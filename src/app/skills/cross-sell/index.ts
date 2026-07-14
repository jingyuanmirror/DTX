import type { Skill } from "../../agent/types";
import type { CouponCard } from "../../types";

const BRAND_QUEUE: Record<string, { name: string; floor: string; waitMin: number }> = {
  chanel: { name: "Chanel 精品店", floor: "1F-A12", waitMin: 60 },
  "香奈儿": { name: "Chanel 精品店", floor: "1F-A12", waitMin: 60 },
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

const CROSS_SELL_COFFEE = {
  brand: "喜茶",
  discount: "8.5折",
  title: "会员专属茶饮券",
  validUntil: "2026.07.31",
  scope: "brand",
};

const DEMO_QUEUE_CASE = {
  name: "海底捞",
  floor: "5F-C01",
  waitMin: 50,
};

function buildDemoResponse() {
  const info = DEMO_QUEUE_CASE;
  const crossCoupon = { type: "coupon-card" as const, ...CROSS_SELL_COFFEE };

  return {
    text: `当前暂未查询到实时排队接口数据，以下为演示案例：${info.name}（${info.floor}）预计等待约${info.waitMin}分钟。\n\n排队时间较长，建议您先前往B1「${crossCoupon.brand}」稍作休息，我已为您附上${crossCoupon.discount}${crossCoupon.title}。`,
    quickReplies: ["帮我托管排队", "查看喜茶菜单", "还有其他餐厅吗"],
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
    const crossCoupon = info.waitMin >= 30 ? ({ type: "coupon-card", ...CROSS_SELL_COFFEE } as CouponCard) : null;

    let textReply = `${info.name}（${info.floor}）当前排队约 ${info.waitMin} 分钟。`;
    if (info.waitMin >= 30 && crossCoupon) {
      textReply += `\n\n排队时间较长，建议您先去B1「${crossCoupon.brand}」歇歇脚，我已为您申请了一张${crossCoupon.discount}${crossCoupon.title}，现在去刚刚好。`;
    } else if (info.waitMin >= 15) {
      textReply += "\n\n如果您需要，我可以帮您托管排队，到号前通知您。";
    }

    return {
      text: textReply,
      quickReplies: info.waitMin >= 30 ? ["帮我托管排队", "查看喜茶菜单", "今天吃什么"] : ["帮我托管排队", "今日专属优惠"],
      coupons: crossCoupon ? [crossCoupon] : undefined,
    };
  },
};
