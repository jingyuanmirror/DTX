import type { Skill } from "../../agent/types";
import type { RestaurantCard } from "../../types";
import { RESTAURANTS, CUISINE_CATEGORIES, type Restaurant } from "../../data/restaurants";
import { chatCompletion } from "../../llm/client";
import type { ChatMessage } from "../../llm/types";

/**
 * 餐饮推荐 skill —— 编辑型纯文字回复
 * 交互两步:
 *   1) 用户问美食推荐但未说口味 → 纯问句引导("想吃中餐/日料还是火锅?")
 *   2) 用户说了口味 → 按菜系类型筛选推荐;说"随便"→ 今日精选(不同价位/类型各挑一家)
 * 口味判断优先用 LLM 在 function call 中填的 cuisine 参数;其次在文本里做关键词匹配。
 */

/** 用户表述中常见口味线索 → 归一到 cuisine 大类 */
const CUISINE_KEYWORDS: { cuisine: string; keys: string[] }[] = [
  { cuisine: "中餐", keys: ["中餐", "中国菜", "台州", "宁波", "烤鸭", "新荣记", "大董", "甬府"] },
  { cuisine: "粤菜", keys: ["粤菜", "广东菜", "港式", "茶市", "乳猪", "翠园", "广式"] },
  { cuisine: "火锅", keys: ["火锅", "涮", "海底捞", "锅底", "麻辣"] },
  { cuisine: "西餐", keys: ["西餐", "法餐", "西式", "牛排", "法式", "Robuchon", "法国菜"] },
  { cuisine: "日料", keys: ["日料", "日式", "寿司", "拉面", "刺身", "日本菜"] },
  { cuisine: "小吃快餐", keys: ["小吃", "快餐", "便当", "轻食", "面", "小笼", "鼎泰丰", "美食广场", "沙拉", "三明治"] },
  { cuisine: "茶饮咖啡", keys: ["茶", "咖啡", "奶茶", "拿铁", "喜茶", "arabica", "arabica"] },
  { cuisine: "随便", keys: ["随便", "都行", "都可以", "你定", "看着办", "你推荐", "不知道吃什么", "没啥想法"] },
];

function detectCuisine(text: string, toolCuisine?: string): string | null {
  if (toolCuisine && toolCuisine.trim()) {
    const hit = CUISINE_CATEGORIES.find((c) => toolCuisine.includes(c));
    if (hit) return hit;
  }
  const lower = text.toLowerCase();
  for (const { cuisine, keys } of CUISINE_KEYWORDS) {
    if (keys.some((k) => lower.includes(k.toLowerCase()))) return cuisine;
  }
  return null;
}

function filterByCuisine(cuisine: string): Restaurant[] {
  if (cuisine === "日料") {
    // 商场暂无纯日料店,日式元素落在美食广场,给出最接近的选择
    return RESTAURANTS.filter((r) => r.cuisine === "小吃快餐");
  }
  return RESTAURANTS.filter((r) => r.cuisine === cuisine);
}

/** 今日精选:不同菜系/价位各挑一家,凑成 3 家有差异的推荐 */
function pickTodayPicks(): Restaurant[] {
  const order = ["火锅", "粤菜", "小吃快餐", "中餐", "茶饮咖啡"];
  const picks: Restaurant[] = [];
  const usedCuisine = new Set<string>();
  for (const c of order) {
    const r = RESTAURANTS.find((x) => x.cuisine === c && !usedCuisine.has(x.cuisine));
    if (r) {
      picks.push(r);
      usedCuisine.add(r.cuisine);
    }
    if (picks.length >= 3) break;
  }
  return picks.slice(0, 3);
}

function buildDigest(restaurants: Restaurant[]): string {
  return restaurants
    .map((r, i) => {
      const dishes = r.recommendation.slice(0, 3).join("、");
      const tip = r.tip ? `\n   小贴士：${r.tip}` : "";
      return `${i + 1}. ${r.name}（${r.floor}）\n   菜系：${r.cuisineType}\n   人均：${r.priceRange}\n   招牌：${dishes}\n   亮点：${r.highlight}${tip}`;
    })
    .join("\n\n");
}

/** 把筛选出的餐厅转成推荐卡片(细节由卡片承载,话术中不再重复罗列) */
function buildRestaurantCards(restaurants: Restaurant[]): RestaurantCard[] {
  return restaurants.map((r) => ({
    type: "restaurant-card",
    name: r.name,
    floor: r.floor,
    cuisineType: r.cuisineType,
    priceRange: r.priceRange,
    highlight: r.highlight,
    recommendation: r.recommendation,
    tags: r.tags,
    tip: r.tip,
    image: r.image,
  }));
}

async function rewriteRecommendation(
  userText: string,
  cuisine: string,
  restaurants: Restaurant[],
): Promise<string> {
  const digest = buildDigest(restaurants);
  const promptLead = cuisine === "随便"
    ? "用户没有指定口味,你按今日精选挑了下面这几家,话术点出有几家、各自适合什么场景即可。"
    : `用户想吃「${cuisine}」,你从中筛选出下面的几家,话术点出有几家、各自适合什么场景即可。`;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是DTX综合商圈的智能管家,负责餐饮推荐。\n"
        + "要求：\n"
        + "1) 称呼用户「先生」或「女士」,语气自然热情、像朋友推荐好去处一样。\n"
        + "2) 严格基于提供的餐厅数据,不杜撰店名、菜品、楼层、价格。\n"
        + "3) 回复是简短的推荐话术:说明为他挑了几家、大致适合什么场景即可。\n"
        + "4) 重要:不要展开每家餐厅的推荐理由、特色、招牌菜、人均——这些信息下方推荐卡片已经展示,话术里重复就是啰嗦。只需要一句话带过,把细节留给卡片。\n"
        + "5) 结尾给一句共同的到店建议(如预约/排队/取餐时机),并问是否需要预约或帮排队。\n"
        + "6) 回复简洁有温度,控制在两三句话,不输出列表序号、不逐家点评。",
    },
    {
      role: "user",
      content: `用户问题：${userText}\n${promptLead}\n\n候选餐厅：\n${digest}`,
    },
  ];

  try {
    const result = await chatCompletion(messages, [], { onToken: () => {} });
    return result.choices[0]?.message?.content?.trim() || "抱歉,餐厅推荐服务暂时不可用。";
  } catch {
    return "抱歉,餐厅推荐服务暂时不可用,请稍后再试。";
  }
}

export const restaurantRecommendSkill: Skill = {
  name: "restaurant-recommend",
  intentDescription:
    "餐饮/餐厅推荐专属。当用户问美食推荐、想吃什么、今天吃什么、求推荐餐厅时调用。若用户未说想吃的类型,先引导用户说出菜系/口味;用户说'随便'则按今日精选推荐。注:纯查餐厅位置/服务台/退换货等非推荐场景仍走 service-qa。",
  match: () => true,
  handle: async ({ text, toolArgs }) => {
    const cuisine = detectCuisine(text, String(toolArgs?.cuisine ?? ""));

    // ── 未表达口味(且未说随便)→ 纯问句引导 ─────────────────────
    if (!cuisine) {
      return {
        text:
          "先生,这就帮您推荐!想先听听您的口味——今天想吃中餐、粤菜、火锅,还是西餐、日料、小吃快餐?要是拿不定主意,跟我说「随便」也行,我按今日精选给您挑几家。",
        quickReplies: ["中餐", "火锅", "随便", "西餐"],
      };
    }

    // ── 随便 → 今日精选 ──────────────────────────────────────
    if (cuisine === "随便") {
      const picks = pickTodayPicks();
      const reply = await rewriteRecommendation(text, "随便", picks);
      return {
        text: reply,
        quickReplies: ["帮我排海底捞", "想换个口味", "查询停车状态"],
        restaurantCards: buildRestaurantCards(picks),
      };
    }

    // ── 指定口味 → 按菜系筛选 ────────────────────────────────
    const matched = filterByCuisine(cuisine);

    if (matched.length === 0) {
      return {
        text:
          `先生,商场目前「${cuisine}」类别的餐厅暂时没有收录,要不换换口味?我给您列几个选择:中餐、粤菜、火锅、西餐、小吃快餐、茶饮咖啡都有,或者直接说「随便」我按今日精选推荐。`,
        quickReplies: ["随便", "中餐", "火锅", "粤菜"],
      };
    }

    const reply = await rewriteRecommendation(text, cuisine, matched);
    const firstBrand = matched[0].name;
    return {
      text: reply,
      quickReplies: [
        firstBrand === "海底捞" ? "帮我排海底捞" : `帮我排${firstBrand}`,
        "想换个口味",
        "查询停车状态",
      ],
      restaurantCards: buildRestaurantCards(matched),
    };
  },
};