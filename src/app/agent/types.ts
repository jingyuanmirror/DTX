import type { ActivityIntroCard, AppointmentCard, AppointmentInfo, BrandCard, CheckInCard, CheckInSpotsCard, CouponCard, MemberCard, MembershipAuthorizationCard, NewMemberOfferCard, ParkingCard, ParkingInfo, ParkingReservation, ParkingShoppingGuideCard, ProductIntroCard, QueueCard, QueueInfo, RedPacketFlowCard, ReservationCard, RestaurantCard, UserProfile } from "../types";

export interface SkillContext {
  text: string;
  userProfile: UserProfile;
  parkingInfo: ParkingInfo | null;
  parkingReservation: ParkingReservation | null;
  queueInfo: QueueInfo | null;
  appointmentInfo: AppointmentInfo | null;
  /** Structured arguments from the LLM's function call (read alongside `text`). */
  toolArgs?: Record<string, unknown>;
}

export interface AgentSideEffects {
  setUserProfile?: (prev: UserProfile) => UserProfile;
  parkingInfo?: ParkingInfo | null;
  parkingReservation?: ParkingReservation | null;
  queueInfo?: QueueInfo | null;
  resetQueueNotified?: boolean;
  appointmentInfo?: AppointmentInfo | null;
}

export interface AgentFollowUpMessage {
  text: string;
  quickReplies?: string[];
  card?: MemberCard;
  membershipAuthorizationCard?: MembershipAuthorizationCard;
  newMemberOfferCard?: NewMemberOfferCard;
  parkingCard?: ParkingCard;
  parkingShoppingGuideCard?: ParkingShoppingGuideCard;
  activityIntroCard?: ActivityIntroCard;
  productIntroCard?: ProductIntroCard;
  reservationCard?: ReservationCard;
  coupons?: CouponCard[];
  queueCard?: QueueCard;
  brandCards?: BrandCard[];
  restaurantCards?: RestaurantCard[];
  appointmentCard?: AppointmentCard;
  checkInCard?: CheckInCard;
  checkInSpotsCard?: CheckInSpotsCard;
  redPacketFlowCard?: RedPacketFlowCard;
  productRecommendCards?: ProductIntroCard[];
}

export interface AgentResponse {
  text: string;
  quickReplies?: string[];
  card?: MemberCard;
  membershipAuthorizationCard?: MembershipAuthorizationCard;
  newMemberOfferCard?: NewMemberOfferCard;
  parkingCard?: ParkingCard;
  parkingShoppingGuideCard?: ParkingShoppingGuideCard;
  activityIntroCard?: ActivityIntroCard;
  productIntroCard?: ProductIntroCard;
  reservationCard?: ReservationCard;
  coupons?: CouponCard[];
  queueCard?: QueueCard;
  brandCards?: BrandCard[];
  restaurantCards?: RestaurantCard[];
  appointmentCard?: AppointmentCard;
  checkInCard?: CheckInCard;
  checkInSpotsCard?: CheckInSpotsCard;
  redPacketFlowCard?: RedPacketFlowCard;
  productRecommendCards?: ProductIntroCard[];
  followUpMessages?: AgentFollowUpMessage[];
  sideEffects?: AgentSideEffects;
}

export interface Skill {
  name: string;
  intentDescription: string;
  match: (ctx: SkillContext) => boolean;
  handle: (ctx: SkillContext) => AgentResponse | null | Promise<AgentResponse | null>;
}
