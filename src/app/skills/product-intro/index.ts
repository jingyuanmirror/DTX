import type { Skill } from "../../agent/types";
import type { ProductIntroCard } from "../../types";

interface ProductDefinition extends Omit<ProductIntroCard, "type"> {
  aliases: string[];
}

const PRODUCTS: ProductDefinition[] = [
  {
    brand: "瑞幸咖啡",
    name: "茉莉拿铁",
    aliases: ["茉莉拿铁", "瑞幸茉莉", "春季茉莉"],
    image: "/checkin-coffee.jpg",
    floor: "2F-A08",
    description: "以鲜泡茉莉花茶融合浓缩咖啡与鲜奶，入口先是清透花香，随后是柔和奶香。整体甜度较低，比传统拿铁更清爽。",
    sellingPoints: ["茉莉花香", "鲜奶拿铁", "春季限定"],
    suitableFor: "喜欢茶香咖啡、不想喝得过甜的顾客。",
    recommendation: "建议选微糖、少冰，茉莉香气和咖啡层次会更明显。",
    regularPrice: 18,
    activityPrice: 6.9,
    pointsLabel: "2倍积分",
    pointsActivity: "实付金额享2倍DTX积分，会员当日第2杯额外赠30积分。",
  },
  {
    brand: "屈臣氏",
    name: "水润保湿精选面膜",
    aliases: ["精选面膜", "保湿面膜", "屈臣氏面膜", "面膜"],
    image: "/product-mask.jpg",
    floor: "5F-B06",
    description: "采用轻薄贴肤膜布，精华液以补水和舒缓为主，敷后肤感清爽，不容易留下明显黏腻感，适合日常快速护理。",
    sellingPoints: ["深层补水", "舒缓保湿", "独立包装"],
    suitableFor: "缺水、换季干燥，或晒后需要快速舒缓的肌肤。",
    recommendation: "每次敷15分钟即可；敏感肌建议先在耳后做小范围测试。",
    regularPrice: 34,
    activityPrice: 3.99,
    pointsLabel: "加赠88积分",
    pointsActivity: "实付金额可累计DTX积分，购买2件再赠88积分。",
  },
  {
    brand: "知味观",
    name: "桂花定胜糕礼盒",
    aliases: ["定胜糕", "桂花定胜糕", "知味观糕点", "定胜糕礼盒"],
    image: "/product-pastry.jpg",
    floor: "1F-C03",
    description: "传统糯米外皮搭配豆沙内馅，加入桂花提香，口感软糯但不黏牙。礼盒份量适中，既适合当场分享，也方便作为伴手礼。",
    sellingPoints: ["糯香细腻", "桂花清香", "伴手礼首选"],
    suitableFor: "喜欢中式糕点的家庭，或需要轻便伴手礼的顾客。",
    recommendation: "当天食用口感最佳，搭配无糖茶更能平衡甜度。",
    regularPrice: 28,
    activityPrice: 23,
    pointsLabel: "2倍积分",
    pointsActivity: "消费积分双倍累计，单笔满50元额外赠50积分。",
  },
  {
    brand: "DTX",
    name: "七夕限定心意礼盒",
    aliases: ["七夕礼盒", "七夕限定礼盒", "心意礼盒", "七夕礼品"],
    image: "/product-gift.jpg",
    floor: "1F-中庭",
    description: "七夕限定礼盒将花香氛、手工巧克力和双人礼遇券组合在一起，外盒采用可重复使用的抽屉结构，送礼仪式感更完整。",
    sellingPoints: ["七夕限定", "双人礼遇", "精美包装"],
    suitableFor: "七夕送礼、纪念日惊喜，或偏好精致小件组合礼的顾客。",
    recommendation: "建议同时预约礼盒内的双人礼遇，可把实物礼品和约会体验一起送出。",
    regularPrice: 199,
    activityPrice: 99,
    pointsLabel: "3倍积分",
    pointsActivity: "参与七夕打卡享3倍积分，购买后点亮1个七夕任务。",
  },
];

export const productIntroSkill: Skill = {
  name: "product-intro",
  intentDescription: "用户说出具体商品名称时，展示商品卖点、日常价、参与活动和最低到手价。商品包括茉莉拿铁、屈臣氏面膜、知味观定胜糕、七夕限定礼盒。",
  match: () => true,
  handle: ({ text }) => {
    const normalized = text.toLowerCase();
    const product = PRODUCTS.find((item) => item.aliases.some((alias) => normalized.includes(alias.toLowerCase())));
    if (!product) return null;
    const { aliases: _aliases, ...card } = product;
    return {
      text: `这是${product.brand}的「${product.name}」。${product.description}\n\n它的主要特点是${product.sellingPoints.join("、")}，很适合${product.suitableFor}${product.recommendation}\n\n日常价¥${product.regularPrice}，当前活动价¥${product.activityPrice}。${product.pointsActivity}`, 
      quickReplies: ["确认选购", "问问商品细节", "查看同类商品"],
      productIntroCard: { type: "product-intro-card", ...card },
    };
  },
};
