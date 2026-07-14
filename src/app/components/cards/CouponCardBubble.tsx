import { motion } from "motion/react";
import type { CouponCard } from "../../types";

export function CouponCardBubble({ coupon }: { coupon: CouponCard }) {
  const isMallWide = coupon.scope === "mall";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden mt-2 mx-1"
      style={{
        width: "100%",
        maxWidth: 300,
        borderRadius: 14,
        background: "#FFFFFF",
        border: "1px solid rgba(240,176,64,0.16)",
        boxShadow: "0 2px 12px rgba(42,37,32,0.06)",
      }}
    >
      <div
        className="h-[3px]"
        style={{
          background: isMallWide
            ? "linear-gradient(90deg, #4CAF8E, #6BC4A6, #4CAF8E)"
            : "linear-gradient(90deg, #F0B040, #FFCC66, #F0B040)",
        }}
      />

      <div className="px-4 pt-3 pb-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[12px] text-[#20201C]" style={{ fontWeight: 600, letterSpacing: "0.02em" }}>
            {coupon.brand}
          </span>
          <span
            className="text-[8px] tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: isMallWide ? "rgba(76,175,142,0.1)" : "rgba(240,176,64,0.12)",
              color: isMallWide ? "#3E9C7E" : "#C8841E",
              border: isMallWide ? "1px solid rgba(76,175,142,0.2)" : "1px solid rgba(240,176,64,0.22)",
            }}
          >
            {isMallWide ? "商场通用" : "品牌专属"}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[22px] text-[#F0B040]" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, lineHeight: 1 }}>
            {coupon.discount}
          </span>
          <span className="text-[12px] text-[#20201C]" style={{ fontWeight: 500 }}>
            {coupon.title}
          </span>
        </div>

        <p className="text-[9px] text-[#A89D8A] tracking-wide">有效期至 {coupon.validUntil}</p>
      </div>

      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-5 rounded-r-full" style={{ background: "#FEF3EB" }} />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-5 rounded-l-full" style={{ background: "#FEF3EB" }} />
    </motion.div>
  );
}
