import type { Skill } from "../../agent/types";
import type { CouponCard } from "../../types";

const BRAND_QUEUE: Record<string, { name: string; floor: string; waitMin: number }> = {
  chanel: { name: "CHANEL", floor: "1F-A12", waitMin: 60 },
  // 常见输入拼写容错：用户输入 channel 时仍按 Chanel 查询。
  channel: { name: "CHANEL", floor: "1F-A12", waitMin: 60 },
  "香奈儿": { name: "CHANEL", floor: "1F-A12", waitMin: 60 },
  hermes: { name: "Hermès", floor: "1F-B03", waitMin: 45 },
  "爱马仕": { name: "Hermès", floor: "1F-B03", waitMin: 45 },
  "hermès": { name: "Hermès", floor: "1F-B03", waitMin: 45 },
  lv: { name: "Louis Vuitton", floor: "1F-C01", waitMin: 30 },
  "louis vuitton": { name: "Louis Vuitton", floor: "1F-C01", waitMin: 30 },
  "路易威登": { name: "Louis Vuitton", floor: "1F-C01", waitMin: 30 },
  dior: { name: "Dior", floor: "1F-D05", waitMin: 25 },
  "迪奥": { name: "Dior", floor: "1F-D05", waitMin: 25 },
  gucci: { name: "Gucci", floor: "1F-E08", waitMin: 20 },
  "古驰": { name: "Gucci", floor: "1F-E08", waitMin: 20 },
  "海底捞": { name: "海底捞", floor: "5F-C01", waitMin: 50 },
  "鼎泰丰": { name: "鼎泰丰", floor: "B1-A01", waitMin: 35 },
  "新荣记": { name: "新荣记", floor: "7F-D01", waitMin: 40 },
  "大董": { name: "大董烤鸭", floor: "6F-D02", waitMin: 30 },
  "超市": { name: "DTX精品超市", floor: "B1-01", waitMin: 5 },
};

const NEARBY_AFTERNOON_TEA = {
  brand: "TWG Tea",
  floor: "1F-A15",
  discount: "8.5折",
  title: "精品下午茶专属券",
  description: "环境精致的茶餐厅，手工茶点和经典茶品很适合下午茶",
};

const FIFTH_FLOOR_AFTERNOON_TEA = {
  brand: "翠园",
  floor: "5F-B01",
  discount: "8.5折",
  title: "粤式下午茶专属券",
  description: "环境精致的粤式茶餐厅，杨枝甘露和广式点心很适合下午茶",
};

function getAfternoonTeaOffer(queueFloor: string) {
  const venue = queueFloor.startsWith("1F") ? NEARBY_AFTERNOON_TEA : FIFTH_FLOOR_AFTERNOON_TEA;
  return {
    ...venue,
    validUntil: "2026.07.31",
    scope: "brand" as const,
  };
}

const DEMO_QUEUE_CASE = {
  name: "海底捞",
  floor: "5F-C01",
  waitMin: 50,
};

function buildDemoResponse() {
  const info = DEMO_QUEUE_CASE;
  const offer = getAfternoonTeaOffer(info.floor);
  const crossCoupon = { type: "coupon-card" as const, ...offer };

  return {
    text: `当前暂未查询到实时排队接口数据，以下为演示案例：${info.name}（${info.floor}）预计等待约${info.waitMin}分钟。\n\n等待时长较长，建议您先去${offer.floor}「${offer.brand}」坐坐。这是一家${offer.description}，我已为您附上${offer.discount}${offer.title}。`,
    quickReplies: ["帮我托管排队", `查看${offer.brand}菜单`, "还有其他餐厅吗"],
    coupons: [crossCoupon],
  };
}

export const crossSellSkill: Skill = {
  name: "cross-sell",
  intentDescription: "处理品牌排队拥挤与等待时长咨询（如\"人多嘛\"、\"拥挤吗\"、\"排队多久\"），并在等待较长时给出交叉营销建议与权益券。",
  match: () => true,
  handle: ({ text }) => {
    const lowerValue = text.toLowerCase();
    const matched = Object.entries(BRAND_QUEUE).find(([keyword]) => lowerValue.includes(keyword));

    if (!matched) {
      return buildDemoResponse();
    }

    const info = matched[1];
    const offer = getAfternoonTeaOffer(info.floor);
    const crossCoupon = info.waitMin >= 30 ? ({ type: "coupon-card", ...offer } as CouponCard) : null;

    let textReply = `${info.name}（${info.floor}）当前排队约 ${info.waitMin} 分钟。`;
    if (info.waitMin >= 30 && crossCoupon) {
      const proximity = info.floor.startsWith("1F") ? "，从这里步行约1分钟，不用上下楼" : "";
      textReply += `\n\n等待时长较长，建议您先去${offer.floor}「${offer.brand}」坐坐${proximity}。这是一家${offer.description}。我已为您申请了一张${offer.discount}${offer.title}，现在去刚刚好。`;
    } else if (info.waitMin >= 15) {
      textReply += "\n\n如果您需要，我可以帮您托管排队，到号前通知您。";
    }

    return {
      text: textReply,
      quickReplies: info.waitMin >= 30 ? ["帮我托管排队", `查看${offer.brand}菜单`, "还有其他餐厅吗"] : ["帮我托管排队", "今日专属优惠"],
      coupons: crossCoupon ? [crossCoupon] : undefined,
    };
  },
};
