import { useState } from "react";
import { motion } from "motion/react";
import { Check, ChevronRight, Gift, MapPin } from "lucide-react";
import type { CheckInCard } from "../../types";

const SPOT_IMAGES: Record<string, string> = {
  "DTX精品超市": "/checkin-market.jpg",
  "海底捞": "/checkin-hotpot.jpg",
  "乐高体验店": "/checkin-lego.jpg",
};

export function CheckInCardBubble({ card }: { card: CheckInCard }) {
  const [claimed, setClaimed] = useState(false);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="mt-2.5 w-full overflow-hidden rounded-[16px] border border-[#E2D8C9] bg-[#FCFBF8] shadow-[0_16px_38px_rgba(39,34,27,0.12)]"
    >
      <div className="relative overflow-hidden border-b border-[#E8E0D4] bg-[#F7F3EC] px-4 pb-3 pt-3">
        <div className="absolute inset-y-0 left-0 w-[3px] bg-[#B89452]" />
        <div className="relative">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium text-[#766248]">
              <span className="grid size-5 place-items-center rounded-full bg-[#173A5E] text-white shadow-sm">
                <Check size={13} strokeWidth={3} />
              </span>
              {card.spotName}
            </div>
            <h3 className="text-[18px] font-semibold leading-tight text-[#183B61]">打卡成功</h3>
            <p className="mt-1 text-[10px] text-[#8A8176]">已点亮 1/30，点亮 5 个有惊喜</p>
          </div>
        </div>

        <div className="relative mt-3 overflow-hidden rounded-[12px] border border-white/80 bg-white shadow-[0_10px_24px_rgba(32,28,23,0.14)]">
          <div className="flex items-center justify-between px-3.5 py-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#27394C]">
              <Gift size={13} className="text-[#A88445]" /> 打卡礼遇
            </div>
            <span className="text-[8px] tracking-wide text-[#9A8E7E]">限量实物好礼</span>
          </div>
          <div className="relative h-[112px] overflow-hidden">
            <img src="/checkin-coffee.jpg" alt={card.prize.name} className="size-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(13,29,45,0.94)_0%,rgba(13,29,45,0.18)_62%,transparent_100%)]" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 text-white">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{card.prize.name}</p>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-[18px] font-semibold text-[#F2D08D]">{card.prize.price}元换购</span>
                  <span className="text-[8px] text-white/65 line-through">¥{card.prize.originalPrice}</span>
                </div>
                <p className="text-[8px] text-white/70">{card.prize.note}</p>
              </div>
              <button
                type="button"
                onClick={() => setClaimed(true)}
                disabled={claimed}
                className="h-8 shrink-0 rounded-full border-2 border-white bg-[#173A5E] px-4 text-[10px] font-medium text-white shadow-lg transition hover:bg-[#234D76] active:scale-95 disabled:bg-[#7C8286]"
              >
                {claimed ? "已领取" : "立即领取"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#203B5C]">
            <MapPin size={14} className="text-[#A88445]" /> 推荐打卡点
          </div>
          <span className="flex items-center text-[9px] text-[#65788C]">继续探索 <ChevronRight size={12} /></span>
        </div>

        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {card.recommendations.map((spot, index) => (
            <motion.div
              key={`${spot.name}-${spot.floor}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.07 }}
              className="min-w-[126px] snap-start overflow-hidden rounded-[9px] border border-[#DED8CF] bg-white shadow-[0_4px_12px_rgba(40,35,29,0.07)]"
            >
              <div className="relative h-[49px] overflow-hidden bg-[#D8D1C7]">
                <img src={SPOT_IMAGES[spot.name]} alt={spot.name} className="size-full object-cover transition duration-300 hover:scale-105" />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(16,31,44,0.55),transparent_62%)]" />
                <span className="absolute right-2 top-2 rounded-full border border-white/50 bg-white/90 px-1.5 py-0.5 text-[8px] font-medium text-[#334B62]">{spot.category}</span>
                <MapPin className="absolute bottom-2 left-2 text-white" size={14} fill="rgba(255,255,255,.2)" />
              </div>
              <div className="px-2 py-1.5">
                <div className="flex min-w-0 items-baseline gap-1">
                  <p className="truncate text-[11px] font-semibold text-[#20201C]">{spot.name}</p>
                  <span className="shrink-0 text-[8px] text-[#A09384]">{spot.floor}</span>
                </div>
                <p className="mt-1 truncate text-[8px] text-[#81766B]">{spot.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-2.5 flex items-start gap-2 border-t border-[#E9E2D8] pt-2.5 text-[9px] leading-[1.4] text-[#7E715F]">
          <Gift size={13} className="mt-px shrink-0 text-[#A88445]" />
          <span>{card.couponHint}</span>
        </div>
      </div>
    </motion.section>
  );
}
