import type { AgentResponse, SkillContext } from "./types";
import { skills } from "../skills";
import { setStoreConsultHistory } from "../skills/store-consult";
import { chat } from "../llm/chat";
import { chatCompletion } from "../llm/client";
import type { ChatMessage } from "../llm/types";

/** Shared conversation history across turns */
let llmHistory: ChatMessage[] = [];

/** Reset LLM conversation history (e.g. on app re-mount) */
export function resetLLMHistory() {
  llmHistory = [];
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

  // Deterministic pattern matching for crowd/wait-time queries — bypass LLM classifier
  // "人多嘛/人多吗/拥挤吗/排队多久/排队长吗" + brand → cross_sell
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
        + "- 重要路由规则：\"预约\"\"约档期\"关键词 → appointment（优先于queue和cross_sell）\n"
        + "- \"帮我排Chanel\" → queue（\"排\"关键词路由到queue）\n"
        + "- \"Chanel排队多久\"、\"香奈儿人多嘛\"、\"人多吗\"、\"拥挤吗\" → cross_sell（询问排队等候时长/拥挤程度）\n\n"
        + "### membership（会员相关）\n"
        + "- 明确入会意愿：\"我想入会\"、\"帮我入会\"、\"我要入会\"、\"办会员\"、\"给我办会员\"、\"入会吧\"、\"加入会员\"、\"申请会员\"、\"现在入会\"\n"
        + "- 入会确认：\"好的\"、\"可以\"、\"是的\"（上下文涉及入会时）\n"
        + "- 补充个人信息：姓名、性别、身份证号、城市、地址\n"
        + "- 会员权益咨询、偏好表达：\"我喜欢美妆\"、\"Hermès\"\n\n"
        + "### activity-recommend（活动推荐）\n"
        + "- 询问商场活动、pop-up、展览：\"今天有什么活动\"、\"推荐活动\"\n"
        + "- 注意：\"新品\"\"新款\"\"到货\"等关键词在品牌上下文中属于 store-consult，不属于 activity-recommend\n\n"
        + "### store-consult（品牌店铺咨询）\n"
        + "- 品牌信息/位置/品类：\"Chanel在几楼\"、\"SKP有没有Moncler\"\n"
        + "- 当季新品/到货：\"Chanel有什么新款包\"、\"有新品吗\"（上下文提到品牌时）\n"
        + "- 礼品推荐/品牌推荐：\"推荐送礼品牌\"、\"送太太什么好\"\n"
        + "- 联系SA导购：\"联系专属顾问\"、\"有SA吗\"\n"
        + "- 重要：当对话上下文最近提到了某个品牌，用户追问\"新品\"\"新款\"\"到货\"\"有什么\"\"有吗\"等，应路由到 store-consult 而非 activity-recommend\n\n"
        + "### queue / cross_sell / coupon\n"
        + "- 按各skill描述路由\n\n"
        + "重要：要结合上下文理解用户意图。例如：\n"
        + "- 用户说\"快到了帮我留一个\"，虽然没有\"车位\"字眼，但从语境可以判断是停车预约，应路由到 parking。\n"
        + "- 上一轮对话提到了某个品牌（如Chanel），用户追问\"有新品吗\"\"有什么新款\"\"到货了吗\"等，虽然不包含品牌名，但语境明确是品牌咨询，应路由到 store-consult，而不是 activity-recommend。\n"
        + "- 只有用\"活动\"\"pop-up\"\"展览\"\"鉴赏会\"等词明确问活动时，才路由到 activity-recommend。\n"
        + "- \"预约\"\"约档期\"关键词路由到appointment，\"排号\"\"排队\"关键词路由到queue，\"排队多久\"\"人多嘛\"\"人多吗\"\"拥挤吗\"关键词路由到cross_sell。\n\n"
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