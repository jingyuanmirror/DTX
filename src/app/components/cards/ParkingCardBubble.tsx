import { motion } from "motion/react";
import { CarFront, Crown, MapPin } from "lucide-react";
import type { ParkingCard } from "../../types";

export function ParkingCardBubble({ card, onJoin }: { card: ParkingCard; onJoin: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative mt-2.5 w-full overflow-hidden"
      style={{
        width: "100%",
        borderRadius: 18,
        background: "#FFFFFF",
        border: "1px solid rgba(240,176,64,0.2)",
        boxShadow: "0 8px 26px rgba(42,37,32,0.1), 0 1px 6px rgba(42,37,32,0.05)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: "linear-gradient(90deg, #F0B040, #FFCC66, #F0B040)" }}
      />

      <div
        className="px-5 py-3"
        style={{
          background: "linear-gradient(135deg, #FFF8EE 0%, #FFF0DC 100%)",
          borderBottom: "1px solid rgba(240,176,64,0.12)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CarFront size={18} strokeWidth={1.8} color="#F0B040" />
            <span className="text-[13px] tracking-wide text-[#20201C]" style={{ fontWeight: 600 }}>
              智能停车
            </span>
          </div>
          <span
            className="rounded-full px-2.5 py-0.5 text-[9px] tracking-wide"
            style={{
              background: "rgba(139,168,136,0.15)",
              color: "#6B8C6A",
              border: "1px solid rgba(139,168,136,0.25)",
              fontWeight: 500,
            }}
          >
            已记录
          </span>
        </div>
      </div>

      <div className="px-5 py-3.5">
        <div className="mb-2.5 flex items-start gap-2.5">
          <span className="w-5 h-5 mt-[2px] flex items-center justify-center" style={{ color: "#F0B040" }}>
            <MapPin size={16} strokeWidth={1.8} color="#F0B040" />
          </span>
          <div>
            <p className="text-[10px] tracking-wide text-[#A89D8A] mb-0.5">停车位置</p>
            <p className="text-[26px] leading-tight text-[#20201C]" style={{ fontWeight: 600 }}>
              {card.location}
            </p>
          </div>
        </div>

        <div className="flex gap-3.5">
          <div className="flex-1 rounded-[12px] px-3.5 py-2.5" style={{ background: "#FFFAF0", border: "1px solid rgba(240,176,64,0.08)" }}>
            <p className="text-[10px] tracking-wide text-[#A89D8A] mb-1">停车时长</p>
            <p className="text-[20px] text-[#20201C] leading-none" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
              {card.duration}
            </p>
          </div>
          <div className="flex-1 rounded-[12px] px-3.5 py-2.5" style={{ background: "#FFFAF0", border: "1px solid rgba(240,176,64,0.08)" }}>
            <p className="text-[10px] tracking-wide text-[#A89D8A] mb-1">停车费用</p>
            <p className="text-[20px] text-[#F0B040] leading-none" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
              ¥{card.fee}
            </p>
          </div>
        </div>

        <p className="mt-2 text-[9px] tracking-wide text-[#B6AA99]">{card.feeRate}</p>

        {card.membershipOffer && (
          <div className="mt-2.5 flex items-center gap-2.5 rounded-[10px] border border-[#CFE4DA] bg-[#F0F8F4] px-3 py-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-[#4E806F] shadow-sm">
              <Crown size={13} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[9px] font-semibold text-[#356B59]">{card.membershipOffer.benefit}</p>
              <p className="mt-0.5 text-[8px] text-[#6D8B80]">{card.membershipOffer.saving}</p>
            </div>
            <button
              type="button"
              onClick={onJoin}
              className="h-7 shrink-0 rounded-full bg-[#173A5E] px-3 text-[8px] font-medium text-white transition active:scale-95"
            >
              立即入会
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
