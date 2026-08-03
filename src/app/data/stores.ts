/**
 * DTX 商场零售/服务类店铺知识库 —— store-recommend skill 的零售分支专用
 *
 * 与 restaurants.ts 对齐的结构化设计,为零售/服务类店铺补充"推荐维度":
 *   category      — 大类(用于"想逛XX""买点XX""带娃去哪"匹配)
 *   categoryLabel — 中文细类(展示用)
 *   scenes        — 适合场景(日常采购/带娃/约会/家居焕新/送礼挑选/逛街歇脚...)
 *   audience      — 适合人群(亲子家庭/年轻情侣/独居/商务送礼...)
 *   priceRange    — 人均/客单区间文案
 *   priceLevel    — 价格档(1亲民 ~ 4奢华,用于排序与多样性)
 *   tags          — 其他亮点标签
 *   highlight     — 推荐时的一句话特色(用于自然话术)
 *   recommendItems — 招牌/推荐品类(对应餐厅的 recommendation)
 *   saBooking     — 是否支持 SA 预约(奢品类才有,推荐时引导预约)
 *
 * 数据来源:brand-catalog.md 中的零售店(超市/无印/宜家/乐高/屈臣氏),
 * 加上若干代表性奢品专柜以覆盖"送礼/品牌挑选"场景。餐饮实际仍读 RESTAURANTS。
 */

export type StoreCategory =
  | "生鲜超市"
  | "美妆个护"
  | "亲子娱乐"
  | "家居生活"
  | "时尚奢品"
  | "数码电器"
  | "运动服饰"
  | "影院娱乐";

export interface RecommendableStore {
  id: string;
  name: string;
  floor: string;
  category: StoreCategory;
  categoryLabel: string;
  scenes: string[];
  audience: string[];
  priceRange: string;
  priceLevel: 1 | 2 | 3 | 4;
  tags: string[];
  highlight: string;
  recommendItems: string[];
  tip?: string;
  image?: string;
  /** 奢品类才有:支持 SA 预约,推荐时引导预约档期。 */
  saBooking?: boolean;
}

export const STORES: RecommendableStore[] = [
  {
    id: "dtx-market",
    name: "DTX精品超市",
    floor: "B1-01",
    category: "生鲜超市",
    categoryLabel: "精品超市 / 进口食品",
    scenes: ["日常采购", "送礼挑选", "带娃", "一人食加餐"],
    audience: ["亲子家庭", "独居", "商务送礼"],
    priceRange: "客单100–300元",
    priceLevel: 2,
    tags: ["源头直采", "现烤烘焙", "有机专区", "晚7点折扣"],
    highlight: "阳澄湖大闸蟹、日本空运和牛到货,每日现烤面包,送礼自用都合适。",
    recommendItems: ["进口鲜花礼盒", "有机水果礼篮", "现烤面包", "空运和牛"],
    tip: "晚7点后部分生鲜有折扣,送礼建议上午到店挑选。",
    image: "/checkin-market.jpg",
  },
  {
    id: "watsons",
    name: "屈臣氏",
    floor: "5F-B06",
    category: "美妆个护",
    categoryLabel: "美妆护肤 / 个护健康",
    scenes: ["日常采购", "送礼挑选", "逛街途中补给"],
    audience: ["独居", "年轻情侣", "闺蜜"],
    priceRange: "客单30–200元",
    priceLevel: 1,
    tags: ["面膜换购", "便捷精选", "个护齐全"],
    highlight: "水润保湿面膜3.99元换购,个护一站搞定,顺路补货很方便。",
    recommendItems: ["保湿面膜礼盒", "个护套装", "防晒精选"],
    tip: "面膜换购到店即可参与,适合随手补货。",
    image: "/product-mask.jpg",
  },
  {
    id: "lego",
    name: "乐高体验店",
    floor: "4F-B02",
    category: "亲子娱乐",
    categoryLabel: "积木玩具 / 亲子体验",
    scenes: ["带娃", "送礼挑选", "周末派对"],
    audience: ["亲子家庭", "小朋友"],
    priceRange: "客单200–800元",
    priceLevel: 3,
    tags: ["限定典藏", "周末拼搭派对", "城市系列新品"],
    highlight: "限定典藏套装到货,周末拼搭派对,带娃来逛一下午不无聊。",
    recommendItems: ["限定典藏套装", "城市系列新品", "拼搭派对体验"],
    tip: "周末拼搭派对需到店登记参加,适合3岁以上小朋友。",
    image: "/checkin-hotpot.jpg",
  },
  {
    id: "muji",
    name: "无印良品",
    floor: "3F-A05",
    category: "家居生活",
    categoryLabel: "家居 / 服饰 / 文具 / 香薰",
    scenes: ["家居焕新", "日常采购", "送礼挑选", "逛街歇脚"],
    audience: ["独居", "年轻情侣", "上班族"],
    priceRange: "客单80–500元",
    priceLevel: 2,
    tags: ["极简自然", "香薰机限定礼盒", "再生棉麻包"],
    highlight: "亚麻寝具新季、香薰机限定礼盒,送礼自用都温柔耐看。",
    recommendItems: ["香薰机礼盒", "亚麻寝具", "再生棉麻包", "文具精选"],
    tip: "香薰机礼盒含精油,适合做伴手礼。",
    image: "/product-pastry.jpg",
  },
  {
    id: "ikea",
    name: "宜家家居",
    floor: "3F-B01",
    category: "家居生活",
    categoryLabel: "家具 / 家居用品 / 软装",
    scenes: ["家居焕新", "带娃", "新居布置"],
    audience: ["亲子家庭", "独居", "年轻情侣"],
    priceRange: "客单100–2000元",
    priceLevel: 2,
    tags: ["北欧实用", "高性价比", "儿童房新品", "收纳组合"],
    highlight: "夏日户外系列、收纳组合套装、儿童房新品,小家大家都能挑到。",
    recommendItems: ["收纳组合套装", "儿童房新品", "灯具软装", "夏日户外系列"],
    tip: "大件家具可预约免费送货,建议先量好尺寸。",
    image: "/product-pastry.jpg",
  },
  {
    id: "hermes",
    name: "Hermès",
    floor: "1F-B03",
    category: "时尚奢品",
    categoryLabel: "皮具 / 丝巾配饰 / 香水家居",
    scenes: ["送礼挑选", "商务送礼", "纪念日"],
    audience: ["商务送礼", "情侣", "高端用户"],
    priceRange: "客单3,900–50,000元起",
    priceLevel: 4,
    tags: ["90cm真丝围巾", "Kelly到货", "需提前1天预约"],
    highlight: "Cavier 牛皮 Kelly 到货、90cm 真丝斜纹围巾新图案,送礼首选。",
    recommendItems: ["90cm真丝丝巾", "Garden Party 帆布款", "皮带", "香水"],
    tip: "需提前1天预约,不接受当日预约。",
    saBooking: true,
    image: "/checkin-coffee.jpg",
  },
  {
    id: "cartier",
    name: "Cartier",
    floor: "1F-G01",
    category: "时尚奢品",
    categoryLabel: "高级珠宝 / 腕表 / 配饰",
    scenes: ["送礼挑选", "纪念日", "商务送礼"],
    audience: ["情侣", "商务送礼", "高端用户"],
    priceRange: "客单6,000–150,000元起",
    priceLevel: 4,
    tags: ["Love手镯玫瑰金新色", "Juste un Clou新款", "黑卡新品优先预览"],
    highlight: "Juste un Clou 新款窄版、Love 手镯玫瑰金新色到店,纪念送礼经典。",
    recommendItems: ["Love手镯", "Juste un Clou戒指", "Tank腕表"],
    tip: "建议提前1天预约,黑卡享新品优先预览权。",
    saBooking: true,
    image: "/checkin-coffee.jpg",
  },
  {
    id: "vca",
    name: "Van Cleef & Arpels",
    floor: "1F-L01",
    category: "时尚奢品",
    categoryLabel: "高级珠宝 / 腕表 / 香水",
    scenes: ["送礼挑选", "纪念日", "情侣"],
    audience: ["情侣", "高端用户"],
    priceRange: "客单12,000–120,000元起",
    priceLevel: 4,
    tags: ["Alhambra四叶草", "Perlée新色", "诗意珠宝"],
    highlight: "Alhambra 长项链新材质、Perlée 戒指新色,诗意四叶草送伴侣很浪漫。",
    recommendItems: ["Alhambra四叶草长项链", "Perlée戒指", "诗意复杂功能腕表"],
    tip: "建议提前1天预约。",
    saBooking: true,
    image: "/checkin-coffee.jpg",
  },
  {
    id: "sephora",
    name: "丝芙兰",
    floor: "2F-C04",
    category: "美妆个护",
    categoryLabel: "美妆护肤 / 香水 / 彩妆集合",
    scenes: ["逛街途中补给", "送礼挑选", "约会前补妆"],
    audience: ["年轻情侣", "闺蜜", "上班族"],
    priceRange: "客单200–800元",
    priceLevel: 2,
    tags: ["100+品牌集合", "免费试妆", "会员积分双倍"],
    highlight: "百个美妆品牌一站试妆,新品香水随手试,送闺蜜彩妆礼盒很省心。",
    recommendItems: ["香水礼盒", "彩妆套盒", "护肤精华", "面膜组合"],
    tip: "会员日积分双倍,适合囤常用精华。",
    image: "/product-mask.jpg",
  },
  {
    id: "la-mer",
    name: "La Mer",
    floor: "1F-E02",
    category: "美妆个护",
    categoryLabel: "奢养护肤",
    scenes: ["送礼挑选", "纪念日", "自用奢养"],
    audience: ["高端用户", "商务送礼", "情侣"],
    priceRange: "客单1,800–6,000元起",
    priceLevel: 4,
    tags: ["海蓝之谜", "面霜精华礼盒", "私享面诊"],
    highlight: "经典面霜与精华奢养套装到货,可一对一私享面诊,送礼显分量。",
    recommendItems: ["经典面霜礼盒", "精华套装", "眼霜"],
    tip: "专柜支持护肤专家面诊,建议提前1天预约。",
    saBooking: true,
    image: "/product-mask.jpg",
  },
  {
    id: "zara-home",
    name: "ZARA Home",
    floor: "3F-C02",
    category: "家居生活",
    categoryLabel: "家居 / 床品 / 餐瓷 / 香薰",
    scenes: ["家居焕新", "新居布置", "送礼挑选", "逛街歇脚"],
    audience: ["年轻情侣", "独居", "上班族"],
    priceRange: "客单100–1,500元",
    priceLevel: 2,
    tags: ["当季床品", "香薰蜡烛", "餐瓷礼盒"],
    highlight: "当季亚麻床品、香薰蜡烛与餐瓷礼盒,新居布置和送礼都很有调性。",
    recommendItems: ["亚麻床品", "香薰蜡烛", "餐瓷礼盒", "摆件"],
    tip: "床品支持按尺寸预订,建议先量好规格。",
    image: "/product-pastry.jpg",
  },
  {
    id: "apple",
    name: "Apple Store",
    floor: "2F-A02",
    category: "数码电器",
    categoryLabel: "消费电子 / 数码配件",
    scenes: ["逛街途中补给", "送礼挑选", "办公置装"],
    audience: ["上班族", "年轻情侣", "独居", "学生"],
    priceRange: "客单200–12,000元",
    priceLevel: 3,
    tags: ["Today at Apple", "以旧换新", "刻字定制"],
    highlight: "最新 iPhone、Mac 现货体验,Today at Apple 免费课程随时逛随时学。",
    recommendItems: ["iPhone", "AirPods", "Apple Watch", "Mac"],
    tip: "支持以旧换新与免费刻字,送礼可定制专属信息。",
    image: "/checkin-coffee.jpg",
  },
  {
    id: "dyson",
    name: "戴森",
    floor: "2F-B03",
    category: "数码电器",
    categoryLabel: "高端小家电 / 个护电器",
    scenes: ["家居焕新", "送礼挑选", "自用升级"],
    audience: ["新婚", "家庭", "上班族"],
    priceRange: "客单1,500–5,000元",
    priceLevel: 3,
    tags: ["吹风机", "吸尘器", "免费试用", "刻字"],
    highlight: "吹风机、吸尘器现场免费试用,送礼可定制刻字,新家自用都合适。",
    recommendItems: ["Supersonic吹风机", "V12吸尘器", "空气净化耳机"],
    tip: "支持刻字定制,适合做结婚/乔迁礼。",
    image: "/checkin-coffee.jpg",
  },
  {
    id: "arcteryx",
    name: "始祖鸟",
    floor: "3F-D05",
    category: "运动服饰",
    categoryLabel: "高端户外 / 冲锋衣",
    scenes: ["逛街途中补给", "出游装备", "送礼挑选"],
    audience: ["户外爱好者", "上班族", "情侣"],
    priceRange: "客单3,000–15,000元",
    priceLevel: 4,
    tags: ["硬壳冲锋衣", "城市机能", "限量配色"],
    highlight: "经典硬壳冲锋衣、城市机能系列到货,城市户外通勤一件搞定。",
    recommendItems: ["Beta硬壳冲锋衣", "Atom棉服", "机能长裤"],
    tip: "限量配色到货即售罄,喜欢可让店员预留。",
    image: "/checkin-hotpot.jpg",
  },
  {
    id: "lululemon",
    name: "Lululemon",
    floor: "3F-E01",
    category: "运动服饰",
    categoryLabel: "瑜伽 / 运动服饰",
    scenes: ["逛街途中补给", "运动通勤", "送礼挑选"],
    audience: ["上班族", "年轻情侣", "闺蜜"],
    priceRange: "客单400–1,500元",
    priceLevel: 2,
    tags: ["瑜伽裤", "运动通勤", "免费社区课"],
    highlight: "Align 瑜伽裤与运动通勤系列,周末还有免费社区瑜伽课,边逛边动。",
    recommendItems: ["Align瑜伽裤", "运动内衣", "男士裤", "外套"],
    tip: "周末社区瑜伽课免费,需提前小程序报名。",
    image: "/checkin-hotpot.jpg",
  },
  {
    id: "meland",
    name: "MELAND 亲子乐园",
    floor: "4F-A01",
    category: "亲子娱乐",
    categoryLabel: "大型室内亲子乐园",
    scenes: ["带娃", "周末派对", "亲子放电"],
    audience: ["亲子家庭", "小朋友"],
    priceRange: "客单200–400元/儿童",
    priceLevel: 2,
    tags: ["超大乐园", "波波池", "适合3-12岁", "家长休息区"],
    highlight: "超大室内乐园,波波池、攀爬迷宫放电一整天,家长有专属休息区。",
    recommendItems: ["单次票", "亲子套票", "生日派对包场"],
    tip: "周末高峰建议提前1天订票,有家长休息区可蹭网办公。",
    image: "/checkin-hotpot.jpg",
  },
  {
    id: "pageone",
    name: "PageOne 书店",
    floor: "4F-B01",
    category: "亲子娱乐",
    categoryLabel: "综合书店 / 文创 / 亲子阅读",
    scenes: ["逛街歇脚", "带娃", "约会", "独自消磨"],
    audience: ["独居", "年轻情侣", "亲子家庭", "上班族"],
    priceRange: "客单50–300元",
    priceLevel: 1,
    tags: ["原版书", "文创手作", "咖啡阅读区", "儿童绘本"],
    highlight: "原版进口书、文创手作齐全,带咖啡阅读区,逛街歇脚或带娃读绘本都合适。",
    recommendItems: ["原版绘本", "文创手账", "咖啡", "限定书签"],
    tip: "内有咖啡阅读区,可点杯饮品慢慢翻书。",
    image: "/product-pastry.jpg",
  },
  {
    id: "dtx-cinema",
    name: "DTX 影院",
    floor: "6F-E01",
    category: "影院娱乐",
    categoryLabel: "影院 / IMAX",
    scenes: ["约会", "逛街歇脚", "带娃", "独自消磨"],
    audience: ["年轻情侣", "亲子家庭", "独居"],
    priceRange: "客单50–120元",
    priceLevel: 1,
    tags: ["IMAX", "杜比全景声", "会员8折", "零食套餐"],
    highlight: "IMAX + 杜比全景声厅,最新大片同步上映,会员8折、爆米花套餐划算。",
    recommendItems: ["IMAX票", "情侣座", "零食套餐", "会员储值"],
    tip: "周末热门场建议提前选座,购物小票可换零食折扣。",
    image: "/checkin-hotpot.jpg",
  },
  {
    id: "ktv",
    name: "DTX KHOUSE KTV",
    floor: "6F-F01",
    category: "影院娱乐",
    categoryLabel: "量贩KTV / 派对聚会",
    scenes: ["朋友小聚", "生日派对", "团建"],
    audience: ["年轻情侣", "闺蜜", "上班族"],
    priceRange: "客单60–200元/人",
    priceLevel: 2,
    tags: ["小包到大包", "自助餐", "欢唱套餐", "夜场优惠"],
    highlight: "包厢从双人到聚会大包齐全,含自助餐欢唱套餐,周末朋友聚会首选。",
    recommendItems: ["欢唱套餐", "情侣小包", "聚會大包", "自助餐"],
    tip: "工作日午场最划算,周末建议提前订包厢。",
    image: "/checkin-hotpot.jpg",
  },
  {
    id: "tiffany",
    name: "Tiffany & Co.",
    floor: "1F-J05",
    category: "时尚奢品",
    categoryLabel: "高级珠宝 / 订婚钻戒",
    scenes: ["求婚", "纪念日", "送礼挑选"],
    audience: ["情侣", "高端用户"],
    priceRange: "客单8,000–200,000元起",
    priceLevel: 4,
    tags: ["T系列", "订婚钻戒", "Tiffany Blue礼盒"],
    highlight: "T 系列与订婚钻戒到货,经典 Tiffany Blue 礼盒求婚纪念最有仪式感。",
    recommendItems: ["T系列戒指", "订婚钻戒", "Keys吊坠", "微笑项链"],
    tip: "建议提前1天预约,钻戒可定制4C参数。",
    saBooking: true,
    image: "/checkin-coffee.jpg",
  },
];

/** 零售大类列表 —— 引导与枚举时用 */
export const STORE_CATEGORY_LIST: StoreCategory[] = [
  "生鲜超市",
  "美妆个护",
  "亲子娱乐",
  "家居生活",
  "时尚奢品",
  "数码电器",
  "运动服饰",
  "影院娱乐",
];

/** 文本线索 → 零售大类(用于"想买包/生鲜/带娃"匹配) */
export const STORE_KEYWORDS: { category: StoreCategory; keys: string[] }[] = [
  { category: "生鲜超市", keys: ["生鲜", "超市", "进口食品", "水果", "蔬菜", "海鲜", "和牛", "大闸蟹", "鲜花", "面包", "烘焙", "有机"] },
  { category: "美妆个护", keys: ["美妆", "护肤", "化妆品", "彩妆", "香水", "面膜", "个护", "个护健康", "面霜", "精华"] },
  { category: "亲子娱乐", keys: ["亲子", "儿童", "孩子", "带娃", "玩具", "乐高", "积木", "儿童友好", "小朋友", "绘本", "乐园", "放电"] },
  { category: "家居生活", keys: ["家居", "家具", "家居用品", "软装", "收纳", "灯具", "香薰", "寝具", "新居", "装修", "床品", "餐瓷"] },
  { category: "时尚奢品", keys: ["包", "包包", "手袋", "腕表", "手表", "珠宝", "项链", "戒指", "丝巾", "奢侈品", "奢品", "钻戒", "求婚"] },
  { category: "数码电器", keys: ["数码", "电子产品", "手机", "电脑", "耳机", "平板", "家电", "小家电", "吹风", "吸尘", "苹果", "iPhone", "mac"] },
  { category: "运动服饰", keys: ["运动", "瑜伽", "跑步", "健身", "户外", "冲锋衣", "运动服", "运动鞋", "lululemon", "始祖鸟"] },
  { category: "影院娱乐", keys: ["电影", "影院", "看电影", "影城", "ktv", "唱歌", "KTV", "包厢", "聚会", "聚会唱K"] },
];

/** 用户表述中常见"随便/你定"等模糊词 → 今日逛逛精选 */
export const CASUAL_KEYS = ["随便", "都行", "都可以", "你定", "看着办", "你推荐", "不知道逛什么", "没啥想法"];
