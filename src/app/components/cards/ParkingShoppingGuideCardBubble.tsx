import { motion } from "motion/react";
import { Route } from "lucide-react";
import type { ParkingShoppingGuideCard } from "../../types";

/**
 * 停车逛逛指南卡 —— 编辑型设计语言
 * 白底 · 左紫竖条 · 序号化 timeline(细线连接+紫编号) · 单层无嵌套 · 优惠券行 · 深蓝领取 CTA
 */
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
      className="mt-2.5 w-full overflow-hidden flex rounded-[16px] border border-[#E8E3D8] bg-white"
      style={{ boxShadow: "0 1px 2px rgba(42,37,32,0.04)" }}
    >
      {/* 左侧紫色竖条 */}
      <div className="shrink-0 w-1 self-stretch" style={{ background: "linear-gradient(180deg, #8070F0 0%, #5B4DD0 100%)" }} />

      <div className="flex-1 pl-5 pr-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Route size={14} strokeWidth={1.5} color="#7C6FE0" />
            <p className="text-[9px] tracking-[0.2em] uppercase text-[#A89D8A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              GUIDE · {card.title}
            </p>
          </div>
        </div>

        {/* Timeline:序号 + 站点,细线连接 */}
        <div className="relative space-y-0">
          {card.stops.map((stop, index) => (
            <div key={`${stop.floor}-${stop.title}`} className="relative flex gap-3 group">
              {/* 连接线 */}
              {index < card.stops.length - 1 && (
                <span className="absolute left-[8px] top-6 bottom-0 w-px bg-[#EDE7DC]" />
              )}
              {/* 紫编号 */}
              <span
                className="relative z-10 mt-0.5 grid size-[17px] shrink-0 place-items-center rounded-full text-[8px] text-white"
                style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, background: index === 0 ? "#5B4DD0" : "#A89D8A" }}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 pb-3.5 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[9px] text-[#7C6FE0]" style={{ fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{stop.floor}</span>
                    <p className="truncate text-[12px] text-[#20201C]" style={{ fontWeight: 500 }}>{stop.title}</p>
                  </div>
                  <p className="mt-1 text-[9px] text-[#A89D8A] truncate">
                    <span className="text-[#5B6B7A]">{stop.tag}</span> · {stop.recommendation}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAction(`${stop.action}${stop.title}`)}
                  className="shrink-0 h-7 px-3 flex items-center justify-center rounded-[8px] text-[10px] transition active:scale-[0.98]"
                  style={{ border: "1px solid rgba(124,111,224,0.28)", color: "#7C6FE0", background: "rgba(124,111,224,0.06)", fontWeight: 500 }}
                >
                  {stop.action}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 优惠券行 */}
        <div className="mt-1 pt-3.5 border-t border-[#F0EBE0] flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] text-[#A89D8A] mb-0.5">顺路福利</p>
            <p className="truncate text-[10px] text-[#20201C] flex items-baseline gap-1.5">
              <span className="text-[18px] text-[#5B4DD0]" style={{ fontFamily: "'Cormorant', serif", fontWeight: 600 }}>{card.coupon.discount}</span>
              <span className="text-[10px] text-[#20201C]" style={{ fontWeight: 500 }}>{card.coupon.brand} · {card.coupon.title}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAction(`领取${card.coupon.brand}优惠券`)}
            className="shrink-0 h-9 px-4 flex items-center justify-center rounded-[10px] text-[12px] text-white transition active:scale-[0.98]"
            style={{ background: "linear-gradient(180deg, #1840A0 0%, #103080 100%)", boxShadow: "0 3px 8px rgba(16,48,128,0.24)", fontWeight: 500 }}
          >
            立即领取
          </button>
        </div>

        {/* 底部:动线说明 + 开始逛街 */}
        <div className="mt-3 pt-3 border-t border-[#F0EBE0] flex items-center justify-between">
          <span className="text-[9px] text-[#A89D8A]">已按停车位置规划动线</span>
          <button
            type="button"
            onClick={() => onAction("导航到第一站")}
            className="text-[10px] text-[#7C6FE0] transition active:scale-[0.98]"
            style={{ fontWeight: 500 }}
          >
            开始逛街 →
          </button>
        </div>
      </div>
    </motion.section>
  );
}