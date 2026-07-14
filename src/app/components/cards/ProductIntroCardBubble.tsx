import { motion } from "motion/react";
import { MapPin, ScanLine } from "lucide-react";
import type { ProductIntroCard } from "../../types";

export function ProductIntroCardBubble({ card }: { card: ProductIntroCard }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="mt-2.5 w-full overflow-hidden rounded-[14px] border border-[#E1D8CC] bg-white shadow-[0_12px_28px_rgba(42,35,27,0.11)]"
    >
      <div className="relative h-[154px] overflow-hidden">
        <img src={card.image} alt={card.name} className="size-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(16,30,44,0.88)_0%,rgba(16,30,44,0.08)_66%,transparent_100%)]" />
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-white/50 bg-white/90 px-2 py-1 text-[8px] font-medium text-[#35495B]">
          <ScanLine size={10} /> 已识别商品
        </span>
        <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
          <p className="text-[8px] text-white/70">{card.brand}</p>
          <h3 className="mt-0.5 text-[16px] font-semibold">{card.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-[8px] text-white/70"><MapPin size={10} /> {card.floor}</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3.5">
        <div>
          <p className="text-[8px] text-[#A0968B]">日常价</p>
          <p className="mt-0.5 text-[12px] font-medium text-[#71675D] line-through">¥{card.regularPrice}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-[#A0968B]">当前活动价</p>
          <div className="mt-0.5 flex items-center justify-end gap-2">
            <span className="rounded-full bg-[#EDF5F1] px-2 py-1 text-[8px] font-medium text-[#4C7B6B]">{card.pointsLabel}</span>
            <p className="text-[22px] font-semibold text-[#B86635]">¥{card.activityPrice}</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
