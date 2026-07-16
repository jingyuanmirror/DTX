import { motion } from "motion/react";
import { MapPin, Sparkles, UtensilsCrossed } from "lucide-react";
import type { RestaurantCard } from "../../types";

/**
 * 餐厅推荐卡 —— 编辑型设计语言
 * 顶部配图(或渐变占位) · 白底 · 左紫竖条 · 衬线店名 + 菜系小标 · 等宽人均 · 招牌菜 tag
 */
export function RestaurantCardBubble({ card }: { card: RestaurantCard }) {
  const dishes = (card.recommendation ?? []).slice(0, 4);
  const hasImage = Boolean(card.image);

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
        {/* 顶部配图:有图显图,无图走餐具图标轻占位 */}
        <div className="relative h-[110px] overflow-hidden" style={!hasImage ? { background: "linear-gradient(135deg, #EDE7DA 0%, #D8D1C7 100%)" } : undefined}>
          {hasImage ? (
            <>
              <img src={card.image} alt={card.name} className="size-full object-cover" />
              <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(16,27,64,0) 45%, rgba(16,27,64,0.42) 100%)" }} />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <UtensilsCrossed size={24} strokeWidth={1.4} color="#B7AE9C" />
              <p className="text-[8px] tracking-wider text-[#B7AE9C]">配图生成中</p>
            </div>
          )}
          {/* 菜系胶囊角标 */}
          <span
            className="absolute left-2.5 top-2.5 px-2 py-0.5 text-[9px] text-white rounded-full"
            style={{ background: "rgba(16,27,64,0.42)", backdropFilter: "blur(4px)" }}
          >
            {card.cuisineType}
          </span>
          {/* 人均角标(右下) */}
          <span
            className="absolute right-2.5 bottom-2 px-2 py-0.5 text-[10px] text-white rounded-full"
            style={{ background: "linear-gradient(135deg, rgba(128,112,240,0.92) 0%, rgba(91,77,208,0.92) 100%)", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}
          >
            人均 {card.priceRange}
          </span>
        </div>

        <div className="pl-5 pr-4 py-3.5">
          {/* 店名 */}
          <h3 className="text-[20px] leading-none text-[#20201C] truncate mb-2.5" style={{ fontFamily: "'Noto Serif SC', serif", fontWeight: 500 }}>
            {card.name}
          </h3>

          {/* 一句话亮点 */}
          <div className="flex items-start gap-1.5 mb-3">
            <Sparkles size={11} strokeWidth={2} color="#7C6FE0" className="mt-[2px] shrink-0" />
            <p className="text-[11px] leading-[1.5] text-[#20201C]">{card.highlight}</p>
          </div>

          {/* 招牌菜 tag */}
          {dishes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {dishes.map((d) => (
                <span
                  key={d}
                  className="text-[9px] px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(91,77,208,0.08)", color: "#5B4DD0", border: "1px solid rgba(91,77,208,0.16)" }}
                >
                  {d}
                </span>
              ))}
            </div>
          )}

          {/* 楼层 + 小贴士 */}
          <div className="flex items-center gap-1.5 pt-3 border-t border-[#F0EBE0]">
            <MapPin size={11} strokeWidth={1.5} color="#A89D8A" />
            <span className="text-[9px] text-[#A89D8A]" style={{ fontFamily: "'DM Mono', monospace" }}>{card.floor}</span>
            {card.tip && <p className="ml-1 truncate text-[9px] text-[#A89D8A]">· {card.tip}</p>}
          </div>

          {/* 标签胶囊(米其林/排队等) */}
          {card.tags && card.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {card.tags.map((t) => (
                <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-full text-[#A89D8A] border border-[#E8E3D8]">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}