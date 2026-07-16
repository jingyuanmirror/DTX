import { motion } from "motion/react";
import type { CouponCard } from "../../types";

/**
 * 优惠券卡 —— 编辑型设计语言
 * 左侧紫竖边(券凭证感) · 金额衬线焦点+标题分行 · 领取按钮(深蓝渐变,区别于紫气泡)右下
 */
export function CouponCardBubble({ coupon, onUse }: { coupon: CouponCard; onUse?: () => void }) {
  const isMallWide = coupon.scope === "mall";
  const discountSize = coupon.discount.length <= 3 ? 30 : coupon.discount.length <= 6 ? 25 : 21;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative mt-2.5 flex w-full overflow-hidden rounded-[8px] border border-[#E8E3D8] bg-white"
      style={{
        boxShadow: "0 1px 2px rgba(42,37,32,0.04)",
      }}
    >
      {/* 左侧紫色竖条:券的凭证感 */}
      <div className="shrink-0 w-1 self-stretch" style={{ background: "linear-gradient(180deg, #8070F0 0%, #5B4DD0 100%)" }} />

      <div className="flex min-w-0 flex-1 items-center justify-between gap-2.5 py-4 pl-5 pr-4">
        {/* 左:品牌行 + 金额(衬线)+ 标题分行 + 有效期 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px] text-[#20201C]" style={{ fontWeight: 500, letterSpacing: "0.02em" }}>
              {coupon.brand}
            </span>
            <span className="text-[9px] text-[#A89D8A]">· {isMallWide ? "商场通用" : "品牌专属"}</span>
          </div>

          <div className="mb-1 flex min-h-8 items-center">
            <span
              className="whitespace-nowrap leading-none text-[#5B4DD0]"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: discountSize, fontWeight: 600, letterSpacing: 0 }}
            >
              {coupon.discount}
            </span>
          </div>
          <p className="text-[11px] text-[#20201C] mb-1" style={{ fontWeight: 500 }}>{coupon.title}</p>
          <p className="text-[9px] text-[#A89D8A] tracking-wide">有效期至 {coupon.validUntil}</p>
        </div>

        {/* 右:领取 CTA(深蓝渐变,区别于紫色气泡) */}
        {onUse && (
          <button
            type="button"
            onClick={onUse}
            className="flex h-9 shrink-0 self-center items-center justify-center rounded-[8px] px-4 text-[11px] text-white transition active:scale-[0.98]"
            style={{ background: "linear-gradient(180deg, #1840A0 0%, #103080 100%)", boxShadow: "0 3px 8px rgba(16,48,128,0.26)", fontWeight: 500 }}
          >
            领取
          </button>
        )}
      </div>
    </motion.div>
  );
}
