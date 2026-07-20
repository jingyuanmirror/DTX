import { useState } from "react";
import { motion } from "motion/react";
import { Check, MapPin, Sparkles } from "lucide-react";
import type { CheckInCard } from "../../types";

const SPOT_IMAGES: Record<string, string> = {
  "DTX精品超市": "/checkin-market.jpg",
  "海底捞": "/checkin-hotpot.jpg",
  "乐高体验店": "/checkin-lego.jpg",
};

/**
 * 打卡卡 —— 编辑型设计语言
 * 白底 · 左紫竖条 · 衬线「打卡成功」· 礼遇配图不压字 · 紫价格焦点 · 深蓝领取 CTA · 推荐点横滚
 */
export function CheckInCardBubble({ card }: { card: CheckInCard }) {
  const [claimed, setClaimed] = useState(false);

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

      <div className="flex-1 min-w-0 pl-5 pr-4 py-4">
        {/* Header:打卡地点条 + 打卡成功 + 进度点亮 */}
        <div className="flex items-center gap-1.5 mb-3">
          <MapPin size={11} strokeWidth={1.8} color="#7C6FE0" />
          <p className="text-[9px] tracking-[0.18em] text-[#A89D8A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {card.spotName}
          </p>
        </div>
        <div className="flex items-end justify-between gap-3 mb-3">
          <h3 className="text-[22px] leading-none text-[#20201C]" style={{ fontFamily: "'Noto Serif SC', serif", fontWeight: 500 }}>
            打卡成功
          </h3>
          <span className="text-[9px] text-[#A89D8A] whitespace-nowrap" style={{ fontFamily: "'DM Mono', monospace" }}>1 / 30</span>
        </div>
        {/* 进度点亮条:1 已点亮,再打 4 个解锁礼遇 */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-1 flex-1 rounded-full"
                style={{
                  background: i === 0
                    ? "linear-gradient(90deg, #8070F0 0%, #5B4DD0 100%)"
                    : "#EDE7DA",
                }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            <Sparkles size={9} strokeWidth={2} color="#7C6FE0" />
            <p className="text-[9px] text-[#A89D8A]">再打卡 4 个,即可领取专属红包</p>
          </div>
        </div>

        {/* 礼遇:配图不压字 + 价格紫焦点 + 深蓝领取 */}
        <div className="rounded-[12px] overflow-hidden border border-[#F0EBE0]" style={{ background: "#FCFBF6" }}>
          <div className="relative h-[104px] overflow-hidden">
            <img src="/checkin-coffee.jpg" alt={card.prize.name} className="size-full object-cover" />
            <span
              className="absolute left-0 top-0 px-2.5 py-1 text-[9px] text-white rounded-br-[10px]"
              style={{ background: "linear-gradient(135deg, #8070F0 0%, #5B4DD0 100%)", fontWeight: 600, letterSpacing: "0.04em" }}
            >
              打卡礼遇
            </span>
            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(16,27,64,0) 45%, rgba(16,27,64,0.18) 100%)" }} />
          </div>
          <div className="px-3.5 py-3 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] text-[#20201C]" style={{ fontWeight: 500 }}>{card.prize.name}</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[18px] text-[#5B4DD0]" style={{ fontFamily: "'Cormorant', serif", fontWeight: 600 }}>{card.prize.price}元换购</span>
                <span className="text-[9px] text-[#A89D8A] line-through">¥{card.prize.originalPrice}</span>
              </div>
              <p className="mt-0.5 text-[9px] text-[#A89D8A]">{card.prize.note}</p>
            </div>
            <button
              type="button"
              onClick={() => setClaimed(true)}
              disabled={claimed}
              className="shrink-0 h-9 px-4 flex items-center justify-center rounded-[10px] text-[12px] text-white transition active:scale-[0.98] disabled:opacity-60"
              style={{ background: claimed ? "#7C6FE0" : "linear-gradient(180deg, #1840A0 0%, #103080 100%)", boxShadow: claimed ? "none" : "0 3px 8px rgba(16,48,128,0.24)", fontWeight: 500 }}
            >
              {claimed ? "已领取" : "立即领取"}
            </button>
          </div>
        </div>

        {/* 推荐打卡点横滚 */}
        <div className="mt-4">
          <div className="flex items-center justify-between gap-1.5 mb-2.5">
            <div className="flex items-center gap-1.5">
              <MapPin size={13} strokeWidth={1.5} color="#7C6FE0" />
              <p className="text-[11px] text-[#20201C]" style={{ fontWeight: 500 }}>继续打卡</p>
            </div>
            <span className="text-[8px] text-[#A89D8A]" style={{ fontFamily: "'DM Mono', monospace" }}>← 左右滑动</span>
          </div>
          <div className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {card.recommendations.map((spot, index) => (
              <motion.div
                key={`${spot.name}-${spot.floor}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.07 }}
                className="min-w-[128px] snap-start overflow-hidden rounded-[10px] border border-[#EEE8DC] bg-white"
              >
                <div className="relative h-[52px] overflow-hidden bg-[#D8D1C7]">
                  <img src={SPOT_IMAGES[spot.name]} alt={spot.name} className="size-full object-cover" />
                  <span className="absolute left-0 bottom-0 right-0 h-5 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(16,27,64,0) 0%, rgba(16,27,64,0.28) 100%)" }} />
                  <span className="absolute right-1.5 top-1.5 text-[8px] text-white px-1.5 py-0.5 rounded-full" style={{ background: "rgba(16,27,64,0.5)", backdropFilter: "blur(4px)" }}>{spot.category}</span>
                  <span className="absolute left-1.5 bottom-1 text-[8px] text-white" style={{ fontFamily: "'DM Mono', monospace" }}>{spot.floor}</span>
                </div>
                <div className="px-2.5 py-2">
                  <p className="truncate text-[11px] text-[#20201C]" style={{ fontWeight: 500 }}>{spot.name}</p>
                  <p className="mt-1 truncate text-[8px] text-[#A89D8A]">{spot.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}