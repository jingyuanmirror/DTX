import type { Skill } from "../../agent/types";
import type { BrandCard, PlanCard, RestaurantCard, UserProfile } from "../../types";
import { RESTAURANTS, CUISINE_CATEGORIES, type Restaurant } from "../../data/restaurants";
import { STORES, STORE_CATEGORY_LIST, STORE_KEYWORDS, CASUAL_KEYS, type RecommendableStore, type StoreCategory } from "../../data/stores";
import { ACTIVITIES, type Activity } from "../../data/activities";
import { chatCompletion } from "../../llm/client";
import type { ChatMessage } from "../../llm/types";
import { getUserSalutation } from "../../utils/salutation";
import { brandKeywords } from "../../utils/preference";

/**
 * 店铺推荐 skill —— 统一"逛吃购"推荐入口
 *
 * 一个 skill 内做意图分流(纯文本兜底,不依赖 toolArgs,因为确定性路由路径不填 toolArgs):
 *   - 餐饮意图(今天吃什么/想吃XX/午餐晚餐/餐厅/咖啡奶茶火锅) → 餐饮分支,输出 RestaurantCard
 *   - 零售意图(想逛逛/想买包/生鲜/带娃去哪逛/家居好物)        → 零售分支,输出 BrandCard
 *   - 模糊意图(周末带娃逛吃)                                   → 混排,同时输出 RestaurantCard + BrandCard
 *
 * 餐饮分支完整搬自原 restaurant-recommend(亲子对比/口味引导/今日精选/按菜系筛选);
 * 零售分支镜像实现(引导/今日逛逛/按品类筛选/SA 引导);
 * 卡片混排由前端 Bubble 天然支持(brandCards + restaurantCards 上下堆叠)。
 */

// ── 餐饮分支:口味识别(搬自 restaurant-recommend) ───────────────────

const CUISINE_KEYWORDS: { cuisine: string; keys: string[] }[] = [
  { cuisine: "中餐", keys: ["中餐", "中国菜", "台州", "宁波", "烤鸭", "新荣记", "大董", "甬府"] },
  { cuisine: "粤菜", keys: ["粤菜", "广东菜", "港式", "茶市", "乳猪", "翠园", "广式"] },
  { cuisine: "火锅", keys: ["火锅", "涮", "海底捞", "锅底", "麻辣"] },
  { cuisine: "西餐", keys: ["西餐", "法餐", "西式", "牛排", "法式", "Robuchon", "法国菜"] },
  { cuisine: "日料", keys: ["日料", "日式", "寿司", "拉面", "刺身", "日本菜"] },
  { cuisine: "小吃快餐", keys: ["小吃", "快餐", "便当", "轻食", "面", "小笼", "鼎泰丰", "美食广场", "沙拉", "三明治"] },
  { cuisine: "茶饮咖啡", keys: ["茶", "咖啡", "奶茶", "拿铁", "喜茶", "arabica"] },
  { cuisine: "随便", keys: ["随便", "都行", "都可以", "你定", "看着办", "你推荐", "不知道吃什么", "没啥想法"] },
];

const FAMILY_INTENT_PATTERN = /亲子|带(?:小孩|孩子|宝宝|娃)|儿童友好|一家人|家庭聚餐/;

const FAMILY_RECOMMENDATIONS: Record<string, {
  score: number;
  reason: string;
  offer: string;
  waitLabel: string;
  waitLevel: "short" | "medium" | "long";
}> = {
  海底捞: {
    score: 5,
    reason: "有儿童游乐区，服务人员对带娃家庭更友好，番茄锅等口味也容易照顾孩子",
    offer: "50元餐饮券可用",
    waitLabel: "晚市约40-60分钟",
    waitLevel: "long",
  },
  翠园: {
    score: 4.5,
    reason: "提供儿童座椅，环境相对安静，广式点心选择多，适合全家分享",
    offer: "8.8折粤菜家庭餐券",
    waitLabel: "周末茶市约20-40分钟",
    waitLevel: "medium",
  },
  鼎泰丰: {
    score: 4,
    reason: "小笼包和蒸点接受度高，出餐稳定，非高峰时段带孩子用餐更轻松",
    offer: "满150减15小笼包礼券",
    waitLabel: "非高峰约10-20分钟，高峰约30-45分钟",
    waitLevel: "medium",
  },
};

/** 餐饮意图识别 —— 含"今天吃什么/午餐晚餐/想吃XX/吃饭/用餐/聚餐"等高频餐饮问句 */
const DINING_INTENT_PATTERN =
  /今天吃(什么|啥)|吃(什么|啥)(好|呢)?|午餐(吃|推荐)?|晚餐(吃|推荐)?|有什么好吃|有啥好吃|想吃|美食|餐厅|好吃的|饿了|饿了啥|(吃|用)餐|聚餐|(吃顿|吃个)?饭|吃饭|订餐|点餐|吃饭前后|饭后|饭前|吃完饭/;
const RESTAURANT_DIRECT_PATTERN = /海底捞|翠园|鼎泰丰|新荣记|大董|甬府|Robuchon|喜茶|Arabica|美食广场|咖啡|奶茶|火锅|烧[烤鹅鸭]/;

function isDiningIntent(text: string): boolean {
  if (DINING_INTENT_PATTERN.test(text)) return true;
  if (RESTAURANT_DIRECT_PATTERN.test(text)) return true;
  // 菜系关键词命中也算餐饮(且能进一步判定具体菜系)
  const lower = text.toLowerCase();
  for (const { keys } of CUISINE_KEYWORDS) {
    if (keys.some((k) => lower.includes(k.toLowerCase()))) return true;
  }
  return false;
}

/** 零售意图识别 —— 命中店铺/品类关键词或"想逛逛/想买XX/带娃去哪逛"等。
 *  含"还能安排/还能逛/逛吃/吃喝玩乐"等逛吃安排信号,使"吃饭前后还能安排什么"等
 *  综合问句同时触发餐饮+零售,进入混排分支给出逛吃组合解答。 */
const RETAIL_INTENT_PATTERN =
  /想逛|逛逛|逛一逛|想买|买点|去买|推荐个店|推荐几家店|带娃去哪|周末去哪逛|逛什么|买什么好(物|店)?|还能(安排|逛|玩|做什么|做点什么)|安排什么|逛吃|吃喝玩乐|逛逛吃吃/;
function isRetailIntent(text: string): boolean {
  if (RETAIL_INTENT_PATTERN.test(text)) return true;
  const lower = text.toLowerCase();
  for (const { keys } of STORE_KEYWORDS) {
    if (keys.some((k) => lower.includes(k.toLowerCase()))) return true;
  }
  return false;
}

// ── 意图分流 ──────────────────────────────────────────────

type RecommendIntent = "dining" | "retail" | "mixed";

/**
 * 行程规划意图:用户想要一个"逛吃购一条龙"的整体安排,不是单点餐饮或单点零售推荐。
 * 涵盖"吃饭前后还能安排什么""今天都能怎么规划""帮我规划下路线""逛一圈怎么安排"
 * 等。这类问句的答案顺序应由用户问题的实际诉求 + 商场动线决定,不能写死成"先吃后逛"。
 */
const PLANNING_PATTERN =
  /怎么规划|怎么安排|规划(一下|下)?|安排(一下|下)?|路线|逛一圈|逛一圈怎么|一日游|怎么逛|怎么玩|都能(怎么|干嘛|干啥)|都能安排什么|还能(安排|怎么|干嘛|干啥|做什么|玩什么)|吃饭前后|饭后还能|饭前还能|吃完(再|还能|之后)/;

function isPlanningIntent(text: string): boolean {
  return PLANNING_PATTERN.test(text);
}

/**
 * 短的无主语追问(如"换个口味""再推荐一个""另一家呢")。带这类追问但既不挑明
 * 新口味又不挑明新品类时,沿用上一轮的餐饮/零售口径,而非误判成"今日逛逛"。
 * (与路由层 isFollowUp 同源,这里独立一份给 skill 内部用,避免反向依赖 agent 模块。)
 */
const LOCAL_FOLLOWUP_PATTERN =
  /换个(口味|品类|方向|店|家|餐厅|品牌)|再(推荐|来|换|给)(一家|一个|几个|别的|点)?|再来一家|另一(个|家)|第[二三四五]家|这家(店|餐厅|怎么样|如何)|对比一下|继续(推荐|逛|吃)?|便宜(点|些|的)|贵(点|些|的)|有(没有|没有更)(便宜|贵|好)的|还有(别的|其他|什么)/;

function isLocalFollowUp(text: string): boolean {
  return text.length <= 16 && LOCAL_FOLLOWUP_PATTERN.test(text);
}

/**
 * 强他域信号:停车/预约/入会/排队/取号/领券/红包/退换货等。这些场景有更具体的
 * 归属(parking/appointment/membership/queue/coupon/service-qa),即便句子里混进
 * "还能安排/吃饭"等逛吃词,也不该被本 skill 的逛吃判定截走,交还路由层处理。
 */
const OTHER_DOMAIN_PATTERN =
  /停车|车位|停在哪|车在|入会|办会员|排队|排号|取号|领券|红包|退换货|营业时间|失物招领|帮我约|预约档期|联系SA|专属顾问|券|积分/;

/** 上一轮服务的口径:dining / retail。追问时沿用,避免重算成"今日逛喝"。 */
let lastServingKind: "dining" | "retail" | null = null;

/**
 * 供路由层确定性命中使用:是否属于店铺推荐(餐饮或零售推荐)意图。
 * 纯文本判断,与 skill 内部分流保持一致,避免两处规则漂移。
 * 含"还能安排/还能逛"等逛吃安排信号,使"吃饭前后还能安排什么"等综合问句命中。
 * 含强他域信号(停车/会员/排队/券等)时排除,交还路由层其它分支处理。
 */
/**
 * 活动问句识别:"今天有什么活动""有什么展览""近期活动"等。并入本 skill 后,
 * 活动也作为综合推荐的一部分,与店铺一起呈现(由问题决定重点)。
 */
const ACTIVITY_QUERY_PATTERN =
  /活动|展览|展|pop.?up|鉴赏会|市集|工坊|首映|首发|联名|近期有什么|今天有什么|有什么活动|有什么展/;

function isActivityQuery(text: string): boolean {
  return ACTIVITY_QUERY_PATTERN.test(text);
}

export function isStoreRecommendIntent(text: string): boolean {
  if (OTHER_DOMAIN_PATTERN.test(text)) return false;
  const hasDining = isDiningIntent(text);
  const hasRetail = isRetailIntent(text);
  const hasPlanning = isPlanningIntent(text);
  const hasActivity = isActivityQuery(text);
  // 至少命中其一即属于推荐意图;行规划、活动都归本 skill 综合推荐
  return hasDining || hasRetail || hasPlanning || hasActivity;
}

function classifyRecommendIntent(text: string): RecommendIntent {
  const hasDining = isDiningIntent(text);
  const hasRetail = isRetailIntent(text);
  const hasActivity = isActivityQuery(text);
  // 行程规划类(怎么规划/路线/吃饭前后安排)本质是要"逛吃购一条龙",无论字面是否
  // 同时命中餐饮+零售,都按 mixed 走规划分支,交由 LLM 按用户诉求 + 动线组织。
  if (isPlanningIntent(text)) return "mixed";
  // 活动问句也走规划分支:规划 prompt 同时掌握店铺与活动候选,能按"问活动"的诉求
  // 把重点放在活动、店铺作为顺路补充,综合呈现。
  if (hasActivity && !hasDining && !hasRetail) return "mixed";
  if (hasDining && hasRetail) return "mixed";
  if (hasDining) return "dining";
  return "retail";
}

// ── 餐饮分支辅助(搬自 restaurant-recommend) ─────────────────────

function detectCuisine(text: string, toolCuisine?: string): string | null {
  if (toolCuisine && toolCuisine.trim()) {
    const hit = CUISINE_CATEGORIES.find((c) => toolCuisine.includes(c));
    if (hit) return hit;
  }
  const lower = text.toLowerCase();
  for (const { cuisine, keys } of CUISINE_KEYWORDS) {
    if (keys.some((k) => lower.includes(k.toLowerCase()))) return cuisine;
  }
  return null;
}

function filterByCuisine(cuisine: string): Restaurant[] {
  if (cuisine === "日料") {
    // 商场暂无纯日料店,日式元素落在美食广场,给出最接近的选择
    return RESTAURANTS.filter((r) => r.cuisine === "小吃快餐");
  }
  return RESTAURANTS.filter((r) => r.cuisine === cuisine);
}

/** 今日精选:不同菜系/价位各挑一家,凑成 3 家有差异的推荐 */
function pickTodayPicks(): Restaurant[] {
  const order = ["火锅", "粤菜", "小吃快餐", "中餐", "茶饮咖啡"];
  const picks: Restaurant[] = [];
  const usedCuisine = new Set<string>();
  for (const c of order) {
    const r = RESTAURANTS.find((x) => x.cuisine === c && !usedCuisine.has(x.cuisine));
    if (r) {
      picks.push(r);
      usedCuisine.add(r.cuisine);
    }
    if (picks.length >= 3) break;
  }
  return picks.slice(0, 3);
}

function buildDiningDigest(restaurants: Restaurant[]): string {
  return restaurants
    .map((r, i) => {
      const dishes = r.recommendation.slice(0, 3).join("、");
      const tip = r.tip ? `\n   小贴士：${r.tip}` : "";
      return `${i + 1}. ${r.name}（${r.floor}）\n   菜系：${r.cuisineType}\n   人均：${r.priceRange}\n   招牌：${dishes}\n   亮点：${r.highlight}${tip}`;
    })
    .join("\n\n");
}

function buildRestaurantCards(restaurants: Restaurant[]): RestaurantCard[] {
  return restaurants.map((r) => ({
    type: "restaurant-card",
    name: r.name,
    floor: r.floor,
    cuisineType: r.cuisineType,
    priceRange: r.priceRange,
    highlight: r.highlight,
    recommendation: r.recommendation,
    tags: r.tags,
    tip: r.tip,
    image: r.image,
  }));
}

function buildFamilyRestaurantCards(restaurants: Restaurant[]): RestaurantCard[] {
  return buildRestaurantCards(restaurants).map((card) => {
    const analysis = FAMILY_RECOMMENDATIONS[card.name];
    return analysis
      ? {
          ...card,
          familyFit: { score: analysis.score, reason: analysis.reason },
          offer: analysis.offer,
          waitTime: { label: analysis.waitLabel, level: analysis.waitLevel },
        }
      : card;
  });
}

// ── 活动候选:按用户画像偏好匹配 + 综合推荐时提供给各分支 ───────────

/**
 * 按用户画像对活动打分排序(brands +3 / categories +2 / items +1),供个性化提及。
 * 无画像时返回空数组——各分支会用全量活动作为"顺路提醒"候选(见 getActivityDigestForBranch)。
 * 来自原 activity-recommend skill 的 rankActivities,现在并入本统一推荐 skill。
 */
function rankActivities(profile: UserProfile): Array<Activity & { score: number }> {
  return ACTIVITIES.map((act) => {
    let score = 0;
    for (const brand of profile.brands) if (act.brands.includes(brand)) score += 3;
    for (const cat of profile.categories) if (act.categories.includes(cat)) score += 2;
    for (const item of profile.items) if (act.items.includes(item)) score += 1;
    return { ...act, score };
  })
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * 给单个推荐分支用的活动摘要:有画像时优先返回高匹配活动(前 6 条),无画像时返回
 * 全量活动(控制为前 6 条),让模型作为"顺路提醒"候选。空字符串表示无可用活动。
 */
function getActivityDigestForBranch(profile: UserProfile): string {
  const ranked = rankActivities(profile);
  const pool = ranked.length > 0 ? ranked : ACTIVITIES;
  return pool
    .slice(0, 6)
    .map((a) => `· ${a.title} | ${a.floor} | ${a.dateRange} | ${a.summary}`)
    .join("\n");
}

async function rewriteDining(
  userText: string,
  cuisine: string,
  restaurants: Restaurant[],
  salutation: string,
  activityDigest: string,
): Promise<string> {
  const digest = buildDiningDigest(restaurants);
  const promptLead = cuisine === "随便"
    ? "用户没有指定口味,你按今日精选挑了下面这几家,话术点出有几家、各自适合什么场景即可。"
    : `用户想吃「${cuisine}」,你从中筛选出下面的几家,话术点出有几家、各自适合什么场景即可。`;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是DTX综合商圈的智能管家,负责餐饮推荐。\n"
        + "要求：\n"
        + `1) 需要称呼时只能使用「${salutation}」且最多一次,不得猜测或改用先生/女士。你是一位熟悉商场的真人导购,说话自然、利落,像当面给顾客建议。\n`
        + "2) 严格基于提供的餐厅数据,不杜撰店名、菜品、楼层、价格。\n"
        + "3) 回复先直接给推荐判断,再用一句话说明挑选逻辑,让用户知道为什么推荐这些店。\n"
        + "4) 可以点出每家最有决策价值的一项理由(如亲子设施、环境、口味或等位),但不要复述卡片中的全部招牌菜和价格。\n"
        + "5) 结尾给一句共同的到店建议(如预约/排队/取餐时机),并问是否需要预约或帮排队。\n"
        + "6) 如果下方\"当下活动\"里有与吃饭场景相关的(如美食市集、餐饮联动、积分日),可在结尾顺带一句提醒用户顺路参加;与餐饮无关的活动不必提。\n"
        + "7) 回复简洁有温度,控制在两三句,不输出列表序号、不逐家点评。",
    },
    {
      role: "user",
      content: `用户问题：${userText}\n${promptLead}\n\n候选餐厅：\n${digest}${activityDigest ? `\n\n当下活动（与餐饮相关可顺带提醒，无关不必提）：\n${activityDigest}` : ""}`,
    },
  ];

  try {
    const result = await chatCompletion(messages, [], { onToken: () => {} });
    return result.choices[0]?.message?.content?.trim() || "抱歉,餐厅推荐服务暂时不可用。";
  } catch {
    return "抱歉,餐厅推荐服务暂时不可用,请稍后再试。";
  }
}

// ── 零售分支辅助 ────────────────────────────────────────────

/**
 * 混排场景("吃饭前后还能安排什么")的餐厅 + 零售组合:
 * 餐厅取今日精选(跨菜系/价位 3 家),零售取跨品类今日逛逛(3 家)。
 * 两者都来自另一边已有的精选函数,保证话术里的数量与下方卡片严格一致。
 */
function pickDiningAndRetailPicks(): { dining: Restaurant[]; retail: RecommendableStore[] } {
  return { dining: pickTodayPicks(), retail: pickStoreTodayPicks() };
}

/**
 * 行程规划连贯话术 —— 画像与已锁定行程驱动,问题感知,不写死顺序、不套固定亲子模板。
 * 候选池由 buildPlanningCandidates 按用户画像筛选(而非全场),已锁定行程作为动线锚点,
 * 在其前后顺路补位推荐"其他"。模型依据用户问题的实际诉求与楼层动线自主组织顺序。
 */
async function rewritePlanning(
  userText: string,
  userProfile: UserProfile,
  itinerary: ItineraryItem[],
  parkingInfo: import("../../agent/types").SkillContext["parkingInfo"],
  salutation: string,
): Promise<{ text: string; planCard?: PlanCard }> {
  const candidates = buildPlanningCandidates(userProfile, itinerary);
  const diningDigest = candidates.restaurants.length > 0 ? buildDiningDigest(candidates.restaurants) : "暂无";
  const retailDigest = candidates.stores.length > 0 ? buildStoreDigest(candidates.stores) : "暂无";
  const activityDigest = buildActivityDigestForPlanning(candidates.activities);

  const profileHint = profileHints(userProfile);
  const itineraryDigest = itinerary.length > 0
    ? itinerary.map((item) => `· ${item.label}`).join("\n")
    : "无";
  const parkingHint = parkingInfo ? `\n车辆停放:${parkingInfo.floor}层 ${parkingInfo.location}。` : "";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是DTX综合商圈的智能管家,负责根据用户的具体问题、会员画像与已锁定行程,帮其规划一趟逛吃购行程。\n"
        + "要求：\n"
        + `1) 需要称呼时只能使用「${salutation}」且最多一次,不得猜或改用先生/女士。你是一位熟悉商场动线的真人导购,说话自然、利落、有判断,像在现场带顾客逛。\n`
        + "2) 严格基于提供的候选餐厅、店铺、活动数据,不杜撰店名、楼层、价格、品类。推荐只能来自下方候选集,不得超出候选自行编造。\n"
        + "3) 绝不要向用户转述“用户画像”“会员档案”“偏好记录”“系统数据”等内部信息来源——画像只用于你默默选店,回复中不出现这些字眼,也不说“根据您的档案”“系统显示”之类。给用户的话要像熟人随口安排,不像念数据。\n"
        + "4) text 只写一到两句自然开场,直接回应需求并交代推荐思路。避免“在DTX这么半天”“既能…又能…”“我帮你规划一条…”等模板化或书面表达;不要重复卡片标题。\n"
        + "5) 先理解用户问题的实际诉求,答复顺序、选店、衔接都要紧贴诉求,不要套固定模板。尤其注意：\n"
        + "   - 问\"吃饭前后还能安排什么\"，真实期待是\"一餐正餐 + 饭前/饭后搭配一些非餐饮的逛购活动\",不要安排成连着吃好几顿。\n"
        + "   - 问\"今天都能怎么规划\"，期待是一整天多条线的逛吃购组合,餐饮与零售都要有。\n"
        + "   - 问\"路线怎么走\"，期待是一条动线顺畅的先后顺序,以楼层顺路为主。\n"
        + "   - 问\"有什么活动/有什么展览\"，期待以活动为重点(说明是什么活动、在哪、什么时间),再顺带提几家与活动同楼层或品类相关的店。\n"
        + "6) 遵循用户画像偏好:若提供了画像偏好,优先选与画像匹配的候选。除非用户明确提到带娃/孩子/亲子,否则不要安排乐高体验店、MELAND亲子乐园、亲子烘焙等亲子活动——亲子不是默认主题。\n"
        + "7) 尊重已锁定行程:若提供了\"已锁定行程\",它们是用户必去环节,必须纳入行程卡(按其楼层和时间安排在合适位置),并在其前后顺路补位推荐\"其他\"候选。整张卡里每个店/活动只出现一次(已锁定项算一次,不要当成新推荐再推一遍)。用户口述\"打算去\"的也算必去。\n"
        + "8) 重要:轻食区/咖啡/茶饮这类偏餐饮的店铺仍算\"吃\"。问吃饭前后的,餐饮最多 1 餐正餐 + 1 杯饮品,其余应是真正\"逛/买\"的零售店;问整天规划的,餐饮与零售各占合理比例。避免\"一路全在吃\"。\n"
        + "9) 结合商场楼层动线组织顺序,减少楼层折返,体验节奏优先于机械地按楼层升降;不要为顺楼层强行加入与需求或画像无关的店铺。\n"
        + "10) 当下进行中的活动已列在\"当下活动\"里:问活动时把相关活动作为重点;问店铺/规划时,若动线顺路路过相关活动可顺带提醒。与问题无关或时间冲突的活动不要提。\n"
        + "11) 每个 items 条目都必须包含精确店名 name、中文类型 type 和具体推荐理由 note。同一店铺或活动整张卡只能出现一次。name 只能写候选数据中的店名/活动名,不能写“先到”“再到”“饭后逛”等动作(动作放 segment.title)。note 要回答\"为什么推荐它\",须基于候选里的设施、环境、特色、适合人群或时效信息,不能只写“顺路”“值得去”“可以逛逛”。\n"
        + "12) 用户问题包含饭前、饭后、吃饭或用餐时,segments 必须且只能安排 1 个正餐段:iconKey 必须为 dining,items 必须选自候选餐厅,不能用书店、咖啡或零售店代替正餐。\n"
        + "13) 只输出合法 JSON,不要 Markdown 代码块或额外文字。结构必须为："
        + '{"text":"一句简短开场","planCard":{"type":"plan-card","eyebrow":"DTX · 行程推荐","title":"行程标题","segments":[{"iconKey":"play|dining|reading|retail|activity|coffee|walk","title":"饭前/正餐/饭后/顺路活动等","floor":"4F","items":[{"name":"店铺或活动名","type":"简短类型","note":"一句建议"}]}],"hint":"错峰或动线提醒"}}。'
        + "segments 按实际行走顺序排列,每段 1-2 个地点;text 不重复卡片内容;卡片 title 用自然中文,可用“·”分隔但不能用“+”拼接;segment title、type、note 必须用自然中文,type 不得输出 play、reading、retail 等英文键名。hint 用一句口语化实用提醒,不要堆叠多个分号。",
    },
    {
      role: "user",
      content:
        `用户问题：${userText}\n请紧扣问题、结合楼层动线生成结构化行程。\n\n`
        + `用户画像：${profileHint || "暂无明确偏好"}\n\n`
        + `已锁定行程（用户必去,务必纳入行程卡并据此顺路安排其他候选）：\n${itineraryDigest}${parkingHint}\n\n`
        + `候选餐厅（正餐段只可从中选）：\n${diningDigest}\n\n`
        + `候选店铺（零售/体验段只可从中选）：\n${retailDigest}\n\n`
        + `当下进行中的活动（顺路可提醒,时间冲突或无关的不必提）：\n${activityDigest}`,
    },
  ];
  try {
    const result = await chatCompletion(messages, [], { onToken: () => {} });
    const content = result.choices[0]?.message?.content?.trim();
    if (!content) return { text: "抱歉，行程建议暂时不可用。" };

    const jsonText = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(jsonText) as { text?: unknown; planCard?: unknown };
    const planCard = parsed.planCard as PlanCard | undefined;
    const hasCompleteItems = planCard?.segments?.every(
      (segment) =>
        typeof segment.title === "string"
        && Array.isArray(segment.items)
        && segment.items.length > 0
        && segment.items.every(
          (item) =>
            typeof item.name === "string" && item.name.trim().length > 0
            && typeof item.type === "string" && item.type.trim().length > 0
            && typeof item.note === "string" && item.note.trim().length > 0,
        ),
    );
    const itemNames = planCard?.segments?.flatMap((segment) => segment.items.map((item) => item.name.trim())) ?? [];
    const hasUniqueItems = new Set(itemNames).size === itemNames.length;
    const needsDiningSegment = /饭前|饭后|吃饭|用餐/.test(userText);
    const hasDiningSegment = planCard?.segments?.some((segment) => segment.iconKey === "dining");
    if (
      typeof parsed.text !== "string"
      || parsed.text.trim().length === 0
      || !planCard
      || planCard.type !== "plan-card"
      || !Array.isArray(planCard.segments)
      || planCard.segments.length === 0
      || !hasCompleteItems
      || !hasUniqueItems
      || (needsDiningSegment && !hasDiningSegment)
    ) {
      throw new Error("Invalid planning response shape");
    }
    return { text: parsed.text, planCard };
  } catch {
    return { text: "抱歉，行程建议暂时不可用，请稍后再试。" };
  }
}

/**
 * 给行程规划用的活动摘要:精简到「标题 · 楼层 · 时间 · 一句话」,控制长度,
 * 只供 LLM 在规划时参考顺路提醒。这里不做严格时序过滤(dateRange 是自由文本如
 * "每周日/每月"),交给模型按用户到访时段自行判断相关性。
 */
function buildActivityDigestForPlanning(activities: Activity[]): string {
  if (activities.length === 0) return "暂无活动";
  return activities
    .map((a) => `· ${a.title} | ${a.floor} | ${a.dateRange} | ${a.summary}`)
    .join("\n");
}

function detectRetailCategory(text: string, toolCategory?: string): StoreCategory | null {
  if (toolCategory && toolCategory.trim()) {
    const hit = STORE_CATEGORY_LIST.find((c) => toolCategory.includes(c));
    if (hit) return hit;
  }
  const lower = text.toLowerCase();
  for (const { category, keys } of STORE_KEYWORDS) {
    if (keys.some((k) => lower.includes(k.toLowerCase()))) return category;
  }
  return null;
}

function filterStoresByCategory(category: StoreCategory): RecommendableStore[] {
  return STORES.filter((s) => s.category === category);
}

/** 今日逛逛精选:跨品类各挑一家,凑成 3 家差异化推荐 */
function pickStoreTodayPicks(): RecommendableStore[] {
  // 跨品类各挑一家,凑 3 家差异化推荐;覆盖面随数据扩充而更全。
  const order: StoreCategory[] = ["生鲜超市", "亲子娱乐", "家居生活", "数码电器", "运动服饰", "影院娱乐"];
  const picks: RecommendableStore[] = [];
  const usedCategory = new Set<StoreCategory>();
  for (const c of order) {
    const s = STORES.find((x) => x.category === c && !usedCategory.has(x.category));
    if (s) {
      picks.push(s);
      usedCategory.add(s.category);
    }
    if (picks.length >= 3) break;
  }
  return picks.slice(0, 3);
}

function buildStoreDigest(stores: RecommendableStore[]): string {
  return stores
    .map((s, i) => {
      const items = s.recommendItems.slice(0, 3).join("、");
      const tip = s.tip ? `\n   小贴士：${s.tip}` : "";
      const sa = s.saBooking ? "\n   可预约SA导购" : "";
      return `${i + 1}. ${s.name}（${s.floor}）\n   品类：${s.categoryLabel}\n   ${s.priceRange}\n   推荐好物：${items}\n   亮点：${s.highlight}${sa}${tip}`;
    })
    .join("\n\n");
}

/** 把零售店铺映射成 BrandCard(独立一份,避免跨 store-consult 模块耦合) */
function buildBrandCards(stores: RecommendableStore[]): BrandCard[] {
  return stores.map((s) => ({
    type: "brand-card",
    brand: s.name,
    floor: s.floor,
    categories: [s.categoryLabel],
    highlight: s.highlight,
  }));
}

async function rewriteRetail(
  userText: string,
  category: string | null,
  stores: RecommendableStore[],
  salutation: string,
  activityDigest: string,
): Promise<string> {
  const digest = buildStoreDigest(stores);
  const promptLead = category === null
    ? "用户没指定方向,你按今日逛逛精选挑了下面几家不同品类的店,话术点出有几家、各自适合什么场景即可。"
    : `用户想逛「${category}」,你从中筛选出下面的几家,话术点出有几家、各自适合什么场景即可。`;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是DTX综合商圈的智能管家,负责店铺/好物推荐。\n"
        + "要求：\n"
        + `1) 需要称呼时只能使用「${salutation}」且最多一次,不得猜测或改用先生/女士。你是一位熟悉商场的真人导购,表达自然、有判断。\n`
        + "2) 严格基于提供的店铺数据,不杜撰店名、品类、楼层、价格。\n"
        + "3) 回复先给出明确推荐判断,再用一句话说明挑选逻辑。\n"
        + "4) 可以点出每家最有决策价值的一项理由(如体验、适合人群或特色),但不要复述卡片中的全部好物和价格。\n"
        + "5) 若候选里有可SA预约的奢品店,结尾顺带问是否需要帮预约档期;否则问是否需要预约到店或导航。\n"
        + "6) 如果下方\"当下活动\"里有与用户想逛品类相关的(如同品类的 pop-up/首发/积分日),可在结尾顺带提醒用户顺路参加;与问题品类无关的不必提。\n"
        + "7) 回复简洁有温度,控制在两三句,不输出列表序号、不逐家点评。",
    },
    {
      role: "user",
      content: `用户问题：${userText}\n${promptLead}\n\n候选店铺：\n${digest}${activityDigest ? `\n\n当下活动（与所选品类相关可顺带提醒，无关不必提）：\n${activityDigest}` : ""}`,
    },
  ];

  try {
    const result = await chatCompletion(messages, [], { onToken: () => {} });
    return result.choices[0]?.message?.content?.trim() || "抱歉,店铺推荐服务暂时不可用。";
  } catch {
    return "抱歉,店铺推荐服务暂时不可用,请稍后再试。";
  }
}

// ── 分支处理 ────────────────────────────────────────────────

/** 餐饮分支:返回餐饮部分的 AgentResponse 片段(restaurantCards + 文本/快捷回复) */
async function handleDining(
  text: string,
  toolCuisine: string,
  salutation: string,
  activityDigest: string,
): Promise<{ text: string; quickReplies?: string[]; restaurantCards?: RestaurantCard[] }> {
  // ── 亲子餐厅对比:按适配度、优惠和等位时长给出决策分析 ───────
  if (FAMILY_INTENT_PATTERN.test(text) && /餐|吃|饭|火锅|粤菜|小笼/.test(text)) {
    const picks = ["海底捞", "翠园", "鼎泰丰"]
      .map((name) => RESTAURANTS.find((restaurant) => restaurant.name === name))
      .filter((restaurant): restaurant is Restaurant => Boolean(restaurant));

    return {
      text:
        `${salutation}，综合亲子设施、优惠和等位时间，我更推荐「翠园」：有儿童座椅、环境相对安静，当前有8.8折家庭餐券，周末茶市预计等位20-40分钟，整体最均衡。\n\n`
        + "如果孩子更看重玩乐，海底捞的儿童游乐区适配度最高，刚好还有一张50元餐饮券可以使用，不过晚市通常要等40-60分钟；如果想尽快入座，鼎泰丰建议避开饭点，非高峰约等10-20分钟。下面可以逐张对比三家。",
      quickReplies: ["帮我排翠园", "查看翠园优惠", "换一家亲子餐厅"],
      restaurantCards: buildFamilyRestaurantCards(picks),
    };
  }

  const cuisine = detectCuisine(text, toolCuisine);

  // ── 未表达口味(且未说随便)→ 纯问句引导 ─────────────────────
  if (!cuisine) {
    return {
      text:
        `${salutation},这就帮您推荐!想先听听您的口味——今天想吃中餐、粤菜、火锅,还是西餐、日料、小吃快餐?要是拿不定主意,跟我说「随便」也行,我按今日精选给您挑几家。`,
      quickReplies: ["中餐", "火锅", "随便", "西餐"],
    };
  }

  // ── 随便 → 今日精选 ──────────────────────────────────────
  if (cuisine === "随便") {
    const picks = pickTodayPicks();
    const reply = await rewriteDining(text, "随便", picks, salutation, activityDigest);
    return {
      text: reply,
      quickReplies: ["帮我排海底捞", "想换个口味", "查询停车状态"],
      restaurantCards: buildRestaurantCards(picks),
    };
  }

  // ── 指定口味 → 按菜系筛选 ────────────────────────────────
  const matched = filterByCuisine(cuisine);

  if (matched.length === 0) {
    return {
      text:
        `${salutation},商场目前「${cuisine}」类别的餐厅暂时没有收录,要不换换口味?我给您列几个选择:中餐、粤菜、火锅、西餐、小吃快餐、茶饮咖啡都有,或者直接说「随便」我按今日精选推荐。`,
      quickReplies: ["随便", "中餐", "火锅", "粤菜"],
    };
  }

  const reply = await rewriteDining(text, cuisine, matched, salutation, activityDigest);
  const firstBrand = matched[0].name;
  return {
    text: reply,
    quickReplies: [
      firstBrand === "海底捞" ? "帮我排海底捞" : `帮我排${firstBrand}`,
      "想换个口味",
      "查询停车状态",
    ],
    restaurantCards: buildRestaurantCards(matched),
  };
}

/** 零售分支:返回零售部分的 AgentResponse 片段(brandCards + 文本/快捷回复) */
async function handleRetail(
  text: string,
  toolCategory: string,
  salutation: string,
  activityDigest: string,
): Promise<{ text: string; quickReplies?: string[]; brandCards?: BrandCard[] }> {
  const isCasual = CASUAL_KEYS.some((k) => text.includes(k));
  const category = detectRetailCategory(text, toolCategory);

  // ── 随便 / 未识别方向 → 今日逛逛精选 ───────────────────────
  if (isCasual || category === null) {
    const picks = pickStoreTodayPicks();
    const reply = await rewriteRetail(text, category ?? null, picks, salutation, activityDigest);
    const hasSa = picks.some((s) => s.saBooking);
    return {
      text: reply,
      quickReplies: hasSa ? ["帮我预约档期", "导航到店", "换个品类逛逛"] : ["导航到店", "换个品类逛逛", "查询停车状态"],
      brandCards: buildBrandCards(picks),
    };
  }

  // ── 指定品类 → 按品类筛选 ────────────────────────────────
  const matched = filterStoresByCategory(category);

  if (matched.length === 0) {
    return {
      text:
        `${salutation},商场目前「${category}」类别的店铺暂时没有收录,要不换个方向?超市好物、美妆个护、亲子体验、家居生活、奢品专柜都有,直接说「随便」我按今日逛逛精选给您挑几家。`,
      quickReplies: ["随便逛逛", "生鲜超市", "亲子娱乐", "家居生活"],
    };
  }

  const reply = await rewriteRetail(text, category, matched, salutation, activityDigest);
  const hasSa = matched.some((s) => s.saBooking);
  const firstBrand = matched[0].name;
  return {
    text: reply,
    quickReplies: hasSa
      ? [`帮我预约${firstBrand}`, "换个品类逛逛", "查询停车状态"]
      : ["导航到店", "换个品类逛逛", "查询停车状态"],
    brandCards: buildBrandCards(matched),
  };
}

// ── 行程锚点与画像驱动的规划辅助 ───────────────────────────────

/**
 * 已锁定行程锚点 —— 从 SkillContext 的预约/活动预约/排队状态里提取用户已确认的环节,
 * 作为规划动线的骨架。只纳入"已确认/进行中",不纳入待收集(pending/selecting)。
 */
interface ItineraryItem {
  /** 展示文案,如"乐高拼搭派对 4F 周六 10:00-11:00""Chanel 品牌预约 1F 14:00-14:45" */
  label: string;
  /** 店铺/活动名(与 STORES/RESTAURANTS name 对齐,用于从候选池剔除已锁定项) */
  brandOrName: string;
  floor: string;
  type: "appointment" | "activity" | "queue";
}

function buildItinerary(ctx: {
  appointmentInfo: import("../../agent/types").SkillContext["appointmentInfo"];
  activityBookingInfo: import("../../agent/types").SkillContext["activityBookingInfo"];
  queueInfo: import("../../agent/types").SkillContext["queueInfo"];
}): ItineraryItem[] {
  const items: ItineraryItem[] = [];

  if (ctx.appointmentInfo?.status === "confirmed" && ctx.appointmentInfo.brand) {
    items.push({
      label: `${ctx.appointmentInfo.brand} 品牌预约 ${ctx.appointmentInfo.floor}${ctx.appointmentInfo.timeSlot ? ` ${ctx.appointmentInfo.timeSlot}` : ""}`,
      brandOrName: ctx.appointmentInfo.brand,
      floor: ctx.appointmentInfo.floor,
      type: "appointment",
    });
  }

  if (ctx.activityBookingInfo?.status === "confirmed" && ctx.activityBookingInfo.activityName) {
    const info = ctx.activityBookingInfo;
    const when = [info.dateLabel, info.timeSlot].filter(Boolean).join(" ");
    items.push({
      label: `${info.activityName} ${info.floor}${when ? ` ${when}` : ""}`,
      brandOrName: info.activityName,
      floor: info.floor,
      type: "activity",
    });
  }

  if (ctx.queueInfo && ctx.queueInfo.status !== "ready" && ctx.queueInfo.brand) {
    // 排队中等候中作为可选锚点(到号 ready 视为已结束,不纳入)
    items.push({
      label: `${ctx.queueInfo.brand} 排队中 ${ctx.queueInfo.floor} 排号${ctx.queueInfo.queueNo}`,
      brandOrName: ctx.queueInfo.brand,
      floor: ctx.queueInfo.floor,
      type: "queue",
    });
  }

  return items;
}

/**
 * 口述行程意图提取 —— 用户没正式预约,但说了"我今天会去 Chanel""想去乐高看看"
 * 这类打算。识别"打算前往 + 品牌名/店名/活动名",转成 ItineraryItem 作为规划锚点。
 * 只识别"打算前往",不把"推荐个X""X在哪""X有新品吗"误判成行程。
 * 与结构化 buildItinerary 并列,mixed 分支会把两者合并(按 brandOrName 去重)。
 */
function matchCatalogName(text: string): { name: string; floor: string } | null {
  const lower = text.toLowerCase();
  // 1) 品牌别名(复用 brandKeywords,覆盖"香奈儿/Chanel")
  for (const [brandName, triggers] of Object.entries(brandKeywords)) {
    if (triggers.some((t) => lower.includes(t.toLowerCase()))) {
      const storeHit = STORES.find((s) => s.name.toLowerCase() === brandName.toLowerCase());
      return { name: brandName, floor: storeHit?.floor ?? "" };
    }
  }
  // 2) STORES 店名直命中(乐高体验店/DTX精品超市 等)
  for (const store of STORES) {
    if (lower.includes(store.name.toLowerCase())) return { name: store.name, floor: store.floor };
  }
  // 3) 活动名命中(标题里常含品牌,如"Gucci Flora 美妆限时 pop-up")
  for (const act of ACTIVITIES) {
    if (lower.includes(act.title.toLowerCase())) return { name: act.title, floor: act.floor };
  }
  return null;
}

function extractStatedItinerary(text: string): ItineraryItem[] {
  // 必须含"前往意图",避免"推荐个chanel""chanel在哪""chanel有新品吗"被误判成要去
  const hasVisitIntent = /会去|要去|打算去|想去|准备去|预约去|先去|今天去|下午去|待会儿去|等下去|顺路去|去逛逛|去看看/.test(text);
  if (!hasVisitIntent) return [];

  const catalogHit = matchCatalogName(text);
  if (!catalogHit) return [];

  return [{
    label: `${catalogHit.name}${catalogHit.floor ? ` ${catalogHit.floor}` : ""}(您打算去)`,
    brandOrName: catalogHit.name,
    floor: catalogHit.floor,
    type: "activity",
  }];
}

/**
 * 按用户画像给零售店铺打分排序(镜像 rankActivities 的做法)。
 * brand 命中 +3;profile.categories 通过 store.category / categoryLabel 模糊匹配 +2;
 * profile.items 匹配 recommendItems/tags +1。用于规划时的画像驱动候选筛选。
 */
function rankStores(profile: UserProfile): Array<RecommendableStore & { score: number }> {
  return STORES.map((store) => {
    let score = 0;
    for (const brand of profile.brands) {
      if (store.name.toLowerCase().includes(brand.toLowerCase()) || brand.toLowerCase().includes(store.name.toLowerCase())) {
        score += 3;
      }
    }
    const storeCategoryText = `${store.category} ${store.categoryLabel}`.toLowerCase();
    for (const cat of profile.categories) {
      if (storeCategoryText.includes(cat.toLowerCase()) || cat.toLowerCase().includes(store.category.toLowerCase())) {
        score += 2;
        break;
      }
    }
    const storeItemText = `${store.recommendItems.join(" ")} ${store.tags.join(" ")}`.toLowerCase();
    for (const item of profile.items) {
      if (storeItemText.includes(item.toLowerCase())) {
        score += 1;
        break;
      }
    }
    return { ...store, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** 把用户画像偏好拼成一句提示,揉进反问与规划 prompt。空画像返回空字符串。 */
function profileHints(profile: UserProfile): string {
  const cats = profile.categories.filter(Boolean);
  const brands = profile.brands.filter(Boolean);
  const parts: string[] = [];
  if (brands.length > 0) parts.push(`关注的品牌:${brands.slice(0, 4).join("、")}`);
  if (cats.length > 0) parts.push(`喜欢的品类:${cats.slice(0, 4).join("、")}`);
  if (parts.length === 0) return "";
  return `用户平时${parts.join("、")}`;
}

/**
 * 画像驱动的规划候选池 —— 只把"跟画像相关"或"多样化精选"的候选交给 LLM,
 * 而不是全场倒进去。已有行程锚点(brandOrName 集合)从候选中剔除,体现"推荐其他"。
 */
function buildPlanningCandidates(
  profile: UserProfile,
  itinerary: ItineraryItem[],
): { restaurants: Restaurant[]; stores: RecommendableStore[]; activities: Activity[] } {
  // 已锁定/打算去的店名 —— 必须保留在候选池里(用户必去,要纳入行程卡),
  // 只是不再作为"新推荐"重复推。去重靠 LLM 唯一性约束 + prompt 说明。
  const lockedNames = new Set(itinerary.map((item) => item.brandOrName));

  // ── 店铺:画像打分优先,无命中退化为跨品类精选(不倒全量);再补入已锁定店确保在池
  const rankedStores = rankStores(profile);
  let stores: RecommendableStore[];
  if (rankedStores.length >= 4) {
    stores = rankedStores.slice(0, 8);
  } else {
    // 画像无足够命中 → 跨品类差异化精选,避免全量噪声
    const todayPicks = pickStoreTodayPicks();
    const extra = rankedStores.filter((s) => !todayPicks.some((p) => p.id === s.id));
    stores = [...rankedStores, ...todayPicks, ...extra].slice(0, 8);
  }
  // 把已锁定店(若存在于 STORES)补进候选池头部,确保 LLM 能把它纳入行程
  const lockedStores = STORES.filter((s) => lockedNames.has(s.name) && !stores.some((x) => x.id === s.id));
  if (lockedStores.length > 0) {
    stores = [...lockedStores, ...stores].slice(0, 8);
  }

  // ── 活动:复用 rankActivities,无命中取前 6;补入已锁定活动
  const rankedActivities = rankActivities(profile);
  const activitiesBase = (rankedActivities.length > 0 ? rankedActivities : ACTIVITIES).slice(0, 6);
  const lockedActivities = ACTIVITIES.filter(
    (a) => lockedNames.has(a.title) && !activitiesBase.some((x) => x.id === a.id),
  );
  const activities = [...lockedActivities, ...activitiesBase].slice(0, 6);

  // ── 餐饮:画像无明显餐饮偏好时给跨菜系精选(复用 pickTodayPicks),足够提供 1 个正餐段
  const restaurants = pickTodayPicks();

  return { restaurants, stores, activities };
}

/**
 * 反问需求 —— 中性的"怎么规划路线"且无任何信号/行程时,先问清主要安排再规划,
 * 不直接出 planCard。话术走真人导购口吻,只随口带一下用户平日爱看的方向(像聊天,
 * 不像念档案),不直陈"会员档案/偏好记录"这类内部数据痕迹。
 * 4 个快捷回复都自带信号词,点击后下一轮会因有信号而直接进入规划,闭合流程。
 */
function askPlanningClarification(profile: UserProfile, salutation: string): { text: string; quickReplies: string[] } {
  // 隐式画像:把 categories/brands 转成口语"您平时爱看美妆和奢品这种"的随口一提,
  // 不出现"档案/记录/系统显示"这类会暴露后台数据的措辞。
  const brandHit = profile.brands.find((b) => b) ?? "";
  const casualMention = profile.categories.length > 0 || brandHit
    ? `您平时爱看${[profile.categories[0], brandHit].filter(Boolean).slice(0, 2).join("、")}这类,`
    : "";
  return {
    text:
      `${salutation},我帮您把今天的行程理一理。${casualMention}先问您两件事:今天是自己逛、和朋友、还是带家人?主要想踩点买东西、还是先吃顿好的再随便走走?跟我说一句,我就按您的时间给您顺一路。`,
    quickReplies: ["先吃再随便逛逛", "主要想踩点买点东西", "带家人逛一天", "先看看今天有什么活动"],
  };
}

// ── Skill 定义 ──────────────────────────────────────────────

export const storeRecommendSkill: Skill = {
  name: "store-recommend",
  intentDescription:
    "店铺/餐饮推荐专属,统一'逛吃购'推荐入口。当用户问美食推荐、想吃什么、今天吃什么、求推荐餐厅,或想逛店、想买某类好物(包/表/生鲜/美妆/亲子/家居)、带娃去哪逛、店铺推荐时调用。根据需求分流:餐饮走餐厅卡(RestaurantCard),零售/服务走品牌卡(BrandCard),两者都想要时混排。若用户说了想吃的菜系/口味填 cuisine 参数,说了想逛的品类填 category 参数;未说明则留空。注:查具体品牌位置/新品/联系SA走 store-consult;挑具体商品(七夕买什么)走 product-recommend;本skill只负责'推荐店铺/餐厅'。",
  match: () => true,
  handle: async ({ text, toolArgs, userProfile, appointmentInfo, activityBookingInfo, queueInfo, parkingInfo }) => {
    const salutation = getUserSalutation(userProfile);
    let intent = classifyRecommendIntent(text);

    // ── 追问沿用上轮口径 ────────────────────────────────────
    // 纯追问短句(无新口味/新品类)时,按上轮口径继续,否则会被误判成零售
    // "今日逛逛"。仅当上一轮有明确口径且本轮确实没挑明新意图时才沿用。
    if (isLocalFollowUp(text) && lastServingKind && intent === "retail" && !isDiningIntent(text)) {
      intent = lastServingKind;
    }

    // 记录本轮口径,供下一轮追问沿用(mixed 记成上一段实际服务的口径:优先餐饮)
    lastServingKind = intent === "mixed" ? "dining" : intent;

    // 统一活动摘要:有画像偏好时优先返回高匹配活动,无画像时返回全量,供各分支
    // 作为"顺路提醒"候选综合进推荐话术(餐饮/零售/规划都带)。
    const activityDigest = getActivityDigestForBranch(userProfile);

    // ── 混排/行程规划:逛吃购一条龙,问题感知 ─────────────────
    // 这类问句("吃饭前后还能安排什么""今天都能怎么规划""帮我规划路线")餐饮部分通常
    // 没指定口味,不走 handleDining 反问流程。由 rewritePlanning 紧贴用户问题 + 楼层动线
    // 自主组织顺序与选店(不写死"先吃后逛"),并顺路提醒当下活动。话术里提到的店由 LLM
    // 按问题决定;下方卡片展示今日精选的餐厅 + 店铺组合,便于进一步查看细节与操作。
    if (intent === "mixed") {
      // ── 行程锚点:结构化预约 + 口述意图合并去重 ──
      // 结构化(buildItinerary):已确认的品牌预约/活动预约/排队。
      // 口述(extractStatedItinerary):"我今天会去 Chanel""想去乐高"这类还没预约但打算去的。
      // 两者按 brandOrName 去重合并,作为规划动线锚点 + hasSignal 信号。
      const structuredItinerary = buildItinerary({ appointmentInfo, activityBookingInfo, queueInfo });
      const statedItinerary = extractStatedItinerary(text);
      const itinerary = [...structuredItinerary];
      const itineraryNames = new Set(structuredItinerary.map((item) => item.brandOrName));
      for (const item of statedItinerary) {
        if (!itineraryNames.has(item.brandOrName)) {
          itineraryNames.add(item.brandOrName);
          itinerary.push(item);
        }
      }

      // ── 决策:中性规划且无任何信号/行程时,先反问需求,不直接出 planCard ──
      // 信号 = 餐饮/零售/活动意图,或文本含同行/场景词,或已有行程(含口述意图)。
      // 反问的 4 个快捷回复都自带信号词,点击后下一轮 hasSignal 为真 → 直接进入规划。
      const hasSignal =
        isDiningIntent(text)
        || isRetailIntent(text)
        || isActivityQuery(text)
        || /带娃|亲子|孩子|宝宝|家人|陪|约会|朋友|闺蜜|一人|自己逛/.test(text)
        || itinerary.length > 0;

      if (isPlanningIntent(text) && !hasSignal) {
        const clarify = askPlanningClarification(userProfile, salutation);
        return {
          text: clarify.text,
          quickReplies: clarify.quickReplies,
        };
      }

      const { retail: retailPicks } = pickDiningAndRetailPicks();
      const reply = await rewritePlanning(text, userProfile, itinerary, parkingInfo, salutation);

      const hasSa = retailPicks.some((s) => s.saBooking);

      return {
        text: reply.text,
        planCard: reply.planCard,
        quickReplies: hasSa
          ? ["帮我预约档期", "帮我排海底捞", "导航到店"]
          : ["帮我排海底捞", "导航到店", "查询停车状态"],
      };
    }

    // ── 纯餐饮 ──────────────────────────────────────────────
    if (intent === "dining") {
      const dining = await handleDining(text, String(toolArgs?.cuisine ?? ""), salutation, activityDigest);
      return {
        text: dining.text,
        quickReplies: dining.quickReplies,
        restaurantCards: dining.restaurantCards,
      };
    }

    // ── 纯零售 ──────────────────────────────────────────────
    const retail = await handleRetail(text, String(toolArgs?.category ?? ""), salutation, activityDigest);
    return {
      text: retail.text,
      quickReplies: retail.quickReplies,
      brandCards: retail.brandCards,
    };
  },
};
