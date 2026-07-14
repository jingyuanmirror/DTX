import { motion } from "motion/react";
import { ChevronRight, Gift, MapPin, Route, ShoppingBag } from "lucide-react";
import type { ParkingShoppingGuideCard } from "../../types";

export function ParkingShoppingGuideCardBubble({
  card,
  onAction,
}: {
  card: ParkingShoppingGuideCard;
  onAction: (action: string) => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="mt-2.5 w-full overflow-hidden rounded-[16px] border border-[#DDD5CA] bg-[#FCFBF8] shadow-[0_14px_32px_rgba(40,34,27,0.11)]"
    >
      <div className="flex items-center justify-between border-b border-[#E9E2D8] bg-[#F5F1EA] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-[#173A5E] text-[#F1D394]"><Route size={14} /></span>
          <div>
            <h3 className="text-[12px] font-semibold text-[#203B5C]">{card.title}</h3>
          </div>
        </div>
        <button type="button" onClick={() => onAction("查看更多活动")} className="flex items-center text-[8px] text-[#60778D]">
          更多活动 <ChevronRight size={11} />
        </button>
      </div>

      <div className="px-4 py-3">
        <div className="relative space-y-2.5 before:absolute before:bottom-3 before:left-[9px] before:top-3 before:w-px before:bg-[#D8C9AE]">
          {card.stops.map((stop, index) => (
            <div key={`${stop.floor}-${stop.title}`} className="relative flex gap-2.5">
              <span className="relative z-10 mt-1 grid size-[19px] shrink-0 place-items-center rounded-full border-2 border-[#FCFBF8] bg-[#B89452] text-[7px] font-semibold text-white">{index + 1}</span>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-[8px] bg-white px-3 py-2.5 shadow-[0_3px_10px_rgba(40,34,27,0.06)]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold text-[#A47735]">{stop.floor}</span>
                    <p className="truncate text-[11px] font-semibold text-[#2D3338]">{stop.title}</p>
                  </div>
                  <p className="mt-1 truncate text-[8px] text-[#857B70]">
                    <span className="font-medium text-[#4E806F]">{stop.tag}</span>
                    <span className="mx-1 text-[#C4BBAF]">·</span>
                    {stop.recommendation}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAction(`${stop.action}${stop.title}`)}
                  className="h-7 w-[58px] shrink-0 rounded-full border border-[#D8C6A6] bg-[#FFF8EC] text-[8px] font-medium text-[#9A6B2E] transition active:scale-95"
                >
                  {stop.action}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-[9px] border border-[#E9D4AD] bg-[#FFF7E9] p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[7px] bg-white text-[#A97931] shadow-sm"><Gift size={17} /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[9px] font-semibold text-[#4A3A27]">{card.coupon.brand} · {card.coupon.title}</p>
            <p className="mt-0.5 text-[14px] font-semibold text-[#C46B2B]">{card.coupon.discount}</p>
          </div>
          <button
            type="button"
            onClick={() => onAction(`领取${card.coupon.brand}优惠券`)}
            className="h-8 shrink-0 rounded-full bg-[#173A5E] px-3 text-[9px] font-medium text-white active:scale-95"
          >
            立即领取
          </button>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[8px] text-[#92877B]">
          <span className="flex items-center gap-1"><MapPin size={10} /> 已按停车位置规划动线</span>
          <button type="button" onClick={() => onAction("导航到第一站")} className="flex items-center gap-1 text-[#56748D]"><ShoppingBag size={10} /> 开始逛街</button>
        </div>
      </div>
    </motion.section>
  );
}
