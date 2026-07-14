import { motion } from "motion/react";
import { ClipboardList, Bookmark, Store, User } from "lucide-react";
import type { AppointmentCard } from "../../types";

export function AppointmentCardBubble({ card }: { card: AppointmentCard }) {
  const statusConfig = {
    confirmed: { label: card.statusLabel || "已确认", bg: "rgba(240,176,64,0.12)", color: "#F0B040", border: "rgba(240,176,64,0.25)" },
    cancelled: { label: card.statusLabel || "已取消", bg: "rgba(180,80,80,0.12)", color: "#8B4040", border: "rgba(180,80,80,0.25)" },
    completed: { label: card.statusLabel || "已完成", bg: "rgba(139,168,136,0.12)", color: "#6B8C6A", border: "rgba(139,168,136,0.25)" },
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
        borderRadius: 14,
        background: "#FFFFFF",
        border: "1px solid rgba(240,176,64,0.15)",
        boxShadow: "0 4px 20px rgba(42,37,32,0.08)",
      }}
    >
      {/* Header: 暖色渐变 + 品牌预约标识 + 状态标签 */}
      <div
        className="px-4 pt-4 pb-3"
        style={{
          background: "linear-gradient(135deg, #FFF8EE 0%, #FFF0DC 100%)",
          borderBottom: "1px solid rgba(240,176,64,0.12)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} strokeWidth={1.8} color="#F0B040" />
            <span className="text-[11px] tracking-wide text-[#20201C]" style={{ fontWeight: 500 }}>
              品牌预约
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
        {/* 品牌名 + 楼层 */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[15px] text-[#20201C]" style={{ fontWeight: 600 }}>
            {card.brand}
          </p>
          <span className="text-[11px] text-[#A89D8A] flex items-center gap-1">
            <Store size={11} strokeWidth={1.8} color="#A89D8A" />
            {card.floor}
          </span>
        </div>

        {/* 双栏：时段 + SA */}
        <div className="flex gap-3">
          <div className="flex-1 px-3 py-2.5 rounded-[10px]" style={{ background: "#FFFAF0", border: "1px solid rgba(240,176,64,0.08)" }}>
            <p className="text-[9px] tracking-wider text-[#A89D8A] mb-1">预约时段</p>
            <p className="text-[13px] text-[#F0B040]" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
              {card.timeSlot}
            </p>
          </div>
          <div className="flex-1 px-3 py-2.5 rounded-[10px]" style={{ background: "#FFFAF0", border: "1px solid rgba(240,176,64,0.08)" }}>
            <p className="text-[9px] tracking-wider text-[#A89D8A] mb-1">服务顾问</p>
            <p className="text-[13px] text-[#20201C]" style={{ fontWeight: 500 }}>
              {card.saName}
            </p>
          </div>
        </div>

        {/* 预约凭证号 */}
        <div className="flex items-center gap-1.5 mt-3">
          <Bookmark size={11} strokeWidth={1.8} color="#CFC3AE" />
          <p className="text-[10px] text-[#CFC3AE] tracking-wide" style={{ fontFamily: "'DM Mono', monospace" }}>
            {card.reservationId}
          </p>
        </div>
      </div>
    </motion.div>
  );
}