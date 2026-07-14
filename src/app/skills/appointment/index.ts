import type { AgentResponse, Skill, SkillContext } from "../../agent/types";
import type { AppointmentCard, AppointmentInfo, CouponCard, UserProfile } from "../../types";
import { brandKeywords } from "../../utils/preference";
import brandSlotsDoc from "../../data/brand-slots.md?raw";

// ── SA 姓名映射表（Demo 阶段硬编码）──────────────────────────────────
const SA_MAP: Record<string, string> = {
  Chanel: "王婷婷",
  "Hermès": "张雅琪",
  "Louis Vuitton": "李梦瑶",
  Dior: "陈思涵",
  Gucci: "林诗韵",
};

// ── 预约凭证号前缀映射 ────────────────────────────────────────────────
const BRAND_PREFIX: Record<string, string> = {
  Chanel: "Cha",
  "Hermès": "Her",
  "Louis Vuitton": "LVo",
  Dior: "Dio",
  Gucci: "Guc",
};

// ── 茶饮推荐券（复用 cross-skill 的 FLAIR 数据格式）───────────────────
const TEA_COUPON = {
  brand: "FLAIR 高端茶饮",
  discount: "8.5折",
  title: "会员专属咖啡券",
  validUntil: "2026.07.31",
  scope: "brand",
};

// ── 品牌档期解析 ──────────────────────────────────────────────────────

interface BrandSlotEntry {
  name: string;
  floor: string;
  slots: string[];
  vipSlots: string[];
  specialNote?: string;
}

function parseBrandSlots(doc: string): BrandSlotEntry[] {
  const lines = doc.split("\n");
  const entries: BrandSlotEntry[] = [];
  let currentName = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ") && !line.startsWith("## 通用规则")) {
      if (currentName) {
        entries.push(buildSlotEntry(currentName, currentContent));
      }
      currentName = line.replace(/^##\s+/, "").trim();
      currentContent = [];
      continue;
    }
    if (currentName) {
      currentContent.push(line);
    }
  }
  if (currentName) {
    entries.push(buildSlotEntry(currentName, currentContent));
  }

  return entries;
}

function buildSlotEntry(name: string, lines: string[]): BrandSlotEntry {
  const joined = lines.join("\n");
  const floor = extractField(joined, "楼层") ?? "";
  const slotsStr = extractField(joined, "每日档期") ?? "";
  const slots = slotsStr.split("/").filter(Boolean);
  const vipStr = extractField(joined, "VIP 时段") ?? "";
  const vipSlots = vipStr ? vipStr.split("/").filter(Boolean) : [];
  const specialNote = extractField(joined, "特殊说明") ?? undefined;

  return { name, floor, slots, vipSlots, specialNote };
}

function extractField(text: string, label: string): string | null {
  const re = new RegExp(`- ${label}[：:]\\s*(.+?)(?:\\n|$)`);
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

const BRAND_SLOTS = parseBrandSlots(brandSlotsDoc);

// ── 品牌匹配 ─────────────────────────────────────────────────────────

function matchBrand(text: string): BrandSlotEntry | null {
  const lower = text.toLowerCase();

  // 1. Try brandKeywords map
  for (const [brandName, triggers] of Object.entries(brandKeywords)) {
    if (triggers.some((t) => lower.includes(t))) {
      const entry = BRAND_SLOTS.find((e) => e.name === brandName);
      if (entry) return entry;
    }
  }

  // 2. Try matching against slot catalog brand names directly
  for (const entry of BRAND_SLOTS) {
    if (lower.includes(entry.name.toLowerCase())) {
      return entry;
    }
  }

  return null;
}

// ── 预约凭证号生成 ────────────────────────────────────────────────────

let slotSeq = 0;

function generateReservationId(brand: string): string {
  const prefix = BRAND_PREFIX[brand] ?? brand.substring(0, 3);
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  slotSeq++;
  return `AP-${prefix}-${dateStr}-${String(slotSeq).padStart(3, "0")}`;
}

// ── 时间解析 ──────────────────────────────────────────────────────────

/**
 * 将用户输入的时间（如 "14:00"、"下午2点"、"2点"）解析为今日的时间戳。
 * 如果解析出的时间已过，返回 null。
 */
function parseTimeFromText(text: string): number | null {
  // 格式1: "14:00" 或 "14点"
  const hmMatch = text.match(/(\d{1,2})[:：点](\d{1,2})?/);
  if (hmMatch) {
    let hour = parseInt(hmMatch[1], 10);
    const minute = parseInt(hmMatch[2] || "0", 10);
    // 处理"下午2点" -> 14
    if (text.includes("下午") || text.includes("pm")) {
      if (hour < 12) hour += 12;
    }
    if (text.includes("上午") || text.includes("am")) {
      if (hour === 12) hour = 0;
    }
    return buildTodayTimestamp(hour, minute);
  }

  // 格式2: "下午2点" (无冒号)
  const afternoonMatch = text.match(/(?:下午|pm)\s*(\d{1,2})/);
  if (afternoonMatch) {
    let hour = parseInt(afternoonMatch[1], 10);
    if (hour < 12) hour += 12;
    return buildTodayTimestamp(hour, 0);
  }

  return null;
}

function buildTodayTimestamp(hour: number, minute: number): number | null {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
  if (target.getTime() <= now.getTime()) return null; // 已过
  return target.getTime();
}

/**
 * 从时段字符串 "14:00" 构建今日时间戳。如果已过则推至明天。
 */
function timeSlotToTimestamp(slotHour: string): number {
  const [h, m] = slotHour.split(":").map(Number);
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m || 0, 0);
  if (target.getTime() <= now.getTime()) {
    // 已过，推至次日
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

/**
 * 从时段字符串 "14:00" 生成显示范围 "14:00 - 14:45"
 */
function formatTimeSlot(slotHour: string): string {
  const [h, m] = slotHour.split(":").map(Number);
  const endMin = m + 45;
  const endH = h + Math.floor(endMin / 60);
  const endM = endMin % 60;
  return `${slotHour} - ${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

// ── 子意图检测 ────────────────────────────────────────────────────────

type AppointmentSubIntent = "creation" | "slot_query" | "status_query";

function detectSubIntent(text: string, appointmentInfo: AppointmentInfo | null): AppointmentSubIntent {
  // 档期查询
  if (/有档期吗|还能约吗|有什么时段|几点的|什么时候|有没有档|还有档/.test(text)) {
    return "slot_query";
  }
  // 预约状态查询
  if (/我的预约|约的几点|预约几点|查看预约|预约状态/.test(text)) {
    return "status_query";
  }
  // 默认：创建预约
  return "creation";
}

// ── 可约时段过滤 ───────────────────────────────────────────────────────

function getAvailableSlots(entry: BrandSlotEntry, memberTier?: string): string[] {
  const now = new Date();
  const currentHour = now.getHours();

  // 过滤掉已过去的时段
  let available = entry.slots.filter((slot) => {
    const hour = parseInt(slot.split(":")[0], 10);
    return hour > currentHour;
  });

  // VIP 时段控制：非钻卡/黑卡不能约 10:00/11:00
  if (memberTier !== "diamond" && memberTier !== "black") {
    available = available.filter((slot) => !entry.vipSlots.includes(slot));
  }

  // Hermès 特殊规则：需提前1天预约，不支持当日
  if (entry.specialNote?.includes("不支持当日")) {
    available = []; // 当日无可约时段
  }

  return available;
}

// ── 处理函数 ──────────────────────────────────────────────────────────

function handleCreation(ctx: SkillContext): AgentResponse {
  const { text, userProfile, appointmentInfo } = ctx;
  const entry = matchBrand(text);
  const brandName = entry?.name ?? appointmentInfo?.brand ?? "";

  // 非会员网关
  if (!userProfile.isMember) {
    return {
      text: `${brandName || "品牌"}的品牌预约需开通 DTX 会员。会员可享优先预约权。是否需要为您办理入会？`,
      quickReplies: ["我想入会", "了解会员权益", "稍后再说"],
    };
  }

  // 未匹配到品牌
  if (!entry) {
    return {
      text: "请问您想预约哪个品牌？我可以帮您查询可预约时段并安排档期。",
      quickReplies: ["预约Chanel", "预约Hermès", "预约Louis Vuitton", "预约Dior"],
    };
  }

  // Hermès 当日不可约
  if (entry.specialNote?.includes("不支持当日")) {
    return {
      text: `${entry.name}需提前1天预约，不支持当日预约。是否需要我帮您预约明天${entry.name}的档期？`,
      quickReplies: [`预约明天${entry.name}`, "预约其他品牌", "稍后再约"],
      sideEffects: {
        appointmentInfo: {
          type: "appointment",
          brand: entry.name,
          floor: entry.floor,
          timeSlot: "",
          appointmentTime: 0,
          saName: SA_MAP[entry.name] ?? "",
          reservationId: "",
          status: "confirmed",
          flowStatus: "selecting_slot",
        },
      },
    };
  }

  // 检查用户是否指定了时间
  const specifiedTime = parseTimeFromText(text);

  if (specifiedTime) {
    // 用户指定了时间 → 直接创建预约
    return createConfirmation(entry, specifiedTime, userProfile);
  }

  // 未指定时间 → 展示可约时段
  const available = getAvailableSlots(entry, userProfile.memberTier);

  if (available.length === 0) {
    return {
      text: `${entry.name}（${entry.floor}）今日已无可预约时段。是否需要我帮您预约明天或稍后日期的档期？`,
      quickReplies: [`预约明天${entry.name}`, "预约其他品牌", "稍后再约"],
    };
  }

  const slotList = available.map((s) => `🕐 ${formatTimeSlot(s)}`).join("\n");

  return {
    text: `${entry.name}（${entry.floor}）今日可预约时段如下：\n${slotList}\n请选择您方便的时段，我即刻为您锁定。`,
    quickReplies: available.slice(0, 4),
    sideEffects: {
      appointmentInfo: {
        type: "appointment",
        brand: entry.name,
        floor: entry.floor,
        timeSlot: "",
        appointmentTime: 0,
        saName: SA_MAP[entry.name] ?? "",
        reservationId: "",
        status: "confirmed",
        flowStatus: "selecting_slot",
      },
    },
  };
}

function handleSlotSelection(ctx: SkillContext): AgentResponse {
  const { text, userProfile, appointmentInfo } = ctx;
  if (!appointmentInfo) return handleCreation(ctx);

  // 尝试从用户文本匹配时段
  const entry = BRAND_SLOTS.find((e) => e.name === appointmentInfo.brand);
  const available = entry ? getAvailableSlots(entry, userProfile.memberTier) : [];

  // 匹配用户选择的时段
  const selectedSlot = available.find((slot) => {
    const slotHour = slot.split(":")[0];
    return text.includes(slot) || text.includes(`${slotHour}点`) || text.includes(`${slotHour}:`);
  });

  if (!selectedSlot) {
    // 用户没选时段，可能换了个问法
    return handleCreation(ctx);
  }

  const timestamp = timeSlotToTimestamp(selectedSlot);
  return createConfirmation(
    { name: appointmentInfo.brand, floor: appointmentInfo.floor } as BrandSlotEntry,
    timestamp,
    userProfile,
  );
}

function handleSlotQuery(ctx: SkillContext): AgentResponse {
  const { text, userProfile } = ctx;
  const entry = matchBrand(text);
  const brandName = entry?.name ?? "";

  if (!entry) {
    return {
      text: "请问您想查询哪个品牌的可预约时段？",
      quickReplies: ["Chanel有档期吗", "LV有档期吗", "Dior有档期吗"],
    };
  }

  if (entry.specialNote?.includes("不支持当日")) {
    return {
      text: `${entry.name}需提前1天预约，不支持当日预约。明天可预约时段：${entry.slots.join(" / ")}。是否需要为您预约？`,
      quickReplies: [`预约明天${entry.name}`, "稍后再约"],
    };
  }

  const available = getAvailableSlots(entry, userProfile.memberTier);
  if (available.length === 0) {
    return {
      text: `${entry.name}（${entry.floor}）今日已无可预约时段。是否需要预约明天的档期？`,
      quickReplies: [`预约明天${entry.name}`, "预约其他品牌", "稍后再约"],
    };
  }

  const slotList = available.map((s) => `🕐 ${formatTimeSlot(s)}`).join("\n");

  return {
    text: `${entry.name}（${entry.floor}）今日可预约时段：\n${slotList}\n是否需要为您预约？`,
    quickReplies: [...available.slice(0, 2).map((s) => `预约${s}`), "稍后再约"],
  };
}

function handleStatusQuery(ctx: SkillContext): AgentResponse {
  const { appointmentInfo } = ctx;

  if (!appointmentInfo || appointmentInfo.flowStatus === "selecting_slot") {
    return {
      text: "您目前暂无已确认的品牌预约。是否需要我帮您预约一个档期？",
      quickReplies: ["预约Chanel", "预约Hermès", "预约Louis Vuitton"],
    };
  }

  const statusLabelMap: Record<string, string> = {
    confirmed: "已确认",
    cancelled: "已取消",
    completed: "已完成",
  };

  const card: AppointmentCard = {
    type: "appointment-card",
    brand: appointmentInfo.brand,
    floor: appointmentInfo.floor,
    timeSlot: appointmentInfo.timeSlot,
    saName: appointmentInfo.saName,
    reservationId: appointmentInfo.reservationId,
    status: appointmentInfo.status,
    statusLabel: statusLabelMap[appointmentInfo.status] ?? appointmentInfo.status,
  };

  return {
    text: `您的预约信息如下：\n${appointmentInfo.brand}（${appointmentInfo.floor}），${appointmentInfo.timeSlot}\n专属 SA：${appointmentInfo.saName}\n预约凭证：${appointmentInfo.reservationId}`,
    appointmentCard: card,
  };
}

// ── 创建预约确认 ──────────────────────────────────────────────────────

function createConfirmation(
  entry: { name: string; floor: string },
  appointmentTime: number,
  userProfile: UserProfile,
): AgentResponse {
  const reservationId = generateReservationId(entry.name);
  const saName = SA_MAP[entry.name] ?? "专属顾问";

  // 根据时间戳反推时段显示
  const date = new Date(appointmentTime);
  const startHour = date.getHours();
  const startMin = date.getMinutes();
  const endTime = new Date(appointmentTime + 45 * 60 * 1000);
  const endHour = endTime.getHours();
  const endMin = endTime.getMinutes();
  const timeSlot = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")} - ${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

  const appointmentInfo: AppointmentInfo = {
    type: "appointment",
    brand: entry.name,
    floor: entry.floor,
    timeSlot,
    appointmentTime,
    saName,
    reservationId,
    status: "confirmed",
  };

  const card: AppointmentCard = {
    type: "appointment-card",
    brand: entry.name,
    floor: entry.floor,
    timeSlot,
    saName,
    reservationId,
    status: "confirmed",
    statusLabel: "已确认",
  };

  // 基础文案
  let textReply = `已为您在 ${entry.name}（${entry.floor}）预约成功：\n📅 今日 ${timeSlot}\n👤 专属 SA：${saName}\n🔖 预约凭证：${reservationId}\n\n同时为您预留车位？`;

  let quickReplies = ["帮我预留车位", "联系专属SA"];
  let coupons: CouponCard[] | undefined;

  // 茶饮推荐：预约时间距现在 > 60 分钟
  const gapMinutes = (appointmentTime - Date.now()) / (60 * 1000);
  if (gapMinutes > 60) {
    textReply += `\n\n距离您的预约还有一段时间，建议您先前往4F「${TEA_COUPON.brand}」稍作休息，我已为您附上${TEA_COUPON.discount}${TEA_COUPON.title}。`;
    coupons = [{ type: "coupon-card", ...TEA_COUPON }];
    quickReplies = [...quickReplies, "查看FLAIR菜单"];
  }

  return {
    text: textReply,
    quickReplies,
    appointmentCard: card,
    coupons,
    sideEffects: { appointmentInfo },
  };
}

// ── Skill 定义 ────────────────────────────────────────────────────────

export const appointmentSkill: Skill = {
  name: "appointment",
  intentDescription:
    "用户想要预约品牌专柜档期、查询可预约时段、查询预约状态等品牌预约场景",
  match: () => true,
  handle: (ctx) => {
    const { text, userProfile, appointmentInfo } = ctx;

    // 0. 非会员网关
    if (!userProfile.isMember) {
      const entry = matchBrand(text);
      const brandName = entry?.name ?? "品牌";
      return {
        text: `${brandName}的品牌预约需开通 DTX 会员。会员可享优先预约权。是否需要为您办理入会？`,
        quickReplies: ["我想入会", "了解会员权益", "稍后再说"],
      };
    }

    // 1. 正在选档期 → 用户选择了某个时段
    if (appointmentInfo?.flowStatus === "selecting_slot") {
      return handleSlotSelection(ctx);
    }

    // 2. 子意图分支
    const subIntent = detectSubIntent(text, appointmentInfo);
    switch (subIntent) {
      case "slot_query":
        return handleSlotQuery(ctx);
      case "status_query":
        return handleStatusQuery(ctx);
      case "creation":
      default:
        return handleCreation(ctx);
    }
  },
};