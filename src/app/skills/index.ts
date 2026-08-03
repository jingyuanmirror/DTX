import type { Skill } from "../agent/types";
import { appointmentSkill } from "./appointment";
import { queueSkill } from "./queue";
import { crossSellSkill } from "./cross-sell";
import { couponSkill } from "./coupon";
import { serviceQASkill } from "./service-qa";
import { membershipSkill } from "./membership";
import { parkingSkill } from "./parking";
import { storeConsultSkill } from "./store-consult";
import { checkInSkill } from "./check-in";
import { redPacketUsageSkill } from "./red-packet-usage";
import { activityIntroSkill } from "./activity-intro";
import { productIntroSkill } from "./product-intro";
import { productRecommendSkill } from "./product-recommend";
import { weatherSkill } from "./weather";
import { storeRecommendSkill } from "./store-recommend";
import { activityBookingSkill } from "./activity-booking";

export const skills: Skill[] = [
  activityBookingSkill,
  appointmentSkill,
  queueSkill,
  crossSellSkill,
  couponSkill,
  membershipSkill,
  parkingSkill,
  storeConsultSkill,
  serviceQASkill,
  activityIntroSkill,
  productIntroSkill,
  productRecommendSkill,
  checkInSkill,
  redPacketUsageSkill,
  weatherSkill,
  storeRecommendSkill,
];
