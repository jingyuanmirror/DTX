import type { AgentResponse, SkillContext } from "./types";
import { skills } from "../skills";
import { setStoreConsultHistory, resetStoreConsultState } from "../skills/store-consult";
import { isProductRecommendIntent } from "../skills/product-recommend";
import { isCheckInSpotsQuery } from "../skills/check-in";
import { isPlanningIntent, resetStoreRecommendState } from "../skills/store-recommend";
import { detectPreference, isPreferenceExpression } from "../utils/preference";
import { chat } from "../llm/chat";
import { chatCompletion } from "../llm/client";
import type { ChatMessage } from "../llm/types";

/** Shared conversation history across turns */
let llmHistory: ChatMessage[] = [];

/**
 * Last skill that actually handled a turn (deterministic/classifier/fallback alike).
 * Used as short-term context: when the next user message is a context-less follow-up
 * (e.g. "换个口味"/"再推荐一个"/"另一个呢"), the router reuses this skill instead of
 * letting the bare-keyword patterns miss and fall through to the LLM classifier —
 * which historically mis-routed these short replies.
 */
let lastActiveSkill: string | null = null;

/** Reset LLM conversation history (e.g. on app re-mount) */
export function resetLLMHistory() {
  llmHistory = [];
  lastActiveSkill = null;
  resetStoreConsultState();
  resetStoreRecommendState();
}

/**
 * Main routing function — skill first, LLM fallback.
 * If any skill matches, return skill result directly.
 * Only when no skill matches will it call LLM.
 */
export async function route(
  ctx: SkillContext,
  onToken?: (token: string) => void,
): Promise<AgentResponse> {
  // Always record the user message to history so context flows across turns
  llmHistory = [...llmHistory, { role: "user", content: ctx.text }];
  const contextualCtx: SkillContext = {
    ...ctx,
    conversationHistory: llmHistory.slice(-8),
  };

  const { response, skillName } = await routeBySkills(contextualCtx);
  if (response) {
    // Record the skill's response so next turn's classifier sees it
    llmHistory = [...llmHistory, { role: "assistant", content: response.text }].slice(-30);
    if (skillName) lastActiveSkill = skillName;
    return response;
  }

  try {
    const { response: llmResponse, newMessages } = await chat(
      ctx.text,
      contextualCtx,
      llmHistory,
      onToken ?? (() => {}),
    );

    // Append new messages to persistent history
    llmHistory = [...llmHistory, ...newMessages].slice(-30);
    // LLM fallback means no deterministic skill handled this turn, so there's no
    // skill to "continue" next turn — clear the short-term context.
    lastActiveSkill = null;

    return llmResponse;
  } catch (error) {
    console.warn("LLM unavailable, falling back to default reply:", error);
    return {
      text: "已收到您的需求，正在为您安排，请稍候片刻。如有任何进一步需求，请随时告知。",
      quickReplies: ["查询停车状态", "今日专属优惠"],
    };
  }
}

/**
 * Short, context-less follow-up phrases that should reuse the last active skill
 * instead of being classified from scratch. These typically omit any explicit
 * topic keyword (e.g. "换个口味", "再推荐一个", "另一个呢"), so the deterministic
 * patterns miss and the bare LLM classifier historically mis-routed them.
 */
const FOLLOWUP_PATTERN =
  /换个(口味|品类|方向|店|家|餐厅|品牌)|再(推荐|来|换|给)(一家|一个|几个|别的|别的店|点)?|再来一家|另一(个|家|家店)|第[二三四五]家|这家(店|餐厅|怎么样|如何)|对比一下|继续(推荐|逛|吃)?|(就|那)(这家|这个)|便宜(点|些|的)|贵(点|些|的)|有(没有|没有更)(便宜|贵|好)的|还要(别的|其他|一个)|就这些|还有(别的|其他|什么)|这家不错|不错(呀|的|啊)|我?(?:(?:带(?:着)?)|和)(?:孩子|小孩|宝宝|娃|老人|长辈|朋友|家人)|我(?:一个人|自己)|(?:上午|早上)[^。]*(?:晚上|晚饭后)[^。]*(?:走|离开)/;

function isFollowUp(text: string): boolean {
  return text.length <= 16 && FOLLOWUP_PATTERN.test(text);
}

/**
 * Skills where "continue the same topic" makes sense — i.e. a follow-up like
 * "换个口味" should reuse them rather than re-classify. Flows that capture their
 * own state (parking/appointment/membership in-flow) are excluded: those route by
 * state, not by follow-up phrasing.
 */
const FOLLOWUP_REUSABLE_SKILLS = new Set([
  "store-recommend",
  "store-consult",
  "product-recommend",
  "product-intro",
  "coupon",
  "service-qa",
]);

/**
 * Skill router — check in-progress flows first, then classify.
 * Returns the matched response plus the skill name that handled it (for the
 * `lastActiveSkill` short-term context). The LLM classifier branch also reports
 * its chosen skill name so follow-up reuse keeps working after a classifier hit.
 */
async function routeBySkills(ctx: SkillContext): Promise<{ response: AgentResponse | null; skillName: string | null }> {
  /** Invoke a skill by name and wrap its response with the skill name. */
  const run = async (name: string): Promise<{ response: AgentResponse | null; skillName: string | null }> => {
    const skill = skills.find((s) => s.name === name);
    if (!skill) return { response: null, skillName: null };
    return { response: await skill.handle(ctx), skillName: name };
  };
  // If user is in the middle of a parking reservation (collecting plate), always route to parking skill
  if (ctx.parkingReservation?.status === "collecting_plate") {
    return run("parking");
  }

  // 活动预约的场次/人数收集是连续流程，短回复必须留在本 skill。
  if (ctx.activityBookingInfo?.flowStatus && !/入会|会员权益|开通会员/.test(ctx.text)) {
    return run("activity-booking");
  }

  if (
    ctx.activityBookingInfo?.status === "confirmed"
    && /我的预约|查看.*预约|预约状态|预约成功了吗/.test(ctx.text)
  ) {
    return run("activity-booking");
  }

  // If user is in the middle of appointment slot selection, always route to appointment skill
  if (ctx.appointmentInfo?.flowStatus === "selecting_slot") {
    return run("appointment");
  }

  // If user is in the middle of enrollment, always route to membership skill
  if (ctx.userProfile._enrollmentForm && !ctx.userProfile.isMember) {
    return run("membership");
  }

  if (ctx.userProfile._membershipAuthorizationPending && !ctx.userProfile.isMember) {
    return run("membership");
  }

  // 入会后的下一条偏好表达优先回到 membership，完成画像记录闭环。
  if (
    ctx.userProfile._justOnboarded
    && (detectPreference(ctx.text).hasPreference || isPreferenceExpression(ctx.text))
  ) {
    return run("membership");
  }

  // ── Follow-up reuse (上下文记忆) ──────────────────────────────────
  // 短的无主语追问(如"换个口味""再推荐一个""另一家呢")不携带任何主题关键词,
  // 确定性 pattern 会全部落空,只靠 LLM 分类器极易误判。此处沿用上一轮激活的
  // 推荐/咨询类 skill。仅对纯文本延续类 skill 生效;流程态 skill(parking 等)
  // 由各自状态决定,不在此列。仍允许用户在新问句里带明确关键词自行跳转 ——
  // 后面的 pattern 会优先生效,所以但这步只接管"谁都不认领"的纯追问短句。
  if (isFollowUp(ctx.text) && lastActiveSkill && FOLLOWUP_REUSABLE_SKILLS.has(lastActiveSkill)) {
    return run(lastActiveSkill);
  }

  const qixiActivityPattern = /七夕(?:打卡|活动|碰出好喜气)|七夕.*(?:怎么玩|有什么)/;
  if (qixiActivityPattern.test(ctx.text)) {
    return run("activity-intro");
  }

  const activityBookingPattern =
    /(?:乐高|拼搭派对|亲子烘焙).*(?:预约|报名|名额|场次|余位)|(?:预约|报名).*(?:乐高|拼搭派对|亲子烘焙|活动)|活动(?:怎么|如何)?(?:预约|报名)|活动预约(?:情况|方法|状态)?|我的活动预约/;
  if (activityBookingPattern.test(ctx.text)) {
    return run("activity-booking");
  }

  // 打卡地点列表查询直接走 check-in，确保返回地点卡片。
  if (isCheckInSpotsQuery(ctx.text)) {
    return run("check-in");
  }

// Deterministic pattern matching for product/gift recommendation — bypass LLM classifier
// "七夕适合买什么/七夕送什么/情人节买什么/纪念日送什么/有什么伴手礼" → product-recommend (多商品卡)
if (isProductRecommendIntent(ctx.text)) {
  return run("product-recommend");
}

const productNamePattern = /茉莉拿铁|瑞幸茉莉|春季茉莉|精选面膜|保湿面膜|屈臣氏面膜|桂花定胜糕|定胜糕(?:礼盒)?|知味观糕点|七夕限定礼盒|七夕礼盒|心意礼盒|七夕礼品/;
  if (productNamePattern.test(ctx.text)) {
    return run("product-intro");
  }

  // 行程规划是明确业务意图,直接进入规划 skill,避免 LLM 分类异常时丢失路线卡。
  if (isPlanningIntent(ctx.text)) {
    return run("store-recommend");
  }

  // 其余意图(餐饮/店铺推荐、排队拥挤、活动咨询等)统一交 LLM 路由器。
  // store-recommend 内部再用上下文解析 + 明确规划/时间表达兜底,
  // 避免"上午到逛一天"这类补充信息丢失上一轮规划语境。
  const targetSkillName = await classifySkillIntent(ctx.text);
  if (!targetSkillName) {
    return { response: null, skillName: null };
  }

  // Provide chat history to store-consult for context-aware follow-up
  if (targetSkillName === "store-consult") {
    setStoreConsultHistory(llmHistory.slice(-8));
  }

  return run(targetSkillName);
}

async function classifySkillIntent(text: string): Promise<string | null> {
  const skillOptions = skills
    .map((skill) => `- ${skill.name}: ${skill.intentDescription}`)
    .join("\n");

  // Include recent conversation context so short replies (like "好的") can be routed correctly
  const recentHistory = llmHistory.slice(-4); // last 2 exchanges (user+assistant each)
  const contextMessages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是意图路由器。根据用户输入和对话上下文，从候选skill中选出最合适的一项。\n\n"
        + "## 路由规则\n\n"
        + "### parking（停车相关）\n"
        + "以下意图都路由到 parking：\n"
        + "- 记录停车位置：\"我停在B2-D05\"、\"车在B3\"\n"
        + "- 查询停车状态/时长/费用：\"停了多久\"、\"停车费多少\"\n"
        + "- 查询车位可用情况：\"有没有空位\"、\"车位情况\"、\"还有车位吗\"、\"车位多不多\"、\"好停车吗\"\n"
        + "- 预约/预留车位：\"预约车位\"、\"预留车位\"、\"帮我留个车位\"、\"先帮我占个位\"、\"快到了帮我留一个\"、\"能不能帮我留个车位\"、\"先占位\"、\"帮我预约一下停车\"\n"
        + "- 提供车牌号（预约流程中）：\"京A12345\"、\"我的车牌是沪B67890\"\n"
        + "- 停车收费规则：\"怎么收费\"、\"收费标准\"\n\n"
        + "### appointment（品牌预约）\n"
        + "- 预约创建：\"帮我预约Chanel\"、\"帮我约下午2点的Hermès\"、\"我想去香奈儿约个档期\"\n"
        + "- 档期查询：\"周末LV有档期吗\"、\"Hermès今天还能约吗\"\n"
        + "- 预约状态查询：\"我的预约几点\"、\"我约的Chanel几点\"\n"
        + "- 选档期中间态：用户回复时间如\"14:00\"（上下文正在选时段时）\n"
        + "- 重要路由规则：\"预约\"\"约档期\"关键词 → appointment（优先于queue和cross-sell）\n"
        + "- \"帮我排Chanel\" → queue（\"排\"关键词路由到queue）\n"
        + "- \"Chanel排队多久\"、\"香奈儿人多嘛\"、\"人多吗\"、\"拥挤吗\" → cross-sell（询问排队等候时长/拥挤程度）\n\n"
        + "### activity-booking（活动预约）\n"
        + "- 查询活动余位/场次：\"乐高活动还有名额吗\"、\"查看乐高场次\"、\"活动预约情况\"\n"
        + "- 询问预约方法：\"乐高怎么预约\"、\"活动怎么报名\"\n"
        + "- 代为预约或查询结果：\"帮我预约乐高\"、\"我的活动预约\"\n"
        + "- 活动预约优先于品牌 appointment；乐高体验店的拼搭派对属于活动预约，不属于品牌 SA 档期。\n\n"
        + "### membership（会员相关）\n"
        + "- 明确入会意愿：\"我想入会\"、\"帮我入会\"、\"我要入会\"、\"办会员\"、\"给我办会员\"、\"入会吧\"、\"加入会员\"、\"申请会员\"、\"现在入会\"\n"
        + "- 入会确认：\"好的\"、\"可以\"、\"是的\"（上下文涉及入会时）\n"
        + "- 补充个人信息：姓名、性别、身份证号、城市、地址\n"
        + "- 会员权益咨询、偏好表达：\"我喜欢美妆\"、\"Hermès\"\n\n"
        + "### store-consult（品牌店铺咨询）\n"
        + "- 品牌信息/位置/品类：\"Chanel在几楼\"、\"DTX有没有Moncler\"\n"
        + "- 当季新品/到货：\"Chanel有什么新款包\"、\"有新品吗\"（上下文提到品牌时）\n"
        + "- 联系SA导购：\"联系专属顾问\"、\"有SA吗\"\n"
        + "- 物品到店位置查询：\"哪里能买到丝巾\"、\"哪层有手表\"\n"
        + "- 重要：品牌\"推荐\"类需求（如\"推荐个送太太的品牌\"\"想买包推荐下\"\"520送什么品牌\"）路由到 store-recommend，不属于 store-consult\n"
        + "- 重要：当对话上下文最近提到了某个品牌，用户追问\"新品\"\"新款\"\"到货\"\"有什么\"\"有吗\"等，应路由到 store-consult 而非 store-recommend\n\n"
        + "### store-recommend（店铺/餐饮/活动综合推荐）\n"
        + "- 餐饮推荐：\"今天吃什么\"、\"午餐推荐\"、\"晚餐吃什么\"、\"有什么好吃的\"、\"吃什么\"、\"有啥吃的\"、\"想吃火锅\"、\"求推荐餐厅\"\n"
        + "- 餐厅信息：\"新荣记\"、\"大董\"、\"鼎泰丰\"、\"海底捞\"、\"喜茶\"、\"美食广场\"等餐厅推荐\n"
        + "- 店铺/品类推荐：\"想逛逛\"、\"推荐个店\"、\"想买包推荐下\"、\"逛逛超市\"、\"带娃去哪逛\"、\"周末买点家居好物\"、\"生鲜\"、\"亲子\"、\"美妆\"、\"家居\"\n"
        + "- 活动推荐：\"今天有什么活动\"、\"有什么展览\"、\"近期活动\"、\"pop-up\"、\"鉴赏会\"、\"市集\" 等，综合店铺与活动一起推荐（活动为主、店铺为辅）\n"
        + "- 行程规划：\"吃饭前后还能安排什么\"、\"今天都能怎么规划\"、\"帮我规划路线\"、\"逛一圈怎么安排\"、\"带老人孩子随便逛逛\"、\"上午到晚上走怎么安排\"、\"待多久/逛一天/逛半天\"等任何想安排一趟整体行程或回答在场时长的表达,都路由到 store-recommend(由站内进一步区分规划 vs 单点推荐)\n"
        + "- 亲子餐厅对比（带决策维度）：\"哪个餐厅适合亲子\"\n"
        + "- 重要边界：查具体品牌位置/新品/联系SA走 store-consult；挑具体商品（\"七夕买什么\"\"送什么商品\"）走 product-recommend;\"七夕打卡活动怎么玩\"等活动介绍走 activity-intro；本skill只负责\"综合推荐店铺/餐厅/活动+行程规划\"\n\n"
        + "### product-recommend（节日/送礼商品推荐）\n"
        + "- 节日或送礼场景下挑什么商品:\"七夕适合买什么\"、\"七夕送什么好\"、\"情人节买什么\"、\"纪念日送什么\"、\"有什么伴手礼推荐\"\n"
        + "- 返回多张精选商品卡(含图与活动价)。重要:用户已说出具体商品名(如\"茉莉拿铁\"\"七夕礼盒\")要查单品详情时,走 product-intro,不走本skill。\"推荐店铺/品牌\"走 store-recommend。\n\n"
        + "### service-qa（商场服务咨询）\n"
        + "- 商场服务：\"服务台\"、\"轮椅\"、\"退换货\"、\"邮寄\"、\"营业时间\"、\"失物招领\"\n"
        + "- 专属红包/打卡红包如何使用、怎么抵扣、怎么花：\"专属红包怎么用\"、\"打卡红包怎么抵扣\"\n"
        + "- 重要：\"今天吃什么\"、\"餐厅推荐\"、\"有什么活动\"等推荐走 store-recommend，不属于 service-qa\n\n"
        + "### queue / cross-sell / coupon\n"
        + "- 按各skill描述路由\n\n"
        + "重要：要结合上下文理解用户意图。例如：\n"
        + "- 用户说\"快到了帮我留一个\"，虽然没有\"车位\"字眼，但从语境可以判断是停车预约，应路由到 parking。\n"
        + "- 上一轮对话提到了某个品牌（如Chanel），用户追问\"有新品吗\"\"有什么新款\"\"到货了吗\"等，虽然不包含品牌名，但语境明确是品牌咨询，应路由到 store-consult，而不是 store-recommend。\n"
        + "- \"今天有什么活动\"\"有什么展览\"等问活动的，路由到 store-recommend（活动已并入综合推荐），不是 service-qa。\n"
        + "- 活动/乐高/拼搭派对的预约报名路由到activity-booking；奢品专柜档期才路由到appointment；\"排号\"\"排队\"关键词路由到queue。\n\n"
        + "若都不适合，输出 NONE。\n"
        + "仅允许输出 skill 名称原文或 NONE，不要输出其他内容。\n\n"
        + `候选skill：\n${skillOptions}`,
    },
    ...recentHistory,
    {
      role: "user",
      content: text,
    },
  ];

  try {
    const result = await chatCompletion(contextMessages, [], { onToken: () => {} });
    const raw = result.choices[0]?.message?.content?.trim() ?? "";
    if (!raw) {
      return null;
    }

    if (/^none$/i.test(raw)) {
      return null;
    }

    const normalized = raw.toLowerCase();
    const matched = skills
      .map((skill) => skill.name)
      .find((name) => normalized.includes(name));
    return matched ?? null;
  } catch (error) {
    console.warn("Intent classification failed:", error);
    return null;
  }
}
