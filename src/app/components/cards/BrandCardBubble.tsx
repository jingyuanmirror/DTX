import { motion } from "motion/react";
import { MapPin, Sparkles } from "lucide-react";
import type { BrandCard } from "../../types";

export function BrandCardBubble({ card }: { card: BrandCard }) {
  const scopeLabel = card.tag === "本季新品" ? "本季新品" : card.highlight ? "热销品牌" : undefined;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full w-full overflow-hidden rounded-[8px] border border-[#E8E3D8] bg-white"
      style={{ boxShadow: "0 1px 2px rgba(42,37,32,0.04)" }}
    >
      <div className="w-1 shrink-0 self-stretch bg-gradient-to-b from-[#8070F0] to-[#5B4DD0]" />

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-[#F0EBE0] bg-[#FAF9F6] px-4 py-3">
          <span className="text-[10px] font-medium text-[#7C7467]">品牌咨询</span>
          {scopeLabel && (
            <span className="rounded-full border border-[rgba(91,77,208,0.16)] bg-[rgba(91,77,208,0.08)] px-2 py-0.5 text-[9px] text-[#5B4DD0]">
              {scopeLabel}
            </span>
          )}
        </header>

        <div className="px-4 py-4">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h3 className="min-w-0 truncate text-[20px] leading-none text-[#20201C]" style={{ fontFamily: "'Noto Serif SC', serif", fontWeight: 500 }}>
              {card.brand}
            </h3>
            <div className="flex shrink-0 items-center gap-1 text-[#A89D8A]">
              <MapPin size={11} strokeWidth={1.5} />
              <span className="text-[9px]" style={{ fontFamily: "'DM Mono', monospace" }}>{card.floor}</span>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {card.categories.map((category) => (
              <span key={category} className="rounded-full border border-[rgba(91,77,208,0.16)] bg-[rgba(91,77,208,0.08)] px-2 py-0.5 text-[9px] text-[#5B4DD0]">
                {category}
              </span>
            ))}
          </div>

          {card.highlight && (
            <div className="border-t border-[#F0EBE0] pt-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[#7C6FE0]">
                <Sparkles size={11} strokeWidth={2} />
                <span className="text-[9px]">当季亮点</span>
              </div>
              <p className="text-[11px] leading-[1.6] text-[#20201C]">{card.highlight}</p>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
