import type { Skill } from "../../agent/types";
import type { CouponCard } from "../../types";

interface CouponDef {
  brand: string;
  discount: string;
  title: string;
  validUntil: string;
  scope: "mall" | "brand";
  triggers: string[];
}

const COUPON_DB: CouponDef[] = [
  { brand: "DTX", discount: "9折", title: "商场通用券", validUntil: "2026.07.31", scope: "mall", triggers: [] },
  { brand: "DTX", discount: "满2000减100", title: "全场满减券", validUntil: "2026.07.31", scope: "mall", triggers: [] },
  { brand: "DTX精品超市", discount: "满199减30", title: "生鲜专属券", validUntil: "2026.07.31", scope: "brand", triggers: ["超市", "生鲜", "dtx精品", "精品超市"] },
  { brand: "海底捞", discount: "满200减20", title: "火锅优惠券", validUntil: "2026.07.31", scope: "brand", triggers: ["海底捞", "火锅"] },
  { brand: "翠园", discount: "8.8折", title: "粤菜家庭餐券", validUntil: "2026.07.20", scope: "brand", triggers: ["翠园", "粤菜"] },
  { brand: "鼎泰丰", discount: "满150减15", title: "小笼包礼券", validUntil: "2026.07.31", scope: "brand", triggers: ["鼎泰丰", "小笼"] },
  { brand: "Chanel", discount: "8.5折", title: "精品店专属券", validUntil: "2026.07.15", scope: "brand", triggers: ["chanel", "香奈儿"] },
  { brand: "Hermès", discount: "专属礼遇", title: "新品预览优先券", validUntil: "2026.08.31", scope: "brand", triggers: ["hermes", "爱马仕", "hermès"] },
  { brand: "Dior", discount: "满3000减300", title: "美妆与精品券", validUntil: "2026.07.31", scope: "brand", triggers: ["dior", "迪奥"] },
  { brand: "Gucci", discount: "9折", title: "当季精选券", validUntil: "2026.07.20", scope: "brand", triggers: ["gucci", "古驰"] },
  { brand: "Louis Vuitton", discount: "专属预览", title: "VIP新品预约券", validUntil: "2026.08.15", scope: "brand", triggers: ["louis vuitton", "lv", "路易威登"] },
  { brand: "Cartier", discount: "满5000减500", title: "高珠臻品券", validUntil: "2026.07.31", scope: "brand", triggers: ["cartier", "卡地亚"] },
  { brand: "La Mer", discount: "满1500减200", title: "护肤臻享券", validUntil: "2026.07.31", scope: "brand", triggers: ["la mer", "海蓝之谜"] },
  { brand: "屈臣氏", discount: "3.99元换购", title: "精选面膜换购券", validUntil: "2026.07.31", scope: "brand", triggers: ["屈臣氏", "watsons", "watson's"] },
];

export function findBrandCoupon(text: string): CouponCard | undefined {
  const normalized = text.toLowerCase();
  const coupon = COUPON_DB.find(
    (item) => item.scope === "brand" && item.triggers.some((trigger) => normalized.includes(trigger)),
  );
  return coupon ? { type: "coupon-card", ...coupon } : undefined;
}

export const couponSkill: Skill = {
  name: "coupon",
  intentDescription: "处理优惠券与活动咨询，返回商场通用券或品牌专属券信息。",
  match: () => true,
  handle: ({ text }) => {
    const matchedBrandCoupon = findBrandCoupon(text);

    if (matchedBrandCoupon) {
      const mallCoupon = COUPON_DB.find((coupon) => coupon.scope === "mall" && coupon.discount === "9折");
      const coupons: CouponCard[] = [matchedBrandCoupon];
      if (mallCoupon) {
        coupons.push({ type: "coupon-card", ...mallCoupon });
      }

      return {
        text: `为您找到了${matchedBrandCoupon.brand}的专属优惠券，同时附上一张商场通用券供您使用。`,
        quickReplies: ["超市有券吗", "海底捞有券吗", "查询停车状态"],
        coupons,
      };
    }

    const mallCoupons = COUPON_DB.filter((coupon) => coupon.scope === "mall");
    return {
      text: "目前以下商场通用优惠券可供领取，您可以直接使用：",
      quickReplies: ["超市有券吗", "海底捞有券吗", "查询停车状态"],
      coupons: mallCoupons.map((coupon) => ({ type: "coupon-card" as const, ...coupon })),
    };
  },
};
