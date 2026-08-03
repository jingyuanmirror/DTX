export interface MemberCard {
  type: "member-card";
  tier: string;
  tierIcon: string;
  name: string;
  cardNo: string;
  points: string;
  benefits: string[];
}

export interface MembershipAuthorizationCard {
  type: "membership-authorization-card";
  title: string;
  subtitle: string;
  benefits: Array<{
    title: string;
    value: string;
    note: string;
  }>;
  authorizedFields: string[];
}

export interface NewMemberOfferCard {
  type: "new-member-offer-card";
  amount: number;
  title: string;
  store: string;
  floor: string;
  distance: string;
  categories: string[];
  validLabel: string;
}

export interface ParkingCard {
  type: "parking-card";
  location: string;
  floor: string;
  duration: string;
  fee: string;
  feeRate: string;
  membershipOffer?: {
    benefit: string;
    saving: string;
  };
}

export interface ParkingShoppingGuideCard {
  type: "parking-shopping-guide-card";
  title: string;
  subtitle: string;
  stops: Array<{
    floor: string;
    title: string;
    recommendation: string;
    tag: string;
    action: string;
  }>;
  coupon: {
    brand: string;
    discount: string;
    title: string;
  };
}

export interface ActivityIntroCard {
  type: "activity-intro-card";
  eyebrow: string;
  title: string;
  slogan: string;
  dateLabel: string;
  benefits: Array<{
    title: string;
    note: string;
  }>;
  actionLabel: string;
}

export interface ProductIntroCard {
  type: "product-intro-card";
  brand: string;
  name: string;
  image: string;
  floor: string;
  description: string;
  sellingPoints: string[];
  suitableFor: string;
  recommendation: string;
  regularPrice: number;
  activityPrice: number;
  pointsLabel: string;
  pointsActivity: string;
}

export interface CouponCard {
  type: "coupon-card";
  brand: string;
  discount: string;
  title: string;
  validUntil: string;
  scope: string;
}

export interface QueueCard {
  type: "queue-card";
  brand: string;
  floor: string;
  partySize: number;
  queueNo: string;
  ahead: number;
  estMin: number;
  status: "queuing" | "almost" | "ready";
}

export interface BrandCard {
  type: "brand-card";
  brand: string;
  floor: string;
  categories: string[];
  highlight: string;
  tag?: string;
}

export interface RestaurantCard {
  type: "restaurant-card";
  name: string;
  floor: string;
  cuisineType: string;
  priceRange: string;
  highlight: string;
  recommendation: string[];
  tags?: string[];
  tip?: string;
  image?: string;
  familyFit?: {
    score: number;
    reason: string;
  };
  offer?: string;
  waitTime?: {
    label: string;
    level: "short" | "medium" | "long";
  };
}

export interface AppointmentInfo {
  type: "appointment";
  brand: string;
  floor: string;
  timeSlot: string;
  appointmentTime: number;
  saName: string;
  reservationId: string;
  status: "confirmed" | "cancelled" | "completed";
  flowStatus?: "selecting_slot";
}

export interface AppointmentCard {
  type: "appointment-card";
  brand: string;
  floor: string;
  timeSlot: string;
  saName: string;
  reservationId: string;
  status: "confirmed" | "cancelled" | "completed";
  statusLabel: string;
}

export interface CheckInSpotItem {
  name: string;
  floor: string;
  category: string;
  desc: string;
  benefit?: string;
  tags?: string[];
}

export interface CheckInCard {
  type: "check-in-card";
  spotName: string;
  status: "success";
  statusLabel: string;
  prize: {
    name: string;
    price: number;
    originalPrice: number;
    note: string;
  };
  recommendations: CheckInSpotItem[];
  couponHint: string;
}

/** 打卡点列表卡片 —— 用户查询"打卡点都有哪些"时展示所有打卡点 */
export interface CheckInSpotsCard {
  type: "check-in-spots-card";
  title: string;
  spots: CheckInSpotItem[];
  hint?: string;
}

/** 专属红包"碰一下"使用流程卡 */
export interface RedPacketFlowCard {
  type: "red-packet-flow-card";
  eyebrow: string;
  title: string;
  subtitle: string;
  steps: { icon: string; title: string; desc: string }[];
  tip: string;
}

/**
 * 行程规划卡 —— "今天怎么规划""吃饭前后还能安排什么"等问句的结构化分层展示。
 * 按时段/动线分成若干段,每段带小 icon + 标题(如"正餐 · 7F")+ 段下条目,
 * 由 PlanCardBubble 渲染成带层次、带 icon 的日程样式,而非平铺文字。
 */
export interface PlanCardItem {
  /** 店铺/活动名,如"新荣记" */
  name: string;
  /** 类型标签,如"台州菜""法餐鉴赏""咖啡外带""活动" */
  type: string;
  /** 一句话角色说明,如"家烧黄鱼是招牌""饭后顺路来一杯" */
  note: string;
}

export interface PlanCardSegment {
  /** icon 键,由前端映射到 lucide 图标(dining/retail/coffee/activity/walk/start/end 等) */
  iconKey: string;
  /** 段标题,如"正餐""饭后逛""顺路活动" */
  title: string;
  /** 该段所在楼层,如"7F"(可空) */
  floor?: string;
  /** 段下条目 */
  items: PlanCardItem[];
}

export interface PlanCard {
  type: "plan-card";
  /** 卡片眉标,如"DTX · 今日规划" */
  eyebrow: string;
  /** 卡片主标题,如"您的逛吃购行程" */
  title: string;
  segments: PlanCardSegment[];
  /** 底部一句衔接建议(如"错峰用餐、顺路导引更从容") */
  hint?: string;
}

export interface ActivityBookingInfo {
  type: "activity-booking";
  activityId: string;
  activityName: string;
  venue: string;
  floor: string;
  status: "pending" | "confirmed";
  flowStatus?: "selecting_slot" | "collecting_party";
  slotId?: string;
  dateLabel?: string;
  timeSlot?: string;
  participantLabel?: string;
  reservationId?: string;
}

export interface ActivityBookingCard {
  type: "activity-booking-card";
  activityName: string;
  venue: string;
  floor: string;
  dateLabel: string;
  timeSlot: string;
  participantLabel: string;
  reservationId: string;
  status: "confirmed" | "cancelled";
  statusLabel: string;
  checkInNote: string;
}

export interface Message {
  id: string;
  role: "agent" | "user";
  text: string;
  time: string;
  quickReplies?: string[];
  card?: MemberCard;
  membershipAuthorizationCard?: MembershipAuthorizationCard;
  newMemberOfferCard?: NewMemberOfferCard;
  parkingCard?: ParkingCard;
  parkingShoppingGuideCard?: ParkingShoppingGuideCard;
  activityIntroCard?: ActivityIntroCard;
  productIntroCard?: ProductIntroCard;
  coupons?: CouponCard[];
  queueCard?: QueueCard;
  brandCards?: BrandCard[];
  restaurantCards?: RestaurantCard[];
  reservationCard?: ReservationCard;
  appointmentCard?: AppointmentCard;
  checkInCard?: CheckInCard;
  checkInSpotsCard?: CheckInSpotsCard;
  redPacketFlowCard?: RedPacketFlowCard;
  productRecommendCards?: ProductIntroCard[];
  planCard?: PlanCard;
  activityBookingCard?: ActivityBookingCard;
  streaming?: boolean;
}

export interface ParkingInfo {
  location: string;
  floor: string;
  parkedAt: number;
}

export interface ParkingReservation {
  floor: string;
  spotId: string;
  plateNumber?: string;
  reservationId?: string;
  reservedAt?: number;
  status: "collecting_plate" | "confirmed";
}

export interface ReservationCard {
  type: "reservation-card";
  spotId: string;
  floor: string;
  plateNumber: string;
  reservationId: string;
  status: "confirmed";
}

export interface QueueInfo {
  brand: string;
  floor: string;
  partySize: number;
  queueNo: string;
  ahead: number;
  estMin: number;
  enrolledAt: number;
  status: "queuing" | "almost" | "ready";
}

export interface EnrollmentForm {
  name?: string;
  gender?: string;
  idNumber?: string;
  city?: string;
  address?: string;
}

export interface UserProfile {
  name?: string;
  gender?: string;
  categories: string[];
  brands: string[];
  items: string[];
  preferenceNotes?: string[];
  isMember?: boolean;
  memberTier?: "silver" | "diamond" | "black";
  _justOnboarded?: boolean;
  _enrollmentForm?: EnrollmentForm;
  _membershipAuthorizationPending?: boolean;
}

export interface FeatureEntry {
  icon: string;
  iconName?: "guide" | "member" | "activity" | "coupon" | "checkin" | "invite";
  title: string;
  sub: string;
  accent: boolean;
}
