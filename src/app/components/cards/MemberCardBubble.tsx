import { motion } from "motion/react";
import type { MemberCard } from "../../types";

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
        background: "linear-gradient(135deg, #E4E7EC 0%, #C9CED5 32%, #B4BAC2 60%, #9AA1A9 100%)",
        boxShadow:
          "0 12px 36px rgba(80,86,94,0.28), 0 2px 8px rgba(42,37,32,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
      }}
    >
      {/* 金属拉丝纹理(横向细纹) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.5] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 0.5px, transparent 0.5px, transparent 2px)",
        }}
      />
      {/* 顶部高光(金属弧面感) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.08) 18%, transparent 40%, transparent 62%, rgba(70,74,80,0.12) 100%)",
        }}
      />
      {/* 噪点(金属微粒质感) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(60,64,70,0.5) 0px, rgba(60,64,70,0.5) 0.5px, transparent 0.5px, transparent 3px)",
        }}
      />

      {/* 金属渐变描边边框 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: 16,
          padding: 1.5,
          background:
            "linear-gradient(135deg, #F2F4F7 0%, #C2C7CE 24%, #8E949C 52%, #C8CCD2 78%, #A8AEB5 100%)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      {/* 扫光动画 */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(105deg, transparent 28%, rgba(255,255,255,0.1) 44%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0.1) 56%, transparent 72%)",
        }}
        initial={{ x: "-130%" }}
        animate={{ x: "130%" }}
        transition={{ duration: 1.8, delay: 0.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
      />

      <div className="relative z-10 px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span
              className="text-[12px] tracking-[0.28em] uppercase"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                background: "linear-gradient(180deg, #4A4F56 0%, #2C3036 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              DTX
            </span>
            <span className="w-px h-3" style={{ background: "rgba(60,64,70,0.45)" }} />
            <span className="text-[9px] tracking-[0.18em] text-[#3C4148]/80 uppercase">Member</span>
          </div>
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(242,244,247,0.6), rgba(178,184,192,0.32))",
              border: "1px solid rgba(120,126,134,0.5)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
            }}
          >
            <span className="text-[10px] text-[#2C3036]">{card.tierIcon}</span>
            <span
              className="text-[9px] tracking-wider"
              style={{
                background: "linear-gradient(180deg, #4A4F56 0%, #2C3036 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontWeight: 600,
              }}
            >
              {card.tier}
            </span>
          </div>
        </div>

        <p
          className="text-[22px] mb-5 leading-tight"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            letterSpacing: "0.01em",
            background: "linear-gradient(180deg, #2C3036 0%, #1A1D21 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {card.name}
        </p>

        <p
          className="text-[11px] mb-4 tracking-[0.15em]"
          style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: "#444A51" }}
        >
          {card.cardNo}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {card.benefits.map((benefit) => (
            <span
              key={benefit}
              className="text-[9px] tracking-wide px-2 py-1 rounded-full"
              style={{
                color: "#3C4148",
                background: "linear-gradient(135deg, rgba(242,244,247,0.5), rgba(200,204,210,0.25))",
                border: "1px solid rgba(120,126,134,0.4)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
                fontWeight: 500,
              }}
            >
              {benefit}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
