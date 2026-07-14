import { motion } from "motion/react";
import { Hourglass, Store } from "lucide-react";
import type { QueueCard } from "../../types";

export function QueueCardBubble({ card }: { card: QueueCard }) {
  const statusConfig = {
    queuing: { label: "排队中", bg: "rgba(139,168,136,0.12)", color: "#6B8C6A", border: "rgba(139,168,136,0.25)" },
    almost: { label: "即将到号", bg: "rgba(200,160,80,0.12)", color: "#9A7B3A", border: "rgba(200,160,80,0.25)" },
    ready: { label: "已到号", bg: "rgba(240,176,64,0.15)", color: "#F0B040", border: "rgba(240,176,64,0.3)" },
  }[card.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden mt-2.5 mx-1"
      style={{
        width: "100%",
        maxWidth: 300,
        borderRadius: 16,
        background: "#FFFFFF",
        border: "1px solid rgba(240,176,64,0.18)",
        boxShadow: "0 4px 20px rgba(42,37,32,0.08), 0 1px 4px rgba(42,37,32,0.04)",
      }}
    >
      <div
        className="px-4 pt-4 pb-3"
        style={{
          background: "linear-gradient(135deg, #FFF8EE 0%, #FFF0DC 100%)",
          borderBottom: "1px solid rgba(240,176,64,0.12)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hourglass size={16} strokeWidth={1.8} color="#F0B040" />
            <span className="text-[11px] tracking-wide text-[#20201C]" style={{ fontWeight: 500 }}>
              排队托管
            </span>
          </div>
          <span
            className="text-[9px] tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: statusConfig.bg, color: statusConfig.color, border: `1px solid ${statusConfig.border}` }}
          >
            {statusConfig.label}
          </span>
        </div>
      </div>

      <div className="px-4 py-3.5">
        <div className="flex items-start gap-2.5 mb-3">
          <span className="w-4 h-4 mt-0.5 flex items-center justify-center" style={{ color: "#F0B040" }}>
            <Store size={14} strokeWidth={1.8} color="#F0B040" />
          </span>
          <div>
            <p className="text-[9px] tracking-wider text-[#A89D8A] mb-0.5">店铺</p>
            <p className="text-[13px] text-[#20201C]" style={{ fontWeight: 500 }}>
              {card.brand}（{card.floor}）<span className="text-[10px] text-[#A89D8A] ml-1">{card.partySize}人位</span>
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 px-3 py-2.5 rounded-[10px]" style={{ background: "#FFFAF0", border: "1px solid rgba(240,176,64,0.08)" }}>
            <p className="text-[9px] tracking-wider text-[#A89D8A] mb-1">排队号码</p>
            <p className="text-[18px] text-[#F0B040]" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
              {card.queueNo}
            </p>
          </div>
          <div className="flex-1 px-3 py-2.5 rounded-[10px]" style={{ background: "#FFFAF0", border: "1px solid rgba(240,176,64,0.08)" }}>
            <p className="text-[9px] tracking-wider text-[#A89D8A] mb-1">前方等待</p>
            <p className="text-[18px] text-[#20201C]" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
              {card.ahead > 0 ? `${card.ahead}组` : "—"}
            </p>
          </div>
        </div>

        <p className="text-[9px] text-[#CFC3AE] mt-2.5 tracking-wide">
          {card.status === "ready" ? "请尽快前往店铺，过号需重新排队" : `预计还需约${card.estMin}分钟，到号前会提前提醒您`}
        </p>
      </div>
    </motion.div>
  );
}
