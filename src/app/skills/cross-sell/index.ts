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
};

const CROSS_SELL_COFFEE = {
  brand: "FLAIR 高端茶饮",
  discount: "8.5折",
  title: "会员专属咖啡券",
  validUntil: "2026.07.31",
  scope: "brand",
};

const DEMO_QUEUE_CASE = {
  name: "Chanel 精品店",
  floor: "1F-A12",
  waitMin: 60,
};

function buildDemoResponse() {
  const info = DEMO_QUEUE_CASE;
  const crossCoupon = { type: "coupon-card" as const, ...CROSS_SELL_COFFEE };

  return {
    text: `李先生，当前暂未查询到实时排队接口数据，以下为演示案例：${info.name}（${info.floor}）预计等待约${info.waitMin}分钟。\n\n排队时间较长，建议您先前往4F「${crossCoupon.brand}」稍作休息，我已为您附上${crossCoupon.discount}${crossCoupon.title}。`,
    quickReplies: ["帮我托管排队", "查看FLAIR菜单", "还有其他品牌吗"],
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

    let textReply = `李先生，${info.name}（${info.floor}）当前排队约 ${info.waitMin} 分钟。`;
    if (info.waitMin >= 30 && crossCoupon) {
      textReply += `\n\n排队时间较长，建议您先去4F「${crossCoupon.brand}」歇歇脚，我已为您申请了一张${crossCoupon.discount}${crossCoupon.title}，现在去刚刚好。`;
    } else if (info.waitMin >= 15) {
      textReply += "\n\n如果您需要，我可以帮您托管排队，到号前通知您。";
    }

    return {
      text: textReply,
      quickReplies: info.waitMin >= 30 ? ["帮我托管排队", "查看FLAIR菜单", "看看丝巾库存"] : ["帮我托管排队", "今日专属优惠"],
      coupons: crossCoupon ? [crossCoupon] : undefined,
    };
  },
};
