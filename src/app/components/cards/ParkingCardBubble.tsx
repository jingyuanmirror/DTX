import { motion } from "motion/react";
import { CarFront, Crown, MapPin } from "lucide-react";
import type { ParkingCard } from "../../types";

/**
 * 停车卡 —— 编辑型设计语言
 * 白底 · 紫色单一强调 · 衬线车位号焦点 · 细线分隔信息列 · 会员优惠紫 CTA
 */
export function ParkingCardBubble({ card, onJoin }: { card: ParkingCard; onJoin: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative mt-2.5 w-full overflow-hidden flex"
      style={{
        width: "100%",
        borderRadius: 16,
        background: "#FFFFFF",
        border: "1px solid #E8E3D8",
        boxShadow: "0 1px 2px rgba(42,37,32,0.04)",
      }}
    >
      {/* 左侧紫色竖条(与券卡一致,凭证感) */}
      <div className="shrink-0 w-1 self-stretch" style={{ background: "linear-gradient(180deg, #8070F0 0%, #5B4DD0 100%)" }} />

      <div className="flex-1 pl-5 pr-5 py-4">
        {/* 顶部:eyebrow + 车位衬线焦点 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CarFront size={15} strokeWidth={1.5} color="#7C6FE0" />
            <p className="text-[9px] tracking-[0.2em] uppercase text-[#A89D8A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              PARKING · 智能停车
            </p>
          </div>
          <span className="flex items-center gap-1 text-[9px] text-[#A89D8A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF8E]" /> 已记录
          </span>
        </div>

        <p className="text-[10px] text-[#A89D8A] mb-1 flex items-center gap-1"><MapPin size={10} /> 停车位置</p>
        <p className="text-[28px] leading-none text-[#20201C] mb-4" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: "0.02em" }}>
          {card.location}
        </p>

        {/* 时长 / 费用:细线分隔,非色块 */}
        <div className="flex items-end justify-between gap-3 py-3 border-y border-[#F0EBE0]">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] text-[#A89D8A] mb-1">停车时长</p>
            <p className="text-[18px] text-[#20201C] leading-none" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>
              {card.duration}
            </p>
          </div>
          <div className="w-px h-8 bg-[#F0EBE0]" />
          <div className="min-w-0 flex-1 text-right">
            <p className="text-[9px] text-[#A89D8A] mb-1">停车费用</p>
            <p className="text-[18px] text-[#5B4DD0] leading-none" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
              ¥{card.fee}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[9px] text-[#A89D8A] tracking-wide">{card.feeRate}</p>

        {/* 非会员入会引导:浅紫底块,横向三段并排(权益 | 省钱 | 入会) */}
        {card.membershipOffer && (
          <div className="mt-3 rounded-[12px] p-3.5" style={{ background: "linear-gradient(135deg, rgba(124,111,224,0.08) 0%, rgba(91,77,208,0.05) 100%)", border: "1px solid rgba(124,111,224,0.18)" }}>
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full" style={{ background: "rgba(124,111,224,0.14)" }}>
                <Crown size={15} className="text-[#7C6FE0]" strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1 flex items-center gap-2.5">
                <div className="min-w-0">
                  <p className="text-[11px] text-[#20201C] leading-tight" style={{ fontWeight: 500 }}>{card.membershipOffer.benefit}</p>
                  <p className="text-[10px] text-[#7C6FE0] leading-tight mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                    {card.membershipOffer.saving}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onJoin}
                className="shrink-0 h-9 px-4 flex items-center justify-center rounded-[10px] text-[11px] text-white transition active:scale-[0.98]"
                style={{ background: "linear-gradient(180deg, #1840A0 0%, #103080 100%)", boxShadow: "0 3px 8px rgba(16,48,128,0.24)", fontWeight: 500 }}
              >
                立即入会
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}