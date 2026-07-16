/**
 * DTX 商场餐厅知识库 —— 餐饮推荐 skill 专用
 * 结构化字段,便于按菜系类型 / 场景 / 预算 精准筛选。
 * 数据与 mall-knowledge.md 第 6 节保持一致,新增结构化标签字段。
 *
 * 字段说明:
 *   cuisine     — 菜系大类(用于"想吃XX"匹配,如 粤菜/火锅/日料/西餐/中餐/小吃快餐/茶饮咖啡)
 *   cuisineType — 菜系细类(中文描述,用于回复)
 *   scenes      — 适合场景(商务宴请/家庭聚餐/朋友小聚/快速午餐/约会/一人食)
 *   priceRange  — 人均区间文案
 *   priceLevel  — 价格档(1亲民 ~ 4奢华,用于排序与多样性)
 *   tags        — 其它亮点标签(米其林/包间/儿童友好/排队短/可外带...)
 *   highlight   — 推荐时的一句话特色(用于自然话术)
 *   recommendation — 招牌/特色菜品
 */

export interface Restaurant {
  id: string;
  name: string;
  floor: string;
  cuisine: string;
  cuisineType: string;
  scenes: string[];
  priceRange: string;
  priceLevel: 1 | 2 | 3 | 4;
  tags: string[];
  highlight: string;
  recommendation: string[];
  tip?: string;
  /** 配图路径,置于 public/ 下(如 /restaurant-xinrongji.jpg)。留空时卡片走渐变占位底,不显图。 */
  image?: string;
}

export const RESTAURANTS: Restaurant[] = [
  {
    id: "xinrongji",
    name: "新荣记",
    floor: "7F-D01",
    cuisine: "中餐",
    cuisineType: "台州菜(米其林三星)",
    scenes: ["商务宴请"],
    priceRange: "800–1200元",
    priceLevel: 4,
    tags: ["米其林三星", "包间", "需提前预约"],
    highlight: "商务宴请首选,家烧黄鱼、沙蒜豆面是招牌。",
    recommendation: ["家烧黄鱼", "沙蒜豆面", "熔岩蜜汁红薯", "花胶黄鱼羹"],
    tip: "需提前预约,包间提前1天预定。",
    image: "/restaurant-xinrongji.jpg",
  },
  {
    id: "dadong",
    name: "大董",
    floor: "6F-D02",
    cuisine: "中餐",
    cuisineType: "烤鸭 / 创意中餐(米其林一星)",
    scenes: ["商务宴请", "家庭聚餐"],
    priceRange: "600–900元",
    priceLevel: 4,
    tags: ["米其林一星", "烤鸭"],
    highlight: "酥不腻烤鸭皮酥肉嫩,午市套餐性价比高。",
    recommendation: ["酥不腻烤鸭", "董氏烧海参", "奇妙虾球", "红花汁鳘肚"],
    tip: "烤鸭建议整只预定,双人份可点半只。",
    image: "/restaurant-dadong.jpg",
  },
  {
    id: "robuchon",
    name: "L'Atelier de Joël Robuchon",
    floor: "6F-A01",
    cuisine: "西餐",
    cuisineType: "法餐(米其林二星)",
    scenes: ["商务宴请", "约会"],
    priceRange: "1500–2500元",
    priceLevel: 4,
    tags: ["米其林二星", "需提前预约", "着装要求"],
    highlight: "吧台位可观开放式厨房,适合1–2位精致用餐。",
    recommendation: ["鱼子酱龙虾冻", "黑松露和牛塔塔", "焦糖布丁"],
    tip: "晚市建议提前2天预约,着装商务休闲。",
    image: "/restaurant-robuchon.jpg",
  },
  {
    id: "yongfu",
    name: "甬府",
    floor: "7F-C01",
    cuisine: "中餐",
    cuisineType: "宁波菜(米其林一星)",
    scenes: ["商务宴请"],
    priceRange: "500–800元",
    priceLevel: 3,
    tags: ["米其林一星", "海鲜", "需提前预约"],
    highlight: "冰镇花雕醉虾、红膏炝蟹,海鲜当季时令最佳。",
    recommendation: ["冰镇花雕醉虾", "宁式鳝丝", "红膏炝蟹", "苔菜小方烤"],
    tip: "午市套餐性价比较高。",
    image: "/restaurant-yongfu.jpg",
  },
  {
    id: "cuiyuan",
    name: "翠园",
    floor: "5F-B01",
    cuisine: "粤菜",
    cuisineType: "粤菜",
    scenes: ["家庭聚餐", "朋友小聚"],
    priceRange: "300–500元",
    priceLevel: 3,
    tags: ["儿童友好", "茶市"],
    highlight: "脆皮乳猪、菠萝咕噜肉,周末茶市人气高。",
    recommendation: ["脆皮乳猪", "菠萝咕噜肉", "脆皮烧鹅", "杨枝甘露"],
    tip: "周末茶市人气高,建议11:00前到店;有儿童座椅,适合家庭。",
    image: "/restaurant-cuiyuan.jpg",
  },
  {
    id: "dingtaifeng",
    name: "鼎泰丰",
    floor: "B1-A01",
    cuisine: "小吃快餐",
    cuisineType: "台湾小笼包 / 点心",
    scenes: ["快速午餐", "一人食", "家庭聚餐"],
    priceRange: "150–250元",
    priceLevel: 2,
    tags: ["可外带", "全天营业"],
    highlight: "小笼包、蟹粉小笼是经典,非高峰等位较短。",
    recommendation: ["小笼包", "蟹粉小笼", "虾仁烧卖", "芋泥小笼"],
    tip: "全天排队,14:00–17:00等位较短;可外带生小笼。",
    image: "/restaurant-dingtaifeng.jpg",
  },
  {
    id: "haidilao",
    name: "海底捞",
    floor: "5F-C01",
    cuisine: "火锅",
    cuisineType: "火锅",
    scenes: ["家庭聚餐", "朋友小聚"],
    priceRange: "120–180元",
    priceLevel: 2,
    tags: ["儿童友好", "排队小程序", "服务周到"],
    highlight: "番茄锅底、虾滑,有儿童游乐区,聚餐热闹。",
    recommendation: ["番茄锅底", "毛肚", "虾滑", "现扯面表演"],
    tip: "晚市排队较长,建议小程序排队;有儿童游乐区。",
    image: "/checkin-hotpot.jpg",
  },
  {
    id: "xicha",
    name: "喜茶",
    floor: "B1-C01",
    cuisine: "茶饮咖啡",
    cuisineType: "新式茶饮",
    scenes: ["一人食", "朋友小聚"],
    priceRange: "25–40元",
    priceLevel: 1,
    tags: ["可外带", "小程序下单"],
    highlight: "多肉葡萄、烤黑糖波波,提前下单到店取最快。",
    recommendation: ["多肉葡萄", "生打椰椰芒", "烤黑糖波波牛乳"],
    tip: "支持小程序提前下单到店取。",
    image: "/restaurant-xicha.jpg",
  },
  {
    id: "arabica",
    name: "％Arabica",
    floor: "1F-E01",
    cuisine: "茶饮咖啡",
    cuisineType: "精品咖啡",
    scenes: ["一人食", "朋友小聚"],
    priceRange: "35–55元",
    priceLevel: 1,
    tags: ["可外带", "少量堂食"],
    highlight: "西班牙拿铁、抹茶拿铁,1层中庭外带方便。",
    recommendation: ["西班牙拿铁", "抹茶拿铁", "冰美式"],
    tip: "门店位于1层中庭,外带与少量堂食位皆可。",
    image: "/checkin-coffee.jpg",
  },
  {
    id: "foodcourt",
    name: "DTX美食广场",
    floor: "B1-B01",
    cuisine: "小吃快餐",
    cuisineType: "综合美食广场(日式拉面/韩式拌饭/泰式炒粉/中式快餐等20+档口)",
    scenes: ["快速午餐", "一人食"],
    priceRange: "35–80元",
    priceLevel: 1,
    tags: ["出餐快", "选择丰富", "扫码点餐"],
    highlight: "档口多、出餐快,日式拉面、韩式拌饭当天想吃啥都有。",
    recommendation: ["日式拉面", "韩式拌饭", "泰国炒粉", "中式快餐"],
    tip: "午餐高峰12:00–13:00,建议11:30前或14:00后到。",
    image: "/restaurant-foodcourt.jpg",
  },
  {
    id: "market-light",
    name: "DTX精品超市轻食区",
    floor: "B1-01",
    cuisine: "小吃快餐",
    cuisineType: "轻食 / 便当 / 沙拉 / 现做寿司",
    scenes: ["快速午餐", "一人食"],
    priceRange: "30–60元",
    priceLevel: 1,
    tags: ["可外带", "晚7点折扣"],
    highlight: "当日现做寿司、沙拉、三明治,适合快速解决或买回家。",
    recommendation: ["当日现做寿司", "沙拉", "三明治", "烘焙"],
    tip: "晚7点后部分轻食有折扣。",
    image: "/checkin-market.jpg",
  },
];

/** 菜系大类 → 引导时供模型参考的口味选项 */
export const CUISINE_CATEGORIES = [
  "中餐",
  "粤菜",
  "火锅",
  "西餐",
  "日料",
  "小吃快餐",
  "茶饮咖啡",
];