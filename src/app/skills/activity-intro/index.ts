import type { Skill } from "../../agent/types";

export const activityIntroSkill: Skill = {
  name: "activity-intro",
  intentDescription: "介绍固定主题活动及对应入会礼遇。用户提到'七夕打卡'、'七夕活动'、'七夕碰出好喜气'时调用，展示七夕活动介绍卡。",
  match: () => true,
  handle: () => ({
    text: "七夕打卡活动已经开始啦！参与活动并加入DTX会员，就能解锁新人券包、3倍积分卡和七夕限定礼品兑换券。",
    quickReplies: ["了解打卡规则", "查看七夕礼品"],
    activityIntroCard: {
      type: "activity-intro-card",
      eyebrow: "DTX · 七夕限定",
      title: "七夕 · 碰出好喜气",
      slogan: "今夕有你，好运成双",
      dateLabel: "限时开启",
      benefits: [
        { title: "100元无门槛券包", note: "入会后自动发放至卡包" },
        { title: "3倍积分卡", note: "领取后30天内有效" },
        { title: "七夕限定礼品兑换券", note: "完成指定打卡任务即可兑换" },
      ],
      actionLabel: "支付宝授权 · 一键入会",
    },
  }),
};
