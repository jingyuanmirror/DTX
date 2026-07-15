import { motion } from "motion/react";
import { ChevronRight, MapPin } from "lucide-react";
import type { NewMemberOfferCard } from "../../types";

/**
 * 新人券推荐卡 —— 编辑型设计语言
 * 配图独立铺顶不压字 · 衬线金额成焦点 · 领取为主 CTA(紫色渐变)
 */
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
      className="mt-2.5 w-full overflow-hidden rounded-[16px] border border-[#E8E3D8] bg-white"
      style={{ boxShadow: "0 1px 2px rgba(42,37,32,0.04)" }}
    >
      {/* 配图:独立铺顶,不压字 */}
      <div className="relative h-[96px] overflow-hidden">
        <img src="/checkin-market.jpg" alt={card.store} className="size-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(16,27,64,0) 55%, rgba(16,27,64,0.18) 100%)" }} />
        <span
          className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[9px] text-white"
          style={{ background: "rgba(16,27,64,0.55)", backdropFilter: "blur(4px)", fontWeight: 500 }}
        >
          {card.validLabel}
        </span>
      </div>

      <div className="px-5 py-4">
        {/* eyebrow + 衬线金额焦点 */}
        <p className="text-[9px] tracking-[0.2em] uppercase text-[#A89D8A] mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          NEW MEMBER · 新人礼
        </p>
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="text-[30px] leading-none text-[#5B4DD0]" style={{ fontFamily: "'Cormorant', serif", fontWeight: 600 }}>
            ¥{card.amount}
          </span>
          <span className="text-[10px] text-[#8C8278]">无门槛券</span>
        </div>

        {/* 门店 + 位置 + 品类 */}
        <div className="flex items-start justify-between gap-2 pt-3 border-t border-[#F0EBE0]">
          <div className="min-w-0">
            <p className="text-[12px] text-[#20201C]" style={{ fontWeight: 500 }}>{card.store}</p>
            <p className="mt-1 flex items-center gap-1 text-[9px] text-[#A89D8A]">
              <MapPin size={10} /> {card.floor} · 距当前位置约{card.distance}
            </p>
          </div>
          <span className="shrink-0 text-[9px] text-[#A89D8A]">{card.categories.join(" · ")}</span>
        </div>

        {/* CTA:领取(主) + 查看好物(次) */}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAction("领取新人券")}
            className="flex-1 flex h-10 items-center justify-center gap-1 rounded-[10px] text-[12px] text-white transition active:scale-[0.98]"
            style={{ background: "linear-gradient(180deg, #8070F0 0%, #5B4DD0 100%)", boxShadow: "0 3px 8px rgba(91,77,208,0.24)", fontWeight: 500 }}
          >
            立即领取
          </button>
          <button
            type="button"
            onClick={() => onAction("查看今日好物")}
            className="h-10 px-3 flex items-center justify-center gap-0.5 rounded-[10px] text-[11px] transition active:scale-[0.98]"
            style={{ border: "1px solid rgba(124,111,224,0.30)", color: "#7C6FE0", background: "rgba(124,111,224,0.06)", fontWeight: 500 }}
          >
            查看好物 <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </motion.section>
  );
}