import type { FeatureEntry } from "../types";

export const FEATURE_ENTRIES: (FeatureEntry & { iconName: "guide" | "member" | "activity" | "coupon" | "checkin" | "invite" })[] = [
  {
    icon: "◈",
    iconName: "guide",
    title: "品牌导览",
    sub: "品牌信息·新品预约",
    accent: true,
  },
  {
    icon: "◆",
    iconName: "member",
    title: "会员中心",
    sub: "积分·等级·家庭卡",
    accent: false,
  },
  {
    icon: "✦",
    iconName: "activity",
    title: "活动中心",
    sub: "限时活动·独家体验",
    accent: true,
  },
  {
    icon: "◇",
    iconName: "coupon",
    title: "领券中心",
    sub: "专属发券·动态权益",
    accent: false,
  },
  {
    icon: "◉",
    iconName: "checkin",
    title: "签到有礼",
    sub: "每日签到·积分奖励",
    accent: false,
  },
  {
    icon: "♡",
    iconName: "invite",
    title: "邀请有礼",
    sub: "邀请好友·尊享礼遇",
    accent: false,
  },
];