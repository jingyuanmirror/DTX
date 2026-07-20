import type { Skill } from "../../agent/types";
import { getUserSalutation } from "../../utils/salutation";

export const redPacketUsageSkill: Skill = {
  name: "red-packet-usage",
  intentDescription:
    "用户咨询专属红包/打卡红包如何使用,如问「专属红包怎么使用」「打卡红包怎么用」「红包怎么抵扣」「红包怎么花」时路由到此,告知支付时直接碰一下即可使用,并展示流程说明图。",
  match: () => true,
  handle: async ({ userProfile }) => {
    const narration = `${getUserSalutation(userProfile)}，请您支付时，直接碰一下，即可使用专属红包。`;

    return {
      text: narration,
      quickReplies: ["查看我的红包", "继续打卡", "今日专属优惠"],
      redPacketFlowCard: {
        type: "red-packet-flow-card",
        eyebrow: "DTX · 专属红包",
        title: "碰一下，就抵扣",
        subtitle: "支付时直接碰一碰，红包自动核销",
        steps: [
          { icon: "wallet", title: "选择商品", desc: "在参与门店挑选心仪商品，到收银台结账" },
          { icon: "nfc", title: "碰一下", desc: "支付时用手机碰一下商家设备，唤起付款码" },
          { icon: "deduct", title: "自动抵扣", desc: "专属红包自动核销，立享优惠金额" },
          { icon: "done", title: "支付完成", desc: "剩余金额可继续叠加其他优惠，轻松买单" },
        ],
        tip: "打卡点亮5个点位即可领取专属红包，红包到卡包后到店支付碰一碰直接使用。",
      },
    };
  },
};