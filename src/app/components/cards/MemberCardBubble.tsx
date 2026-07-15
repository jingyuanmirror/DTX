import { motion } from "motion/react";
import type { MemberCard } from "../../types";

/**
 * 会员卡 —— 编辑型设计语言
 * 银色卡面(保留银卡身份色) · 衬线名字 · 极简版式 · 去拉丝/扫光重特效
 */
export function MemberCardBubble({ card }: { card: MemberCard }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden mt-2.5 mx-1"
      style={{
        width: "100%",
        maxWidth: 300,
        borderRadius: 16,
        background: "linear-gradient(135deg, #E4E7EC 0%, #C9CED5 36%, #B4BAC2 64%, #9AA1A9 100%)",
        boxShadow: "0 6px 18px rgba(80,86,94,0.20), inset 0 1px 0 rgba(255,255,255,0.5)",
      }}
    >
      {/* 极淡银面斜光,仅一层,克制 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 40%, rgba(70,74,80,0.06) 100%)" }}
      />

      <div className="relative z-10 px-5 pt-5 pb-5">
        {/* 顶部:品牌 + 等级 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-[12px] tracking-[0.28em] text-[#2C3036]" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>
              DTX
            </span>
            <span className="w-px h-3" style={{ background: "rgba(60,64,70,0.4)" }} />
            <span className="text-[9px] tracking-[0.18em] text-[#545A62] uppercase">Member</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 h-6 rounded-full" style={{ background: "rgba(255,255,255,0.45)", border: "1px solid rgba(120,126,134,0.4)" }}>
            <span className="text-[10px] text-[#3C4148]">{card.tierIcon}</span>
            <span className="text-[9px] tracking-wider text-[#2C3036]" style={{ fontWeight: 600 }}>
              {card.tier}
            </span>
          </div>
        </div>

        {/* 名字 + 卡号 */}
        <p className="text-[24px] leading-tight text-[#1A1D21] mb-4" style={{ fontFamily: "'Noto Serif SC', serif", fontWeight: 500 }}>
          {card.name}
        </p>
        <p className="text-[11px] tracking-[0.15em] text-[#444A51] mb-5" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 400 }}>
          {card.cardNo}
        </p>

        {/* 权益标签 */}
        <div className="flex flex-wrap gap-1.5">
          {card.benefits.map((benefit) => (
            <span
              key={benefit}
              className="text-[9px] tracking-wide px-2.5 py-1 rounded-full text-[#3C4148]"
              style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(120,126,134,0.36)", fontWeight: 500 }}
            >
              {benefit}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}