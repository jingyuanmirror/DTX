import type { Skill } from "../../agent/types";
import { getUserSalutation } from "../../utils/salutation";
import type { CheckInSpotItem, CouponCard } from "../../types";

interface CheckInSpot {
  name: string;
  floor: string;
  category: string;
  desc: string;
}

// 打卡点数据——复用现有商场真实铺位(brand-catalog.md / mall-knowledge.md)
const CHECKIN_SPOTS: CheckInSpot[] = [
  { name: "DTX精品超市", floor: "B1-01", category: "生鲜好物", desc: "进口鲜花礼盒·有机水果,周末满赠好礼" },
  { name: "海底捞", floor: "5F-C01", category: "人气火锅", desc: "番茄锅底·虾滑·现扯面,服务热情适合家庭" },
  { name: "乐高体验店", floor: "4F-B02", category: "亲子创意", desc: "限定典藏套装·周末拼搭派对,城市系列新品" },
  { name: "％Arabica", floor: "1F-E01", category: "精品咖啡", desc: "西班牙拿铁·抹茶拿铁,1层中庭外带堂食皆可" },
];

// 专项打卡奖励券(独立于普通 COUPON_DB)
const CHECKIN_COUPON: CouponCard = {
  type: "coupon-card",
  brand: "DTX",
  discount: "满199减30",
  title: "打卡专属奖励券",
  validUntil: "2026.07.31",
  scope: "brand",
};

const CURRENT_SPOT = CHECKIN_SPOTS[3];

// 随机选取3个推荐打卡点(不精确识别当前点)
function pickRecommendations(): CheckInSpotItem[] {
  return Array.from(CHECKIN_SPOTS)
    .filter((spot) => spot.name !== CURRENT_SPOT.name)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((s) => ({ name: s.name, floor: s.floor, category: s.category, desc: s.desc }));
}

export const checkInSkill: Skill = {
  name: "check-in",
  intentDescription:
    "用户完成商场打卡活动、说'我已打卡/打卡了/打卡完成/完成打卡'时路由到此,显示打卡成功、发放专项打卡奖励券、推荐其他打卡点并引导到店体验。重要:'签到有礼''每日签到'属于日常签到,不是打卡活动,不要路由到此。",
  match: () => true,
  handle: async ({ userProfile }) => {
    const recommendations = pickRecommendations();
    const couponText = `${CHECKIN_COUPON.discount} ${CHECKIN_COUPON.title}`;

    const narration = `${getUserSalutation(userProfile)}，打卡成功！原价38元的西班牙拿铁已为您解锁，今天1元换购，数量有限，建议先领取。取完咖啡后，可以顺路去DTX精品超市完成下一站打卡，点亮5个即可获得专属红包。`;

    return {
      text: narration,
      quickReplies: ["立即领取", "导航到店", "继续打卡"],
      checkInCard: {
        type: "check-in-card",
        spotName: `${CURRENT_SPOT.name} · ${CURRENT_SPOT.floor}`,
        status: "success",
        statusLabel: "打卡成功",
        prize: {
          name: "西班牙拿铁",
          price: 1,
          originalPrice: 38,
          note: "领取后当日到店核销",
        },
        recommendations,
        couponHint: `已发放${couponText},到店核销即可使用`,
      },
      coupons: [CHECKIN_COUPON],
    };
  },
};
