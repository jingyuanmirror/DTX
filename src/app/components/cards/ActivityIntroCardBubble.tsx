import { motion } from "motion/react";
import type { ActivityIntroCard } from "../../types";

/**
 * 活动介绍卡 —— 编辑型设计语言
 * 配图独立铺顶不压字 · 白底信息区 · 紫色单一强调 · benefits 序号化 · 深蓝 CTA
 */
export function ActivityIntroCardBubble({
  card,
  onJoin,
}: {
  card: ActivityIntroCard;
  onJoin: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="mt-2.5 w-full overflow-hidden flex rounded-[16px] border border-[#E8E3D8] bg-white"
      style={{ boxShadow: "0 1px 2px rgba(42,37,32,0.04)" }}
    >
      {/* 左侧紫色竖条 */}
      <div className="shrink-0 w-1 self-stretch" style={{ background: "linear-gradient(180deg, #8070F0 0%, #5B4DD0 100%)" }} />

      <div className="flex-1 min-w-0">
        {/* 配图:独立铺顶,不深压字 */}
        <div className="relative h-[132px] overflow-hidden">
          <img src="/product-gift.jpg" alt={card.title} className="size-full object-cover object-[center_48%]" />
          {/* 仅顶部轻蒙版保证标签可读,不全局压冷色 */}
          <div className="absolute inset-x-0 top-0 h-16" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 100%)" }} />
          <span
            className="absolute top-3 left-3 px-2.5 py-1 text-[9px] text-white rounded-full"
            style={{ background: "linear-gradient(135deg, #8070F0 0%, #5B4DD0 100%)", fontWeight: 600, letterSpacing: "0.04em" }}
          >
            {card.eyebrow}
          </span>
          <span
            className="absolute top-3 right-3 px-2.5 py-1 text-[9px] text-white rounded-full"
            style={{ background: "linear-gradient(135deg, #8070F0 0%, #5B4DD0 100%)", fontWeight: 600 }}
          >
            {card.dateLabel}
          </span>
        </div>

        <div className="px-5 py-4">
          {/* 标题(衬线) + slogan */}
          <h3 className="text-[20px] leading-tight text-[#20201C]" style={{ fontFamily: "'Noto Serif SC', serif", fontWeight: 500 }}>
            {card.title}
          </h3>
          <p className="mt-1.5 text-[11px] leading-[1.6] text-[#8C8278]">{card.slogan}</p>

          {/* Benefits:序号化列表,细线分隔 */}
          <div className="mt-4 divide-y divide-[#F0EBE0]">
            {card.benefits.map((benefit, index) => (
              <div key={benefit.title} className="flex items-baseline gap-3 py-3">
                <span className="text-[10px] text-[#BDB3A3] shrink-0 w-5" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-[#20201C]" style={{ fontWeight: 500 }}>{benefit.title}</p>
                  <p className="mt-0.5 text-[10px] leading-[1.55] text-[#A89D8A]">{benefit.note}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA:深蓝渐变 */}
          <button
            type="button"
            onClick={onJoin}
            className="mt-4 w-full h-11 flex items-center justify-center rounded-[10px] text-[13px] text-white transition active:scale-[0.98]"
            style={{ background: "linear-gradient(180deg, #1840A0 0%, #103080 100%)", boxShadow: "0 4px 10px rgba(16,48,128,0.26)", fontWeight: 500 }}
          >
            {card.actionLabel}
          </button>
        </div>
      </div>
    </motion.section>
  );
}