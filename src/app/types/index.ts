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
  reservationCard?: ReservationCard;
  appointmentCard?: AppointmentCard;
  checkInCard?: CheckInCard;
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
  categories: string[];
  brands: string[];
  items: string[];
  isMember?: boolean;
  memberTier?: "silver" | "diamond" | "black";
  _justOnboarded?: boolean;
  _enrollmentForm?: EnrollmentForm;
  _membershipAuthorizationPending?: boolean;
}

export interface FeatureEntry {
  icon: string;
  title: string;
  sub: string;
  accent: boolean;
}
