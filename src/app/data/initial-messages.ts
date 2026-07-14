import type { Message } from "../types";

export const INITIAL_MESSAGES: Message[] = [
  {
    id: "a1",
    role: "agent",
    text: "先生下午好~我是DTX专享管家，随时为您效劳：逛哪儿、找什么、停车缴费、今日优惠和会员积分，我都能帮您打理。\n\n今日生鲜区新到一批当季好物（1F-生鲜），要不要我帮您看看有什么值得带回家的？",
    time: "15:28",
    quickReplies: ["今天吃什么", "新鲜好物", "520送点什么"],
  },
];
