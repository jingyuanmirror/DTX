/**
 * DTX 商场活动数据源
 *
 * 每条活动带 categories / brands / items 标签，
 * 用于和 UserProfile 中的偏好做匹配，实现个性化推荐。
 */

export interface Activity {
  id: string;
  title: string;
  summary: string;
  floor: string;
  dateRange: string;
  /** 关联品类，与 UserProfile.categories 对齐 */
  categories: string[];
  /** 关联品牌，与 UserProfile.brands 对齐 */
  brands: string[];
  /** 关联商品类型，与 UserProfile.items 对齐 */
  items: string[];
}

export const ACTIVITIES: Activity[] = [
  {
    id: "act-001",
    title: "Gucci Flora 美妆限时 pop-up",
    summary:
      "Gucci 全新 Flora Gorgeous Jasmine 香水首发体验，现场可定制专属花艺瓶身装饰，购满 2 件享 9 折礼遇。",
    floor: "1F-A01",
    dateRange: "6/26 – 7/10",
    categories: ["美妆护肤"],
    brands: ["Gucci"],
    items: ["香水", "彩妆"],
  },
  {
    id: "act-002",
    title: "Hermès 皮具鉴赏日",
    summary:
      "本季 Kelly & Birkin 全色系现货鉴赏，可预约一对一 SA 专属导览，消费积分享双倍累计。",
    floor: "1F-B03",
    dateRange: "6/28 – 7/5",
    categories: ["皮具"],
    brands: ["Hermès"],
    items: ["手袋"],
  },
  {
    id: "act-003",
    title: "Dior 美妆工坊——唇色定制体验",
    summary:
      "Dior 首席彩妆师驻场一对一唇色定制，现场购满 1,500 元赠限定收纳包。Rouge Dior 系列全线 9 折。",
    floor: "1F-C02",
    dateRange: "6/27 – 7/3",
    categories: ["美妆护肤"],
    brands: ["Dior"],
    items: ["彩妆", "护肤"],
  },
  {
    id: "act-004",
    title: "Chanel 高珠私享预览",
    summary:
      "Chanel 高级珠宝 COCO CRUSH 系列新季预览，仅限黑卡会员预约，享专属下午茶礼遇。",
    floor: "1F-D01",
    dateRange: "7/1 – 7/7",
    categories: ["珠宝首饰"],
    brands: ["Chanel"],
    items: ["珠宝"],
  },
  {
    id: "act-005",
    title: "PORSCHE x DTX 限时联名展",
    summary:
      "Porsche 911 Dakar 联名艺术装置，到场可获限量车模一枚；试驾预约即赠 DTX 500 积分。",
    floor: "B1-中庭",
    dateRange: "6/25 – 7/15",
    categories: [],
    brands: [],
    items: [],
  },
  {
    id: "act-006",
    title: "La Mer 奢养护肤私享课",
    summary:
      "La Mer 旗舰店护肤专家一对一面诊，定制奢养方案。到场赠经典面霜体验装，消费满 3,000 元享额外积分。",
    floor: "1F-E02",
    dateRange: "6/29 – 7/6",
    categories: ["美妆护肤"],
    brands: ["La Mer"],
    items: ["护肤"],
  },
  {
    id: "act-007",
    title: "Rolex 腕表品鉴沙龙",
    summary:
      "Rolex 2026 全新 Oyster Perpetual 系列鉴赏，资深表匠现场解构机芯，双倍积分日。",
    floor: "1F-F01",
    dateRange: "7/2 – 7/9",
    categories: ["高奢腕表"],
    brands: ["Rolex"],
    items: ["腕表"],
  },
  {
    id: "act-008",
    title: "DTX-S 先锋艺术装置展",
    summary:
      "数字艺术团队 teamLab 全新沉浸装置「无界·宇宙」，DTX-S 四楼全景呈现，会员免费观展。",
    floor: "4F-DTX-S",
    dateRange: "6/20 – 8/31",
    categories: ["先锋设计师"],
    brands: [],
    items: [],
  },
  {
    id: "act-009",
    title: "DTX 周末鲜食市集",
    summary:
      "B1 精品超市户外区，每周六日新鲜直供：有机蔬菜、进口水果、现烤面包、手冲咖啡。会员享 9 折，更有满赠好礼。",
    floor: "B1-户外区",
    dateRange: "每周六日",
    categories: ["生鲜美食"],
    brands: ["DTX精品超市"],
    items: ["生鲜"],
  },
  {
    id: "act-010",
    title: "亲子烘焙工坊",
    summary:
      "4F 乐高体验店旁，每周末亲子 DIY 烘焙，适合 3-10 岁儿童，会员家庭积分可抵扣活动费。名额有限需提前报名。",
    floor: "4F-C03",
    dateRange: "7/1 – 8/31",
    categories: ["亲子娱乐"],
    brands: [],
    items: [],
  },
  {
    id: "act-011",
    title: "DTX 影城·暑期大片连映周",
    summary:
      "DTX 影院 IMAX 厅暑期档连映周,凭当日商场消费小票满 200 元即享电影票 8 折,亲子动画与院线大片同档。",
    floor: "6F-E01",
    dateRange: "7/15 – 8/31",
    categories: ["亲子娱乐"],
    brands: [],
    items: [],
  },
  {
    id: "act-012",
    title: "Apple Today·夏日影像课",
    summary:
      "Apple Store 周末免费影像创作课,iPhone 街拍与短视频剪辑现场教学,到场赠限定教室贴纸,无需预约随到随学。",
    floor: "2F-A02",
    dateRange: "7/5 – 8/10",
    categories: [],
    brands: [],
    items: [],
  },
  {
    id: "act-013",
    title: "Lululemon 社区瑜伽派对",
    summary:
      "Lululemon 每周日上午免费社区瑜伽课,中庭草坪开场,需提前小程序报名;到场赠运动水壶一份。",
    floor: "1F-中庭",
    dateRange: "每周日",
    categories: [],
    brands: [],
    items: [],
  },
  {
    id: "act-014",
    title: "DTX 七夕限定·心动市集",
    summary:
      "七夕限时主题市集,集结鲜花、手工巧克力、香水小样与双人礼遇券,点亮 5 个打卡点即领专属红包,可一站式备齐七夕之礼。",
    floor: "1F-中庭",
    dateRange: "7/29 – 8/2",
    categories: ["生鲜美食", "高端餐饮"],
    brands: ["DTX精品超市"],
    items: ["鲜花", "甜品"],
  },
  {
    id: "act-015",
    title: "始祖鸟户外硬壳新品首发",
    summary:
      "始祖鸟最新 Beta 硬壳冲锋衣全色系现货首发,购满 5,000 元赠限量机能收纳包,现场可体验防风防泼测试。",
    floor: "3F-D05",
    dateRange: "7/20 – 8/5",
    categories: [],
    brands: [],
    items: [],
  },
  {
    id: "act-016",
    title: "丝芙兰会员8倍积分日",
    summary:
      "丝芙兰全店会员日 8 倍积分,香水彩妆满 599 减 80,适合囤常用精华与囤礼;同期新品香水均可现场试用。",
    floor: "2F-C04",
    dateRange: "7/25 – 7/28",
    categories: ["美妆护肤"],
    brands: [],
    items: ["香水", "彩妆", "护肤"],
  },
  {
    id: "act-017",
    title: "sudo拉满·KTV欢唱夜场特惠",
    summary:
      "DTX KHOUSE 周五周六夜场特惠,大包欢唱+自助餐套餐立减 30%,凭商场消费小票再加赠果盘,朋友聚会首选。",
    floor: "6F-F01",
    dateRange: "每周五六",
    categories: [],
    brands: [],
    items: [],
  },
  {
    id: "act-018",
    title: "PageOne 中外绘本人文展",
    summary:
      "PageOne 书店限时呈现中外艺术绘本人文展,百余册进口绘本与限定书签到场,周末作者签售场,亲子共读与文艺爱好者不容错过。",
    floor: "4F-B01",
    dateRange: "7/10 – 8/20",
    categories: ["亲子娱乐"],
    brands: [],
    items: [],
  },
  {
    id: "act-019",
    title: "DTX 周末会员双倍积分日",
    summary:
      "全场通用:周末会员消费享双倍积分,积分可抵扣停车费与活动报名费;配合当日各店活动,逛吃购一路累积更划算。",
    floor: "全场",
    dateRange: "每周末",
    categories: [],
    brands: [],
    items: [],
  },
  {
    id: "act-020",
    title: "MELAND 亲子乐园·夏日嘉年华",
    summary:
      "MELAND 亲子乐园暑期嘉年华,增设水上乐园与夏日主题闯关,单次票送家长休息区饮品券,适合带娃放一整天电。",
    floor: "4F-A01",
    dateRange: "7/1 – 8/31",
    categories: ["亲子娱乐"],
    brands: [],
    items: [],
  },
];