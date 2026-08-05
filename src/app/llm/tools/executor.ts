import type { AgentSideEffects, SkillContext } from "../../agent/types";
import type { ActivityBookingCard, ActivityIntroCard, AppointmentCard, BrandCard, CheckInCard, CheckInSpotsCard, MemberCard, MembershipAuthorizationCard, NewMemberOfferCard, ParkingCard, ParkingShoppingGuideCard, PlanCard, ProductIntroCard, CouponCard, QueueCard, RedPacketFlowCard, ReservationCard, RestaurantCard } from "../../types";
import { skills } from "../../skills";

export interface ToolResult {
  data: unknown;
  sideEffects?: AgentSideEffects;
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
  planCard?: PlanCard;
  activityBookingCard?: ActivityBookingCard;
}

/**
 * Execute a tool call by finding the matching skill and calling handle().
 * Zero duplication — directly reuses existing skill logic.
 */
export function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: SkillContext,
): Promise<ToolResult> {
  // Find the skill by name
  const skill = skills.find((s) => s.name === toolName);
  if (!skill) {
    return Promise.resolve({ data: { error: `Unknown tool: ${toolName}` } });
  }

  // Build a modified context where text comes from the tool argument.
  // Pass the full args through `toolArgs` so skills that need structured
  // parameters (e.g. weather's `city`) can read them; existing skills
  // only read `text` and are unaffected.
  const toolCtx: SkillContext = {
    ...ctx,
    text: String(args.text ?? ""),
    toolArgs: args,
  };

  // Execute the skill's handle() directly
  return Promise.resolve(skill.handle(toolCtx)).then((response) => {
    if (!response) {
      return {
        data: { error: `Skill returned no result: ${toolName}` },
      };
    }

    return {
      data: {
        reply: response.text,
        quickReplies: response.quickReplies,
      },
      sideEffects: response.sideEffects,
      card: response.card,
      membershipAuthorizationCard: response.membershipAuthorizationCard,
      newMemberOfferCard: response.newMemberOfferCard,
      parkingCard: response.parkingCard,
      parkingShoppingGuideCard: response.parkingShoppingGuideCard,
      activityIntroCard: response.activityIntroCard,
      productIntroCard: response.productIntroCard,
      reservationCard: response.reservationCard,
      coupons: response.coupons,
      queueCard: response.queueCard,
      brandCards: response.brandCards,
      restaurantCards: response.restaurantCards,
      appointmentCard: response.appointmentCard,
      checkInCard: response.checkInCard,
      checkInSpotsCard: response.checkInSpotsCard,
      redPacketFlowCard: response.redPacketFlowCard,
      productRecommendCards: response.productRecommendCards,
      planCard: response.planCard,
      activityBookingCard: response.activityBookingCard,
    };
  });
}
