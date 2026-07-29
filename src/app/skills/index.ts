import type { Skill } from "../agent/types";
import { appointmentSkill } from "./appointment";
import { queueSkill } from "./queue";
import { crossSellSkill } from "./cross-sell";
import { couponSkill } from "./coupon";
import { serviceQASkill } from "./service-qa";
import { membershipSkill } from "./membership";
import { parkingSkill } from "./parking";
import { activityRecommendSkill } from "./activity-recommend";
import { storeConsultSkill } from "./store-consult";
import { checkInSkill } from "./check-in";
import { redPacketUsageSkill } from "./red-packet-usage";
import { activityIntroSkill } from "./activity-intro";
import { productIntroSkill } from "./product-intro";
import { productRecommendSkill } from "./product-recommend";
import { weatherSkill } from "./weather";
import { restaurantRecommendSkill } from "./restaurant-recommend";

export const skills: Skill[] = [
  appointmentSkill,
  queueSkill,
  crossSellSkill,
  couponSkill,
  membershipSkill,
  parkingSkill,
  storeConsultSkill,
  serviceQASkill,
  activityRecommendSkill,
  activityIntroSkill,
  productIntroSkill,
  productRecommendSkill,
  checkInSkill,
  redPacketUsageSkill,
  weatherSkill,
  restaurantRecommendSkill,
];
