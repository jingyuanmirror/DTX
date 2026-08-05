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

const FAMILY_INTENT_PATTERN = /亲子|带(?:着)?(?:小孩|孩子|宝宝|娃)|儿童友好|一家人|家庭聚餐/;

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

/**
 * 时间预算/在场时长信号 —— "逛一天/逛半天/待多久/待到几点/上午到...走"这类
 * 表达本身就是行程规划(回答"待多久"),应归 planning/mixed,而非被确定性路由漏掉
 * 落到 LLM 路由器误判(图9路由错根因:这些时长短句不在 PLANNING_PATTERN 里)。
 */
const TIME_BUDGET_PATTERN =
  /逛(一)?天|逛半天|逛一整天|待多久|待几个小时|逛几个小时|待到[^。]*(?:走|离开|离场|结束)|(上午|下午|早上|晚上|中午)[^。]*到[^。]*(?:走|离开|离场|结束)|\d{1,2}点[^。]*(?:走|离开|离场|结束)/;

export function isPlanningIntent(text: string): boolean {
  return PLANNING_PATTERN.test(text) || TIME_BUDGET_PATTERN.test(text);
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
        + "3) 回复先直接给建议,再自然点出每家最值得用户关心的到店收益(如环境、口味、等位或设施),但不要解释你的筛选过程。\n"
        + "4) 禁止向用户输出“挑选逻辑”“场景互补”“决策价值”“候选”“打分”等内部推荐术语;不要复述卡片中的全部招牌菜和价格。\n"
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

interface PlanningRevisionContext {
  previousPlanCard: PlanCard;
  changedCompanions: Array<"elderly" | "kids" | "family" | "couple" | "friends" | "solo">;
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
  budget: TimeBudget,
  companions: Companions,
  quotas: PlanQuotas,
  salutation: string,
  excludedNames: Set<string>,
  revision?: PlanningRevisionContext,
): Promise<{ text: string; planCard?: PlanCard }> {
  const candidates = buildPlanningCandidates(userProfile, itinerary, companions, revision?.previousPlanCard, excludedNames);
  const diningDigest = candidates.restaurants.length > 0 ? buildDiningDigest(candidates.restaurants) : "暂无";
  const retailDigest = candidates.stores.length > 0 ? buildStoreDigest(candidates.stores) : "暂无";
  const activityDigest = buildActivityDigestForPlanning(candidates.activities);
  const teaDigest = candidates.teaShops.length > 0 ? buildStoreDigest(candidates.teaShops) : "暂无";
  const allowedNames = new Set([
    ...candidates.restaurants.map((restaurant) => restaurant.name),
    ...candidates.stores.map((store) => store.name),
    ...candidates.activities.map((activity) => activity.title),
    ...candidates.teaShops.map((store) => store.name),
  ]);
  const allowedFloorsByName = new Map([
    ...candidates.restaurants.map((restaurant) => [restaurant.name, restaurant.floor] as const),
    ...candidates.stores.map((store) => [store.name, store.floor] as const),
    ...candidates.activities.map((activity) => [activity.title, activity.floor] as const),
    ...candidates.teaShops.map((store) => [store.name, store.floor] as const),
  ]);
  const childVenueNames = new Set([
    ...candidates.stores.filter(isStrictlyChildFocusedStore).map((store) => store.name),
    ...candidates.activities.filter(isChildFocusedActivity).map((activity) => activity.title),
  ]);
  const requiredChildVenueNames = childVenueNames.has("乐高体验店")
    ? new Set(["乐高体验店"])
    : childVenueNames;
  const familyDiningNames = new Set(
    candidates.restaurants
      .filter(isFamilyFriendlyRestaurant)
      .map((restaurant) => restaurant.name),
  );
  const profileHint = profileHints(userProfile);
  const itineraryDigest = itinerary.length > 0
    ? itinerary.map((item) => `· ${item.label}`).join("\n")
    : "无";
  const parkingHint = parkingInfo ? `\n车辆停放:${parkingInfo.floor}层 ${parkingInfo.location}。` : "";

  // 时段骨架:按 budget.span/arrive/leave 给出一天骨架,让 LLM 在骨架内填段
  const skeleton = buildTimeSkeleton(budget, quotas);
  const companionText = companionDescription(companions);

  const systemContent =
    "你是DTX综合商圈的路线规划师,负责根据用户在商场待的时长、同行人群、会员画像与已锁定行程,产出一份能照着走的完整路线卡。\n"
    + "要求：\n"
    + "1) 严格基于提供的候选餐厅、店铺、活动、茶歇数据,不杜撰店名、楼层、价格、品类。推荐只能来自下方候选集,不得超出候选自行编造。\n"
    + "2) 用户需求中包含连续多轮原话。后续一轮默认是在上一轮基础上补充条件,不是重置行程;此前明确的到离店时间、用餐、必去地点和同行人都必须保留。只有用户明确说修改、替换或取消某项时,才以较新的说法覆盖冲突项。取舍优先级为:完整多轮明确需求 > 已确认时间与同行人 > 已锁定行程 > 画像偏好。\n"
    + "3) 候选筛选、画像、打分和配额都是内部过程,只能用来做取舍,绝不写进标题、到店建议或底部提醒。只写用户到店后能直接感知的好处。\n"
    + "4) 【核心】像做攻略一样给一份能照着走的完整日程——从到达到离开,按时段排成一条线:几点在哪、做什么、什么时候吃饭和休息。**不是把候选罗列让用户自己选**,而是你替用户做完取舍和排序,只选最合适的放进行程卡,其余不进卡。\n"
    + "5) 配额是硬约束,不得超出:正餐段恰好 " + quotas.meals + " 段、茶歇段≤" + quotas.tea + " 段、非餐饮逛购段≈" + quotas.retailSegments + " 段,段总数≤" + quotas.totalSegments + "。" + (quotas.noMeal ? "用户已说明不安排吃饭,正餐段必须为 0,只能逛购+可选茶歇。" : "") + "同一品类(如美妆、奢品、家居)一天最多 " + quotas.maxPerCategory + " 家,超了就换其他类型,避免一天全是同一类。\n"
    + "6) 按下方\"时段骨架\"填充,每个段标题带上具体时段(如\"11:00-12:30 看看家居新品\"\"12:30-13:30 吃午饭\"),不要只写\"饭前/饭后\"。标题必须说清该站的实际内容,如采购、试用、阅读、看电影、吃饭;禁止使用\"到店逛逛\"\"到店先逛\"\"继续逛\"\"慢逛\"等没有信息的说法。所有时段必须完全落在用户的到达与离开时间内,最后一段结束时间不得晚于用户离开时间。两个正餐之间至少隔 3 小时,正餐段后不得紧接茶歇段。segments 数组顺序就是时间顺序。\n"
    + "7) " + (companionText
      ? `用户明确提到的同行人群只有:${companionText}。只围绕这些已确认信息做适配,不得再猜测其他同行人。`
      : "用户没有提到任何同行人,不得猜测或补充老人、孩子、伴侣、朋友等人群。")
    + (companions.kids
      ? "用户已明确提到孩子,行程必须包含至少一个孩子能实际参与的亲子体验点;候选中有乐高体验店时优先安排乐高体验店。有正餐时必须选择适合家庭用餐的候选,并根据店铺设施写具体的亲子到店收益。"
      : "用户没有明确说带孩子;即使画像喜欢亲子品类或候选里有亲子场所,也禁止使用“带娃”“孩子”“小朋友”“亲子家庭”等口吻。") + "\n"
    + "8) 尊重已锁定行程:若提供了\"已锁定行程\",它们是用户必去环节,必须纳入行程卡(按其楼层与时段安排在合适位置),并在其前后顺路补位其他候选。整张卡每个店/活动只出现一次。用户口述\"打算去\"的也算必去。\n"
    + "9) 每个 items 条目含精确店名 name、中文类型 type、给用户看的具体到店建议 note。name 只能写候选里的店名/活动名(不能写\"先到\"\"再到\"等动作,动作放 segment.title)。同一段的地点必须在同一楼层,segment.floor 必须与段内所有地点的真实楼层一致。note 只写设施、环境、特色或时效带来的直接好处,不解释为什么它被系统选中,也不写\"顺路\"\"值得去\"等空话。段标题与该段活动/店语义一一对应。\n"
    + "10) 结合楼层动线组织顺序,减少楼层折返,但体验节奏优先于机械升降;不为顺楼层强加与需求无关的店。对用户没有主动提出、只是你顺带推荐的事项,使用“做些”“可以看看”等建议口吻,不得写成“把某事办好”这类既定待办。\n"
    + "11) 只输出合法 JSON,不要 Markdown 代码块或额外文字。结构："
    + '{"planCard":{"type":"plan-card","eyebrow":"DTX · 行程推荐","title":"行程标题","segments":[{"iconKey":"play|dining|reading|retail|activity|coffee|walk","title":"带具体时段的标题","floor":"4F","items":[{"name":"店铺或活动名","type":"简短类型","note":"一句建议"}]}],"hint":"错峰或动线提醒"}}。'
    + "每段 1-2 个地点;卡片 title 用自然中文;segment title/type/note 用自然中文,type 不得输出英文键名。hint 只写一句可执行的错峰、取号或休息提醒。"
    + (revision
      ? `\n12) 这是基于上一版的调整。上一版地点:${revision.previousPlanCard.segments.flatMap((segment) => segment.items.map((item) => item.name)).join("、") || "无"}。明确不去的地点:${[...excludedNames].join("、") || "无"}。必须删除明确不去的地点,其他上一版地点原则上全部保留;只有本轮条件确实冲突时才做最少替换。保留的餐厅必须继续用于原来的午餐或晚餐,不得对调。不要只换标题。`
      : "");

  const userContent =
    `完整多轮需求（按轮次阅读；后轮默认补充，明确修改时才覆盖前轮）：\n${userText}\n请先综合全部已确认条件，再按时段骨架与配额给出一份能照着走的完整日程。\n\n`
    + `用户画像：${profileHint || "暂无明确偏好"}\n`
    + (companionText ? `同行人群：${companionText}\n` : "")
    + `时间预算：${budgetDescription(budget)}\n`
    + `时段骨架（按此填充,餐间隔≥3h,正餐后不接茶歇）：\n${skeleton}\n\n`
    + `配额：正餐${quotas.meals}段、茶歇≤${quotas.tea}段、逛购≈${quotas.retailSegments}段、同品类≤${quotas.maxPerCategory}家、段总数≤${quotas.totalSegments}\n\n`
    + `明确不去的地点（不得出现）：${[...excludedNames].join("、") || "无"}\n\n`
    + `已锁定行程（用户必去,务必纳入并据此顺路安排其他候选）：\n${itineraryDigest}${parkingHint}\n\n`
    + `候选餐厅（正餐段只可从中选）：\n${diningDigest}\n\n`
    + `候选茶歇（茶歇/咖啡段只可从中选）：\n${teaDigest}\n\n`
    + `候选店铺（零售/体验段只可从中选）：\n${retailDigest}\n\n`
    + `当下活动（顺路可提醒,无关/时间冲突的不提）：\n${activityDigest}`;

  // 第4层:生成 → 校验 → 不通过带原因重试(最多2次) → 结构化卡片兜底
  let lastValidationReason = "首次生成";
  for (let attempt = 0; attempt < 3; attempt++) {
    const messages: ChatMessage[] = [
      { role: "system", content: systemContent },
      { role: "user", content: userContent + (attempt > 0 ? `\n\n[上次生成未通过校验,原因:${lastValidationReason}]请修正后重新生成。` : "") },
    ];
    let parsed: { planCard?: unknown };
    try {
      const result = await chatCompletion(messages, [], { onToken: () => {} });
      const content = result.choices[0]?.message?.content?.trim();
      if (!content) {
        lastValidationReason = "模型返回为空";
        continue;
      }
      const jsonText = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      parsed = JSON.parse(jsonText);
    } catch {
      lastValidationReason = "JSON解析失败";
      continue;
    }
    const planCard = parsed.planCard as PlanCard | undefined;
    const structuralOk =
      planCard?.type === "plan-card"
      && Array.isArray(planCard.segments) && planCard.segments.length > 0
      && planCard.segments.every((seg) =>
        typeof seg.title === "string" && Array.isArray(seg.items) && seg.items.length > 0
        && seg.items.every((it) => typeof it.name === "string" && it.name.trim() && typeof it.type === "string" && it.type.trim() && typeof it.note === "string" && it.note.trim()));
    const itemNames = planCard?.segments?.flatMap((seg) => seg.items.map((it) => it.name.trim())) ?? [];
    const uniqueOk = new Set(itemNames).size === itemNames.length;
    if (!structuralOk || !uniqueOk) {
      lastValidationReason = "结构不完整或店名重复";
      continue;
    }
    const validation = validatePlanCard(
      planCard!,
      quotas,
      companions,
      budget,
      allowedNames,
      allowedFloorsByName,
      new Set(itinerary.map((item) => item.brandOrName)),
      requiredChildVenueNames,
      familyDiningNames,
      excludedNames,
      revision,
    );
    if (!validation.ok) {
      lastValidationReason = validation.reason;
      // 必去项由结构化兜底卡完整保留；模型已经遗漏时无需继续消耗多轮重试。
      if (validation.reason.startsWith("遗漏用户明确要去的地点")) break;
      continue;
    }
    const text = await rewritePlanningMessage(userText, planCard!, budget, companions, salutation, revision);
    return { text, planCard: planCard! };
  }
  const planCard = buildFallbackPlanningCard(candidates, budget, quotas, companions, itinerary);
  const text = await rewritePlanningMessage(userText, planCard, budget, companions, salutation, revision);
  return { text, planCard };
}

/** 由时间预算+配额生成一天时段骨架文案,供 LLM 在骨架内填段。 */
function buildTimeSkeleton(budget: TimeBudget, quotas: PlanQuotas): string {
  if (budget.span === "fullday") {
    const lines = ["· 上午 优先安排用户明确要去的地点或一项重点体验", "· 午间 安排午餐并坐下来休息", "· 午后 安排商品体验、亲子体验、阅读或观影,可在午晚餐之间留一次茶歇", "· 晚间 安排晚餐,与午餐至少间隔 5 小时", "· 晚饭后直接离场,不再追加耗时项目"];
    return lines.filter((line) => !(quotas.noMeal && /午餐|晚餐/.test(line))).join("\n");
  }
  if (budget.span === "evening") {
    return ["· 傍晚 先完成一项重点挑选或体验", quotas.noMeal ? "· 晚间 可继续体验或短暂休息" : "· 晚间 安排一顿正餐", "· 饭后直接离场"].join("\n");
  }
  // halfday
  return [
    budget.arrive ? `· ${budget.arrive} 到店后优先安排已明确的必去项或重点体验` : "· 到店后优先安排已明确的必去项或重点体验",
    quotas.noMeal ? "· 中段 安排一项体验或短暂休息" : "· 午间或晚间 安排一顿正餐",
    "· 用餐后安排一项轻松体验再离场",
  ].join("\n");
}

function budgetDescription(budget: TimeBudget): string {
  const spanLabel = budget.span === "fullday" ? "逛一整天" : budget.span === "evening" ? "仅晚上来逛" : "逛半天";
  const arr = budget.arrive ? `、约 ${budget.arrive} 到` : "";
  const lev = budget.leave ? `、约 ${budget.leave} 走` : "";
  const meal = budget.noMeal ? "、不安排吃饭" : "";
  return `${spanLabel}${arr}${lev}${meal}`;
}

function companionDescription(c: Companions): string {
  const parts = [
    c.elderly && "老人",
    c.kids && "孩子",
    c.family && "家人",
    c.couple && "伴侣",
    c.friends && "朋友",
    c.solo && "独自",
  ].filter(Boolean);
  return parts.join("、");
}

function planStoreSegment(store: RecommendableStore, title: string) {
  return {
    iconKey: "retail",
    title,
    floor: store.floor,
    items: [{ name: store.name, type: store.categoryLabel, note: store.highlight }],
  };
}

function planDiningSegment(restaurant: Restaurant, title: string) {
  return {
    iconKey: "dining",
    title,
    floor: restaurant.floor,
    items: [{ name: restaurant.name, type: restaurant.cuisineType, note: restaurant.highlight }],
  };
}

type FallbackPhase = "morning" | "afterLunch" | "afternoon" | "beforeDinner" | "afterDinner" | "evening";

function fallbackStoreTitle(store: RecommendableStore, phase: FallbackPhase, isUserSpecified = false): string {
  const phaseLabel: Record<FallbackPhase, string> = {
    morning: "上午",
    afterLunch: "午后",
    afternoon: "下午",
    beforeDinner: "晚餐前",
    afterDinner: "晚饭后",
    evening: "傍晚",
  };
  const recommendedItems = store.recommendItems.filter(Boolean).slice(0, 2).join("和");
  let action: string;
  if (isUserSpecified && store.category === "时尚奢品") action = `去${store.name}看看`;
  else if (store.category === "生鲜超市") action = "做些采买";
  else if (store.category === "亲子娱乐") action = store.name.includes("乐高") ? "玩一会儿拼搭" : "让孩子活动一会儿";
  else if (store.category === "影院娱乐") action = /KTV/i.test(store.name) ? "唱会儿歌" : "看场电影";
  else if (store.category === "数码电器") action = recommendedItems ? `体验${recommendedItems}` : "体验数码产品";
  else action = recommendedItems ? `看看${recommendedItems}` : `去${store.name}看看`;
  return `${phaseLabel[phase]} ${action}`;
}

function floorRank(floor: string): number {
  const basement = floor.match(/^B(\d+)/i);
  if (basement) return -Number(basement[1]);
  const aboveGround = floor.match(/^(\d+)F/i);
  return aboveGround ? Number(aboveGround[1]) : 99;
}

function floorZone(floor: string): string {
  return floor.match(/B\d+|\d+F/i)?.[0].toUpperCase() ?? floor.trim();
}

function parseClock(value?: string): number | null {
  if (!value) return null;
  const match = value.match(/(\d{1,2})(?:[:：](\d{2})|点(半)?)/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[3] ? 30 : Number(match[2] ?? 0);
  if (/下午|傍晚|晚上/.test(value) && hour < 12) hour += 12;
  if (/中午/.test(value) && hour < 11) hour += 12;
  return hour * 60 + minute;
}

function formatClock(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function applyFallbackTimeline(segments: PlanCard["segments"], budget: TimeBudget): void {
  const start = parseClock(budget.arrive);
  const end = parseClock(budget.leave);
  if (start === null || end === null || end <= start || segments.length === 0) return;

  const mealCount = segments.filter((segment) => segment.iconKey === "dining").length;
  const retailCount = Math.max(1, segments.length - mealCount);
  const availableForRetail = Math.max(retailCount * 30, end - start - mealCount * 60);
  const retailDuration = Math.floor(availableForRetail / retailCount);
  let cursor = start;
  for (const segment of segments) {
    const duration = segment.iconKey === "dining" ? 60 : retailDuration;
    const segmentEnd = Math.min(end, cursor + duration);
    segment.title = `${formatClock(cursor)}-${formatClock(segmentEnd)} ${segment.title}`;
    cursor = segmentEnd;
  }
}

/** 即使 LLM 连续输出非法 JSON,规划请求也必须有可渲染的 planCard。 */
function buildFallbackPlanningCard(
  candidates: ReturnType<typeof buildPlanningCandidates>,
  budget: TimeBudget,
  quotas: PlanQuotas,
  companions: Companions,
  itinerary: ItineraryItem[],
): PlanCard {
  const lockedNames = new Set(itinerary.map((item) => item.brandOrName));
  const lockedStores = candidates.stores.filter((store) => lockedNames.has(store.name));
  const targetStoreCount = Math.max(2, quotas.retailSegments, lockedStores.length);
  // 先按必去项与候选相关性完成取舍，再排序动线。若先按楼层选择，B1 店铺会无条件挤进每一版路线。
  let stores = [...lockedStores, ...candidates.stores.filter((store) => !lockedNames.has(store.name))]
    .filter((store, index, all) => all.findIndex((candidate) => candidate.id === store.id) === index)
    .slice(0, targetStoreCount)
    .sort((a, b) => floorRank(a.floor) - floorRank(b.floor));
  if (companions.kids) {
    const childStore = candidates.stores.find((store) => store.name === "乐高体验店")
      ?? candidates.stores.find(isStrictlyChildFocusedStore);
    if (childStore && !stores.some((store) => store.id === childStore.id)) {
      const replaceIndex = [...stores].reverse().findIndex((store) => !lockedNames.has(store.name));
      const actualIndex = replaceIndex < 0 ? -1 : stores.length - 1 - replaceIndex;
      stores = actualIndex >= 0
        ? stores.map((store, index) => index === actualIndex ? childStore : store)
        : [...stores, childStore];
      stores = stores
        .sort((a, b) => floorRank(a.floor) - floorRank(b.floor));
    }
  }
  const meals = candidates.restaurants.slice(0, quotas.meals);
  const segments: PlanCard["segments"] = [];
  const firstPhase: FallbackPhase = budget.span === "evening"
    ? "evening"
    : /下午/.test(budget.arrive ?? "") ? "afternoon" : "morning";

  if (budget.span === "fullday") {
    if (stores[0]) segments.push(planStoreSegment(stores[0], fallbackStoreTitle(stores[0], firstPhase, lockedNames.has(stores[0].name))));
    if (meals[0]) segments.push(planDiningSegment(meals[0], "午餐 吃饭歇一会儿"));
    if (stores[1]) segments.push(planStoreSegment(stores[1], fallbackStoreTitle(stores[1], "afterLunch", lockedNames.has(stores[1].name))));
    if (stores[2]) segments.push(planStoreSegment(stores[2], fallbackStoreTitle(stores[2], "afternoon", lockedNames.has(stores[2].name))));
    if (stores[3]) segments.push(planStoreSegment(stores[3], fallbackStoreTitle(stores[3], "beforeDinner", lockedNames.has(stores[3].name))));
    if (meals[1]) segments.push(planDiningSegment(meals[1], "晚餐 好好吃顿饭"));
  } else {
    const dinnerRequested = /晚饭|晚餐/.test(budget.raw);
    const afterDinnerStore = dinnerRequested
      ? stores.find((store) => lockedNames.has(store.name) && store.category === "影院娱乐")
      : undefined;
    const dinnerPool = companions.kids || companions.family || companions.elderly
      ? RESTAURANTS.filter(isFamilyFriendlyRestaurant)
      : RESTAURANTS.filter((restaurant) => restaurant.cuisine !== "茶饮咖啡");
    const dinnerRestaurant = afterDinnerStore
      ? [...dinnerPool].sort((a, b) => {
        const score = (restaurant: Restaurant) =>
          Math.abs(floorRank(restaurant.floor) - floorRank(afterDinnerStore.floor)) * 10
          + (restaurant.tags.some((tag) => /需提前预约/.test(tag)) ? 15 : 0)
          + (/午市|午餐/.test(`${restaurant.highlight} ${restaurant.tip ?? ""}`) ? 12 : 0)
          + (/晚市排队较长/.test(restaurant.tip ?? "") ? 5 : 0)
          + restaurant.priceLevel;
        return score(a) - score(b);
      })[0]
      : meals[0];
    const beforeMealStores = stores.filter((store) => store.id !== afterDinnerStore?.id);
    if (dinnerRequested) {
      beforeMealStores
        .slice(0, quotas.retailSegments)
        .forEach((store, index, selectedStores) => {
          const phase = index === 0
            ? firstPhase
            : index === selectedStores.length - 1 ? "beforeDinner" : "afternoon";
          segments.push(planStoreSegment(store, fallbackStoreTitle(store, phase, lockedNames.has(store.name))));
        });
      if (dinnerRestaurant) segments.push(planDiningSegment(dinnerRestaurant, "晚餐 好好吃顿饭"));
      if (afterDinnerStore) segments.push(planStoreSegment(afterDinnerStore, fallbackStoreTitle(afterDinnerStore, "afterDinner", true)));
    } else {
      if (beforeMealStores[0]) segments.push(planStoreSegment(beforeMealStores[0], fallbackStoreTitle(beforeMealStores[0], firstPhase, lockedNames.has(beforeMealStores[0].name))));
      if (meals[0]) segments.push(planDiningSegment(meals[0], budget.span === "evening" ? "晚餐 好好吃顿饭" : "吃饭 顺便歇一会儿"));
      if (stores[1]) segments.push(planStoreSegment(stores[1], fallbackStoreTitle(stores[1], "afterLunch", lockedNames.has(stores[1].name))));
      if (stores[2] && segments.length < quotas.totalSegments) {
        segments.push(planStoreSegment(stores[2], fallbackStoreTitle(stores[2], "afternoon", lockedNames.has(stores[2].name))));
      }
    }
  }
  applyFallbackTimeline(segments, budget);

  return {
    type: "plan-card",
    eyebrow: "DTX · 行程推荐",
    title: companions.kids ? "带孩子版 · 今日逛吃路线" : "今天的逛吃路线",
    segments,
    hint: companions.kids
      ? quotas.meals > 1
        ? "带孩子可以每两段歇一会儿，午、晚餐临近饭点时提前取号会更从容。"
        : quotas.meals === 1
          ? "带孩子可以每两段歇一会儿，正餐临近饭点时提前取号会更从容。"
          : "带孩子可以每两段歇一会儿，中间留些休息余量会更从容。"
      : quotas.meals > 0
        ? "按楼层顺着走，临近饭点可以提前取号。"
        : "按楼层顺着走，中间留些休息余量。",
  };
}

async function rewritePlanningMessage(
  userText: string,
  planCard: PlanCard,
  budget: TimeBudget,
  companions: Companions,
  salutation: string,
  revision?: PlanningRevisionContext,
): Promise<string> {
  const latestUserTurn = latestPlanningUserTurn(userText);
  const routeDigest = planCard.segments
    .map((segment) => `${segment.title}:${segment.items.map((item) => `${item.name}(${item.type};${item.note})`).join("、")}`)
    .join("\n");
  const previousRouteDigest = revision
    ? revision.previousPlanCard.segments
      .map((segment) => `${segment.title}:${segment.items.map((item) => item.name).join("、")}`)
      .join("\n")
    : "无";
  const currentVenueNames = planCard.segments.flatMap((segment) => segment.items.map((item) => item.name));
  const previousVenueNames = revision
    ? revision.previousPlanCard.segments.flatMap((segment) => segment.items.map((item) => item.name))
    : [];
  const previousVenueSet = new Set(previousVenueNames);
  const currentVenueSet = new Set(currentVenueNames);
  const addedVenues = currentVenueNames.filter((name) => !previousVenueSet.has(name));
  const removedVenues = previousVenueNames.filter((name) => !currentVenueSet.has(name));
  const retainedVenues = currentVenueNames.filter((name) => previousVenueSet.has(name));
  const explicitlyExcludedVenues = inferExcludedVisits(latestUserTurn, previousVenueNames)
    .filter((name) => previousVenueSet.has(name));
  const companionLabels: Record<PlanningRevisionContext["changedCompanions"][number], string> = {
    elderly: "老人",
    kids: "孩子",
    family: "家人",
    couple: "伴侣",
    friends: "朋友",
    solo: "独自",
  };
  const changedContext = revision?.changedCompanions.length
    ? revision.changedCompanions.map((key) => companionLabels[key]).join("、")
    : "无";
  const systemContent =
    "你是DTX商场成熟、专业且体贴的资深导购。路线已经确定,请写一段放在路线卡上方的简短回复。\n"
    + `1) 以「${salutation}」自然开场,称呼最多出现一次。只使用已确认的时间、同行人和路线事实,不猜测用户动机、偏好、人数或关系。\n`
    + "2) 只写两句自然口语,总长不超过110字。第一句用「我建议」或「可以」自然说安排,不说「安排先…」;第二句说「不用赶、有时间吃饭休息、少走回头路」这类具体好处,不写抽象感受。\n"
    + "3) 下方卡片会展示完整细节。首次规划不能省略用户明确要求的午饭或晚饭。调整方案必须如实说明前后变化:只删除时说「已去掉A」;同时有新增和移除时,明确说「把A换成B」;只有确实没有移除任何地点时,才能说「加进去」或「其他不变」。替换时最多点出这两个地点,不逐项报店。\n"
    + "4) 不新增卡片里没有的活动,不把导购的安排说成用户的选择,不暴露筛选、画像、打分、配额等内部过程。\n"
    + "5) 只输出给顾客看的回复正文,不输出JSON、标题、列表或解释。";
  const userContent =
    `用户本轮原话:${latestUserTurn}\n`
    + `已确认时间:${budgetDescription(budget)}\n`
    + `已确认同行人:${companionDescription(companions) || "未提及"}\n`
    + `本轮新确认的同行信息:${changedContext}\n`
    + `本轮明确不去:${explicitlyExcludedVenues.join("、") || "无"}\n`
    + `新增地点:${addedVenues.join("、") || "无"}\n`
    + `移除地点:${removedVenues.join("、") || "无"}\n`
    + `保留地点:${retainedVenues.join("、") || "无"}\n`
    + `上一版路线:\n${previousRouteDigest}\n`
    + `最终路线:\n${routeDigest}\n`
    + `路线底部提醒:${planCard.hint ?? "无"}`;

  let lastReason = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const messages: ChatMessage[] = [
        { role: "system", content: systemContent },
        { role: "user", content: userContent + (lastReason ? `\n上次回复不合适:${lastReason},请换一种自然说法。` : "") },
      ];
      const result = await chatCompletion(messages, [], { onToken: () => {} });
      const text = result.choices[0]?.message?.content?.trim() ?? "";
      const validation = validatePlanningMessage(text, userText, planCard, budget, companions, revision);
      if (validation.ok) return text;
      lastReason = validation.reason;
    } catch {
      lastReason = "话术生成失败";
    }
  }
  return buildPlanningMessageFallback(planCard, companions, salutation, revision, latestUserTurn);
}

function latestPlanningUserTurn(text: string): string {
  const turns = text.split(/(?:^|\n)第\d+轮用户原话：/).filter(Boolean);
  return turns.at(-1)?.trim() || text.trim();
}

/**
 * 模型不可用时从已校验的路线事实提炼话术，避免向顾客暴露技术故障。
 * 正常路径仍由 rewritePlanningMessage 的 Prompt 生成，这里不根据场景预写店铺推荐。
 */
function buildPlanningMessageFallback(
  planCard: PlanCard,
  companions: Companions,
  salutation: string,
  revision?: PlanningRevisionContext,
  latestUserTurn = "",
): string {
  const mealSegments = planCard.segments.filter((segment) => segment.iconKey === "dining");
  const experienceSegments = planCard.segments.filter((segment) => segment.iconKey !== "dining");
  const currentItems = planCard.segments.flatMap((segment) => segment.items);
  const currentNames = new Set(currentItems.map((item) => item.name));
  const previousEntries = revision?.previousPlanCard.segments.flatMap((segment) =>
    segment.items.map((item) => ({ item, iconKey: segment.iconKey }))) ?? [];
  const previousNames = new Set(previousEntries.map(({ item }) => item.name));
  const addedItems = currentItems.filter((item) => !previousNames.has(item.name));
  const removedEntries = previousEntries.filter(({ item }) => !currentNames.has(item.name));
  const removedExperience = removedEntries.find(({ iconKey }) => iconKey !== "dining") ?? removedEntries[0];
  const latestExcludedNames = new Set(inferExcludedVisits(
    latestUserTurn,
    previousEntries.map(({ item }) => item.name),
  ));
  const explicitlyRemoved = removedEntries.find(({ item }) => latestExcludedNames.has(item.name));
  const primaryRemoved = explicitlyRemoved ?? removedExperience;
  const matchedRequestedVenue = matchCatalogName(latestUserTurn)?.name;
  const requestedVenue = matchedRequestedVenue && !latestExcludedNames.has(matchedRequestedVenue)
    ? matchedRequestedVenue
    : undefined;
  const requestedAddedItem = addedItems.find((item) => item.name === requestedVenue);
  const childFocusedItem = addedItems.find((item) => /亲子|儿童|孩子|积木|乐园/.test(`${item.name} ${item.type} ${item.note}`))
    ?? currentItems.find((item) => /亲子|儿童|孩子|积木|乐园/.test(`${item.name} ${item.type} ${item.note}`));

  if (revision?.changedCompanions.includes("kids") && companions.kids) {
    if (childFocusedItem && removedExperience) {
      return `${salutation}，明白，带着孩子的话，我建议把${removedExperience.item.name}换成${childFocusedItem.name}。这样不用赶得更紧，孩子也有得玩，您看可以吗？`;
    }
    const focus = childFocusedItem ? `把${childFocusedItem.name}加进去，原来的安排都保留` : "按带孩子的节奏调整一下";
    return `${salutation}，明白，今天还带着孩子，我建议${focus}。这样不用赶，孩子也有得玩，您看可以吗？`;
  }

  if (revision?.changedCompanions.length) {
    const labels: Record<PlanningRevisionContext["changedCompanions"][number], string> = {
      elderly: "长辈",
      kids: "孩子",
      family: "家人",
      couple: "伴侣",
      friends: "朋友",
      solo: "独自到店",
    };
    const changedLabel = revision.changedCompanions.map((key) => labels[key]).join("、");
    const change = addedItems[0] && removedExperience
      ? `把${removedExperience.item.name}换成${addedItems[0].name}`
      : addedItems[0] ? `把${addedItems[0].name}加进去，原来的安排都保留` : "调整一下路线";
    return `${salutation}，明白，我建议按${changedLabel}同行的节奏，${change}。这样不用赶，吃饭和休息也能留够时间，您看可以吗？`;
  }

  if (revision && explicitlyRemoved) {
    if (addedItems[0]) {
      return `${salutation}，明白，我把${explicitlyRemoved.item.name}换成${addedItems[0].name}，其他安排都保留。这样不用重新赶路，吃饭和休息的时间也不变，您看可以吗？`;
    }
    return `${salutation}，明白，我已经把${explicitlyRemoved.item.name}去掉，其他安排都保留。这样不用为这一站赶路，吃饭和休息的时间也不变，您看可以吗？`;
  }

  if (revision && (requestedAddedItem || addedItems[0])) {
    const focus = requestedAddedItem ?? addedItems[0];
    if (primaryRemoved) {
      return `${salutation}，明白，我建议把${primaryRemoved.item.name}换成${focus.name}。这样不用赶得更紧，您看可以吗？`;
    }
    return `${salutation}，明白，我把${focus.name}加进去，原来的安排都保留。这样不用赶，您看可以吗？`;
  }

  if (companions.kids && childFocusedItem) {
    const rest = mealSegments.length > 1 ? "午饭、晚饭之间也能歇一会儿" : "吃饭前后也能歇一会儿";
    return `${salutation}，带着孩子的话，我建议先去${childFocusedItem.name}玩一会儿，其他地方尽量按楼层安排。这样孩子有得玩，${rest}，您看可以吗？`;
  }

  const requestedStore = requestedVenue
    ? STORES.find((store) => store.name === requestedVenue && currentNames.has(store.name))
    : undefined;
  const movieSegmentIndex = planCard.segments.findIndex((segment) =>
    segment.items.some((item) => STORES.some((store) => store.name === item.name && store.category === "影院娱乐")),
  );
  const dinnerSegmentIndex = planCard.segments.findLastIndex((segment) =>
    segment.iconKey === "dining" && /晚餐|晚饭/.test(segment.title),
  );
  const routeParts: string[] = [];
  if (requestedStore?.category === "影院娱乐") routeParts.push(`先去${requestedStore.name}看场电影`);
  else if (requestedStore) routeParts.push(`先去${requestedStore.name}逛逛`);
  else if (experienceSegments.length > 0) routeParts.push("先逛一会儿");

  if (mealSegments.length > 1) routeParts.push("午饭和晚饭都留够时间");
  else if (mealSegments.length === 1) {
    routeParts.push(/晚餐|晚饭/.test(mealSegments[0].title) ? "中间留出吃晚饭的时间" : "中间留出吃饭和休息的时间");
  }
  if (movieSegmentIndex >= 0 && requestedStore?.category !== "影院娱乐") {
    routeParts.push(movieSegmentIndex > dinnerSegmentIndex && dinnerSegmentIndex >= 0 ? "晚饭后再看场电影" : "再看场电影");
  }
  const planSummary = routeParts.join("，") || "路线排得松一点";
  const benefit = mealSegments.length > 0 ? "这样一路不用赶，吃饭和休息也更从容" : "这样一路不用赶，逛起来会更轻松";
  return `${salutation}，我建议${planSummary}。${benefit}，您看可以吗？`;
}

function isSafePlanningMessage(text: string, companions: Companions): boolean {
  if (!text) return false;
  if (/挑选逻辑|场景互补|决策价值|候选|画像|打分|配额|系统显示/.test(text)) return false;
  if (/您俩|你们俩|一家[234两三四]口/.test(text)) return false;
  if (!companionDescription(companions) && /同行|陪同|一起来/.test(text)) return false;
  if (!companions.kids && /带娃|带孩子|孩子|小朋友|宝宝|亲子/.test(text)) return false;
  if (!companions.family && !companions.kids && /家庭聚餐|一家人/.test(text)) return false;
  if (!companions.elderly && /带老人|长辈同行|老人友好/.test(text)) return false;
  return true;
}

function unsupportedPlanningActivity(text: string, planCard: PlanCard): string | undefined {
  const planText = [
    planCard.hint ?? "",
    ...planCard.segments.flatMap((segment) => [
      segment.title,
      ...segment.items.flatMap((item) => [item.name, item.type, item.note]),
    ]),
  ].join(" ");
  return ["散步", "咖啡", "茶歇", "看电影", "观影", "看展", "阅读"]
    .find((activity) => text.includes(activity) && !planText.includes(activity));
}

function validatePlanningMessage(
  text: string,
  userText: string,
  planCard: PlanCard,
  budget: TimeBudget,
  companions: Companions,
  revision?: PlanningRevisionContext,
): { ok: boolean; reason: string } {
  if (!isSafePlanningMessage(text, companions)) return { ok: false, reason: "出现内部表达或未确认的同行人推断" };
  if (text.length > 110) return { ok: false, reason: "回复超过110字,与下方卡片信息重复" };
  if (/兴致更稳|状态更稳定|舒适度随行程|加入体验区/.test(text)) {
    return { ok: false, reason: "表达抽象生硬,没有说清具体顾客收益" };
  }
  if (/已经排好了|照着走就行|我保留这个时间不动/.test(text)) {
    return { ok: false, reason: "口吻像系统汇报或命令" };
  }
  if (/，安排先|体验每处|感受会.{0,8}顺滑/.test(text)) {
    return { ok: false, reason: "句式不像当面给顾客建议" };
  }
  if (/正餐|重点体验|坐下来轻松观影|顺着衔接|节奏不会太挤/.test(text)) {
    return { ok: false, reason: "照抄了路线卡或使用了策划式表达，不够口语化" };
  }
  const latestUserTurn = latestPlanningUserTurn(userText);
  const plannedMealCount = planCard.segments.filter((segment) => segment.iconKey === "dining").length;
  const sentences = text.split(/[。！？]/).map((sentence) => sentence.trim()).filter(Boolean);
  if (sentences.length !== 2 || !/(不用|不会)赶|少(?:走|来回|折返)|留(?:出|够).{0,8}(?:吃饭|休息|歇)|吃饭和休息/.test(sentences[1])) {
    return { ok: false, reason: "第二句没有说清不赶路、少折返或便于吃饭休息的具体好处" };
  }
  if (!revision && /晚饭|晚餐/.test(latestUserTurn) && !/晚饭|晚餐/.test(text)) {
    return { ok: false, reason: "首次规划忽略了用户明确提到的晚饭" };
  }
  if (!revision && /午饭|午餐/.test(latestUserTurn) && !/午饭|午餐/.test(text)) {
    return { ok: false, reason: "首次规划忽略了用户明确提到的午饭" };
  }
  if (!revision && plannedMealCount > 1 && (!/午饭|午餐/.test(text) || !/晚饭|晚餐/.test(text))) {
    return { ok: false, reason: "全天路线的概括必须同时保留午饭和晚饭" };
  }
  if (/(皮具|手袋|包款)(?:新色|新款)?/.test(text) && !/(皮具|手袋|包款|包包|看包)/.test(latestUserTurn)) {
    return { ok: false, reason: "用户只说了品牌，不能擅自假定要看的商品品类" };
  }
  if (/您把.{0,24}(?:放在|安排在).{0,16}(?:明智|合适|很好)/.test(text) && !/采买|挑选|体验|用餐|吃饭|休息/.test(userText)) {
    return { ok: false, reason: "把导购的路线取舍误说成用户的选择" };
  }
  if (/您(?:想|希望|更看重|偏好)/.test(text)) {
    return { ok: false, reason: "把行程约束或导购取舍误推为用户偏好" };
  }
  const unsupportedActivity = unsupportedPlanningActivity(text, planCard);
  if (unsupportedActivity) return { ok: false, reason: `回复新增了路线卡不存在的活动:${unsupportedActivity}` };
  const currentVenueNames = planCard.segments.flatMap((segment) => segment.items.map((item) => item.name));
  const previousVenueNames = revision?.previousPlanCard.segments.flatMap((segment) => segment.items.map((item) => item.name)) ?? [];
  const previousVenueSet = new Set(previousVenueNames);
  const currentVenueSet = new Set(currentVenueNames);
  const addedNames = new Set(currentVenueNames.filter((name) => !previousVenueSet.has(name)));
  const removedNames = previousVenueNames.filter((name) => !currentVenueSet.has(name));
  const explicitlyExcludedNames = inferExcludedVisits(latestUserTurn, previousVenueNames)
    .filter((name) => previousVenueSet.has(name));
  const hasReplacement = Boolean(revision && addedNames.size > 0 && removedNames.length > 0);
  const mentionedVenues = [...new Set([...currentVenueNames, ...previousVenueNames])]
    .filter((name) => planningMessageMentionsVenue(text, name));
  if (!revision && mentionedVenues.some((name) => !planningMessageMentionsVenue(latestUserTurn, name))) {
    return { ok: false, reason: "首次方案回复复述了用户没有说过的店名" };
  }
  const mentionLimit = explicitlyExcludedNames.length > 0
    ? explicitlyExcludedNames.length + (hasReplacement ? 1 : 0)
    : hasReplacement ? 2 : 1;
  if (mentionedVenues.length > mentionLimit) return { ok: false, reason: "复述了卡片中过多店铺" };
  if (revision) {
    const matchedRequestedVenue = matchCatalogName(latestUserTurn)?.name;
    const requestedVenue = matchedRequestedVenue && !explicitlyExcludedNames.includes(matchedRequestedVenue)
      ? matchedRequestedVenue
      : undefined;
    if (requestedVenue && addedNames.has(requestedVenue) && !planningMessageMentionsVenue(text, requestedVenue)) {
      return { ok: false, reason: `没有回应本轮新增的地点:${requestedVenue}` };
    }
    if (hasReplacement && !removedNames.some((name) => planningMessageMentionsVenue(text, name))) {
      return { ok: false, reason: "路线实际移除了地点，回复却只说新增、没有说明替换" };
    }
    if (hasReplacement && ![...addedNames].some((name) => planningMessageMentionsVenue(text, name))) {
      return { ok: false, reason: "路线发生替换，回复没有点出新增地点" };
    }
    const unacknowledgedRemoval = explicitlyExcludedNames.find((name) => !planningMessageMentionsVenue(text, name));
    if (unacknowledgedRemoval) {
      return { ok: false, reason: `没有回应用户本轮要删除的地点:${unacknowledgedRemoval}` };
    }
    if (!hasReplacement && revision.changedCompanions.length > 0 && mentionedVenues.some((name) => !addedNames.has(name))) {
      return { ok: false, reason: "把上一版已有地点误说成本轮调整重点" };
    }
    const repeatedTimes = [budget.arrive, budget.leave]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.replace(/^约\s*/, "").trim())
      .filter((value) => value && text.includes(value));
    if (repeatedTimes.length > 1) return { ok: false, reason: "复述了未变的到离店时间" };
    if (revision.changedCompanions.includes("kids") && companions.kids && !/孩子|亲子|乐高/.test(text)) {
      return { ok: false, reason: "没有回应用户新增的孩子同行信息" };
    }
    if (revision.changedCompanions.includes("kids") && companions.kids) {
      const childFocusedAddedItems = planCard.segments
        .flatMap((segment) => segment.items)
        .filter((item) => addedNames.has(item.name) && /亲子|儿童|孩子|积木|乐园/.test(`${item.name} ${item.type} ${item.note}`));
      if (childFocusedAddedItems.length > 0 && !childFocusedAddedItems.some((item) => planningMessageMentionsVenue(text, item.name))) {
        return { ok: false, reason: "没有点出本轮新增的核心亲子体验" };
      }
    }
  }
  return { ok: true, reason: "" };
}

function planningMessageMentionsVenue(text: string, venueName: string): boolean {
  const compactText = text.replace(/\s+/g, "").toLowerCase();
  const compactName = venueName.replace(/\s+/g, "").toLowerCase();
  const shortName = compactName.replace(/(?:体验店|旗舰店|书店|餐厅|store)$/i, "");
  return compactText.includes(compactName) || (shortName.length >= 2 && compactText.includes(shortName));
}

/**
 * 第4层:planCard 可行性校验。返回 {ok,reason}。不通过触发重试。
 */
function validatePlanCard(
  planCard: PlanCard,
  quotas: PlanQuotas,
  companions: Companions,
  budget: TimeBudget,
  allowedNames: Set<string>,
  allowedFloorsByName: Map<string, string>,
  lockedItineraryNames: Set<string>,
  requiredChildVenueNames: Set<string>,
  familyDiningNames: Set<string>,
  excludedNames: Set<string>,
  revision?: PlanningRevisionContext,
): { ok: boolean; reason: string } {
  const segs = planCard.segments;
  const userFacingText = [
    planCard.title,
    planCard.hint ?? "",
    ...segs.flatMap((segment) => [
      segment.title,
      ...segment.items.flatMap((item) => [item.type, item.note]),
    ]),
  ].join(" ");
  if (/挑选逻辑|场景互补|决策价值|候选池|画像偏好|系统打分|配额/.test(userFacingText)) {
    return { ok: false, reason: "向用户暴露了内部推荐逻辑" };
  }
  const genericBrowseTitles = segs.filter((segment) => /到店(?:先)?逛|继续逛|慢逛/.test(segment.title));
  if (genericBrowseTitles.length > 0) {
    return { ok: false, reason: `段标题动作过于单一:${genericBrowseTitles[0].title}` };
  }
  if (/楼层待确认|用户明确要去/.test(userFacingText)) {
    return { ok: false, reason: "路线卡包含未核实的假地点或内部标记" };
  }
  if (segs.filter((segment) => /逛/.test(segment.title)).length > 1) {
    return { ok: false, reason: "多个段标题重复使用“逛”，需要改成具体动作" };
  }
  if (!companions.kids && /带娃|带孩子|带小孩|孩子|小朋友|宝宝|儿童友好|亲子家庭|亲子畅玩/.test(userFacingText)) {
    return { ok: false, reason: "用户未提带娃却输出了亲子人群推断" };
  }
  if (!companions.elderly && /带老人|长辈同行|老人友好/.test(userFacingText)) {
    return { ok: false, reason: "用户未提老人却输出了长辈人群推断" };
  }
  const itemNames = segs.flatMap((segment) => segment.items.map((item) => item.name.trim()));
  const unknownName = itemNames.find((name) => !allowedNames.has(name));
  if (unknownName) return { ok: false, reason: `店名/活动名不在候选集:${unknownName}` };
  const excludedItem = itemNames.find((name) => excludedNames.has(name));
  if (excludedItem) return { ok: false, reason: `路线仍包含用户明确不去的地点:${excludedItem}` };
  const missingLockedItem = [...lockedItineraryNames].find((name) => !itemNames.includes(name));
  if (missingLockedItem) return { ok: false, reason: `遗漏用户明确要去的地点:${missingLockedItem}` };
  if (revision && excludedNames.size > 0) {
    const currentNameSet = new Set(itemNames);
    const unexpectedlyRemoved = revision.previousPlanCard.segments
      .flatMap((segment) => segment.items.map((item) => item.name))
      .filter((name) => !excludedNames.has(name) && !currentNameSet.has(name));
    if (unexpectedlyRemoved.length > 0) {
      return { ok: false, reason: `删除指定地点时又改动了其他行程:${unexpectedlyRemoved.join("、")}` };
    }
  }
  if (revision?.changedCompanions.length) {
    const currentNameSet = new Set(itemNames);
    const currentDiningNames = segs
      .filter((segment) => segment.iconKey === "dining")
      .flatMap((segment) => segment.items.map((item) => item.name));
    const previousDiningNames = revision.previousPlanCard.segments
      .filter((segment) => segment.iconKey === "dining")
      .flatMap((segment) => segment.items.map((item) => item.name));
    const previousExperienceNames = revision.previousPlanCard.segments
      .filter((segment) => segment.iconKey !== "dining")
      .flatMap((segment) => segment.items.map((item) => item.name));
    const removedDiningNames = previousDiningNames.filter((name) => !currentNameSet.has(name));
    const removedExperienceNames = previousExperienceNames.filter((name) => !currentNameSet.has(name));
    const previousAlreadyHadSuitableDining = previousDiningNames.some((name) => familyDiningNames.has(name));
    if (previousAlreadyHadSuitableDining && currentDiningNames.some((name, index) => name !== previousDiningNames[index])) {
      return { ok: false, reason: "补充同行人后对调了原有的午餐和晚餐餐厅" };
    }
    if (removedDiningNames.length > 0 && previousAlreadyHadSuitableDining) {
      return { ok: false, reason: `补充同行人后无必要地更换了原有用餐:${removedDiningNames.join("、")}` };
    }
    if (removedDiningNames.length > 1) {
      return { ok: false, reason: `补充同行人后用餐调整过多:${removedDiningNames.join("、")}` };
    }
    if (removedExperienceNames.length > 1) {
      return { ok: false, reason: `补充同行人后重排过多，应最多替换一个非餐饮项:${removedExperienceNames.join("、")}` };
    }
  }
  for (const segment of segs) {
    const segmentFloor = floorZone(segment.floor ?? "");
    const itemFloors = new Set(
      segment.items
        .map((item) => floorZone(allowedFloorsByName.get(item.name.trim()) ?? ""))
        .filter(Boolean),
    );
    if (itemFloors.size > 1) return { ok: false, reason: `同一时段包含不同楼层地点:${segment.title}` };
    const [itemFloor] = itemFloors;
    if (itemFloor && segmentFloor !== itemFloor) {
      return { ok: false, reason: `时段楼层${segment.floor ?? "缺失"}与地点楼层${itemFloor}不一致:${segment.title}` };
    }
  }

  const arriveAt = parseClock(budget.arrive);
  const leaveAt = parseClock(budget.leave);
  let previousEnd: number | null = null;
  for (const segment of segs) {
    const clocks = [...segment.title.matchAll(/\d{1,2}[:：]\d{2}/g)]
      .map((match) => parseClock(match[0]))
      .filter((value): value is number => value !== null);
    if (arriveAt !== null && leaveAt !== null && clocks.length < 2) {
      return { ok: false, reason: `段标题缺完整起止时间:${segment.title}` };
    }
    if (clocks.length >= 2) {
      const [start, end] = clocks;
      if (end <= start) return { ok: false, reason: `时段先后顺序错误:${segment.title}` };
      if (arriveAt !== null && start < arriveAt) return { ok: false, reason: `行程早于用户到达时间:${segment.title}` };
      if (leaveAt !== null && end > leaveAt) return { ok: false, reason: `行程晚于用户离开时间:${segment.title}` };
      if (previousEnd !== null && start < previousEnd) return { ok: false, reason: `行程时段重叠:${segment.title}` };
      previousEnd = end;
    }
  }

  const floors = segs
    .map((segment) => segment.floor ? floorRank(segment.floor) : 99)
    .filter((rank) => rank !== 99);
  let direction = 0;
  let reversals = 0;
  for (let index = 1; index < floors.length; index++) {
    const nextDirection = Math.sign(floors[index] - floors[index - 1]);
    if (nextDirection === 0) continue;
    if (direction !== 0 && nextDirection !== direction) reversals += 1;
    direction = nextDirection;
  }
  const allowedReversals = lockedItineraryNames.size > 0 ? 1 : 0;
  if (reversals > allowedReversals) {
    return { ok: false, reason: `楼层动线存在${reversals}次折返` };
  }
  // 段总数超配额(堆砌,图8)
  if (segs.length > quotas.totalSegments + 1) {
    return { ok: false, reason: `段数${segs.length}超过上限${quotas.totalSegments}` };
  }
  // 正餐段数
  const diningSegs = segs.filter((s) => s.iconKey === "dining");
  if (diningSegs.length !== quotas.meals) {
    return { ok: false, reason: `正餐段${diningSegs.length}与需要的${quotas.meals}不一致` };
  }
  if (quotas.noMeal && diningSegs.length > 0) {
    return { ok: false, reason: "用户不吃却安排了正餐段" };
  }
  if (companions.kids && requiredChildVenueNames.size > 0 && !itemNames.some((name) => requiredChildVenueNames.has(name))) {
    return { ok: false, reason: "带孩子的路线没有安排可实际参与的亲子体验点" };
  }
  if (companions.kids && quotas.meals > 0 && familyDiningNames.size > 0 && !itemNames.some((name) => familyDiningNames.has(name))) {
    return { ok: false, reason: "带孩子的路线没有安排适合家庭用餐的餐厅" };
  }
  // 正餐后紧接茶歇(连吃):dining 段的下一个段是 coffee/茶歇
  for (let i = 0; i < segs.length - 1; i++) {
    if (segs[i].iconKey === "dining" && (segs[i + 1].iconKey === "coffee" || /茶歇|下午茶|咖啡/.test(segs[i + 1].title))) {
      return { ok: false, reason: `正餐段(${segs[i].title})后紧接茶歇(${segs[i + 1].title}),连吃` };
    }
  }
  // 同品类集中:用段里 item.type 近似判断(美妆/奢品/家居等),同关键词超 maxPerCategory
  const typeCount = new Map<string, number>();
  for (const seg of segs) {
    for (const it of seg.items) {
      const t = it.type || "";
      for (const key of ["美妆", "奢品", "皮具", "珠宝", "家居", "亲子", "数码", "运动"]) {
        if (t.includes(key)) typeCount.set(key, (typeCount.get(key) ?? 0) + 1);
      }
    }
  }
  for (const [key, cnt] of typeCount) {
    if (cnt > quotas.maxPerCategory) return { ok: false, reason: `${key}类出现${cnt}次超过${quotas.maxPerCategory}` };
  }
  // 段标题缺时序词
  for (const seg of segs) {
    if (!/\d{1,2}[:：点]|\d{1,2}点|上午|下午|午后|中午|傍晚|晚上|早晨|早上|到达|午间|晚间|饭前|饭后|出发前|先到|先逛|再到|离场前/.test(seg.title)) {
      return { ok: false, reason: `段标题缺时序词:${seg.title}` };
    }
  }
  // 人群适配:含同行人群但 note 全无适配词(宽松:只检老年人/孩子场景)
  if (companions.elderly || companions.kids) {
    const allNotes = segs.flatMap((s) => s.items.map((it) => it.note || "")).join("");
    const adaptHit = /老人|长辈|孩子|儿童|小朋友|休息|可坐|歇脚|轻松|节奏|无障碍|亲子|绘本|乐园/.test(allNotes);
    if (!adaptHit) return { ok: false, reason: "带老人/孩子但 note 未体现人群适配" };
  }
  return { ok: true, reason: "" };
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
      // 适合人群/场景:让 LLM 在带老人/孩子/朋友等同行人群时能据此挑选并写适配理由
      const audience = s.audience?.length ? `\n   适合人群：${s.audience.join("、")}` : "";
      const scenes = s.scenes?.length ? `\n   适合场景：${s.scenes.join("、")}` : "";
      return `${i + 1}. ${s.name}（${s.floor}）\n   品类：${s.categoryLabel}\n   ${s.priceRange}\n   推荐好物：${items}\n   亮点：${s.highlight}${audience}${scenes}${sa}${tip}`;
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
        + "3) 回复先给出明确建议,再自然点出每家最值得用户关心的到店收益(如体验、环境或当季特色),但不要解释你的筛选过程。\n"
        + "4) 禁止向用户输出“挑选逻辑”“场景互补”“决策价值”“候选”“打分”等内部推荐术语;不要复述卡片中的全部好物和价格。\n"
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

// ── 规划意图解析(LLM 理解,替代写死的正则猜测) ──────────────────────────
/**
 * 由大模型从用户原话理解规划意图与结构化参数,**不靠关键词正则匹配**。
 * 设计原则:意图理解交给模型,代码只接收结构化结果做纯逻辑(配额/筛选/校验)。
 * 解析失败时返回保守 fallback;显式规划语句仍由 isPlanningIntent 兜底判断。
 */
export interface ParsedPlanningIntent {
  /** 是否要做行程规划(整体安排),而非单点餐饮/零售/活动推荐 */
  isPlanning: boolean;
  /** 本轮是否在补充、修改或取消上一版路线的条件。 */
  updatesExistingPlan: boolean;
  /** 时间预算;span 为 null 表示用户没说待多久 → 触发反问 */
  timeBudget: { span: "halfday" | "fullday" | "evening" | null; arrive?: string; leave?: string; noMeal: boolean };
  /** 同行人群(模型从原话理解,未提到为 false) */
  companions: { elderly: boolean; kids: boolean; family: boolean; couple: boolean; friends: boolean; solo: boolean };
  /** 同行人群的用户原话证据;用来防止模型无根据推断。 */
  companionEvidence: { elderly: string; kids: string; family: string; couple: string; friends: string; solo: string };
  /** 口述打算去的店/活动/品牌(原话级别,代码再用 matchCatalogName 补楼层) */
  statedVisits: string[];
  /** 最新一轮对地点的增删操作，由模型理解否定、取消和恢复语义。 */
  visitChanges: Array<{ name: string; action: "add" | "remove" }>;
  /** 是否要安排正餐:null=未表达;true=要吃;false=明确不吃 */
  needMeal: boolean | null;
  /** 一句话概括核心诉求,供规划 prompt 参考 */
  coreAsk: string;
}

const PLANNING_INTENT_FALLBACK: ParsedPlanningIntent = {
  isPlanning: false,
  updatesExistingPlan: false,
  timeBudget: { span: null, noMeal: false },
  companions: { elderly: false, kids: false, family: false, couple: false, friends: false, solo: false },
  companionEvidence: { elderly: "", kids: "", family: "", couple: "", friends: "", solo: "" },
  statedVisits: [],
  visitChanges: [],
  needMeal: null,
  coreAsk: "",
};

type CompanionKey = keyof ParsedPlanningIntent["companions"];

const COMPANION_EVIDENCE_PATTERNS: Record<CompanionKey, RegExp> = {
  elderly: /老人|长辈|父母|爸妈|爷爷|奶奶|外公|外婆|我爸|我妈|老年/,
  kids: /带娃|娃|孩子|小孩|小朋友|宝宝|儿童|儿子|女儿|亲子|一家三口/,
  family: /家人|一家|全家|家庭|父母|爸妈|孩子|儿子|女儿/,
  couple: /情侣|对象|伴侣|男朋友|女朋友|老公|老婆|爱人|约会/,
  friends: /朋友|闺蜜|同事|同学/,
  solo: /独自|一个人|自己逛|我自己/,
};

function recentPlanningMessages(text: string, history: ChatMessage[]): ChatMessage[] {
  const recent = history
    .filter((message) => (message.role === "user" || message.role === "assistant") && typeof message.content === "string")
    .slice(-3);
  const last = recent[recent.length - 1];
  if (last?.role === "user" && last.content === text) return recent;
  return [...recent, { role: "user", content: text }];
}

function hasVerifiedCompanionEvidence(
  key: CompanionKey,
  claimed: unknown,
  evidence: unknown,
  sourceText: string,
): boolean {
  if (!claimed || typeof evidence !== "string") return false;
  const quote = evidence.trim();
  return quote.length > 0 && sourceText.includes(quote) && COMPANION_EVIDENCE_PATTERNS[key].test(quote);
}

export async function parsePlanningIntent(
  text: string,
  history: ChatMessage[] = [],
  hasPlanningSession = false,
): Promise<ParsedPlanningIntent> {
  const contextMessages = recentPlanningMessages(text, history);
  const sourceText = contextMessages
    .filter((message) => message.role === "user")
    .map((message) => message.content ?? "")
    .join("\n");
  const previousAssistantAskedForTime = [...contextMessages]
    .reverse()
    .find((message) => message.role === "assistant")
    ?.content?.includes("几点到") === true;
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是DTX商场的意图解析器。从用户的原话理解其逛商场诉求,输出严格JSON。不要靠关键词匹配,要理解语义。\n"
        + "字段说明:\n"
        + '- isPlanning: 用户是否想要一个"整体行程安排/规划"(如"怎么规划/安排一天/逛一圈/待多久/上午到晚上走/带XX随便逛逛"),而非单点询问(如只问"今天吃什么""想买包""Chanel在哪")。\n'
        + `- updatesExistingPlan: ${hasPlanningSession ? "当前已有一版路线。若用户本轮是在补充同行人、想去的地方、用餐、时间、偏好，或修改/取消旧条件，则为 true；补充条件不等于重置路线。只有明显开启一趟无关的新行程时才为 false。" : "当前没有上一版路线，必须为 false。"}\n`
        + '- timeBudget.span: 用户在商场待多久,fullday(逛一整天/上午到晚上)、halfday(半天/逛几个小时)、evening(仅晚上),没说则为 null。\n'
        + "- timeBudget.arrive/leave: 用户提到的到达/离开时刻(如\"10点\"\"上午\"\"晚上走\"),没提则省略。\n"
        + "- timeBudget.noMeal: 用户明确表示不安排吃饭(不吃/吃过了/不饿)。\n"
        + "- companions: 同行人群,elderly(老人长辈)/kids(孩子带娃)/family(家人一家)/couple(伴侣情侣)/friends(朋友闺蜜)/solo(独自)。只有用户原话明确提到才能为 true;不得从时间、想去的店、偏好或常识推测。\n"
        + "- companionEvidence: 为每个同行类型提供用户原话中能直接证明该类型的最短原文引用;没有证据必须是空字符串,对应 companions 必须是 false。\n"
        + "- statedVisits: 只提取最后一条用户消息中明确新增、恢复或保留的具体店铺、餐厅、活动或到店内容。否定或取消的地点不得写入该数组；不得从更早的用户消息或助手路线中抄取地点。\n"
        + '- visitChanges: 必须输出的数组，只记录最后一条用户消息对具体地点的操作。“想去/加上/还是去/保留”为{"name":"地点","action":"add"};“不想去/去掉/取消/换掉”为{"name":"地点","action":"remove"}。例如最新消息是“不想去无印良品”时，statedVisits必须为[]，visitChanges必须为[{"name":"无印良品","action":"remove"}]。\n'
        + "- needMeal: 是否要安排正餐,true要/false明确不吃/null未表达。注意 isPlanning 且 span 非空但用户没特别说吃饭时,null 即可(由时长推导)。\n"
        + "- coreAsk: 一句话概括用户核心诉求(给规划参考)。\n"
        + "若上一轮管家正在询问到达/离开时间,本轮用户只回复时间,仍属于行程规划,isPlanning 必须为 true。\n"
        + '只输出JSON，且必须包含所有字段：{"isPlanning":false,"updatesExistingPlan":false,"timeBudget":{"span":null,"noMeal":false},"companions":{"elderly":false,"kids":false,"family":false,"couple":false,"friends":false,"solo":false},"companionEvidence":{"elderly":"","kids":"","family":"","couple":"","friends":"","solo":""},"statedVisits":[],"visitChanges":[],"needMeal":null,"coreAsk":""}。'
        + "用户只补充‘上午10点到,下午4点离开’时,companions 全为 false,companionEvidence 全为空字符串,不得添加带娃等信息。",
    },
    ...contextMessages,
  ];
  try {
    const result = await chatCompletion(messages, [], { onToken: () => {} });
    const raw = result.choices[0]?.message?.content?.trim() ?? "";
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(jsonStr) as Partial<ParsedPlanningIntent>;
    const rawSpan = parsed.timeBudget?.span;
    const span = rawSpan === "halfday" || rawSpan === "fullday" || rawSpan === "evening" ? rawSpan : null;
    const evidence = parsed.companionEvidence ?? PLANNING_INTENT_FALLBACK.companionEvidence;
    const companions = {
      elderly: hasVerifiedCompanionEvidence("elderly", parsed.companions?.elderly, evidence.elderly, sourceText),
      kids: hasVerifiedCompanionEvidence("kids", parsed.companions?.kids, evidence.kids, sourceText),
      family: hasVerifiedCompanionEvidence("family", parsed.companions?.family, evidence.family, sourceText),
      couple: hasVerifiedCompanionEvidence("couple", parsed.companions?.couple, evidence.couple, sourceText),
      friends: hasVerifiedCompanionEvidence("friends", parsed.companions?.friends, evidence.friends, sourceText),
      solo: hasVerifiedCompanionEvidence("solo", parsed.companions?.solo, evidence.solo, sourceText),
    };
    const mentionedCurrentNames = new Set(mentionedVisitNames(text));
    const visitChanges = Array.isArray(parsed.visitChanges)
      ? parsed.visitChanges.flatMap((change) => {
        if (!change || typeof change.name !== "string" || (change.action !== "add" && change.action !== "remove")) return [];
        const catalog = matchCatalogName(change.name);
        if (!catalog || !mentionedCurrentNames.has(catalog.name)) return [];
        return [{ name: catalog.name, action: change.action }];
      })
      : [];
    return {
      isPlanning: Boolean(parsed.isPlanning) || (previousAssistantAskedForTime && span !== null),
      updatesExistingPlan: hasPlanningSession && Boolean(parsed.updatesExistingPlan),
      timeBudget: {
        span,
        arrive: parsed.timeBudget?.arrive,
        leave: parsed.timeBudget?.leave,
        noMeal: Boolean(parsed.timeBudget?.noMeal),
      },
      companions,
      companionEvidence: {
        elderly: companions.elderly ? evidence.elderly : "",
        kids: companions.kids ? evidence.kids : "",
        family: companions.family ? evidence.family : "",
        couple: companions.couple ? evidence.couple : "",
        friends: companions.friends ? evidence.friends : "",
        solo: companions.solo ? evidence.solo : "",
      },
      statedVisits: Array.isArray(parsed.statedVisits) ? parsed.statedVisits.filter((s): s is string => typeof s === "string") : [],
      visitChanges,
      needMeal: parsed.needMeal === true ? true : parsed.needMeal === false ? false : null,
      coreAsk: typeof parsed.coreAsk === "string" ? parsed.coreAsk : "",
    };
  } catch {
    const fallbackBudget = inferTimeBudget(sourceText);
    const companionKeys = inferCurrentCompanionUpdates(sourceText);
    const companions = {
      elderly: companionKeys.includes("elderly"),
      kids: companionKeys.includes("kids"),
      family: companionKeys.includes("family"),
      couple: companionKeys.includes("couple"),
      friends: companionKeys.includes("friends"),
      solo: companionKeys.includes("solo"),
    };
    return {
      ...PLANNING_INTENT_FALLBACK,
      isPlanning: isPlanningIntent(sourceText) || previousAssistantAskedForTime,
      updatesExistingPlan: hasPlanningSession && (
        inferCurrentCompanionUpdates(text).length > 0
        || /调整|改一下|换一下|重新排|重新规划/.test(text)
        || VISIT_EXCLUSION_PATTERN.test(text)
      ),
      timeBudget: fallbackBudget,
      companions,
      companionEvidence: {
        elderly: companions.elderly ? sourceText : "",
        kids: companions.kids ? sourceText : "",
        family: companions.family ? sourceText : "",
        couple: companions.couple ? sourceText : "",
        friends: companions.friends ? sourceText : "",
        solo: companions.solo ? sourceText : "",
      },
      statedVisits: inferStatedVisits(sourceText),
      visitChanges: [
        ...inferExcludedVisits(text).map((name) => ({ name, action: "remove" as const })),
        ...inferStatedVisits(text).map((name) => ({ name, action: "add" as const })),
      ],
      needMeal: fallbackBudget.noMeal ? false : null,
      coreAsk: sourceText,
    };
  }
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
      const normalizedBrand = brandName.toLowerCase();
      const storeHit = STORES.find((store) => store.name.toLowerCase() === normalizedBrand)
        ?? STORES.find((store) =>
          store.name.toLowerCase().includes(normalizedBrand)
          || triggers.some((trigger) => store.name.toLowerCase().includes(trigger.toLowerCase())));
      return { name: storeHit?.name ?? brandName, floor: storeHit?.floor ?? "" };
    }
  }
  // 2) STORES 店名直命中(乐高体验店/DTX精品超市 等)
  for (const store of STORES) {
    if (lower.includes(store.name.toLowerCase())) return { name: store.name, floor: store.floor };
  }
  // 3) 餐厅名命中
  for (const restaurant of RESTAURANTS) {
    if (lower.includes(restaurant.name.toLowerCase())) return { name: restaurant.name, floor: restaurant.floor };
  }
  // 4) 活动名命中(标题里常含品牌,如"Gucci Flora 美妆限时 pop-up")
  for (const act of ACTIVITIES) {
    if (lower.includes(act.title.toLowerCase())) return { name: act.title, floor: act.floor };
  }
  // 5) 用户可能说的是想做的内容而不是店名，用统一品类词表映射到最匹配的场所。
  for (const group of STORE_KEYWORDS) {
    const matchedKeys = group.keys.filter((key) => lower.includes(key.toLowerCase()));
    if (matchedKeys.length === 0) continue;
    const store = pickStoreForCategoryIntent(group.category, matchedKeys);
    if (store) return { name: store.name, floor: store.floor };
  }
  return null;
}

function pickStoreForCategoryIntent(category: StoreCategory, matchedKeys: string[]): RecommendableStore | undefined {
  const candidates = STORES.filter((store) => store.category === category);
  return [...candidates].sort((left, right) => {
    const score = (store: RecommendableStore) => {
      const searchable = `${store.name} ${store.categoryLabel} ${store.tags.join(" ")} ${store.scenes.join(" ")} ${store.recommendItems.join(" ")} ${store.highlight}`.toLowerCase();
      return matchedKeys.reduce((sum, key) => sum + (searchable.includes(key.toLowerCase()) ? 1 : 0), 0);
    };
    return score(right) - score(left);
  })[0];
}

const VISIT_EXCLUSION_PATTERN = /(?:不想|不打算|不要|别|不用)(?:再)?(?:去|看|逛|玩|体验)|不(?:再)?去|(?:去掉|删掉|移除|取消|换掉|不安排|排除)/;
const VISIT_RESTORE_PATTERN = /(?:想|打算|计划|准备|要|会|还是|继续|照旧|仍然)(?:再|先|还是)?(?:去|看|逛|玩|体验)|保留|加回来|别删/;

function planningUserTurns(text: string): string[] {
  return text.split(/(?:^|\n)第\d+轮用户原话：/).filter(Boolean);
}

/** 只提取文本中真实出现的地点，不在这里判断用户是要去还是不去。 */
function mentionedVisitNames(text: string, extraNames: string[] = []): string[] {
  const lower = text.toLowerCase();
  const names = [
    ...STORES.filter((store) => lower.includes(store.name.toLowerCase())).map((store) => store.name),
    ...RESTAURANTS.filter((restaurant) => lower.includes(restaurant.name.toLowerCase())).map((restaurant) => restaurant.name),
    ...ACTIVITIES.filter((activity) => lower.includes(activity.title.toLowerCase())).map((activity) => activity.title),
    ...extraNames.filter((name) => lower.includes(name.toLowerCase())),
  ];
  for (const [brandName, triggers] of Object.entries(brandKeywords)) {
    if (!triggers.some((trigger) => lower.includes(trigger.toLowerCase()))) continue;
    const store = STORES.find((candidate) => candidate.name.toLowerCase() === brandName.toLowerCase());
    if (store) names.push(store.name);
  }
  if (/电影|观影|影院/.test(text)) names.push("DTX 影院");
  if (/唱歌|唱k|ktv/i.test(text)) names.push("DTX KHOUSE KTV");
  return [...new Set(names)];
}

/** 按对话顺序维护排除状态：后一轮的“还是去/保留”可以覆盖早先的取消。 */
export function inferExcludedVisits(text: string, extraNames: string[] = []): string[] {
  const excluded = new Set<string>();
  for (const turn of planningUserTurns(text)) {
    const clauses = turn.split(/[，,。；;！！？?]/).map((clause) => clause.trim()).filter(Boolean);
    for (const clause of clauses) {
      const mentionedNames = mentionedVisitNames(clause, extraNames);
      if (mentionedNames.length === 0) continue;
      if (VISIT_EXCLUSION_PATTERN.test(clause)) {
        mentionedNames.forEach((name) => excluded.add(name));
      } else if (VISIT_RESTORE_PATTERN.test(clause)) {
        mentionedNames.forEach((name) => excluded.delete(name));
      }
    }
  }
  return [...excluded];
}

/** 模型不可用时仍能保留用户明确说要去的店、餐厅或内容。 */
function inferStatedVisits(text: string): string[] {
  const names = mentionedVisitNames(text);
  const userTurns = planningUserTurns(text);
  for (const turn of userTurns) {
    if (VISIT_EXCLUSION_PATTERN.test(turn) || !/想|顺便|打算|计划|安排|准备|要去|去逛|去看|去玩|体验/.test(turn)) continue;
    const normalizedTurn = turn.toLowerCase();
    for (const group of STORE_KEYWORDS) {
      const matchedKeys = group.keys.filter((key) => normalizedTurn.includes(key.toLowerCase()));
      if (matchedKeys.length === 0) continue;
      const store = pickStoreForCategoryIntent(group.category, matchedKeys);
      if (store) names.push(store.name);
    }
  }
  const excludedNames = new Set(inferExcludedVisits(text));
  return [...new Set(names)].filter((name) => !excludedNames.has(name));
}

/**
 * 按用户画像给零售店铺打分排序(镜像 rankActivities 的做法)。
 * brand 命中 +3;profile.categories 通过 store.category / categoryLabel 模糊匹配 +2;
 * profile.items 匹配 recommendItems/tags +1。用于规划时的画像驱动候选筛选。
 */
/**
 * 按画像 + 同行人群给零售店铺打分排序。
 * brand 命中 +3;profile.categories 命中 +2;profile.items 命中 +1。
 * 人群维度(第2层):带老人→适合歇脚/家人/可坐的店 +2,高强度户外/运动 -2;
 * 带孩子(用户确认带娃)→亲子娱乐/书店绘本区 +2。不匹配人群不强塞,降权即可。
 */
function rankStores(profile: UserProfile, companions?: Companions): Array<RecommendableStore & { score: number }> {
  const c = companions ?? { elderly: false, kids: false, friends: false, family: false, couple: false, solo: false, raw: "" };
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
    // 人群适配打分
    const audienceText = `${(store.audience ?? []).join(" ")} ${(store.scenes ?? []).join(" ")}`.toLowerCase();
    if (c.elderly) {
      if (/家人|亲子家庭|独居|逛街歇脚|约会|独自消磨/.test(audienceText) || store.category === "影院娱乐" || store.category === "亲子娱乐") {
        score += 2; // 有可坐/可歇/轻松的店对老人友好
      }
      if (store.category === "运动服饰" || /高强度|户外|冲锋|瑜伽课/.test(storeItemText)) {
        score -= 2; // 高强度运动店对老人不友好
      }
    }
    if (c.kids) {
      if (store.category === "亲子娱乐") score += 2;
      if (/绘本|儿童|亲子|小朋友/.test(audienceText)) score += 1;
    }
    return { ...store, score };
  })
    // 画像命中(>0)或人群明显适配的都保留;纯负分(人群减分到负)剔除
    .filter((s) => s.score > 0 || (c.elderly && s.category === "影院娱乐"))
    .sort((a, b) => b.score - a.score);
}

/** 多样性裁剪:每个品类最多保留 cap 家(按打分高低取,无分按原序),防止单品类占满候选池(图7根因)。 */
function applyDiversityCap(stores: Array<RecommendableStore & { score?: number }>, cap: number): RecommendableStore[] {
  const byCategory = new Map<string, Array<RecommendableStore & { score?: number }>>();
  for (const s of stores) {
    const arr = byCategory.get(s.category) ?? [];
    arr.push(s);
    byCategory.set(s.category, arr);
  }
  const out: RecommendableStore[] = [];
  // 按各品类内最高分轮取,保证跨品类均衡
  const buckets = [...byCategory.values()].map((arr) => arr.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)));
  let any = true;
  while (any) {
    any = false;
    for (const bucket of buckets) {
      if (bucket.length === 0) continue;
      const picked = bucket.shift()!;
      out.push(picked);
      // 该品类已达上限则清空桶
      if (out.filter((s) => s.category === picked.category).length >= cap) bucket.length = 0;
      any = true;
    }
  }
  return out;
}

function isFamilyFriendlyRestaurant(restaurant: Restaurant): boolean {
  return restaurant.scenes.some((scene) => /家庭|亲子/.test(scene))
    || restaurant.tags.some((tag) => /儿童|包间|可外带/.test(tag));
}

/** 餐厅筛选:带老人/孩子优先家庭聚餐、儿童友好、有包间的;否则跨菜系精选。 */
function pickFamilyFriendlyRestaurants(companions?: Companions): Restaurant[] {
  const c = companions;
  if (c && (c.elderly || c.kids || c.family)) {
    const preferredOrder = c.kids
      ? ["鼎泰丰", "翠园", "海底捞", "大董"]
      : ["翠园", "大董", "鼎泰丰", "海底捞"];
    const familyFit = preferredOrder
      .map((name) => RESTAURANTS.find((restaurant) => restaurant.name === name && isFamilyFriendlyRestaurant(restaurant)))
      .filter((restaurant): restaurant is Restaurant => Boolean(restaurant));
    if (familyFit.length >= 3) return familyFit.slice(0, 4);
    // 不够就补足
    const base = pickTodayPicks();
    const seen = new Set(familyFit.map((r) => r.id));
    return [...familyFit, ...base.filter((r) => !seen.has(r.id))].slice(0, 4);
  }
  const neutral = RESTAURANTS.filter((restaurant) => !restaurant.tags.some((tag) => /儿童|亲子/.test(tag)));
  const order = ["小吃快餐", "中餐", "西餐", "粤菜"];
  return order
    .map((cuisine) => neutral.find((restaurant) => restaurant.cuisine === cuisine))
    .filter((restaurant): restaurant is Restaurant => Boolean(restaurant))
    .slice(0, 4);
}

function isStrictlyChildFocusedStore(store: RecommendableStore): boolean {
  return store.category === "亲子娱乐"
    && store.audience.length > 0
    && store.audience.every((audience) => /亲子|小朋友|儿童/.test(audience));
}

function isChildFocusedActivity(activity: Activity): boolean {
  return /亲子|儿童|带娃|小朋友/.test(
    `${activity.title} ${activity.summary} ${activity.categories.join(" ")}`,
  );
}

/** 无明确带娃信号时,规划默认候选不放入纯亲子场所。 */
function pickPlanningFallbackStores(companions?: Companions): RecommendableStore[] {
  const order: StoreCategory[] = companions?.kids
    ? ["亲子娱乐", "影院娱乐", "家居生活", "数码电器", "生鲜超市"]
    : ["家居生活", "数码电器", "影院娱乐", "运动服饰", "美妆个护", "生鲜超市"];
  const picks: RecommendableStore[] = [];
  for (const category of order) {
    const store = STORES.find((candidate) =>
      candidate.category === category
      && (companions?.kids || !isStrictlyChildFocusedStore(candidate)));
    if (store) picks.push(store);
  }
  return picks;
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
  companions?: Companions,
  previousPlanCard?: PlanCard,
  excludedNames: Set<string> = new Set(),
): { restaurants: Restaurant[]; stores: RecommendableStore[]; activities: Activity[]; teaShops: RecommendableStore[] } {
  // 已锁定/打算去的店名 —— 必须保留在候选池里(用户必去,要纳入行程卡),
  // 只是不再作为"新推荐"重复推。去重靠 LLM 唯一性约束 + prompt 说明。
  const lockedNames = new Set(itinerary.map((item) => item.brandOrName));
  const previousNames = new Set(
    (previousPlanCard?.segments.flatMap((segment) => segment.items.map((item) => item.name)) ?? [])
      .filter((name) => !excludedNames.has(name)),
  );
  const protectedNames = new Set([...lockedNames, ...previousNames]);

  // ── 店铺:画像+人群打分,再按品类裁剪(每品类≤2,治图7单品类满池)
  const rankedStores = rankStores(profile, companions)
    .filter((store) => !excludedNames.has(store.name))
    .filter((store) => companions?.kids || !isStrictlyChildFocusedStore(store));
  // 画像命中与通用场景始终混合,避免通用规划被单一偏好占满。
  const generalPicks = pickPlanningFallbackStores(companions)
    .filter((store) => !excludedNames.has(store.name));
  const previousStores = STORES.filter((store) => previousNames.has(store.name));
  const freshStores = applyDiversityCap([
    ...rankedStores.slice(0, 4),
    ...generalPicks,
  ].filter((store, index, all) => all.findIndex((candidate) => candidate.id === store.id) === index), 2);
  let stores: RecommendableStore[] = [...previousStores, ...freshStores]
    .filter((store, index, all) => all.findIndex((candidate) => candidate.id === store.id) === index)
    .slice(0, 8);
  // 把已锁定店(若存在于 STORES)补进候选池头部,确保 LLM 能把它纳入行程
  const lockedStores = STORES.filter((s) => !excludedNames.has(s.name) && lockedNames.has(s.name) && !stores.some((x) => x.id === s.id));
  if (lockedStores.length > 0) {
    stores = [...lockedStores, ...stores].slice(0, 8);
  }
  if (companions?.kids) {
    const requiredNames = new Set(["乐高体验店"].filter((name) => !excludedNames.has(name)));
    const requiredStores = STORES.filter((store) => requiredNames.has(store.name));
    for (const requiredStore of requiredStores) {
      if (stores.some((store) => store.id === requiredStore.id)) continue;
      let replaceIndex = -1;
      for (let index = stores.length - 1; index >= 0; index--) {
        const candidate = stores[index];
        if (!protectedNames.has(candidate.name) && !requiredNames.has(candidate.name)) {
          replaceIndex = index;
          break;
        }
      }
      if (stores.length < 8 || replaceIndex < 0) stores.push(requiredStore);
      else stores.splice(replaceIndex, 1, requiredStore);
    }
  }
  // 仅对已有真实楼层的结构化预约合成候选，不让泛词成为“楼层待确认”的假店铺。
  const withoutStoreEntry = itinerary.filter(
    (item) => item.floor
      && !stores.some((store) => store.name === item.brandOrName)
      && !RESTAURANTS.some((restaurant) => restaurant.name === item.brandOrName)
      && !ACTIVITIES.some((activity) => activity.title === item.brandOrName),
  );
  for (const item of withoutStoreEntry) {
    if (stores.some((s) => s.name === item.brandOrName)) continue;
    stores.unshift({
      id: `locked-${item.brandOrName}`,
      name: item.brandOrName,
      floor: item.floor,
      category: "时尚奢品",
      categoryLabel: item.brandOrName,
      scenes: [],
      audience: [],
      priceRange: "请到店咨询",
      priceLevel: 4,
      tags: [],
      highlight: "这是已确认的到店安排,按预约时间前往即可。",
      recommendItems: [],
    });
  }

  // ── 活动:复用 rankActivities,无命中取前 6;补入已锁定活动
  const rankedActivities = rankActivities(profile);
  const activityPool = (rankedActivities.length > 0 ? rankedActivities : ACTIVITIES)
    .filter((activity) => !excludedNames.has(activity.title))
    .filter((activity) => companions?.kids || !isChildFocusedActivity(activity));
  const activitiesBase = activityPool.slice(0, 6);
  const lockedActivities = ACTIVITIES.filter(
    (activity) => !excludedNames.has(activity.title)
      && lockedNames.has(activity.title)
      && !activitiesBase.some((candidate) => candidate.id === activity.id),
  );
  const previousActivities = ACTIVITIES.filter((activity) => previousNames.has(activity.title));
  const activities = [...lockedActivities, ...previousActivities, ...activitiesBase]
    .filter((activity, index, all) => all.findIndex((candidate) => candidate.id === activity.id) === index)
    .slice(0, 8);

  // ── 餐饮:带老人孩子优先家庭聚餐/儿童友好;正餐与茶歇分开
  const previousRestaurantNames = previousPlanCard?.segments
    .filter((segment) => segment.iconKey === "dining")
    .flatMap((segment) => segment.items.map((item) => item.name))
    .filter((name) => !excludedNames.has(name)) ?? [];
  const previousRestaurants = previousRestaurantNames
    .map((name) => RESTAURANTS.find((restaurant) => restaurant.name === name))
    .filter((restaurant): restaurant is Restaurant => Boolean(restaurant));
  const restaurants = [...previousRestaurants, ...pickFamilyFriendlyRestaurants(companions)]
    .filter((restaurant) => !excludedNames.has(restaurant.name))
    .filter((restaurant, index, all) => all.findIndex((candidate) => candidate.id === restaurant.id) === index)
    .slice(0, 6);
  // 茶歇/咖啡:从 STORES 里取咖啡茶饮类(目前数据里暂无独立茶饮店,用餐厅里的茶饮咖啡类兜底)
  const teaShops = STORES
    .filter((store) => !excludedNames.has(store.name))
    .filter((store) => /咖啡|茶饮|茶/.test(`${store.categoryLabel} ${store.tags.join(" ")}`))
    .slice(0, 3);

  return { restaurants, stores, activities, teaShops };
}

/**
 * 反问需求 —— 中性的"怎么规划路线"且无任何信号/行程时,先问清主要安排再规划,
 * 不直接出 planCard。话术走真人导购口吻,只随口带一下用户平日爱看的方向(像聊天,
 * 不像念档案),不直陈"会员档案/偏好记录"这类内部数据痕迹。
 * 4 个快捷回复都自带信号词,点击后下一轮会因有信号而直接进入规划,闭合流程。
 */
// ── 第0层:时间预算 + 同行人群提取,以及缺时长的反问 ───────────────────────

export interface TimeBudget {
  /** 用户大致在场跨度:半天/全天/仅晚上。决定配额,不做硬性时刻约束。 */
  span: "halfday" | "fullday" | "evening";
  /** 原文里能识别出的到达时刻(如 "10点""上午"),识别不到为 undefined */
  arrive?: string;
  /** 原文里能识别出的离开时刻 */
  leave?: string;
  /** 用户明确表示不安排正餐 */
  noMeal: boolean;
  /** 是否成功识别到任何时长信号(span 之外的强信号也算) */
  detected: boolean;
  raw: string;
}

/** 同行人群:老人/孩子/朋友/家人/伴侣/独自。 */
export interface Companions { elderly: boolean; kids: boolean; friends: boolean; family: boolean; couple: boolean; solo: boolean; raw: string }

interface PlanningSession {
  budget: TimeBudget;
  companions: Companions;
  planCard: PlanCard;
  /** 当前路线相关的用户原话。后续调整必须在完整上下文上增量合并，而不是只看最后一句。 */
  userTurns: string[];
}

interface PendingPlanningRequest {
  sourceText: string;
}

let lastPlanningSession: PlanningSession | null = null;
let pendingPlanningRequest: PendingPlanningRequest | null = null;

/** 路由层用于判断无主题短句是否仍属于当前路线的增量补充。 */
export function hasActivePlanningSession(): boolean {
  return lastPlanningSession !== null;
}

export function resetStoreRecommendState(): void {
  lastServingKind = null;
  lastPlanningSession = null;
  pendingPlanningRequest = null;
}

const CURRENT_COMPANION_PATTERNS: Record<CompanionKey, RegExp> = {
  elderly: /老人|长辈|父母|爸妈|爷爷|奶奶|外公|外婆|我爸|我妈/,
  kids: /带(?:着)?(?:娃|孩子|小孩|宝宝)|和(?:孩子|小孩|宝宝)|儿子|女儿|一家三口/,
  family: /家人|一家人|全家|家庭同行/,
  couple: /情侣|对象|伴侣|男朋友|女朋友|老公|老婆|爱人/,
  friends: /朋友|闺蜜|同事|同学/,
  solo: /独自|一个人|自己逛|我自己/,
};

function inferCurrentCompanionUpdates(text: string): CompanionKey[] {
  return (Object.keys(CURRENT_COMPANION_PATTERNS) as CompanionKey[])
    .filter((key) => CURRENT_COMPANION_PATTERNS[key].test(text));
}

export function isPlanningContinuation(text: string): boolean {
  if (!pendingPlanningRequest) return false;
  if (OTHER_DOMAIN_PATTERN.test(text)) return false;
  return text.length <= 40 && (
    /(?:早上|上午|中午|下午|傍晚|晚上)?\s*\d{1,2}(?::\d{2}|点半?|点)\s*(?:到|来|抵达|走|离开|离场|结束)?/.test(text)
    || /半天|一整天|逛一天|几个小时|晚饭后/.test(text)
    || /必去|想去|打算去|会去|想逛|想看|想吃|看电影|观影|买|采买|亲子|带娃|带孩子/.test(text)
    || /^(?:没有|没了|都可以|随便|没什么倾向|你看着安排)[。！！？?]*$/.test(text.trim())
  );
}

function planningClarificationFallback(sourceText: string, salutation: string): string {
  const inferred = inferTimeBudget(sourceText);
  const visits = inferStatedVisits(sourceText);
  const hasMovie = visits.includes("DTX 影院");
  const hasVisit = visits.length > 0;
  const visitDay = sourceText.match(/周[一二三四五六日天]/)?.[0];
  if (hasMovie) {
    return `${salutation}，可以，我会围绕晚饭后的电影来安排${visitDay ? `${visitDay}下午` : "下午"}；您大概几点到、电影几点开场？如果还有必去的店，或更想安排用餐、采买、亲子体验，也一起告诉我，我把前后时间衔接好。`;
  }
  const missingTimeQuestion = inferred.arrive
    ? "您大概准备几点离开？"
    : inferred.leave
      ? "您大概几点到？"
      : "您大概几点到、几点离开？";
  const knownArrangement = hasVisit
    ? `我会把${visits.slice(0, 2).join("、")}作为路线里的必去环节`
    : "我会按您在店的时间把路线排顺";
  return `${salutation}，可以，${missingTimeQuestion}如果已经有必去的店，或更想安排吃饭、采买、亲子体验、看电影这类内容，也可以一起告诉我，${knownArrangement}。`;
}

/** 追问未补齐的时间，同时给用户补充必去店与兴趣方向的空间。 */
async function askPlanningDetails(sourceText: string, salutation: string): Promise<{ text: string; quickReplies: string[] }> {
  const inferred = inferTimeBudget(sourceText);
  const visits = inferStatedVisits(sourceText);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是DTX商场成熟、专业且体贴的资深导购。用户想要规划路线，但时间还不足以落地。\n"
        + `以「${salutation}」自然开场，只写两句、不超过110字。\n`
        + "第一句自然接住用户已经说过的日期、同行人或已安排内容，只追问缺少的到店/离店时间。\n"
        + "第二句顺带询问是否有必去的店，或更想逛的品类、用餐、亲子、电影等方向；说清这些信息会如何帮助安排。\n"
        + "用户已经说过的必去店或内容不要再问，而是提炼为路线锚点；例如已说晚饭后看电影，就询问电影开场时间，不再问是否想看电影。\n"
        + "不猜测动机，不说“有了这个时间”或其他固定套话，只输出顾客可见正文。",
    },
    {
      role: "user",
      content:
        `用户已表达的规划需求:${sourceText}\n`
        + `已知到店时间:${inferred.arrive ?? "未知"}\n`
        + `已知离店时间:${inferred.leave ?? "未知"}\n`
        + `已知必去内容:${visits.join("、") || "未提及"}`,
    },
  ];
  let text = "";
  try {
    const result = await chatCompletion(messages, [], { onToken: () => {} });
    text = result.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    text = "";
  }
  return {
    text: text && text.length <= 180 ? text : planningClarificationFallback(sourceText, salutation),
    quickReplies: [
      "上午10点到，晚饭后离开",
      "下午1点到，逛半天",
      "晚上6点到，逛两三小时",
      "没有特别倾向",
    ],
  };
}

/** LLM 解析异常时的保守时长兜底,只处理明确时长/时间段表达。 */
function inferTimeBudget(text: string): ParsedPlanningIntent["timeBudget"] {
  const timePattern = "(?:早上|上午|中午|下午|傍晚|晚上)?\\s*\\d{1,2}(?::\\d{2}|点半?|点)";
  const times = [...text.matchAll(new RegExp(timePattern, "g"))].map((match) => match[0].trim());
  const explicitArrive = text.match(new RegExp(`(${timePattern})\\s*(?:到|来|抵达)`))?.[1]?.trim();
  const explicitLeave = text.match(new RegExp(`(${timePattern})\\s*(?:走|离开|离场|结束)`))?.[1]?.trim();
  const arrivesInMorning = /(?:早上|上午)[^。]*(?:到|来|抵达)/.test(text);
  const leavesAfterDinner = /(?:晚饭|晚餐)(?:后)?[^。]*(?:走|离开|离场|结束)/.test(text);
  let span: ParsedPlanningIntent["timeBudget"]["span"] = null;
  if (/一整天|逛一天/.test(text) || (arrivesInMorning && leavesAfterDinner) || /从?上午[^\u3002]*(晚上|晚饭后)/.test(text)) span = "fullday";
  else if (/只?晚上|晚间|傍晚/.test(text) && !/上午|中午|下午/.test(text)) span = "evening";
  else if (/半天|几个小时|两三个小时/.test(text) || TIME_BUDGET_PATTERN.test(text)) span = "halfday";
  else if (explicitArrive && /下午/.test(explicitArrive) && PLANNING_PATTERN.test(text)) span = "halfday";

  const qualitativeArrive = /上午[^。]*(?:到|来|抵达)/.test(text)
    ? "上午"
    : /早上[^。]*(?:到|来|抵达)/.test(text)
      ? "早上"
      : /下午[^。]*(?:到|来|抵达)/.test(text) ? "下午" : undefined;
  const qualitativeLeave = leavesAfterDinner
    ? "晚饭后"
    : /晚上[^。]*(?:走|离开|离场|结束)/.test(text) ? "晚上" : undefined;
  return {
    span,
    arrive: explicitArrive ?? times[0] ?? qualitativeArrive,
    leave: explicitLeave ?? (times.length > 1 ? times[times.length - 1] : qualitativeLeave),
    noMeal: /不吃|吃过了|不饿|不安排(吃饭|正餐)/.test(text),
  };
}

// ── 第1层:由时间预算推导配额(全部由时长决定,不写死) ─────────────────────

export interface PlanQuotas {
  /** 正餐段数:整天2(午+晚)、半天1、仅晚上1;noMeal 强制0 */
  meals: number;
  /** 茶歇/咖啡段数 */
  tea: number;
  /** 非餐饮逛购段数 */
  retailSegments: number;
  /** 段总数上限(治图8堆砌) */
  totalSegments: number;
  /** 同一品类一天最多几家 */
  maxPerCategory: number;
  span: TimeBudget["span"];
  noMeal: boolean;
}

export function deriveQuotas(budget: TimeBudget): PlanQuotas {
  if (budget.noMeal) {
    // 显式不吃:正餐0,纯逛购+可选茶歇
    return {
      meals: 0,
      tea: budget.span === "fullday" ? 1 : 0,
      retailSegments: budget.span === "fullday" ? 5 : 3,
      totalSegments: budget.span === "fullday" ? 6 : 3,
      maxPerCategory: 2,
      span: budget.span,
      noMeal: true,
    };
  }
  switch (budget.span) {
    case "fullday":
      return { meals: 2, tea: 1, retailSegments: 4, totalSegments: 7, maxPerCategory: 2, span: "fullday", noMeal: false };
    case "evening":
      // 仅晚上:1 正餐(晚餐)或纯逛吃茶歇;默认1餐,时段短
      return { meals: 1, tea: 0, retailSegments: 2, totalSegments: 3, maxPerCategory: 2, span: "evening", noMeal: false };
    case "halfday":
    default:
      return { meals: 1, tea: 1, retailSegments: 3, totalSegments: 5, maxPerCategory: 2, span: "halfday", noMeal: false };
  }
}

// ── Skill 定义 ──────────────────────────────────────────────

export const storeRecommendSkill: Skill = {
  name: "store-recommend",
  intentDescription:
    "店铺/餐饮推荐专属,统一'逛吃购'推荐入口。当用户问美食推荐、想吃什么、今天吃什么、求推荐餐厅,或想逛店、想买某类好物(包/表/生鲜/美妆/亲子/家居)、带娃去哪逛、店铺推荐时调用。根据需求分流:餐饮走餐厅卡(RestaurantCard),零售/服务走品牌卡(BrandCard),两者都想要时混排。若用户说了想吃的菜系/口味填 cuisine 参数,说了想逛的品类填 category 参数;未说明则留空。注:查具体品牌位置/新品/联系SA走 store-consult;挑具体商品(七夕买什么)走 product-recommend;本skill只负责'推荐店铺/餐厅'。",
  match: () => true,
  handle: async ({ text, toolArgs, userProfile, appointmentInfo, activityBookingInfo, queueInfo, parkingInfo, conversationHistory }) => {
    const salutation = getUserSalutation(userProfile);
    const continuesActivePlanning = toolArgs?.continuePlanning === true && lastPlanningSession !== null;
    const continuesPendingPlanning = isPlanningContinuation(text);
    const planningSourceText = continuesPendingPlanning && pendingPlanningRequest
      ? `${pendingPlanningRequest.sourceText}\n用户补充:${text}`
      : text;
    const startsFreshPlanning = !continuesPendingPlanning
      && isPlanningIntent(text)
      && !/调整|改一下|换一下|重新排|重新规划/.test(text)
      && !VISIT_EXCLUSION_PATTERN.test(text);
    if (startsFreshPlanning) pendingPlanningRequest = null;

    const changedCompanions = inferCurrentCompanionUpdates(text);
    // ── 规划意图优先:LLM 负责语义理解,明确规划/时间表达做可靠性兜底 ──
    const parsed = await parsePlanningIntent(
      planningSourceText,
      startsFreshPlanning ? [] : conversationHistory,
      Boolean(lastPlanningSession && !startsFreshPlanning),
    );
    const inferredBudget = inferTimeBudget(planningSourceText);
    const isPlanningRevision = Boolean(
      lastPlanningSession
      && !startsFreshPlanning
      && (
        continuesActivePlanning
        || parsed.updatesExistingPlan
        || changedCompanions.length > 0
        || /调整|改一下|换一下|重新排|重新规划/.test(text)
        || VISIT_EXCLUSION_PATTERN.test(text)
      ),
    );
    const planningTurns = isPlanningRevision && lastPlanningSession
      ? [...lastPlanningSession.userTurns, text].slice(-12)
      : [planningSourceText];
    const rememberedPlanningText = planningTurns
      .map((turn, index) => `第${index + 1}轮用户原话：${turn}`)
      .join("\n");
    const previousBudget = isPlanningRevision ? lastPlanningSession?.budget : undefined;
    const resolvedBudget: ParsedPlanningIntent["timeBudget"] = {
      span: inferredBudget.span ?? previousBudget?.span ?? parsed.timeBudget.span ?? null,
      arrive: inferredBudget.arrive ?? previousBudget?.arrive ?? parsed.timeBudget.arrive,
      leave: inferredBudget.leave ?? previousBudget?.leave ?? parsed.timeBudget.leave,
      noMeal: parsed.timeBudget.noMeal || inferredBudget.noMeal || previousBudget?.noMeal === true,
    };
    const shouldPlan = continuesPendingPlanning || continuesActivePlanning || parsed.isPlanning || parsed.updatesExistingPlan || isPlanningIntent(text) || isPlanningRevision;
    if (shouldPlan) {
      const previousRouteNames = lastPlanningSession?.planCard.segments
        .flatMap((segment) => segment.items.map((item) => item.name)) ?? [];
      const excludedNames = new Set(inferExcludedVisits(rememberedPlanningText, previousRouteNames));
      for (const change of parsed.visitChanges) {
        if (change.action === "remove") excludedNames.add(change.name);
        else excludedNames.delete(change.name);
      }
      // 行程锚点:结构化预约 + 解析出的口述去某地(用 matchCatalogName 补楼层,纯数据查找非意图)
      const structuredItinerary = buildItinerary({ appointmentInfo, activityBookingInfo, queueInfo })
        .filter((item) => !excludedNames.has(item.brandOrName));
      const itinerary = [...structuredItinerary];
      const itineraryNames = new Set(structuredItinerary.map((item) => item.brandOrName));
      // 用本地目录回落模型解析结果，“服饰”“特色活动”等泛词不能成为必去地点。
      const modelStatedVisits = [
        ...parsed.statedVisits,
        ...parsed.visitChanges.filter((change) => change.action === "add").map((change) => change.name),
      ].flatMap((name) => {
        const catalog = matchCatalogName(name);
        return catalog ? [catalog.name] : [];
      });
      const statedVisits = [...new Set([...inferStatedVisits(rememberedPlanningText), ...modelStatedVisits])]
        .filter((name) => !excludedNames.has(name));
      for (const visitName of statedVisits) {
        const catalog = matchCatalogName(visitName);
        const name = catalog?.name ?? visitName;
        if (!itineraryNames.has(name)) {
          itineraryNames.add(name);
          itinerary.push({
            label: `${name}${catalog?.floor ? ` ${catalog.floor}` : ""}(您打算去)`,
            brandOrName: name,
            floor: catalog?.floor ?? "",
            type: "activity",
          });
        }
      }

      // 缺时间预算 → 保留待补全状态,下一轮短回复仍回到本 skill。
      if (resolvedBudget.span == null) {
        pendingPlanningRequest = { sourceText: planningSourceText };
        const ask = await askPlanningDetails(planningSourceText, salutation);
        return { text: ask.text, quickReplies: ask.quickReplies };
      }

      // 时长已有 → 推导配额(needMeal=false 强制0餐,noMeal 同理)→ 规划 → 校验
      const budget: TimeBudget = {
        span: resolvedBudget.span,
        arrive: resolvedBudget.arrive,
        leave: resolvedBudget.leave,
        noMeal: resolvedBudget.noMeal || parsed.needMeal === false,
        detected: true,
        raw: rememberedPlanningText,
      };
      const quotas = deriveQuotas(budget);
      const previousCompanions = isPlanningRevision ? lastPlanningSession?.companions : undefined;
      const wasExplicitlyUpdated = (key: CompanionKey) => changedCompanions.includes(key);
      const companions: Companions = {
        elderly: wasExplicitlyUpdated("elderly") || parsed.companions.elderly || previousCompanions?.elderly === true,
        kids: wasExplicitlyUpdated("kids") || parsed.companions.kids || previousCompanions?.kids === true,
        family: wasExplicitlyUpdated("family") || parsed.companions.family || previousCompanions?.family === true,
        couple: wasExplicitlyUpdated("couple") || parsed.companions.couple || previousCompanions?.couple === true,
        friends: wasExplicitlyUpdated("friends") || parsed.companions.friends || previousCompanions?.friends === true,
        solo: wasExplicitlyUpdated("solo") || parsed.companions.solo || previousCompanions?.solo === true,
        raw: text,
      };
      const revision: PlanningRevisionContext | undefined = isPlanningRevision && lastPlanningSession
        ? {
          previousPlanCard: lastPlanningSession.planCard,
          changedCompanions,
        }
        : undefined;
      const reply = await rewritePlanning(
        rememberedPlanningText,
        userProfile,
        itinerary,
        parkingInfo,
        budget,
        companions,
        quotas,
        salutation,
        excludedNames,
        revision,
      );

      if (reply.planCard) {
        lastPlanningSession = { budget, companions, planCard: reply.planCard, userTurns: planningTurns };
        pendingPlanningRequest = null;
      }

      return {
        text: reply.text,
        planCard: reply.planCard,
        quickReplies: ["调整一下路线", "导航到第一站", "查询停车状态"],
      };
    }

    // ── 非规划:单点餐饮/零售/活动推荐 ──
    let intent = classifyRecommendIntent(text);

    // ── 追问沿用上轮口径 ────────────────────────────────────
    if (isLocalFollowUp(text) && lastServingKind && intent === "retail" && !isDiningIntent(text)) {
      intent = lastServingKind;
    }

    // 记录本轮口径,供下一轮追问沿用(mixed 记成上一段实际服务的口径:优先餐饮)
    lastServingKind = intent === "mixed" ? "dining" : intent;

    // 统一活动摘要:有画像偏好时优先返回高匹配活动,无画像时返回全量,供各分支
    // 作为"顺路提醒"候选综合进推荐话术(餐饮/零售/规划都带)。
    const activityDigest = getActivityDigestForBranch(userProfile);

    // ── 单点推荐分支:餐饮/零售/活动 ──(规划已在上面的 parsed.isPlanning 分支处理)
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
