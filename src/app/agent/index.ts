import type { AgentResponse, SkillContext } from "./types";
import { skills } from "../skills";
import { setStoreConsultHistory, resetStoreConsultState } from "../skills/store-consult";
import { isProductRecommendIntent } from "../skills/product-recommend";
import { isCheckInSpotsQuery } from "../skills/check-in";
import { detectPreference, isPreferenceExpression } from "../utils/preference";
import { chat } from "../llm/chat";
import { chatCompletion } from "../llm/client";
import type { ChatMessage } from "../llm/types";

/** Shared conversation history across turns */
let llmHistory: ChatMessage[] = [];

/** Reset LLM conversation history (e.g. on app re-mount) */
export function resetLLMHistory() {
  llmHistory = [];
  resetStoreConsultState();
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

  const skillResponse = await routeBySkills(ctx);
  if (skillResponse) {
    // Record the skill's response so next turn's classifier sees it
    llmHistory = [...llmHistory, { role: "assistant", content: skillResponse.text }].slice(-30);
    return skillResponse;
  }

  try {
    const { response, newMessages } = await chat(
      ctx.text,
      ctx,
      llmHistory,
      onToken ?? (() => {}),
    );

    // Append new messages to persistent history
    llmHistory = [...llmHistory, ...newMessages].slice(-30);

    return response;
  } catch (error) {
    console.warn("LLM unavailable, falling back to default reply:", error);
    return {
      text: "已收到您的需求，正在为您安排，请稍候片刻。如有任何进一步需求，请随时告知。",
      quickReplies: ["查询停车状态", "今日专属优惠"],
    };
  }
}

/**
 * Skill router — check in-progress flows first, then classify.
 */
async function routeBySkills(ctx: SkillContext): Promise<AgentResponse | null> {
  // If user is in the middle of a parking reservation (collecting plate), always route to parking skill
  if (ctx.parkingReservation?.status === "collecting_plate") {
    const parkingSkill = skills.find((skill) => skill.name === "parking");
    if (parkingSkill) {
      return await parkingSkill.handle(ctx);
    }
  }

  // If user is in the middle of appointment slot selection, always route to appointment skill
  if (ctx.appointmentInfo?.flowStatus === "selecting_slot") {
    const appointmentSkill = skills.find((skill) => skill.name === "appointment");
    if (appointmentSkill) {
      return await appointmentSkill.handle(ctx);
    }
  }

  // If user is in the middle of enrollment, always route to membership skill
  if (ctx.userProfile._enrollmentForm && !ctx.userProfile.isMember) {
    const membershipSkill = skills.find((skill) => skill.name === "membership");
    if (membershipSkill) {
      return await membershipSkill.handle(ctx);
    }
  }

  if (ctx.userProfile._membershipAuthorizationPending && !ctx.userProfile.isMember) {
    const membershipSkill = skills.find((skill) => skill.name === "membership");
    if (membershipSkill) {
      return await membershipSkill.handle(ctx);
    }
  }

  // 入会后的下一条偏好表达优先回到 membership，完成画像记录闭环。
  if (
    ctx.userProfile._justOnboarded
    && (detectPreference(ctx.text).hasPreference || isPreferenceExpression(ctx.text))
  ) {
    const membershipSkill = skills.find((skill) => skill.name === "membership");
    if (membershipSkill) {
      return await membershipSkill.handle(ctx);
    }
  }

  const qixiActivityPattern = /七夕(?:打卡|活动|碰出好喜气)|七夕.*(?:怎么玩|有什么)/;
  if (qixiActivityPattern.test(ctx.text)) {
    const activityIntroSkill = skills.find((skill) => skill.name === "activity-intro");
    if (activityIntroSkill) {
      return await activityIntroSkill.handle(ctx);
    }
  }

  // 打卡地点列表查询直接走 check-in，确保返回地点卡片。
  if (isCheckInSpotsQuery(ctx.text)) {
    const checkInSkill = skills.find((skill) => skill.name === "check-in");
    if (checkInSkill) {
      return await checkInSkill.handle(ctx);
    }
  }

  // 亲子用餐属于带决策维度的餐厅推荐，直接进入专用分析分支。
  const familyDiningPattern = /亲子|带(?:小孩|孩子|宝宝|娃).*餐|儿童友好.*餐厅|餐厅.*(?:亲子|孩子|儿童)/;
  if (familyDiningPattern.test(ctx.text)) {
    const restaurantSkill = skills.find((skill) => skill.name === "restaurant-recommend");
    if (restaurantSkill) {
      return await restaurantSkill.handle(ctx);
    }
  }

// Deterministic pattern matching for product/gift recommendation — bypass LLM classifier
// "七夕适合买什么/七夕送什么/情人节买什么/纪念日送什么/有什么伴手礼" → product-recommend (多商品卡)
if (isProductRecommendIntent(ctx.text)) {
  const productRecommendSkill = skills.find((skill) => skill.name === "product-recommend");
  if (productRecommendSkill) {
    return await productRecommendSkill.handle(ctx);
  }
}

const productNamePattern = /茉莉拿铁|瑞幸茉莉|春季茉莉|精选面膜|保湿面膜|屈臣氏面膜|桂花定胜糕|定胜糕(?:礼盒)?|知味观糕点|七夕限定礼盒|七夕礼盒|心意礼盒|七夕礼品/;
  if (productNamePattern.test(ctx.text)) {
    const productIntroSkill = skills.find((skill) => skill.name === "product-intro");
    if (productIntroSkill) {
      return await productIntroSkill.handle(ctx);
    }
  }

  // Deterministic pattern matching for dining queries — bypass LLM classifier
  // "今天吃什么/吃什么/午餐/晚餐" → service-qa (餐饮推荐)
  const diningPattern = /今天吃(什么|啥)|吃(什么|啥)(好|呢)?|午餐(吃|推荐)?|晚餐(吃|推荐)?|有什么好吃|有啥好吃/;
  if (diningPattern.test(ctx.text)) {
    const serviceQASkill = skills.find((skill) => skill.name === "service-qa");
    if (serviceQASkill) {
      return await serviceQASkill.handle(ctx);
    }
  }

  // Deterministic pattern matching for crowd/wait-time queries — bypass LLM classifier
  // "人多嘛/人多吗/拥挤吗/排队多久/排队长吗" + brand → cross-sell
  const crowdWaitPattern = /人多[嘛吗？?]|拥挤[嘛吗？?]|排队多久|排队长[嘛吗？?]|要等多久|等多久/;
  if (crowdWaitPattern.test(ctx.text)) {
    const crossSellSkill = skills.find((skill) => skill.name === "cross-sell");
    if (crossSellSkill) {
      return await crossSellSkill.handle(ctx);
    }
  }

  const targetSkillName = await classifySkillIntent(ctx.text);
  if (!targetSkillName) {
    return null;
  }

  const targetSkill = skills.find((skill) => skill.name === targetSkillName);
  if (!targetSkill) {
    return null;
  }

  // Provide chat history to store-consult for context-aware follow-up
  if (targetSkillName === "store-consult") {
    setStoreConsultHistory(llmHistory.slice(-8));
  }

  return await targetSkill.handle(ctx);
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
        + "### membership（会员相关）\n"
        + "- 明确入会意愿：\"我想入会\"、\"帮我入会\"、\"我要入会\"、\"办会员\"、\"给我办会员\"、\"入会吧\"、\"加入会员\"、\"申请会员\"、\"现在入会\"\n"
        + "- 入会确认：\"好的\"、\"可以\"、\"是的\"（上下文涉及入会时）\n"
        + "- 补充个人信息：姓名、性别、身份证号、城市、地址\n"
        + "- 会员权益咨询、偏好表达：\"我喜欢美妆\"、\"Hermès\"\n\n"
        + "### activity-recommend（活动推荐）\n"
        + "- 询问商场活动、pop-up、展览：\"今天有什么活动\"、\"推荐活动\"\n"
        + "- 注意：\"新品\"\"新款\"\"到货\"等关键词在品牌上下文中属于 store-consult，不属于 activity-recommend\n\n"
        + "### store-consult（品牌店铺咨询）\n"
        + "- 品牌信息/位置/品类：\"Chanel在几楼\"、\"DTX有没有Moncler\"\n"
        + "- 当季新品/到货：\"Chanel有什么新款包\"、\"有新品吗\"（上下文提到品牌时）\n"
        + "- 礼品推荐/品牌推荐：\"推荐送礼品牌\"、\"送太太什么好\"、\"520送点什么\"、\"送点什么\"、\"情人节送什么\"、\"纪念日送什么\"\n"
        + "- 生鲜好物推荐：\"新鲜好物\"、\"有什么好物\"、\"生鲜区\"、\"今日上新\"、\"超市推荐\"\n"
        + "- 联系SA导购：\"联系专属顾问\"、\"有SA吗\"\n"
        + "- 重要：当对话上下文最近提到了某个品牌，用户追问\"新品\"\"新款\"\"到货\"\"有什么\"\"有吗\"等，应路由到 store-consult 而非 activity-recommend\n"
        + "- 重要：\"新鲜好物\"\"好物推荐\"\"生鲜\"等商品推荐路由到 store-consult，不属于 activity-recommend\n\n"
        + "### product-recommend（节日/送礼商品推荐）\n"
        + "- 节日或送礼场景下挑什么商品:\"七夕适合买什么\"、\"七夕送什么好\"、\"情人节买什么\"、\"纪念日送什么\"、\"有什么伴手礼推荐\"\n"
        + "- 返回多张精选商品卡(含图与活动价)。重要:用户已说出具体商品名(如\"茉莉拿铁\"\"七夕礼盒\")要查单品详情时,走 product-intro,不走本skill。\"送什么品牌\"等品牌推荐仍走 store-consult。\n\n"
        + "- 餐饮推荐：\"今天吃什么\"、\"午餐推荐\"、\"晚餐吃什么\"、\"有什么好吃的\"、\"吃什么\"、\"有啥吃的\"\n"
        + "- 餐厅信息：\"新荣记\"、\"大董\"、\"鼎泰丰\"、\"海底捞\"、\"喜茶\"、\"美食广场\"等餐厅推荐与信息\n"
        + "- 商场服务：\"服务台\"、\"轮椅\"、\"退换货\"、\"邮寄\"、\"营业时间\"、\"失物招领\"\n"
        + "- 专属红包/打卡红包如何使用、怎么抵扣、怎么花：\"专属红包怎么用\"、\"打卡红包怎么抵扣\"\n\n"
        + "### queue / cross-sell / coupon\n"
        + "- 按各skill描述路由\n\n"
        + "重要：要结合上下文理解用户意图。例如：\n"
        + "- 用户说\"快到了帮我留一个\"，虽然没有\"车位\"字眼，但从语境可以判断是停车预约，应路由到 parking。\n"
        + "- 上一轮对话提到了某个品牌（如Chanel），用户追问\"有新品吗\"\"有什么新款\"\"到货了吗\"等，虽然不包含品牌名，但语境明确是品牌咨询，应路由到 store-consult，而不是 activity-recommend。\n"
        + "- 只有用\"活动\"\"pop-up\"\"展览\"\"鉴赏会\"等词明确问活动时，才路由到 activity-recommend。\n"
        + "- \"预约\"\"约档期\"关键词路由到appointment，\"排号\"\"排队\"关键词路由到queue，\"排队多久\"\"人多嘛\"\"人多吗\"\"拥挤吗\"关键词路由到cross-sell。\n\n"
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
