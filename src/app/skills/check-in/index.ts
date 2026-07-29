import type { Skill } from "../../agent/types";
import { getUserSalutation } from "../../utils/salutation";
import type { CheckInSpotItem, CouponCard } from "../../types";

interface CheckInSpot {
  name: string;
  floor: string;
  category: string;
  desc: string;
  benefit?: string;
  tags?: string[];
}

// 打卡点数据——复用现有商场真实铺位(brand-catalog.md / mall-knowledge.md)
const CHECKIN_SPOTS: CheckInSpot[] = [
  { name: "DTX精品超市", floor: "B1-01", category: "生鲜好物", desc: "进口鲜花礼盒·有机水果,周末满赠好礼", benefit: "打卡礼:满199减30鲜食券", tags: ["进口生鲜", "现烤烘焙"] },
  { name: "海底捞", floor: "5F-C01", category: "人气火锅", desc: "番茄锅底·虾滑·现扯面,服务热情适合家庭", benefit: "打卡礼:免费虾滑1份", tags: ["家庭聚餐", "服务热情"] },
  { name: "乐高体验店", floor: "4F-B02", category: "亲子创意", desc: "限定典藏套装·周末拼搭派对,城市系列新品", benefit: "打卡礼:限定典藏徽章", tags: ["亲子体验", "周末派对"] },
  { name: "％Arabica", floor: "1F-E01", category: "精品咖啡", desc: "西班牙拿铁·抹茶拿铁,1层中庭外带堂食皆可", benefit: "打卡礼:西班牙拿铁1元换购", tags: ["中庭外带", "人气咖啡"] },
  { name: "屈臣氏", floor: "5F-B06", category: "美妆护肤", desc: "保湿面膜3.99元换购·精选个护,打卡到店即可参与", benefit: "打卡礼:面膜3.99元换购", tags: ["美妆个护", "便捷精选"] },
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

// 打卡地点查询意图（区别于“我已打卡”的成功场景）。
// 这里同时供确定性路由和 skill 内部分支使用，避免两处规则不一致。
export function isCheckInSpotsQuery(text: string): boolean {
  const normalized = text.replace(/[\s，。！？、,.!?]/g, "");
  return /(?:查询|查看|查找|找)?(?:全部|所有|商场)?打卡(?:点|地点|位置)(?:都?有哪(?:些|儿)|在哪(?:儿|里)?|位置|列表|清单|查询|查看|怎么走)?/.test(normalized)
    || /有哪(?:些|儿)(?:可以)?打卡(?:的)?(?:点|地点|位置)?/.test(normalized)
    || /打卡(?:地图|指南|去哪(?:儿|里)|在哪里|位置查询|地点查询)/.test(normalized);
}

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
    "用户完成商场打卡活动、说'我已打卡/打卡了/打卡完成/完成打卡'时路由到此,显示打卡成功、发放专项打卡奖励券、推荐其他打卡点并引导到店体验。也处理打卡点查询,如'打卡点都有哪些''有哪些打卡点''打卡地图'时,展示打卡点列表卡片。重要:'签到有礼''每日签到'属于日常签到,不是打卡活动,不要路由到此。",
  match: () => true,
  handle: async ({ text, userProfile }) => {
    // ── 查询打卡点列表 ────────────────────────────────────────────
    if (isCheckInSpotsQuery(text)) {
      // 列表/位置查询:纵向展示前 5 个打卡点(含当前点),按楼层一眼看清"在哪"
      const spots = CHECKIN_SPOTS
        .map((s) => ({ name: s.name, floor: s.floor, category: s.category, desc: s.desc, benefit: s.benefit, tags: s.tags }))
        .slice(0, 5);

      return {
        text: `${getUserSalutation(userProfile)}，这就给您整理了商场的打卡点，下面按位置一一列出，每个点都有不同的打卡礼遇，到店参与即可点亮。`,
        quickReplies: ["我已打卡", "怎么参与打卡", "导航到店"],
        checkInSpotsCard: {
          type: "check-in-spots-card",
          title: "商场打卡点",
          spots,
          hint: "点亮 5 个打卡点即可领取专属红包",
        },
      };
    }

    // ── 打卡成功 ──────────────────────────────────────────────────
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
