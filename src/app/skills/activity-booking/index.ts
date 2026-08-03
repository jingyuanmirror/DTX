import type { AgentResponse, Skill, SkillContext } from "../../agent/types";
import { BOOKABLE_ACTIVITIES, type BookableActivity } from "../../data/activity-bookings";
import type { ActivityBookingCard, ActivityBookingInfo } from "../../types";
import { getUserSalutation } from "../../utils/salutation";

interface ResolvedSlot {
  id: string;
  dateLabel: string;
  dayLabel: string;
  startTime: string;
  endTime: string;
  remaining: number;
}

let reservationSequence = 0;

function matchActivity(text: string): BookableActivity | null {
  const lower = text.toLowerCase();
  return BOOKABLE_ACTIVITIES.find((activity) =>
    activity.keywords.some((keyword) => lower.includes(keyword.toLowerCase())),
  ) ?? null;
}

function nextDayOfWeek(targetDay: number): Date {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let delta = (targetDay - date.getDay() + 7) % 7;
  if (delta === 0 && now.getHours() >= 17) delta = 7;
  date.setDate(date.getDate() + delta);
  return date;
}

function resolveSlots(activity: BookableActivity): ResolvedSlot[] {
  return activity.slots.map((slot) => {
    const date = nextDayOfWeek(slot.day === "saturday" ? 6 : 0);
    const dayLabel = slot.day === "saturday" ? "周六" : "周日";
    return {
      id: slot.id,
      dateLabel: `${date.getMonth() + 1}月${date.getDate()}日 ${dayLabel}`,
      dayLabel,
      startTime: slot.startTime,
      endTime: slot.endTime,
      remaining: slot.remaining,
    };
  });
}

function findSelectedSlot(text: string, activity: BookableActivity): ResolvedSlot | null {
  const slots = resolveSlots(activity);
  return slots.find((slot) => {
    const timeMatched = text.includes(slot.startTime) || text.includes(slot.startTime.replace(":30", "点半"));
    const dayMatched = text.includes(slot.dayLabel) || text.includes(slot.dateLabel.split(" ")[0]);
    return timeMatched && (dayMatched || slots.filter((item) => item.startTime === slot.startTime).length === 1);
  }) ?? null;
}

function parseParty(text: string): string | null {
  const compact = text.replace(/\s/g, "");
  const adultsAndChildren = compact.match(/([1-4])大([1-4])小/);
  if (adultsAndChildren) return `${adultsAndChildren[1]}位成人 · ${adultsAndChildren[2]}位儿童`;

  const people = compact.match(/([1-6])(?:个人|人)/);
  if (people) return `${people[1]}人`;
  return null;
}

function buildPendingInfo(
  activity: BookableActivity,
  flowStatus: ActivityBookingInfo["flowStatus"],
  slot?: ResolvedSlot,
): ActivityBookingInfo {
  return {
    type: "activity-booking",
    activityId: activity.id,
    activityName: activity.name,
    venue: activity.venue,
    floor: activity.floor,
    status: "pending",
    flowStatus,
    slotId: slot?.id,
    dateLabel: slot?.dateLabel,
    timeSlot: slot ? `${slot.startTime}-${slot.endTime}` : undefined,
  };
}

function slotListResponse(activity: BookableActivity, salutation: string): AgentResponse {
  const slots = resolveSlots(activity).filter((slot) => slot.remaining > 0);
  const list = slots
    .map((slot) => `🗓 ${slot.dateLabel} ${slot.startTime}-${slot.endTime} · 余${slot.remaining}组`)
    .join("\n");

  return {
    text:
      `${salutation}，${activity.name}本周末还有这些场次：\n\n${list}\n\n`
      + `${activity.ageRange}，每场${activity.duration.replace("约 ", "")}。建议优先选上午场，孩子精神更足，现场也更从容。`,
    quickReplies: slots.slice(0, 4).map((slot) => `${slot.dayLabel} ${slot.startTime}`),
    sideEffects: { activityBookingInfo: buildPendingInfo(activity, "selecting_slot") },
  };
}

function methodResponse(activity: BookableActivity, salutation: string): AgentResponse {
  return {
    text:
      `${salutation}，${activity.shortName}可以直接由我代您预约。\n\n`
      + `📋 预约方法\n${activity.bookingMethod}\n\n`
      + `🎯 活动信息\n${activity.ageRange} · ${activity.duration} · ${activity.priceLabel}\n\n`
      + `💡 提醒\n${activity.cancelNote}`,
    quickReplies: ["查看乐高场次", "帮我预约乐高", "暂不预约"],
  };
}

function createConfirmation(
  activity: BookableActivity,
  slot: ResolvedSlot,
  participantLabel: string,
  salutation: string,
): AgentResponse {
  reservationSequence += 1;
  const date = new Date();
  const dateCode = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const reservationId = `ACT-LEGO-${dateCode}-${String(reservationSequence).padStart(3, "0")}`;
  const timeSlot = `${slot.startTime}-${slot.endTime}`;

  const activityBookingInfo: ActivityBookingInfo = {
    type: "activity-booking",
    activityId: activity.id,
    activityName: activity.name,
    venue: activity.venue,
    floor: activity.floor,
    status: "confirmed",
    slotId: slot.id,
    dateLabel: slot.dateLabel,
    timeSlot,
    participantLabel,
    reservationId,
  };

  const activityBookingCard: ActivityBookingCard = {
    type: "activity-booking-card",
    activityName: activity.name,
    venue: activity.venue,
    floor: activity.floor,
    dateLabel: slot.dateLabel,
    timeSlot,
    participantLabel,
    reservationId,
    status: "confirmed",
    statusLabel: "预约成功",
    checkInNote: activity.checkInNote,
  };

  return {
    text: `${salutation}，乐高拼搭派对已经帮您约好了。上午场孩子状态通常更好，结束后也方便在4F继续逛逛。`,
    quickReplies: ["查看活动预约", "导航到乐高", "预约其他活动"],
    activityBookingCard,
    sideEffects: { activityBookingInfo },
  };
}

function statusResponse(info: ActivityBookingInfo | null, salutation: string): AgentResponse {
  if (!info || info.status !== "confirmed" || !info.dateLabel || !info.timeSlot || !info.participantLabel || !info.reservationId) {
    return {
      text: `${salutation}，目前还没有已确认的活动预约。乐高周末拼搭派对还有场次，可以先看看余位。`,
      quickReplies: ["查看乐高场次", "乐高怎么预约"],
    };
  }

  const activity = BOOKABLE_ACTIVITIES.find((item) => item.id === info.activityId) ?? BOOKABLE_ACTIVITIES[0];
  return {
    text: `${salutation}，这是您已确认的活动预约，签到时出示预约码即可。`,
    activityBookingCard: {
      type: "activity-booking-card",
      activityName: info.activityName,
      venue: info.venue,
      floor: info.floor,
      dateLabel: info.dateLabel,
      timeSlot: info.timeSlot,
      participantLabel: info.participantLabel,
      reservationId: info.reservationId,
      status: "confirmed",
      statusLabel: "已确认",
      checkInNote: activity.checkInNote,
    },
    quickReplies: ["导航到乐高", "预约其他活动"],
  };
}

export const activityBookingSkill: Skill = {
  name: "activity-booking",
  intentDescription:
    "处理商场活动预约：查询活动预约情况和剩余名额、说明预约方法、代用户选择场次并报名、查询已确认的活动预约。乐高体验店周末创意拼搭派对为完整演示案例。",
  match: () => true,
  handle: (ctx) => {
    const { text, userProfile, activityBookingInfo } = ctx;
    const salutation = getUserSalutation(userProfile);
    const currentActivity = activityBookingInfo
      ? BOOKABLE_ACTIVITIES.find((item) => item.id === activityBookingInfo.activityId) ?? null
      : null;
    const activity = matchActivity(text) ?? currentActivity;

    if (/我的.*活动预约|查看.*(?:活动)?预约|预约成功了吗|活动预约状态/.test(text)) {
      return statusResponse(activityBookingInfo, salutation);
    }

    if (/怎么预约|如何预约|预约方法|怎么报名|如何报名|报名方式|预约流程/.test(text)) {
      if (!activity) {
        return {
          text: `${salutation}，目前可以在线预约乐高体验店的周末创意拼搭派对。您可以先查看规则或本周末场次。`,
          quickReplies: ["乐高怎么预约", "查看乐高场次"],
        };
      }
      return methodResponse(activity, salutation);
    }

    if (/其他活动|别的活动|换个活动/.test(text)) {
      return {
        text: `${salutation}，目前支持直接在线预约的是乐高周末创意拼搭派对；其他活动开放代约后，我也会在这里同步场次和余位。`,
        quickReplies: ["查看乐高场次", "乐高怎么预约"],
      };
    }

    if (!activity) {
      return {
        text: `${salutation}，您想预约哪项活动？目前乐高体验店的周末创意拼搭派对支持直接查询余位和在线预约。`,
        quickReplies: ["查看乐高场次", "乐高怎么预约", "帮我预约乐高"],
      };
    }

    if (activityBookingInfo?.flowStatus === "collecting_party") {
      const participantLabel = parseParty(text);
      const slot = resolveSlots(activity).find((item) => item.id === activityBookingInfo.slotId);
      if (!participantLabel || !slot) {
        return {
          text: `${salutation}，再告诉我参加人数就能确认了。儿童需由成人陪同。`,
          quickReplies: ["1大1小", "2大1小", "2大2小"],
        };
      }
      return createConfirmation(activity, slot, participantLabel, salutation);
    }

    const selectedSlot = findSelectedSlot(text, activity);
    if (activityBookingInfo?.flowStatus === "selecting_slot" || selectedSlot) {
      if (!selectedSlot) return slotListResponse(activity, salutation);

      const participantLabel = parseParty(text);
      if (participantLabel) return createConfirmation(activity, selectedSlot, participantLabel, salutation);

      return {
        text: `${salutation}，已选${selectedSlot.dateLabel} ${selectedSlot.startTime}-${selectedSlot.endTime}。请告诉我参加人数，儿童需由成人陪同。`,
        quickReplies: ["1大1小", "2大1小", "2大2小"],
        sideEffects: { activityBookingInfo: buildPendingInfo(activity, "collecting_party", selectedSlot) },
      };
    }

    if (/预约情况|可约|名额|余位|场次|什么时候|还有.*约|查看.*场次/.test(text)) {
      return slotListResponse(activity, salutation);
    }

    return slotListResponse(activity, salutation);
  },
};
