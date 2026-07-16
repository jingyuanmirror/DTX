import type { Skill } from "../../agent/types";
import type { BrandCard } from "../../types";
import { chatCompletion } from "../../llm/client";
import type { ChatMessage } from "../../llm/types";
import { brandKeywords, itemKeywords } from "../../utils/preference";
import brandCatalogDoc from "../../data/brand-catalog.md?raw";

// ── Module-level chat history reference ───────────────────────────────
// Updated by the agent router before each handle() call so that
// context-aware follow-up queries (e.g. "有新品吗" after "Chanel") work.
let recentChatHistory: ChatMessage[] = [];

export function setStoreConsultHistory(history: ChatMessage[]): void {
  recentChatHistory = history;
}

// ── Brand card dedup ─────────────────────────────────────────────────
// Track which brands have already had their card shown in this conversation.
// Once a brand's card has appeared, we don't show it again for follow-up queries.
const shownBrandCards = new Set<string>();

function shouldShowBrandCard(brandName: string): boolean {
  if (shownBrandCards.has(brandName)) return false;
  shownBrandCards.add(brandName);
  return true;
}

// ── Brand catalog parser ──────────────────────────────────────────────

interface BrandEntry {
  name: string;
  floor: string;
  categories: string[];
  highlight: string;
  saBooking: string;
  memberBenefit?: string;
  rawContent: string;
}

function parseBrandCatalog(doc: string): BrandEntry[] {
  const lines = doc.split("\n");
  const entries: BrandEntry[] = [];
  let currentName = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ") && !line.startsWith("## 给礼推荐")) {
      if (currentName) {
        entries.push(buildEntry(currentName, currentContent));
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
    entries.push(buildEntry(currentName, currentContent));
  }

  return entries;
}

function buildEntry(name: string, lines: string[]): BrandEntry {
  const joined = lines.join("\n");
  const floor = extractField(joined, "楼层") ?? "";
  const categories = (extractField(joined, "品类") ?? "").split(" · ").filter(Boolean);
  const highlight = extractField(joined, "当季亮点") ?? "";
  const saBooking = extractField(joined, "SA 预约") ?? "";
  const memberBenefit = extractField(joined, "会员权益") ?? undefined;

  return { name, floor, categories, highlight, saBooking, memberBenefit, rawContent: joined };
}

function extractField(text: string, label: string): string | null {
  const re = new RegExp(`- ${label}[：:]\\s*(.+?)(?:\\n|$)`);
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

const BRAND_CATALOG = parseBrandCatalog(brandCatalogDoc);

// ── Brand matching ────────────────────────────────────────────────────

/**
 * Match user text against brand catalog entries using the shared brandKeywords map.
 * Returns matched BrandEntry or null.
 */
function matchBrand(text: string): BrandEntry | null {
  const lower = text.toLowerCase();

  // 1. Try exact keyword match from preference system
  for (const [brandName, triggers] of Object.entries(brandKeywords)) {
    if (triggers.some((t) => lower.includes(t))) {
      const entry = BRAND_CATALOG.find((e) => e.name === brandName);
      if (entry) return entry;
    }
  }

  // 2. Try matching against catalog brand names directly
  for (const entry of BRAND_CATALOG) {
    if (lower.includes(entry.name.toLowerCase())) {
      return entry;
    }
  }

  return null;
}

// ── Brand follow-up detection (short queries in brand context) ───────

const BRAND_FOLLOWUP_KEYWORDS = ["新品", "新款", "到货", "到了什么", "有什么", "有吗", "几楼", "在哪", "位置", "品类", "卖什么"];

/**
 * Check if the text is a short follow-up that should be interpreted
 * in the context of a previously discussed brand.
 * Returns the brand name from recent history, or null.
 */
function detectBrandFromContext(text: string, recentHistory: ChatMessage[]): string | null {
  // Only trigger for short follow-up queries (not long sentences)
  if (text.length > 20) return null;

  // Must contain a brand follow-up keyword
  if (!BRAND_FOLLOWUP_KEYWORDS.some((kw) => text.includes(kw))) return null;

  // Must NOT already contain a brand name
  if (matchBrand(text)) return null;

  // Search recent assistant messages for brand names
  for (let i = recentHistory.length - 1; i >= 0; i--) {
    const msg = recentHistory[i];
    if (msg.role !== "assistant") continue;

    for (const [brandName, triggers] of Object.entries(brandKeywords)) {
      if (triggers.some((t) => msg.content.toLowerCase().includes(t))) {
        return brandName;
      }
    }
    // Also check catalog brand names
    for (const entry of BRAND_CATALOG) {
      if (msg.content.toLowerCase().includes(entry.name.toLowerCase())) {
        return entry.name;
      }
    }
  }

  return null;
}

// ── Gift / recommendation detection ──────────────────────────────────

const GIFT_KEYWORDS = ["送礼", "送人", "礼物", "推荐个", "送老婆", "送太太", "送长辈", "送朋友", "商务送礼", "送伴侣", "送点", "送点什么", "520", "情人", "情人节", "纪念日", "送女友", "送男友", "送闺蜜"];
const RECOMMEND_KEYWORDS = ["推荐品牌", "推荐个品牌", "有什么品牌", "适合送", "帮我推荐", "推荐一下", "新鲜好物", "好物推荐", "有什么好物", "推荐好物", "生鲜"];

function isGiftOrRecommendQuery(text: string): boolean {
  return [...GIFT_KEYWORDS, ...RECOMMEND_KEYWORDS].some((kw) => text.includes(kw));
}

// ── SA connection detection ──────────────────────────────────────────

const SA_KEYWORDS = ["SA", "导购", "顾问", "专属顾问", "联系SA", "联系导购"];

function isSAConnectionQuery(text: string): boolean {
  return SA_KEYWORDS.some((kw) => text.includes(kw));
}

// ── Brand info builder ───────────────────────────────────────────────

function buildBrandCard(entry: BrandEntry, tag?: string): BrandCard {
  return {
    type: "brand-card",
    brand: entry.name,
    floor: entry.floor,
    categories: entry.categories,
    highlight: entry.highlight,
    tag,
  };
}

// ── LLM-powered answer for brand queries ─────────────────────────────

async function answerWithLLM(userQuestion: string, snippet: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是DTX综合商圈智能管家。你只能基于提供的'品牌知识片段'作答，严禁杜撰。\n"
        + "要求：\n"
        + "1) 语气自然、轻松热情、有温度，称呼用户为'先生'或'女士'。\n"
        + "2) 内容必须与知识片段一致，不可新增事实。\n"
        + "3) 若用户问新品/到货，列出知识片段中的当季亮点信息。\n"
        + "4) 若知识片段无法覆盖用户问题，直接回复：'抱歉，目前没有该品牌的详细信息，正在帮您联系商场人工台核实。'\n"
        + "5) 输出仅回答正文，不要额外解释。",
    },
    {
      role: "user",
      content: `用户问题：${userQuestion}\n\n品牌知识片段：\n${snippet}`,
    },
  ];

  const result = await chatCompletion(messages, [], { onToken: () => {} });
  const text = result.choices[0]?.message?.content?.trim();
  return text ?? "抱歉，目前没有该品牌的详细信息。";
}

// ── LLM-powered gift recommendation ──────────────────────────────────

async function recommendWithLLM(
  userQuestion: string,
  userProfile: { categories: string[]; brands: string[]; items: string[] },
): Promise<string> {
  const preferenceStr = [...userProfile.categories, ...userProfile.brands, ...userProfile.items].join("、") || "暂无偏好记录";

  // Extract gift section from catalog
  const giftSection = brandCatalogDoc.split("## 给礼推荐").pop()?.trim() ?? "";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是DTX综合商圈智能管家，根据用户需求推荐好物或挑选礼物。\n"
        + "要求：\n"
        + "1) 语气自然、轻松热情、有温度，称呼用户为'先生'或'女士'。\n"
        + "2) 根据用户问题判断场景：问好物/生鲜则推荐当季好物；问送礼（520、情人节、生日、纪念日、日常）则挑选礼物。基于'推荐参考'和'用户偏好'给出 3-5 个推荐，覆盖轻奢、生活方式、餐饮体验等不同预算档次。\n"
        + "3) 优先考虑用户已有偏好的品牌，但也给出日常实惠的选项。\n"
        + "4) 每个推荐格式：序号. 品牌/商品（楼层）— 内容，简要理由\n"
        + "5) 末尾加上：'如需预约或到店体验，随时告诉我。'\n"
        + "6) 输出仅回答正文。",
    },
    {
      role: "user",
      content: `用户问题：${userQuestion}\n用户偏好：${preferenceStr}\n\n推荐参考：\n${giftSection}`,
    },
  ];

  const result = await chatCompletion(messages, [], { onToken: () => {} });
  const text = result.choices[0]?.message?.content?.trim();
  return text ?? "请告诉我更多关于您需求的信息，我来为您精准推荐。";
}

// ── Intent classification for store-consult ──────────────────────────

async function isStoreConsultQuery(text: string, recentHistory?: ChatMessage[]): Promise<boolean> {
  // Fast path: if text directly mentions a brand name, it's a store-consult intent
  const directMatch = matchBrand(text);
  if (directMatch) return true;

  // Fast path: brand follow-up in context ("有新品吗" after mentioning Chanel)
  if (recentHistory && detectBrandFromContext(text, recentHistory)) return true;

  // Fast path: gift / recommendation / SA queries
  if (isGiftOrRecommendQuery(text) || isSAConnectionQuery(text)) return true;

  // Fast path: item-based query that might match a brand catalog entry
  const allItemKeywords = Object.values(itemKeywords).flat();
  const hasItemKeyword = allItemKeywords.some((kw) => text.includes(kw));
  const hasBrandPositionQuery = /在几楼|在哪个|有没有|在哪|几层|哪层|什么品牌|什么牌子/.test(text);
  if (hasItemKeyword && hasBrandPositionQuery) return true;

  // Fast path: short follow-up with new-arrival keywords
  if (/^.{0,10}?(新品|新款|到货|有什么新|有新).{0,10}?$/.test(text)) return true;

  // Fallback: LLM classification
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是一个意图分类器。判断用户问题是否属于'品牌店铺咨询'。\n"
        + "品牌店铺咨询包含：品牌信息查询、品牌位置楼层、当季新品到货、礼品推荐、品牌推荐、联系SA导购等。\n"
        + "重要：\"新品\"\"新款\"\"到货\"等词在品牌对话上下文中属于品牌店铺咨询，不是活动推荐。\n"
        + "注意：以下场景不属于品牌店铺咨询：\n"
        + "- 询问停车/停车费（属于 parking）\n"
        + "- 排队取号/排队进度（属于 queue）\n"
        + "- 询问优惠/领券（属于 coupon）\n"
        + "- 会员注册/入会/会员信息（属于 membership）\n"
        + "- 商场服务/餐厅推荐/退换货（属于 service-qa）\n"
        + "- 商场活动/展览/pop-up（属于 activity-recommend）\n"
        + "如果是品牌店铺咨询，输出 YES；否则输出 NO。只允许输出 YES 或 NO。",
    },
    {
      role: "user",
      content: text,
    },
  ];

  try {
    const result = await chatCompletion(messages, [], { onToken: () => {} });
    const decision = result.choices[0]?.message?.content?.trim().toUpperCase();
    return decision === "YES";
  } catch {
    return false;
  }
}

// ── Skill definition ─────────────────────────────────────────────────

export const storeConsultSkill: Skill = {
  name: "store-consult",
  intentDescription:
    "处理品牌/好物在线咨询（品牌信息、楼层位置、当季新品到货、生鲜好物推荐、礼品推荐、品牌推荐、联系SA导购等来店前咨询场景）",
  match: () => true,
  handle: async ({ text, userProfile }) => {
    const isConsult = await isStoreConsultQuery(text, recentChatHistory);
    if (!isConsult) return null;

    // ── Context-based brand resolution ────────────────────────────
    // If user text doesn't name a brand directly, but conversation
    // context recently did, resolve it (e.g. "有新品吗" → Chanel).
    let contextBrand: BrandEntry | null = null;
    const directBrand = matchBrand(text);
    if (!directBrand) {
      const contextBrandName = detectBrandFromContext(text, recentChatHistory);
      if (contextBrandName) {
        contextBrand = BRAND_CATALOG.find((e) => e.name === contextBrandName) ?? null;
      }
    }

    // ── Gift / recommendation query ─────────────────────────────────
    if (isGiftOrRecommendQuery(text) && !matchBrand(text)) {
      const recommendation = await recommendWithLLM(text, userProfile);

      // Build brand cards for mentioned brands in user preferences
      const preferenceBrands = userProfile.brands
        .map((b) => BRAND_CATALOG.find((e) => e.name === b))
        .filter(Boolean) as BrandEntry[];

      const brandCards = preferenceBrands.length > 0
        ? preferenceBrands.filter((e) => shouldShowBrandCard(e.name)).slice(0, 3).map((e) => buildBrandCard(e))
        : undefined;
      const hasAnyCards = brandCards && brandCards.length > 0;

      return {
        text: recommendation,
        quickReplies: ["帮我预约档期", "帮我预留车位", "联系专属SA"],
        brandCards: hasAnyCards ? brandCards : undefined,
      };
    }

    // ── Brand-specific query ────────────────────────────────────────
    const matchedBrand = matchBrand(text) ?? contextBrand;
    if (matchedBrand) {
      const snippet = `品牌：${matchedBrand.name}\n楼层：${matchedBrand.floor}\n品类：${matchedBrand.categories.join(" · ")}\n当季亮点：${matchedBrand.highlight}\nSA 预约：${matchedBrand.saBooking}${matchedBrand.memberBenefit ? `\n会员权益：${matchedBrand.memberBenefit}` : ""}`;

      // If brand came from context (not from text), prepend it to user question for LLM clarity
      const fullQuestion = contextBrand && !directBrand
        ? `${matchedBrand.name}：${text}`
        : text;
      const answer = await answerWithLLM(fullQuestion, snippet);

      const tag = /新品|新款|到货|到了什么/.test(text) ? "本季新品" : undefined;
      const showCard = shouldShowBrandCard(matchedBrand.name);

      return {
        text: answer,
        quickReplies: [`帮我预约${matchedBrand.name}`, "查看本季新品", "联系专属SA"],
        brandCards: showCard ? [buildBrandCard(matchedBrand, tag)] : undefined,
      };
    }

    // ── Item-based query (e.g. "哪里能买到丝巾") ───────────────────
    const allItemKeywords = Object.entries(itemKeywords);
    const matchedItems = allItemKeywords
      .filter(([, keywords]) => keywords.some((kw) => text.includes(kw)))
      .map(([item]) => item);

    if (matchedItems.length > 0) {
      // Find brands that carry this item category
      const relevantBrands = BRAND_CATALOG.filter((e) =>
        e.categories.some((c) =>
          matchedItems.some((item) => c.includes(item) || item.includes(c)),
        ),
      ).slice(0, 3);

      if (relevantBrands.length > 0) {
        const brandList = relevantBrands
          .map((b) => `${b.name}（${b.floor}）— ${b.highlight || b.categories.join("·")}`)
          .map((line, i) => `${i + 1}. ${line}`)
          .join("\n");

        const brandCards = relevantBrands
          .filter((e) => shouldShowBrandCard(e.name))
          .map((e) => buildBrandCard(e));

        return {
          text: `关于${matchedItems.join("、")}，为您推荐以下品牌：\n\n${brandList}\n\n如需我为您安排试看或预约 SA，随时告诉我。`,
          quickReplies: [`帮我预约${relevantBrands[0].name}`, "帮我预留车位", "联系专属SA"],
          brandCards: brandCards.length > 0 ? brandCards : undefined,
        };
      }
    }

    // ── SA connection query ─────────────────────────────────────────
    if (isSAConnectionQuery(text)) {
      const brand = matchBrand(text);
      const brandName = brand?.name ?? "";
      const floorInfo = brand ? `（${brand.floor}）` : "";

      return {
        text: `${brandName ? `${brandName}${floorInfo}的` : "品牌"}专属 SA 可以通过预约档期为您安排。${
          brand?.saBooking ? `\n\n预约说明：${brand.saBooking}` : ""
        }\n\n是否需要我帮您${brandName ? `在${brandName}` : ""}预约一个档期？`,
        quickReplies: brandName
          ? [`帮我预约${brandName}`, "帮我预留车位", "今日专属优惠"]
          : ["帮我预约Chanel", "帮我预约Hermès", "今日专属优惠"],
        brandCards: brand && shouldShowBrandCard(brand.name) ? [buildBrandCard(brand)] : undefined,
      };
    }

    // ── Generic brand query fallback (LLM handles) ──────────────────
    return {
      text: "请问您想了解哪个品牌或好物的信息？我可以帮您查询位置、当季新品、预约安排或新鲜好物推荐。",
      quickReplies: ["今天吃什么", "新鲜好物", "520送点什么"],
    };
  },
};
