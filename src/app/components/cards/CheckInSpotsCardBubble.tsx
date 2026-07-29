import { motion } from "motion/react";
import { MapPin, Sparkles, Gift } from "lucide-react";
import type { CheckInSpotsCard } from "../../types";

const SPOT_IMAGES: Record<string, string> = {
  "DTX精品超市": "/checkin-market.jpg",
  "海底捞": "/checkin-hotpot.jpg",
  "乐高体验店": "/checkin-lego.jpg",
  "％Arabica": "/checkin-coffee.jpg",
  "屈臣氏": "/product-mask.jpg",
};

/**
 * 打卡点列表卡 —— 用户查询"打卡点都有哪些/在哪"时纵向展示打卡点(由 skill 截断为 5 个)
 * 白底 · 左紫竖条 · 标题 + 打卡点纵向列表(左大图 + 右文案:楼层·礼遇·标签)· 底部提示
 */
export function CheckInSpotsCardBubble({ card }: { card: CheckInSpotsCard }) {
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
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-3">
          <MapPin size={12} strokeWidth={1.8} color="#7C6FE0" />
          <p className="text-[9px] tracking-[0.18em] text-[#A89D8A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            DTX · 打卡地图
          </p>
        </div>
        <h3 className="text-[20px] leading-none text-[#20201C] mb-3" style={{ fontFamily: "'Noto Serif SC', serif", fontWeight: 500 }}>
          {card.title}
        </h3>

        {/* 打卡点纵向列表:左大图 + 右文案(楼层·礼遇·标签·描述) */}
        <div className="flex flex-col gap-2.5">
          {card.spots.map((spot, index) => {
            const img = SPOT_IMAGES[spot.name];
            return (
              <motion.div
                key={`${spot.name}-${spot.floor}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.06 }}
                className="flex gap-3 rounded-[14px] border border-[#EEE8DC] bg-white p-2.5"
              >
                {/* 左侧店铺图(比之前更大) */}
                <div className="shrink-0 size-[80px] overflow-hidden rounded-[10px] bg-[#D8D1C7]">
                  {img && <img src={img} alt={spot.name} className="size-full object-cover" />}
                </div>
                {/* 右侧文案:店名 · 位置 · 打卡礼遇 · 标签 */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] text-[#20201C]" style={{ fontWeight: 600 }}>{spot.name}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <MapPin size={10} strokeWidth={2} color="#7C6FE0" />
                    <span className="text-[10px] text-[#5B4DD0]" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{spot.floor}</span>
                  </div>
                  {spot.benefit && (
                    <div className="mt-1 flex items-center gap-1">
                      <Gift size={11} strokeWidth={2} color="#7C6FE0" />
                      <span className="truncate text-[10px] text-[#5B4DD0]" style={{ fontWeight: 600 }}>{spot.benefit}</span>
                    </div>
                  )}
                  {spot.tags && spot.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {spot.tags.map((t) => (
                        <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "#F4F0FA", color: "#7C6FE0" }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 底部提示 */}
        {card.hint && (
          <div className="mt-3 flex items-center gap-1">
            <Sparkles size={9} strokeWidth={2} color="#7C6FE0" />
            <p className="text-[9px] text-[#A89D8A]">{card.hint}</p>
          </div>
        )}
      </div>
    </motion.section>
  );
}