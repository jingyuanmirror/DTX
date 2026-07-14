import type { Skill } from "../../agent/types";
import { parseQueueRequest, QUEUE_VENUES } from "../../utils/queue";
import type { QueueInfo } from "../../types";

const DEMO_QUEUE_INFO: QueueInfo = {
  brand: "新荣记",
  floor: "5F",
  partySize: 3,
  queueNo: "D28",
  ahead: 4,
  estMin: 32,
  enrolledAt: Date.now(),
  status: "queuing",
};

function createQueueNo() {
  return `${String.fromCharCode(65 + Math.floor(Math.random() * 8))}${Math.floor(Math.random() * 90) + 10}`;
}

export const queueSkill: Skill = {
  name: "queue",
  intentDescription: "处理餐厅或门店排队托管、取号、排队进度与到号状态查询；无实时数据时提供演示案例。",
  match: () => true,
  handle: ({ text, queueInfo }) => {
    const queueRequest = parseQueueRequest(text);

    if (queueRequest) {
      const venue = QUEUE_VENUES[queueRequest.venueKey];
      const queueNo = createQueueNo();
      const ahead = Math.floor(Math.random() * 6) + 3;
      const estMin = ahead * 8;

      const info: QueueInfo = {
        brand: venue.name,
        floor: venue.floor,
        partySize: queueRequest.partySize,
        queueNo,
        ahead,
        estMin,
        enrolledAt: Date.now(),
        status: "queuing",
      };

      return {
        text: `已为您在${venue.name}（${venue.floor}）托管排队，${queueRequest.partySize}人位，取号${queueNo}。前方等候${ahead}组，预计约需${estMin}分钟。到号前我会提前提醒您，您可以在商场内自由逛逛。`,
        quickReplies: ["查询排队进度", "今日专属优惠", "查询停车状态"],
        queueCard: {
          type: "queue-card",
          brand: venue.name,
          floor: venue.floor,
          partySize: queueRequest.partySize,
          queueNo,
          ahead,
          estMin,
          status: "queuing",
        },
        sideEffects: {
          queueInfo: info,
          resetQueueNotified: true,
        },
      };
    }

    if (queueInfo) {
      return {
        text:
          queueInfo.status === "ready"
            ? `您在${queueInfo.brand}的排队已到号！请前往${queueInfo.floor}入座。`
            : queueInfo.status === "almost"
              ? `您在${queueInfo.brand}的排队即将到号，前方仅剩${queueInfo.ahead}组，请准备前往。`
              : `您在${queueInfo.brand}的排队正在进行中，前方还有${queueInfo.ahead}组等候，预计约需${queueInfo.estMin}分钟。`,
        quickReplies: queueInfo.status === "ready" ? ["导航到店铺", "今日专属优惠"] : ["今日专属优惠", "查询停车状态"],
        queueCard: {
          type: "queue-card",
          brand: queueInfo.brand,
          floor: queueInfo.floor,
          partySize: queueInfo.partySize,
          queueNo: queueInfo.queueNo,
          ahead: queueInfo.ahead,
          estMin: queueInfo.estMin,
          status: queueInfo.status,
        },
      };
    }

    return {
      text: `目前暂未查询到您的实时排队记录。为便于演示，先为您展示一个示例：${DEMO_QUEUE_INFO.brand}（${DEMO_QUEUE_INFO.floor}）${DEMO_QUEUE_INFO.partySize}人位，排号${DEMO_QUEUE_INFO.queueNo}，前方${DEMO_QUEUE_INFO.ahead}组，预计约${DEMO_QUEUE_INFO.estMin}分钟。`,
      quickReplies: ["帮我排新荣记", "帮我排海底捞", "查询排队进度"],
      queueCard: {
        type: "queue-card",
        brand: DEMO_QUEUE_INFO.brand,
        floor: DEMO_QUEUE_INFO.floor,
        partySize: DEMO_QUEUE_INFO.partySize,
        queueNo: DEMO_QUEUE_INFO.queueNo,
        ahead: DEMO_QUEUE_INFO.ahead,
        estMin: DEMO_QUEUE_INFO.estMin,
        status: DEMO_QUEUE_INFO.status,
      },
    };
  },
};
