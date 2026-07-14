import { motion } from "motion/react";
import { MapPin } from "lucide-react";
import type { BrandCard } from "../../types";

export function BrandCardBubble({ card }: { card: BrandCard }) {
  const scopeLabel =
    card.tag === "本季新品"
      ? "本季新品"
      : card.highlight
        ? "热销品牌"
        : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden mt-2.5 mx-1"
      style={{
        width: "100%",
        maxWidth: 300,
        borderRadius: 14,
        background: "#FFFFFF",
        border: "1px solid rgba(240,176,64,0.16)",
        boxShadow: "0 4px 20px rgba(42,37,32,0.08), 0 1px 4px rgba(42,37,32,0.04)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3"
        style={{
          background: "linear-gradient(135deg, #FFF8EE 0%, #FFF0DC 100%)",
          borderBottom: "1px solid rgba(240,176,64,0.12)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[13px]" style={{ color: "#F0B040" }}>✦</span>
            <span className="text-[11px] tracking-wide text-[#20201C]" style={{ fontWeight: 500 }}>
              品牌咨询
            </span>
          </div>
          {scopeLabel && (
            <span
              className="text-[9px] tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(76,175,142,0.12)",
                color: "#3E9C7E",
                border: "1px solid rgba(76,175,142,0.25)",
              }}
            >
              {scopeLabel}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3.5">
        {/* Brand name & floor */}
        <p className="text-[16px] text-[#20201C] mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
          {card.brand}
        </p>
        <div className="flex items-center gap-1.5 mb-3">
          <MapPin size={12} strokeWidth={1.8} color="#A89D8A" />
          <span className="text-[11px] text-[#A89D8A] tracking-wide">{card.floor}</span>
        </div>

        {/* Category tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {card.categories.map((cat) => (
            <span
              key={cat}
              className="text-[9px] tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(240,176,64,0.1)",
                color: "#C8841E",
                border: "1px solid rgba(240,176,64,0.18)",
              }}
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Highlight */}
        {card.highlight && (
          <div
            className="px-3 py-2 rounded-[8px]"
            style={{ background: "#FFFAF0", border: "1px solid rgba(240,176,64,0.1)" }}
          >
            <p className="text-[9px] tracking-wider text-[#A89D8A] mb-1">★ 当季亮点</p>
            <p className="text-[11px] text-[#20201C] leading-[1.55]" style={{ fontWeight: 400 }}>
              {card.highlight}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}