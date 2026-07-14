import { motion } from "motion/react";
import { ChevronRight, Gift, MapPin, Navigation } from "lucide-react";
import type { NewMemberOfferCard } from "../../types";

export function NewMemberOfferCardBubble({
  card,
  onAction,
}: {
  card: NewMemberOfferCard;
  onAction: (action: string) => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="mt-2.5 w-full overflow-hidden rounded-[14px] border border-[#E3D7C6] bg-white shadow-[0_10px_26px_rgba(45,36,24,0.10)]"
    >
      <div className="relative h-[92px] overflow-hidden">
        <img src="/checkin-market.jpg" alt={card.store} className="size-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,35,54,0.92)_0%,rgba(16,35,54,0.58)_54%,rgba(16,35,54,0.08)_100%)]" />
        <div className="absolute inset-0 flex items-center justify-between px-4 text-white">
          <div>
            <div className="mb-1 flex items-center gap-1 text-[9px] text-[#F1D394]"><Gift size={12} /> 新人礼已到账</div>
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-semibold">¥{card.amount}</span>
              <span className="text-[10px]">无门槛券</span>
            </div>
          </div>
          <span className="rounded-full border border-white/60 bg-white/90 px-2 py-1 text-[8px] font-medium text-[#173A5E]">{card.validLabel}</span>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-[#203B5C]">{card.store}</p>
            <p className="mt-1 flex items-center gap-1 text-[8px] text-[#8E8377]">
              <MapPin size={10} className="text-[#A88445]" /> {card.floor} · 距当前位置约{card.distance}
            </p>
          </div>
          <span className="shrink-0 text-[8px] text-[#9A8E80]">{card.categories.join(" · ")}</span>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            onClick={() => onAction("查看今日好物")}
            className="flex h-9 items-center justify-center gap-1 rounded-full bg-[#173A5E] text-[10px] font-medium text-white transition active:scale-[0.98]"
          >
            查看今日好物 <ChevronRight size={12} />
          </button>
          <button
            type="button"
            onClick={() => onAction("导航到DTX精品超市")}
            className="grid size-9 place-items-center rounded-full border border-[#D8CDBD] text-[#8A6A38] transition active:scale-95"
            title="导航到店"
            aria-label="导航到店"
          >
            <Navigation size={14} />
          </button>
        </div>
      </div>
    </motion.section>
  );
}
