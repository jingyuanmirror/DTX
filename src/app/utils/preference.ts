import type { UserProfile } from "../types";

export const categoryMap: Record<string, string[]> = {
  高奢腕表: ["腕表", "手表", "钟表", "手表皮具", "腕表皮具"],
  皮具: ["皮具", "包包", "手袋", "箱包"],
  美妆护肤: ["美妆", "护肤", "化妆品", "彩妆", "香水"],
  先锋设计师: ["设计师", "潮牌", "先锋", "买手"],
  珠宝首饰: ["珠宝", "首饰", "黄金", "钻石", "饰品"],
  高端餐饮: ["餐饮", "美食", "餐厅", "吃饭", "下午茶", "咖啡"],
  生鲜美食: ["生鲜", "超市", "新鲜", "好物", "进口食品", "有机", "水果", "蔬菜", "海鲜"],
  亲子娱乐: ["亲子", "儿童", "孩子", "游乐", "乐高", "烘焙", "绘本"],
  生活方式: ["生活方式", "家居", "生活", "无印", "宜家", "香薰"],
  日常餐饮: ["吃什么", "午餐", "晚餐", "快餐", "美食广场", "火锅", "便当", "轻食"],
};

export const brandKeywords: Record<string, string[]> = {
  "Hermès": ["hermes", "爱马仕", "hermès"],
  Chanel: ["chanel", "香奈儿"],
  "Louis Vuitton": ["louis vuitton", "lv", "路易威登"],
  Dior: ["dior", "迪奥"],
  Gucci: ["gucci", "古驰"],
  Prada: ["prada", "普拉达"],
  Cartier: ["cartier", "卡地亚"],
  Bulgari: ["bulgari", "宝格丽"],
  "Van Cleef": ["van cleef", "梵克雅宝"],
  Celine: ["celine", "思琳"],
  Fendi: ["fendi", "芬迪"],
  "Bottega Veneta": ["bottega veneta", "bv", "葆蝶家"],
  Loewe: ["loewe", "罗意威"],
  Givenchy: ["givenchy", "纪梵希"],
  Valentino: ["valentino", "华伦天奴"],
  "Saint Laurent": ["saint laurent", "ysl", "圣罗兰"],
  Rolex: ["rolex", "劳力士"],
  Omega: ["omega", "欧米茄"],
  "Patek Philippe": ["patek", "百达翡丽"],
  "La Mer": ["la mer", "海蓝之谜"],
  "SK-II": ["sk-ii", "skii", "sk2"],
  "Tom Ford": ["tom ford", "tf"],
  "DTX精品超市": ["dtx超市", "dtx精品", "精品超市"],
  无印良品: ["无印", "muji"],
  宜家: ["宜家", "ikea"],
  乐高: ["乐高", "lego"],
  屈臣氏: ["屈臣氏", "watsons", "watson's"],
};

export const itemKeywords: Record<string, string[]> = {
  丝巾: ["丝巾", "围巾", "披肩"],
  手袋: ["手袋", "包", "包包", "手提包", "斜挎包"],
  腕表: ["腕表", "手表", "表"],
  珠宝: ["珠宝", "项链", "戒指", "耳环", "手镯", "胸针"],
  香水: ["香水", "香氛"],
  彩妆: ["彩妆", "口红", "唇膏", "粉底", "眼影"],
  护肤: ["护肤", "面霜", "精华", "面膜"],
  鞋履: ["鞋", "高跟鞋", "皮鞋", "运动鞋"],
  成衣: ["成衣", "大衣", "西装", "外套", "连衣裙", "裙"],
  家居: ["家居", "家居用品", "摆件", "烛台"],
  生鲜: ["生鲜", "水果", "蔬菜", "海鲜", "肉类", "牛奶", "面包", "和牛", "大闸蟹"],
  鲜花: ["鲜花", "花束", "玫瑰", "百合", "郁金香"],
  甜品: ["甜品", "甜点", "蛋糕", "冰淇淋", "马卡龙", "dessert"],
};

export interface PreferenceDetection {
  matchedCategory?: string;
  matchedCategories: string[];
  matchedBrands: string[];
  matchedItems: string[];
  hasPreference: boolean;
}

export function detectPreference(text: string): PreferenceDetection {
  const matchedCategories = Object.entries(categoryMap)
    .filter(([, keywords]) => keywords.some((kw) => text.includes(kw)))
    .map(([category]) => category);
  const matchedCategory = matchedCategories[0];

  const matchedBrands = Object.entries(brandKeywords)
    .filter(([, keywords]) => keywords.some((kw) => text.toLowerCase().includes(kw)))
    .map(([brand]) => brand);

  const matchedItems = Object.entries(itemKeywords)
    .filter(([, keywords]) => keywords.some((kw) => text.includes(kw)))
    .map(([item]) => item);

  return {
    matchedCategory,
    matchedCategories,
    matchedBrands,
    matchedItems,
    hasPreference: matchedCategories.length > 0 || matchedBrands.length > 0 || matchedItems.length > 0,
  };
}

export function isPreferenceExpression(text: string): boolean {
  return /(?:我)?(?:喜欢|偏好|关注|感兴趣|常买|爱逛|更喜欢|比较喜欢)|我的喜好|我的偏好/.test(text);
}

export function buildPreferenceSummary(profile: UserProfile): string {
  const parts: string[] = [];

  if (profile.categories.length > 0) {
    const catList =
      profile.categories.length > 1
        ? profile.categories.slice(0, -1).join("、") + "和" + profile.categories[profile.categories.length - 1]
        : profile.categories[0];
    parts.push(catList);
  }

  if (profile.brands.length > 0) {
    const brandList =
      profile.brands.length > 1
        ? profile.brands.slice(0, -1).join("、") + "和" + profile.brands[profile.brands.length - 1]
        : profile.brands[0];
    parts.push(brandList);
  }

  if (profile.items.length > 0) {
    const itemList =
      profile.items.length > 1
        ? profile.items.slice(0, -1).join("、") + "和" + profile.items[profile.items.length - 1]
        : profile.items[0];
    parts.push(itemList);
  }

  if (profile.preferenceNotes?.length) {
    parts.push(profile.preferenceNotes.join("、"));
  }

  return parts.join("、");
}
