import type { UserProfile } from "../types";

/**
 * 模拟用户画像 —— 用于开发调试活动推荐等个性化功能。
 * 顾客：偏好 Gucci、Hermès、Dior 等精品，也爱生鲜美食与日常好物。
 */
export const SIMULATED_USER_PROFILE: UserProfile = {
  name: "李",
  gender: "男",
  categories: ["美妆护肤", "皮具", "生鲜美食"],
  brands: ["Gucci", "Hermès", "Dior", "Chanel"],
  items: ["彩妆", "手袋", "香水", "生鲜"],
  isMember: false,
};
