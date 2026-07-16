import type { Skill } from "../../agent/types";
import { chatCompletion } from "../../llm/client";
import type { ChatMessage } from "../../llm/types";
import mallKnowledgeDoc from "../../data/mall-knowledge.md?raw";
import { getUserSalutation } from "../../utils/salutation";

interface KnowledgeSection {
  title: string;
  content: string;
}

function parseSections(doc: string): KnowledgeSection[] {
  const lines = doc.split("\n");
  const sections: KnowledgeSection[] = [];

  let currentTitle = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentTitle) {
        sections.push({ title: currentTitle, content: currentContent.join("\n").trim() });
      }
      currentTitle = line.replace(/^##\s+/, "").trim();
      currentContent = [];
      continue;
    }

    if (currentTitle) {
      currentContent.push(line);
    }
  }

  if (currentTitle) {
    sections.push({ title: currentTitle, content: currentContent.join("\n").trim() });
  }

  return sections;
}

function scoreSection(query: string, section: KnowledgeSection): number {
  const normalizedQuery = query.toLowerCase();
  const target = `${section.title}\n${section.content}`.toLowerCase();

  const serviceKeywords = [
    "服务台", "客服台", "问询台", "咨询台", "轮椅", "退货", "退换", "邮寄", "寄送", "快递", "配送", "营业时间", "失物招领", "无障碍", "会员",
  ];

  let score = 0;

  for (const keyword of serviceKeywords) {
    if (normalizedQuery.includes(keyword) && target.includes(keyword)) {
      score += 2;
    }
  }

  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const compactTitle = section.title.toLowerCase().replace(/\s+/g, "");
  if (compactQuery.includes(compactTitle) || compactTitle.includes(compactQuery)) {
    score += 3;
  }

  return score;
}

async function isMallServiceQuery(text: string): Promise<boolean> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是一个意图分类器。判断用户问题是否属于’商场服务与信息咨询’。\n"
        + "商场服务与信息咨询包含但不限于：服务台、轮椅、退换货、寄送配送、营业时间、失物招领、无障碍、会员服务规则、楼层品牌、店铺位置等。\n"
        + "重要：’餐厅推荐’、’今天吃什么’、’美食推荐’、’求推荐餐厅’等餐饮推荐类问题不属于此分类，应输出 NO。\n"
        + "如果是，输出 YES；如果不是，输出 NO。只允许输出 YES 或 NO。",
    },
    {
      role: "user",
      content: text,
    },
  ];

  const result = await chatCompletion(messages, [], { onToken: () => {} });
  const decision = result.choices[0]?.message?.content?.trim().toUpperCase();
  return decision === "YES";
}

async function selectBestSectionTitleByLLM(query: string, sections: KnowledgeSection[]): Promise<string | null> {
  if (sections.length === 0) return null;

  const sectionList = sections
    .map((section) => `- ${section.title}`)
    .join("\n");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是知识检索助手。根据用户问题，从给定章节标题中选出最相关的一项。\n"
        + "若没有合适章节，输出 NONE。\n"
        + "输出必须是某一个标题原文，或 NONE。不要输出其他内容。",
    },
    {
      role: "user",
      content: `用户问题：${query}\n\n可选章节：\n${sectionList}`,
    },
  ];

  const result = await chatCompletion(messages, [], { onToken: () => {} });
  const picked = result.choices[0]?.message?.content?.trim();
  if (!picked || picked === "NONE") return null;

  const matched = sections.find((section) => section.title === picked);
  return matched ? matched.title : null;
}

async function retrieveKnowledgeSnippet(query: string): Promise<string | null> {
  const sections = parseSections(mallKnowledgeDoc);
  if (sections.length === 0) return null;

  const selectedTitle = await selectBestSectionTitleByLLM(query, sections);
  if (selectedTitle) {
    const selected = sections.find((section) => section.title === selectedTitle);
    if (selected) {
      return `问题主题：${selected.title}\n\n${selected.content}`;
    }
  }

  let bestSection: KnowledgeSection | null = null;
  let bestScore = 0;

  for (const section of sections) {
    const score = scoreSection(query, section);
    if (score > bestScore) {
      bestScore = score;
      bestSection = section;
    }
  }

  if (!bestSection || bestScore <= 0) {
    return null;
  }

  return `问题主题：${bestSection.title}\n\n${bestSection.content}`;
}

async function rewriteWithLLM(userQuestion: string, snippet: string, salutation: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是DTX综合商圈专属客服。你只能基于提供的’知识片段’作答，严禁杜撰。\n"
        + "要求：\n"
        + `1) 语气自然、专业、有温度；需要称呼时只能使用「${salutation}」，且最多出现一次，不得使用“先生/女士”占位。\n`
        + "2) 内容必须与知识片段一致，不可新增事实。\n"
        + "3) 若用户问吃什么/餐厅推荐，按知识片段中的餐厅列出相关选项，涵盖商务宴请、家庭聚餐、快速午餐等不同场景和人均档次，给出菜系和特色，并给一句选择建议。\n"
        + "4) 若知识片段无法覆盖用户问题，直接回复：’抱歉，目前没有相关信息。’\n"
        + "5) 输出仅回答正文，不要额外解释。",
    },
    {
      role: "user",
      content: `用户问题：${userQuestion}\n\n知识片段：\n${snippet}`,
    },
  ];

  const result = await chatCompletion(
    messages,
    [],
    { onToken: () => {} },
  );

  const text = result.choices[0]?.message?.content?.trim();
  if (!text) {
    return "抱歉，目前没有相关信息。";
  }

  return text;
}

export const serviceQASkill: Skill = {
  name: "service-qa",
  intentDescription: "处理商场服务咨询（服务台、轮椅、退换货、邮寄、营业时间、失物招领、楼层品牌、店铺位置、会员服务规则等），基于知识库文档回答且不杜撰。注:餐厅推荐/今天吃什么/美食推荐等餐饮推荐场景走 restaurant-recommend。",
  match: () => true,
  handle: async ({ text, userProfile }) => {
    const mallServiceQuery = await isMallServiceQuery(text);
    if (!mallServiceQuery) {
      return null;
    }

    const snippet = await retrieveKnowledgeSnippet(text);

    if (!snippet) {
      return {
        text: "抱歉，目前没有相关信息。",
        quickReplies: ["服务台在哪", "提供轮椅吗", "会员退货规则"],
      };
    }

    try {
      const refinedText = await rewriteWithLLM(text, snippet, getUserSalutation(userProfile));
      return {
        text: refinedText,
        quickReplies: ["还有其他服务吗", "联系人工客服", "我想入会"],
      };
    } catch {
      return {
        text: "抱歉，目前没有相关信息。",
        quickReplies: ["服务台在哪", "提供轮椅吗", "可以免费邮寄吗"],
      };
    }
  },
};
