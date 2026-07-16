import type { Skill } from "../../agent/types";

/**
 * 天气查询 skill —— 编辑型纯文字回复
 * 数据源:Open-Meteo(免密钥、可商用)
 *   1) geocoding-api 把城市名转经纬度
 *   2) forecast-api 取实时天气 + 当日预报
 * 城市名由 LLM 在 function call 的 city 参数中给出(解析交给模型);
 * 未给城市时回退到 北京(DTX 所在地)。
 */

const DEFAULT_CITY = "北京";
const WEATHER_CODE_MAP: Record<number, string> = {
  0: "晴", 1: "晴间多云", 2: "多云", 3: "阴",
  45: "有雾", 48: "雾凇",
  51: "小雨", 53: "小雨", 55: "中雨",
  56: "冻雨", 57: "冻雨",
  61: "小雨", 63: "中雨", 65: "大雨",
  66: "冻雨", 67: "冻雨",
  71: "小雪", 73: "中雪", 75: "大雪",
  77: "霰",
  80: "阵雨", 81: "中阵雨", 82: "强阵雨",
  85: "阵雪", 86: "阵雪",
  95: "雷阵雨", 96: "雷阵雨伴冰雹", 99: "强雷阵雨伴冰雹",
};

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

async function geocode(city: string, signal?: AbortSignal): Promise<GeoResult | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data?.results?.[0];
  if (!hit) return null;
  return {
    name: hit.name as string,
    latitude: hit.latitude as number,
    longitude: hit.longitude as number,
    country: hit.country,
    admin1: hit.admin1,
  };
}

interface ForecastSnapshot {
  weatherCode: number;
  temp: number;
  apparentTemp: number;
  humidity: number;
  windSpeed: number;
  precipProb: number;
  daily: {
    date: string;
    max: number;
    min: number;
    code: number;
    precipProb: number;
  }[];
}

async function fetchForecast(lat: number, lon: number, signal?: AbortSignal): Promise<ForecastSnapshot | null> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "2",
    language: "zh",
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = await res.json();
  const c = data?.current;
  const d = data?.daily;
  if (!c || !d) return null;

  const daily: ForecastSnapshot["daily"] = [];
  const dmax: number[] = Array.isArray(d.temperature_2m_max) ? d.temperature_2m_max : [];
  const dmin: number[] = Array.isArray(d.temperature_2m_min) ? d.temperature_2m_min : [];
  const dcode: number[] = Array.isArray(d.weather_code) ? d.weather_code : [];
  const dprob: number[] = Array.isArray(d.precipitation_probability_max) ? d.precipitation_probability_max : [];
  const dtime: string[] = Array.isArray(d.time) ? d.time : [];
  const len = Math.min(dtime.length, dmax.length, dmin.length, dcode.length);
  for (let i = 0; i < len; i++) {
    daily.push({ date: dtime[i], max: dmax[i], min: dmin[i], code: dcode[i], precipProb: dprob[i] ?? 0 });
  }

  return {
    weatherCode: c.weather_code,
    temp: c.temperature_2m,
    apparentTemp: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    windSpeed: c.wind_speed_10m,
    precipProb: c.precipitation_probability ?? 0,
    daily,
  };
}

function describe(code: number): string {
  return WEATHER_CODE_MAP[code] ?? "天气情况未知";
}

function todayLabel(iso: string): string {
  // iso like "2026-07-16"
  return iso;
}

export const weatherSkill: Skill = {
  name: "weather",
  intentDescription:
    "查询天气。当用户询问某个城市/地区天气(如'上海天气怎样'、'北京今天热吗'、'明天会下雨吗')时调用。城市名从参数 city 获取,未指定则默认为商场所在地。",
  match: () => true,
  handle: async ({ toolArgs }) => {
    const city = String(toolArgs?.city ?? "").trim() || DEFAULT_CITY;

    let geo: GeoResult | null = null;
    let forecast: ForecastSnapshot | null = null;
    try {
      geo = await geocode(city);
      if (geo) {
        forecast = await fetchForecast(geo.latitude, geo.longitude);
      }
    } catch {
      // network / abort — fall through to fallback text
    }

    if (!geo || !forecast) {
      return {
        text: `抱歉，暂时没查到「${city}」的实时天气，可能是城市名不太准确或网络波动。您可以换个城市名再问我，比如「上海天气」或「北京今天天气」。`,
        quickReplies: ["上海天气", "北京天气", "今天适合逛街吗"],
      };
    }

    const placeName = [geo.admin1, geo.name].filter(Boolean).join("·");
    const cur = describe(forecast.weatherCode);
    const lines: string[] = [
      `「${placeName}」实时天气:`,
      `· 天气:${cur},气温${forecast.temp.toFixed(0)}°C(体感${forecast.apparentTemp.toFixed(0)}°C)`,
      `· 湿度${forecast.humidity.toFixed(0)}%,风速${forecast.windSpeed.toFixed(0)} km/h,降水概率${forecast.precipProb.toFixed(0)}%`,
    ];

    if (forecast.daily.length > 0) {
      const t = forecast.daily[0];
      lines.push(`· 今日:${describe(t.code)},${t.min.toFixed(0)}~${t.max.toFixed(0)}°C,降水概率${t.precipProb.toFixed(0)}%`);
    }
    if (forecast.daily.length > 1) {
      const tm = forecast.daily[1];
      lines.push(`· 明日(${todayLabel(tm.date)}):${describe(tm.code)},${tm.min.toFixed(0)}~${tm.max.toFixed(0)}°C,降水概率${tm.precipProb.toFixed(0)}%`);
    }

    // 出门友好度提示
    const rainy = [51, 53, 56, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(forecast.weatherCode);
    const tip = rainy
      ? "当前有降水,记得带伞,商场室内动线不受影响。"
      : "体感适宜,适合来商场逛吃,记得按气温增减衣物。";
    lines.push(tip);

    return {
      text: lines.join("\n"),
      quickReplies: ["今天适合逛街吗", "明天天气", "今日专属优惠"],
    };
  },
};