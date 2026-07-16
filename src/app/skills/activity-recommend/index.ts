import type { Skill } from "../../agent/types";
import type { UserProfile } from "../../types";
import { ACTIVITIES, type Activity } from "../../data/activities";
import { chatCompletion } from "../../llm/client";
import type { ChatMessage } from "../../llm/types";
import { getUserSalutation } from "../../utils/salutation";

/**
 * 根据用户画像计算匹配分，返回按相关性排序的活动列表。
 * 匹配规则：
 *   - brands 命中 +3
 *   - categories 命中 +2
 *   - items 命中 +1
 *   - 命中数 >= 2 → 强相关；命中数 = 1 → 相关；命中数 = 0 → 不相关
 */
function rankActivities(profile: UserProfile): Array<Activity & { score: number }> {
  return ACTIVITIES.map((act) => {
    let score = 0;

    for (const brand of profile.brands) {
      if (act.brands.includes(brand)) score += 3;
    }
    for (const cat of profile.categories) {
      if (act.categories.includes(cat)) score += 2;
    }
    for (const item of profile.items) {
      if (act.items.includes(item)) score += 1;
    }

    return { ...act, score };
  })
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** 构建供 LLM 重写用的活动摘要文本（按匹配分降序，不含内部评分标签） */
function buildActivityDigest(activities: Array<Activity & { score: number }>): string {
  return activities
    .map((a, i) => `${i + 1}. ${a.title}\n   ${a.summary}\n   地点：${a.floor}　时间：${a.dateRange}`)
    .join("\n\n");
}

/** 用 LLM 将活动摘要重写为个性化推荐话术 */
async function rewriteRecommendation(
  userText: string,
  profile: UserProfile,
  digest: string,
): Promise<string> {
  const prefSummary = [...profile.categories, ...profile.brands, ...profile.items].join("、");
  const salutation = getUserSalutation(profile);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是DTX综合商圈的智能管家。根据用户画像和匹配到的活动，撰写一段个性化活动推荐。\n"
        + "要求：\n"
        + "1) 开头以轻松自然的方式引入，如「今天的活动挺多，这几个您可能会感兴趣」，不要用生硬的推荐列表式开头。\n"
        + `2) 需要称呼时只能使用「${salutation}」且最多一次，不得猜测或改用先生/女士。语气轻松热情、有温度。\n`
        + "3) 活动按匹配度从高到低排列，优先详细介绍排名靠前的活动，靠后的可简略带过或省略。\n"
        + "4) 每个活动说清：是什么、为什么觉得用户会感兴趣（自然地和偏好关联，不要说'因为您偏好XX'这种机械话术），以及地点和时间。\n"
        + "5) 结尾询问是否需要安排预约或到店体验。\n"
        + "6) 严格基于给定的活动数据，不杜撰活动。若匹配活动为空，回复「暂无与您偏好相关的活动」。\n"
        + "7) 回复简洁有温度，不要过度冗长。",
    },
    {
      role: "user",
      content:
        `用户问题：${userText}\n\n`
        + `用户画像偏好：${prefSummary}\n\n`
        + `匹配到的活动：\n${digest}`,
    },
  ];

  try {
    const result = await chatCompletion(messages, [], { onToken: () => {} });
    const text = result.choices[0]?.message?.content?.trim();
    return text || "暂无与您偏好相关的活动推荐。";
  } catch {
    return "抱歉，活动推荐服务暂时不可用，请稍后再试。";
  }
}

/** 检测用户是否在问活动相关（供 LLM 路由器参考） */
const ACTIVITY_INTENTRegex = /活动|推荐.*活动|有啥活动|什么活动|近期活动|今日活动|活动吗|活动推荐|pop.?up|鉴赏|工坊|展览|展|联名/;

export const activityRecommendSkill: Skill = {
  name: "activity-recommend",
  intentDescription:
    "根据用户画像（品牌/品类/商品偏好）个性化推荐商场活动。当用户询问活动、pop-up、展览、鉴赏会、联名等活动信息时调用。",
  match: () => true,
  handle: async ({ text, userProfile }) => {
    // 如果用户画像无偏好，给出通用活动列表
    const hasPreference =
      userProfile.categories.length > 0
      || userProfile.brands.length > 0
      || userProfile.items.length > 0;

    if (!hasPreference) {
      // 无画像 → 通用活动简列
      const allDigest = ACTIVITIES.map(
        (a, i) => `${i + 1}. ${a.title}　${a.floor}　${a.dateRange}`,
      ).join("\n");

      const messages: ChatMessage[] = [
        {
          role: "system",
          content:
            "你是DTX综合商圈的智能管家。根据活动列表撰写简要活动推荐。\n"
            + `要求：\n1) 需要称呼时只能使用「${getUserSalutation(userProfile)}」且最多一次，不得猜测性别。\n2) 列出当前活动，每条一句话概述。\n3) 结尾建议用户告诉我偏好，以便精准推荐。`,
        },
        { role: "user", content: `用户问题：${text}\n\n活动列表：\n${allDigest}` },
      ];

      try {
        const result = await chatCompletion(messages, [], { onToken: () => {} });
        const reply = result.choices[0]?.message?.content?.trim();
        return {
          text: reply || "目前商圈有多场精彩活动正在进行，您可以告诉我关注的品牌或品类，我会为您精准推荐。",
          quickReplies: ["我喜欢Gucci", "关注美妆护肤", "喜欢生鲜", "查看全部活动"],
        };
      } catch {
        return {
          text: "目前商圈有多场精彩活动正在进行，您可以告诉我关注的品牌或品类，我会为您精准推荐。",
          quickReplies: ["我喜欢Gucci", "关注美妆护肤", "喜欢生鲜", "查看全部活动"],
        };
      }
    }

    // 有画像 → 个性化匹配
    const matched = rankActivities(userProfile);

    if (matched.length === 0) {
      return {
        text: `${getUserSalutation(userProfile)}，目前暂无与您偏好直接相关的活动。商场新一轮活动正在筹备中，我会第一时间通知您。`,
        quickReplies: ["查看全部活动", "告诉我新活动", "查询停车状态"],
      };
    }

    const digest = buildActivityDigest(matched);
    const reply = await rewriteRecommendation(text, userProfile, digest);

    return {
      text: reply,
      quickReplies: ["预约活动", "查看全部活动", "查询停车状态"],
    };
  },
};
