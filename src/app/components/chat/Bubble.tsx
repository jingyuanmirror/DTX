import { motion } from "motion/react";
import type { Message } from "../../types";
import { MemberCardBubble } from "../cards/MemberCardBubble";
import { ParkingCardBubble } from "../cards/ParkingCardBubble";
import { ReservationCardBubble } from "../cards/ReservationCardBubble";
import { QueueCardBubble } from "../cards/QueueCardBubble";
import { CouponCardBubble } from "../cards/CouponCardBubble";
import { BrandCardCarousel } from "../cards/BrandCardCarousel";
import { RestaurantCardCarousel } from "../cards/RestaurantCardCarousel";
import { AppointmentCardBubble } from "../cards/AppointmentCardBubble";
import { CheckInCardBubble } from "../cards/CheckInCardBubble";
import { RedPacketFlowCardBubble } from "../cards/RedPacketFlowCardBubble";
import { MembershipAuthorizationCardBubble } from "../cards/MembershipAuthorizationCardBubble";
import { NewMemberOfferCardBubble } from "../cards/NewMemberOfferCardBubble";
import { ParkingShoppingGuideCardBubble } from "../cards/ParkingShoppingGuideCardBubble";
import { ActivityIntroCardBubble } from "../cards/ActivityIntroCardBubble";
import { ProductIntroCardBubble } from "../cards/ProductIntroCardBubble";
import { CatMascot } from "../CatMascot";

export function Bubble({ msg, onQuickReply }: { msg: Message; onQuickReply: (text: string) => void }) {
  const isAgent = msg.role === "agent";
  const hasRichCard = Boolean(
    msg.card || msg.parkingCard || msg.reservationCard || msg.queueCard || msg.coupons?.length
      || msg.brandCards?.length || msg.restaurantCards?.length || msg.appointmentCard || msg.checkInCard || msg.redPacketFlowCard || msg.membershipAuthorizationCard
      || msg.newMemberOfferCard || msg.parkingShoppingGuideCard || msg.activityIntroCard || msg.productIntroCard,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={`flex gap-2.5 ${isAgent ? "" : "flex-row-reverse"}`}>
        {isAgent && (
          <CatMascot
            withBackground
            headOnly
            className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full"
            style={{ border: "1px solid rgba(240,176,64,0.3)" }}
          />
        )}

        <div className={`${isAgent && hasRichCard ? "w-[calc(100%-42px)] max-w-[326px]" : "max-w-[80%]"} ${!isAgent ? "flex flex-col items-end" : ""}`}>
          <div
            className={`px-4 py-2.5 text-[13px] leading-[1.65] rounded-[20px] ${
              isAgent ? "rounded-tl-[6px]" : "rounded-tr-[6px]"
            } ${isAgent && hasRichCard ? "self-start" : ""}`}
            style={{
              background: isAgent ? "#FFFFFF" : "#8070F0",
              border: isAgent ? "1px solid rgba(240,176,64,0.16)" : "none",
              boxShadow: isAgent ? "0 1px 3px rgba(42,37,32,0.05)" : "0 3px 12px rgba(128,112,240,0.32)",
              color: isAgent ? "#20201C" : "#FFFFFF",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 400,
              whiteSpace: "pre-line",
              maxWidth: isAgent && hasRichCard ? "80%" : undefined,
            }}
          >
            {msg.text}
          </div>

          {isAgent && msg.card && <MemberCardBubble card={msg.card} />}
          {isAgent && msg.membershipAuthorizationCard && (
            <MembershipAuthorizationCardBubble
              card={msg.membershipAuthorizationCard}
              onConfirm={() => onQuickReply("同意授权并加入会员")}
            />
          )}
          {isAgent && msg.newMemberOfferCard && (
            <NewMemberOfferCardBubble card={msg.newMemberOfferCard} onAction={onQuickReply} />
          )}
          {isAgent && msg.parkingCard && (
            <ParkingCardBubble card={msg.parkingCard} onJoin={() => onQuickReply("我想入会")} />
          )}
          {isAgent && msg.parkingShoppingGuideCard && (
            <ParkingShoppingGuideCardBubble card={msg.parkingShoppingGuideCard} onAction={onQuickReply} />
          )}
          {isAgent && msg.activityIntroCard && (
            <ActivityIntroCardBubble card={msg.activityIntroCard} onJoin={() => onQuickReply("我想入会")} />
          )}
          {isAgent && msg.productIntroCard && (
            <ProductIntroCardBubble card={msg.productIntroCard} />
          )}
          {isAgent && msg.reservationCard && <ReservationCardBubble card={msg.reservationCard} />}
          {isAgent && msg.queueCard && <QueueCardBubble card={msg.queueCard} />}
          {isAgent && msg.brandCards && <BrandCardCarousel cards={msg.brandCards} />}
          {isAgent && !msg.checkInCard && msg.coupons && msg.coupons.map((coupon) => <CouponCardBubble key={`${coupon.brand}-${coupon.discount}`} coupon={coupon} onUse={() => onQuickReply(`领取${coupon.brand}优惠券`)} />)}
          {isAgent && msg.restaurantCards && <RestaurantCardCarousel cards={msg.restaurantCards} />}
          {isAgent && msg.appointmentCard && <AppointmentCardBubble card={msg.appointmentCard} />}
          {isAgent && msg.checkInCard && <CheckInCardBubble card={msg.checkInCard} />}
          {isAgent && msg.redPacketFlowCard && <RedPacketFlowCardBubble card={msg.redPacketFlowCard} />}

          <p className="text-[9px] text-[#A89D8A] mt-1 tracking-wider">{msg.time}</p>
        </div>
      </div>

      {isAgent && msg.quickReplies && (
        <div className="ml-10 mt-2.5 flex flex-wrap gap-1.5">
          {msg.quickReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => onQuickReply(reply)}
              className="text-[11px] px-3 py-1.5 tracking-wide transition-all duration-200 active:scale-95 rounded-full"
              style={{
                background: "#EFEEFE",
                border: "1px solid rgba(128,112,240,0.32)",
                color: "#6D5DE0",
                boxShadow: "0 1px 3px rgba(42,37,32,0.04)",
              }}
            >
              {reply}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
