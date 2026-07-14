import type { Skill } from "../../agent/types";
import type { EnrollmentForm, UserProfile } from "../../types";
import { buildPreferenceSummary, detectPreference } from "../../utils/preference";
import { chatCompletion } from "../../llm/client";
import type { ChatMessage } from "../../llm/types";

const MEMBERSHIP_INQUIRY = /有会员吗|会员吗|会员服务|会员制度|会员权益|会员中心|怎么入会|如何入会|怎么办会员|会员|入会/;
const MEMBERSHIP_ENROLL_INTENT = /我想(?:要)?(?:办理|申请|加入|开通|注册)?(?:入会|会员)|我要(?:办理|申请|加入|开通|注册)?(?:入会|会员)|帮我(?:办|办理|申请|加入|开通|注册)?(?:入会|会员)|给我(?:办|办理|申请|加入|开通|注册)?(?:入会|会员)|(?:办|办理|申请|加入|开通|注册)(?:一下)?(?:入会|会员)|(?:想|要|现在|马上|直接)(?:入会|加入会员)|成为(?:DTX)?会员|入会吧/;
const MEMBERSHIP_AUTH_CONFIRM = /同意授权并加入会员|同意授权|确认授权/;
const MEMBERSHIP_AUTH_CANCEL = /取消授权|不同意|暂不入会/;

const AUTHORIZATION_CARD = {
  type: "membership-authorization-card" as const,
  title: "DTX邀您加入会员",
  subtitle: "确认授权后即可完成入会",
  benefits: [
    { title: "DTX精品超市新人礼", value: "50元无门槛券", note: "入会后自动发放至卡包" },
    { title: "会员专属停车礼遇", value: "2小时免费停车", note: "入会当日可用" },
  ],
  authorizedFields: ["姓名", "手机号", "生日", "身份信息"],
};

/** Use LLM to extract enrollment fields from free-form user text */
async function extractFormFieldsWithLLM(text: string, existing: EnrollmentForm): Promise<EnrollmentForm> {
  const existingInfo = Object.entries(existing)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是一个信息提取助手。从用户的消息中提取入会所需的个人信息。\n"
        + "需要提取的字段：name（姓名）、gender（性别，男/女）、idNumber（身份证号，18位）、city（所在城市）、address（详细地址）。\n"
        + "已收集到的信息：" + (existingInfo || "无") + "。\n"
        + "请严格按JSON格式输出，只输出JSON，不要输出其他内容。如果某个字段无法从消息中提取且之前也没有收集到，则该字段为null。\n"
        + '示例输出：{"name":"李明","gender":"男","idNumber":"110101199001011234","city":"北京","address":"朝阳区建国路87号"}',
    },
    {
      role: "user",
      content: text,
    },
  ];

  try {
    const result = await chatCompletion(messages, [], { onToken: () => {} });
    const raw = result.choices[0]?.message?.content?.trim() ?? "";
    // Try to parse JSON — handle possible markdown code blocks
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(jsonStr);

    return {
      name: parsed.name || existing.name || undefined,
      gender: parsed.gender || existing.gender || undefined,
      idNumber: parsed.idNumber || existing.idNumber || undefined,
      city: parsed.city || existing.city || undefined,
      address: parsed.address || existing.address || undefined,
    };
  } catch {
    // LLM extraction failed, fall back to regex
    return extractFormFieldsRegex(text, existing);
  }
}

/** Fallback: regex-based extraction */
function extractFormFieldsRegex(text: string, existing: EnrollmentForm): EnrollmentForm {
  const form: EnrollmentForm = { ...existing };

  if (!form.gender) {
    if (/男|先生|男士/i.test(text)) form.gender = "男";
    else if (/女|女士/i.test(text)) form.gender = "女";
  }

  if (!form.idNumber) {
    const idMatch = text.match(/[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/);
    if (idMatch) form.idNumber = idMatch[0].toUpperCase();
  }

  if (!form.name) {
    const nameMatch = text.match(/(?:我叫|姓名[是是为：:]|名字[是是为：:])\s*([^\s,，。.;；!！?？\d]{2,4})/);
    if (nameMatch) form.name = nameMatch[1];
  }

  if (!form.city) {
    const cityLabelMatch = text.match(/(?:所在)?城市[是为：:]\s*([^\s,，。.;；!！?？]{2,10})/);
    if (cityLabelMatch) {
      form.city = cityLabelMatch[1];
    } else {
      const cityKeywords = ["北京", "上海", "广州", "深圳", "成都", "杭州", "南京", "武汉", "重庆", "天津", "苏州", "西安", "长沙", "郑州", "青岛", "大连", "厦门", "宁波", "济南", "昆明"];
      for (const c of cityKeywords) {
        if (text.includes(c)) { form.city = c; break; }
      }
    }
  }

  if (!form.address) {
    const addrMatch = text.match(/(?:详细)?(?:地址|住址)[是为：:]*\s*([^\n]{4,})/);
    if (addrMatch) {
      form.address = addrMatch[1].trim();
    }
  }

  return form;
}

/** Which fields are still missing */
function missingFields(form: EnrollmentForm): string[] {
  const missing: string[] = [];
  if (!form.name) missing.push("姓名");
  if (!form.gender) missing.push("性别");
  if (!form.idNumber) missing.push("身份证号");
  if (!form.city) missing.push("所在城市");
  if (!form.address) missing.push("详细地址");
  return missing;
}

function getTierLabel(memberTier: "silver" | "diamond" | "black" | undefined): string {
  if (memberTier === "diamond") return "金卡会员";
  if (memberTier === "black") return "黑卡会员";
  return "银卡会员";
}

/** Enrollment intro — asks for all info at once */
const ENROLLMENT_INTRO = `好的，很高兴为您办理入会。为了完成注册，请您提供以下信息：

• 姓名
• 性别
• 身份证号
• 所在城市
• 详细地址

您可以一次性提供，也可以分多次补充。`;

export const membershipSkill: Skill = {
  name: "membership",
  intentDescription: "处理入会办理、会员权益咨询、会员等级说明，以及入会后偏好补充与档案更新，也处理用户表达品牌/品类偏好。",
  match: () => true,
  handle: async ({ text, userProfile }) => {
    const preference = detectPreference(text);
    const form = userProfile._enrollmentForm;

    // ── 0. 入会授权确认 ──
    if (userProfile._membershipAuthorizationPending && !userProfile.isMember) {
      if (MEMBERSHIP_AUTH_CANCEL.test(text)) {
        return {
          text: "好的，已取消本次授权。您可以随时再找我办理入会。",
          quickReplies: ["了解会员权益", "稍后入会"],
          sideEffects: {
            setUserProfile: () => ({ ...userProfile, _membershipAuthorizationPending: false }),
          },
        };
      }

      if (MEMBERSHIP_AUTH_CONFIRM.test(text)) {
        return {
          text: "李先生，欢迎加入DTX。您的50元新人礼和2小时停车权益已经生效。正好可以去B1精品超市逛逛，购买鲜花、水果等商品可直接使用新人券。",
          quickReplies: ["使用新人券", "会员权益"],
          card: {
            type: "member-card",
            tier: "银卡会员",
            tierIcon: "◇",
            name: "李先生",
            cardNo: "DTX 2026 **** 88",
            points: "0",
            benefits: ["积分累计享双倍", "专属停车优惠", "生日礼遇"],
          },
          newMemberOfferCard: {
            type: "new-member-offer-card",
            amount: 50,
            title: "DTX精品超市新人券",
            store: "DTX精品超市",
            floor: "B1-01",
            distance: "3分钟",
            categories: ["进口鲜花", "有机水果"],
            validLabel: "今日可用",
          },
          sideEffects: {
            setUserProfile: () => ({
              ...userProfile,
              isMember: true,
              memberTier: "silver",
              _justOnboarded: true,
              _membershipAuthorizationPending: false,
            }),
          },
        };
      }

      return {
        text: "加入会员前，请先确认个人信息授权。",
        membershipAuthorizationCard: AUTHORIZATION_CARD,
      };
    }

    // ── 1. 偏好收集（入会后）──
    if (preference.hasPreference && userProfile._justOnboarded) {
      const newCategories =
        preference.matchedCategory && !userProfile.categories.includes(preference.matchedCategory)
          ? [...userProfile.categories, preference.matchedCategory]
          : userProfile.categories;
      const newBrands = [...new Set([...userProfile.brands, ...preference.matchedBrands])];
      const newItems = [...new Set([...userProfile.items, ...preference.matchedItems])];

      return {
        text: `好的，已记下您的偏好，包括${buildPreferenceSummary({ categories: newCategories, brands: newBrands, items: newItems })}。后续有相关新品或活动，我会第一时间为您留意。\n\n如有其他需要，请随时告诉我。`,
        quickReplies: ["今日专属优惠", "查询停车状态", "联系专属SA"],
        sideEffects: {
          setUserProfile: () => ({
            categories: newCategories,
            brands: newBrands,
            items: newItems,
            isMember: true,
            memberTier: userProfile.memberTier ?? "silver",
            _justOnboarded: false,
          }),
        },
      };
    }

    // ── 2. 偏好收集（已有会员）──
    if (preference.hasPreference && userProfile.isMember && !userProfile._justOnboarded) {
      const newCategories =
        preference.matchedCategory && !userProfile.categories.includes(preference.matchedCategory)
          ? [...userProfile.categories, preference.matchedCategory]
          : userProfile.categories;
      const newBrands = [...new Set([...userProfile.brands, ...preference.matchedBrands])];
      const newItems = [...new Set([...userProfile.items, ...preference.matchedItems])];

      const hasNew = newCategories.length > userProfile.categories.length
        || newBrands.length > userProfile.brands.length
        || newItems.length > userProfile.items.length;

      if (hasNew) {
        return {
          text: `好的，已为您记录偏好——${buildPreferenceSummary({ categories: newCategories, brands: newBrands, items: newItems })}。后续有相关新品或活动，我会第一时间通知您。\n\n如有其他需要，请随时告诉我。`,
          quickReplies: ["今日专属优惠", "查询停车状态", "联系专属SA"],
          sideEffects: {
            setUserProfile: () => ({
              categories: newCategories,
              brands: newBrands,
              items: newItems,
              isMember: true,
              memberTier: userProfile.memberTier ?? "silver",
              _justOnboarded: false,
            }),
          },
        };
      }

      return {
        text: `好的，已记下您的偏好。后续有${buildPreferenceSummary(userProfile)}相关的最新信息，我会第一时间通知您。\n\n如有其他需要，请随时告诉我。`,
        quickReplies: ["今日专属优惠", "查询停车状态", "联系专属SA"],
      };
    }

    // ── 3. 入会信息收集中 —— 用 LLM 提取字段 ──
    if (form && !userProfile.isMember) {
      const updatedForm = await extractFormFieldsWithLLM(text, form);
      const stillMissing = missingFields(updatedForm);

      if (stillMissing.length === 0) {
        const displayName = updatedForm.name ?? "李先生";
        return {
          text: `感谢您提供完整信息，${displayName}先生。入会手续已办理完成，您现在是DTX银卡会员。\n\n您可以点击会员中心查看会员信息，也可以随时向我咨询。\n\n另外，为了更好地服务您，您可以把偏好告诉我，比如您喜欢的品类或近期关注的品牌，有相关信息我会第一时间通知您。`,
          quickReplies: ["美妆护肤", "生鲜美食", "亲子娱乐", "今日优惠"],
          card: {
            type: "member-card",
            tier: "银卡会员",
            tierIcon: "◇",
            name: displayName,
            cardNo: "DTX 2026 **** 88",
            points: "0",
            benefits: ["积分累计享双倍", "专属停车优惠", "生日礼遇"],
          },
          sideEffects: {
            setUserProfile: () => ({
              categories: userProfile.categories,
              brands: userProfile.brands,
              items: userProfile.items,
              isMember: true,
              memberTier: "silver",
              _justOnboarded: true,
              _enrollmentForm: updatedForm,
            }),
          },
        };
      }

      // 还有缺失字段
      const previouslyMissing = missingFields(form);
      const newlyFilled = previouslyMissing.filter((f) => !stillMissing.includes(f));

      let msg = "";
      if (newlyFilled.length > 0) {
        msg = `已收到。还需要补充以下信息：${stillMissing.join("、")}。`;
      } else {
        msg = `抱歉，未能识别您提供的信息。还需要补充：${stillMissing.join("、")}。请您重新提供，例如："姓名：张三，性别：男，身份证：110101199001011234，城市：北京，地址：朝阳区建国路87号"`;
      }

      return {
        text: msg,
        quickReplies: [],
        sideEffects: {
          setUserProfile: () => ({
            ...userProfile,
            _enrollmentForm: updatedForm,
          }),
        },
      };
    }

    // ── 4. 会员咨询（咨询类只回答不办理）──
    if (MEMBERSHIP_INQUIRY.test(text) && !MEMBERSHIP_ENROLL_INTENT.test(text)) {
      if (userProfile.isMember) {
        const tierLabel = getTierLabel(userProfile.memberTier);
        return {
          text: `是的，商场提供会员服务。您已经是我们的${tierLabel}了，可享积分累计、停车优惠和生日礼遇等权益。`,
          quickReplies: ["查看会员权益", "升级条件", "查询停车状态"],
        };
      }
      return {
        text: "是的，商场提供会员服务。当前会员可享积分累计、停车优惠、生日礼遇等权益。如您愿意，我可以立即为您办理入会。",
        quickReplies: ["我想入会", "了解会员权益", "入会后做什么"],
      };
    }

    // ── 5. 已是会员的通用回复 ──
    if (userProfile.isMember) {
      return {
        text: "您当前会员状态正常。DTX会员体系包含银卡、金卡、黑卡等级，可享积分累计、停车优惠、生日礼遇等权益。若您需要，我也可以为您进一步说明各等级差异。",
        quickReplies: ["查看会员权益", "升级条件", "查询停车状态"],
      };
    }

    // ── 6. 明确表达入会意愿 —— 请求个人信息授权 ──
    if (MEMBERSHIP_ENROLL_INTENT.test(text)) {
      return {
        text: "当然可以。入会前，请您确认个人信息授权，授权后即可完成注册并领取新人礼遇。",
        membershipAuthorizationCard: AUTHORIZATION_CARD,
        sideEffects: {
          setUserProfile: () => ({
            ...userProfile,
            _membershipAuthorizationPending: true,
          }),
        },
      };
    }

    // ── 7. 非会员，被 LLM 路由来的确认消息（上下文与入会相关）──
    if (!userProfile.isMember) {
      return {
        text: "入会前，请您先确认个人信息授权。",
        membershipAuthorizationCard: AUTHORIZATION_CARD,
        sideEffects: {
          setUserProfile: () => ({
            ...userProfile,
            _membershipAuthorizationPending: true,
          }),
        },
      };
    }

    // ── 8. 兜底 ──
    return {
      text: "是的，商场提供会员服务。当前会员可享积分累计、停车优惠、生日礼遇等权益。如您愿意，我可以立即为您办理入会。",
      quickReplies: ["我想入会", "了解会员权益", "入会后做什么"],
    };
  },
};
