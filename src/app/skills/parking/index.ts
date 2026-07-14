import type { ParkingReservation } from "../../types";
import type { Skill } from "../../agent/types";
import { calcParkingDuration, calcParkingFee, parseParkingLocation } from "../../utils/parking";
import parkingBenefitsDoc from "../../data/membership-benefits.md?raw";

const PARKING_PRICING_QUERY = /怎么收费|收费标准|停车费|多少钱|价格|计费|收费规则/;
const RESERVATION_QUERY = /车位|空位|预约|预留|有没有车位|还有车位吗|车位情况|车位状态|好停车吗|车位多不多|留个|占个|帮我留|帮我占|快到了/;
const RESERVATION_INTENT = /预约车位|预留车位|我要预约|帮我预约|预约停车|预留停车|帮我留个|帮我占个|留一个|占一个|帮我留|先帮我|先占|帮我预约一下/;
const LICENSE_PLATE_REGEX = /[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤川青藏琼宁][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]/;

const SIMULATED_AVAILABILITY: Record<string, { total: number; available: number; label: string }> = {
  B1: { total: 120, available: 8, label: "B1层" },
  B2: { total: 200, available: 23, label: "B2层" },
  B3: { total: 180, available: 45, label: "B3层" },
};

function generateReservationId(): string {
  return `DTX-RSV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function getParkingBenefitMessageFromDoc(memberTier: "silver" | "diamond" | "black" | undefined): string | null {
  const tier = memberTier ?? "silver";
  const lines = parkingBenefitsDoc.split("\n");
  const targetPrefix = `- ${tier}:`;
  const line = lines.find((item) => item.trim().startsWith(targetPrefix));
  if (!line) return null;
  return line.replace(targetPrefix, "").trim();
}

export const parkingSkill: Skill = {
  name: "parking",
  intentDescription: "处理所有停车相关事务：1) 记录停车位置（如\"我停在B2-D05\"）；2) 查询停车状态/时长/费用；3) 查询车位可用情况（如\"有没有空位\"、\"好停车吗\"、\"车位多不多\"）；4) 预约/预留车位（如\"预约车位\"、\"帮我留个车位\"、\"快到了帮我留一个\"、\"先占个位\"）；5) 预约流程中提供车牌号；6) 停车收费标准与停车权益说明。任何与停车、车位、停车费相关的意图都应路由到此skill。",
  match: () => true,
  handle: ({ text, parkingInfo, parkingReservation, userProfile }) => {
    const parkingLocation = parseParkingLocation(text);
    const isParkingRecord = Boolean(parkingLocation);
    const isPricingQuery = PARKING_PRICING_QUERY.test(text);

    // ── 0. 预约流程中：收集车牌号 ──
    if (parkingReservation?.status === "collecting_plate") {
      const plateMatch = text.match(LICENSE_PLATE_REGEX);
      if (plateMatch) {
        const plate = plateMatch[0].toUpperCase();
        const reservationId = generateReservationId();
        const confirmed: ParkingReservation = {
          ...parkingReservation,
          plateNumber: plate,
          reservationId,
          reservedAt: Date.now(),
          status: "confirmed",
        };
        return {
          text: `李先生，车位预约成功！您的预约信息如下：\n\n车位：${confirmed.floor}层 ${confirmed.spotId}\n车牌：${plate}\n预约编号：${reservationId}\n\n该车位将为您保留2小时，请在到达时凭预约编号快速入场。`,
          quickReplies: ["查询停车状态", "导航到商场", "今日专属优惠"],
          reservationCard: {
            type: "reservation-card",
            spotId: confirmed.spotId,
            floor: confirmed.floor,
            plateNumber: plate,
            reservationId,
            status: "confirmed",
          },
          sideEffects: {
            parkingReservation: confirmed,
          },
        };
      }
      // 未识别到车牌号
      return {
        text: "抱歉，未能识别您的车牌号，请提供完整的车牌号码，例如\"京A12345\"。",
        quickReplies: [],
      };
    }

    // ── 1. 查询车位情况（纯查询，非预约意图）──
    if (RESERVATION_QUERY.test(text) && !RESERVATION_INTENT.test(text) && !isParkingRecord) {
      const summary = Object.values(SIMULATED_AVAILABILITY)
        .map((f) => `${f.label}：${f.available}/${f.total}个可用`)
        .join("\n");
      return {
        text: `李先生，当前商场车位情况如下：\n\n${summary}\n\n如需预约车位，请告诉我，我将为您预留。`,
        quickReplies: ["预约车位", "我停在B2-D05", "停车费多少"],
      };
    }

    // ── 2. 预约车位意图 ──
    if (RESERVATION_INTENT.test(text)) {
      // 选择空位最多的楼层
      const bestFloor = Object.entries(SIMULATED_AVAILABILITY)
        .sort(([, a], [, b]) => b.available - a.available)[0];
      // 随机分配一个车位编号
      const spotId = `${bestFloor[0]}-${String.fromCharCode(65 + Math.floor(Math.random() * 6))}${String(Math.floor(Math.random() * 99) + 1).padStart(2, "0")}`;

      const newReservation: ParkingReservation = {
        floor: bestFloor[0],
        spotId,
        status: "collecting_plate",
      };

      return {
        text: `李先生，已为您选择${bestFloor[1].label}空余车位 ${spotId}。请提供您的车牌号以完成预约，例如\"京A12345\"。`,
        quickReplies: [],
        sideEffects: {
          parkingReservation: newReservation,
        },
      };
    }

    // ── 3. 停车位置登记 ──
    if (isParkingRecord) {
      const info = {
        location: parkingLocation!.location,
        floor: parkingLocation!.floor,
        parkedAt: Date.now(),
      };
      const floorLabel = `${info.floor}层`;

      return {
        text: `李先生，车位已经帮您记好啦：${floorLabel} ${info.location}。之后随时问我，都能帮您查位置、时长和费用。`,
        parkingCard: {
          type: "parking-card",
          location: `${floorLabel} · ${info.location}`,
          floor: info.floor,
          duration: "0分钟",
          fee: "0",
          feeRate: "15元/小时 · 前30分钟免费",
          membershipOffer: userProfile.isMember
            ? undefined
            : { benefit: "入会享2小时免费停车", saving: "最高省¥30" },
        },
        followUpMessages: [{
          text: "今天商场的活动不少，我先挑了几个您可能喜欢的，从1F一路逛到5F，顺路又不走回头路。想逛美食、咖啡还是美妆？告诉我，我来帮您量身规划！",
          quickReplies: ["我喜欢美食", "想看咖啡活动", "推荐美妆活动"],
          parkingShoppingGuideCard: {
            type: "parking-shopping-guide-card",
            title: "今日活动推荐",
            subtitle: "",
            stops: [
              { floor: "1F", title: "知味观", recommendation: "招牌糕点与现制小吃可用", tag: "满20减5", action: "领券" },
              { floor: "2F", title: "瑞幸咖啡 · 春季上新", recommendation: "原价18元茉莉拿铁", tag: "6.9元换购", action: "立即购买" },
              { floor: "5F", title: "屈臣氏", recommendation: "价值34元的精选面膜", tag: "3.99元换购", action: "立即购买" },
            ],
            coupon: { brand: "DTX", discount: "满100减10", title: "全场通用券" },
          },
        }],
        sideEffects: {
          parkingInfo: info,
        },
      };
    }

    // ── 4. 停车状态查询 ──
    if (parkingInfo) {
      const duration = calcParkingDuration(parkingInfo.parkedAt);
      const fee = calcParkingFee(parkingInfo.parkedAt);
      const floorLabel = `${parkingInfo.floor}层`;
      const parkingBenefitMessage = userProfile.isMember
        ? getParkingBenefitMessageFromDoc(userProfile.memberTier)
        : null;
      const hasMembershipBenefit = Boolean(parkingBenefitMessage);

      const textWithBenefit = hasMembershipBenefit
        ? `李先生，您的爱车目前停在${floorLabel} ${parkingInfo.location}，已停放${duration}。\n\n${parkingBenefitMessage}`
        : `李先生，您的爱车目前停在${floorLabel} ${parkingInfo.location}，已停放${duration}。\n\n您当前还不是会员，入会后可享停车减免与积分抵扣等停车权益，是否需要我现在为您办理入会？`;

      return {
        text: textWithBenefit,
        quickReplies: hasMembershipBenefit
          ? ["积分抵扣停车费", "导航到车位", "今日专属优惠"]
          : ["我想入会", "了解会员权益", "导航到车位"],
        parkingCard: {
          type: "parking-card",
          location: `${floorLabel} · ${parkingInfo.location}`,
          floor: parkingInfo.floor,
          duration,
          fee,
          feeRate: "15元/小时 · 前30分钟免费",
          membershipOffer: userProfile.isMember
            ? undefined
            : { benefit: "入会享2小时免费停车", saving: "最高省¥30" },
        },
      };
    }

    // ── 5. 停车收费查询 ──
    if (isPricingQuery) {
      const parkingBenefitMessage = userProfile.isMember
        ? getParkingBenefitMessageFromDoc(userProfile.memberTier)
        : null;

      const benefitText = parkingBenefitMessage
        ? `\n\n${parkingBenefitMessage}`
        : "\n\n您当前还不是会员，入会后可享停车减免与积分抵扣等权益。";

      return {
        text: `李先生，商场停车收费标准为：前30分钟免费，之后15元/小时，不足1小时按1小时计费。${benefitText}`,
        quickReplies: userProfile.isMember
          ? ["查询停车状态", "积分抵扣停车费", "我停在B2-D05"]
          : ["我想入会", "会员停车权益", "我停在B2-D05"],
      };
    }

    // ── 6. 兜底 ──
    return {
      text: "李先生，目前还没有您的停车记录。您可以告诉我您的停车位置，例如\"我停在B2-D05\"，我会为您记录并计算费用。如需预约车位，也可以告诉我。",
      quickReplies: ["我停在B3-A12", "预约车位", "今日专属优惠"],
    };
  },
};
