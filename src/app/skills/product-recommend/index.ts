import type { Skill } from "../../agent/types";
import type { ProductIntroCard } from "../../types";
import { getUserSalutation } from "../../utils/salutation";

/**
 * 商品推荐卡 —— 节日/送礼场景(如"七夕适合买什么")从精选 SKU 列表里挑选若干件,
 * 纵向多卡展示,每件含图、卖点、日常价、活动价、积分权益。
 * 商品定义内联在此(与 product-intro 的单品介绍解耦),便于按场景组织推荐盘货。
 */

interface RecommendableProduct extends Omit<ProductIntroCard, "type"> {
  /** 适用场景标签,用于按语义挑选 */
  scenarios: string[];
}

const PRODUCTS: RecommendableProduct[] = [
  {
    brand: "DTX",
    name: "七夕限定心意礼盒",
    scenarios: ["七夕", "情人节", "纪念日", "送礼"],
    image: "/product-gift.jpg",
    floor: "1F-中庭",
    description: "花香氛、手工巧克力与双人礼遇券组合,抽屉式外盒送礼仪式感十足。",
    sellingPoints: ["七夕限定", "双人礼遇", "精美包装"],
    suitableFor: "七夕主礼、纪念日惊喜。",
    recommendation: "建议同时预约礼盒内双人礼遇,实物加体验一起送。",
    regularPrice: 199,
    activityPrice: 99,
    pointsLabel: "3倍积分",
    pointsActivity: "参与七夕打卡享3倍积分。",
  },
  {
    brand: "DTX精品超市",
    name: "进口鲜花礼盒",
    scenarios: ["七夕", "情人节", "纪念日", "送伴侣"],
    image: "/home.jpg",
    floor: "B1-01",
    description: "厄瓜多尔进口玫瑰礼盒,花头饱满、花期持久,附UE光感贺卡。",
    sellingPoints: ["进口玫瑰", "精美礼盒", "可代写贺卡"],
    suitableFor: "送伴侣/太太,搭配主礼更有氛围。",
    recommendation: "建议七夕当天上午取花,保鲜更久。",
    regularPrice: 299,
    activityPrice: 199,
    pointsLabel: "2倍积分",
    pointsActivity: "消费积分双倍累计。",
  },
  {
    brand: "瑞幸咖啡",
    name: "茉莉拿铁双人套餐",
    scenarios: ["七夕", "约会", "日常"],
    image: "/checkin-coffee.jpg",
    floor: "2F-A08",
    description: "清透茉莉花香融合鲜奶拿铁,双人套餐含两杯,适合约会小憩。",
    sellingPoints: ["花香拿铁", "双人套餐", "清爽不甜"],
    suitableFor: "约会、逛街歇脚。",
    recommendation: "建议微糖少冰,茉莉层次更明显。",
    regularPrice: 36,
    activityPrice: 13.8,
    pointsLabel: "2倍积分",
    pointsActivity: "会员当日第2杯额外赠30积分。",
  },
  {
    brand: "屈臣氏",
    name: "水润保湿面膜礼盒",
    scenarios: ["七夕", "送礼", "护肤"],
    image: "/product-mask.jpg",
    floor: "5F-B06",
    description: "补水舒缓面膜组合礼盒,轻巧便携,适合作为七夕小礼或伴手礼。",
    sellingPoints: ["深层补水", "舒缓保湿", "伴手礼首选"],
    suitableFor: "送闺蜜、轻量护肤礼。",
    recommendation: "敏感肌建议先耳后试敏。",
    regularPrice: 68,
    activityPrice: 39.9,
    pointsLabel: "加赠88积分",
    pointsActivity: "购买2件再赠88积分。",
  },
  {
    brand: "知味观",
    name: "桂花定胜糕礼盒",
    scenarios: ["七夕", "送礼", "伴手礼"],
    image: "/product-pastry.jpg",
    floor: "1F-C03",
    description: "糯香豆沙内馅配桂花提香,软糯不黏牙,礼盒份量适中。",
    sellingPoints: ["糯香细腻", "桂花清香", "伴手礼首选"],
    suitableFor: "喜欢中式糕点的家庭、轻便伴手礼。",
    recommendation: "当天食用最佳,搭配无糖茶更平衡。",
    regularPrice: 28,
    activityPrice: 23,
    pointsLabel: "2倍积分",
    pointsActivity: "单笔满50元额外赠50积分。",
  },
];

/** 礼物推荐场景特征词 → 场景标签 */
const SCENARIO_RULES: Array<{ pattern: RegExp; scenario: string }> = [
  { pattern: /七夕|情人节|214|2\.14/, scenario: "七夕" },
  { pattern: /纪念日/, scenario: "纪念日" },
  { pattern: /伴手礼/, scenario: "伴手礼" },
  { pattern: /送(伴侣|太太|老公|女友|男友|对象|什么|点)|送闺蜜/, scenario: "送礼" },
];

interface ScenarioMatch {
  scenario: string;
  matched: boolean;
}

/** 根据用户文本推断当前场景(命中即用,否则默认七夕) */
function detectScenario(text: string): ScenarioMatch {
  for (const rule of SCENARIO_RULES) {
    if (rule.pattern.test(text)) return { scenario: rule.scenario, matched: true };
  }
  return { scenario: "七夕", matched: false };
}

/** 是否为"买什么/送什么"的推荐意图(区别于问某具体商品的"商品介绍") */
const RECOMMEND_INTENT = /(?:适合)?(?:买|送|挑|选|买点|买什么|送什么|挑什么|选什么)/;

export const isProductRecommendIntent = (text: string): boolean => {
  let scenarioHit = false;
  for (const rule of SCENARIO_RULES) {
    if (rule.pattern.test(text)) {
      scenarioHit = true;
      break;
    }
  }
  return scenarioHit && RECOMMEND_INTENT.test(text);
};

export const productRecommendSkill: Skill = {
  name: "product-recommend",
  intentDescription:
    "节日/送礼场景的商品推荐。当用户问\"七夕适合买什么\"\"七夕送什么\"\"情人节买什么\"\"纪念日送什么\"\"有什么伴手礼\"等挑选类意图时,展示若干件精选商品卡(含图、活动价、积分)。注意:用户说出具体商品名(如\"茉莉拿铁\"\"七夕礼盒\")要查单品详情时,路由到 product-intro,而非本 skill。",
  match: () => true,
  handle: ({ text, userProfile }) => {
    const { scenario } = detectScenario(text);

    // 按场景标签命中排序:命中场景的优先,其余补位,共取 3-4 件
    const ranked = [...PRODUCTS].sort((a, b) => {
      const ai = a.scenarios.includes(scenario) ? 0 : 1;
      const bi = b.scenarios.includes(scenario) ? 0 : 1;
      return ai - bi;
    });

    // 至少保证2件命中当前场景,上限4件
    const matched = ranked.filter((p) => p.scenarios.includes(scenario));
    const others = ranked.filter((p) => !p.scenarios.includes(scenario));
    const picks = [...matched, ...others].slice(0, 4);

    const cards: ProductIntroCard[] = picks.map(({ scenarios: _s, ...card }) => ({
      type: "product-intro-card",
      ...card,
    }));

    const salutation = getUserSalutation(userProfile);

    return {
      text:
        `${salutation}，${scenario}送礼我帮您挑了几样。`
        + `先看主礼「${picks[0].brand}·${picks[0].name}」——${picks[0].description}`
        + `\n\n下面这几件是按${scenario}场景精选的,日常价与当前活动价都列出来了,可一并参考。点到任意商品我可以展开详情与选购。`,
      quickReplies: ["选购主礼", `说说「${picks[0].name}」`, "再多推荐几件", "去B1超市看看"],
      productRecommendCards: cards,
    };
  },
};