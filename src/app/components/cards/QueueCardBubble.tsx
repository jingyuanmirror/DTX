import { motion } from "motion/react";
import { Hourglass, Store } from "lucide-react";
import type { QueueCard } from "../../types";

/**
 * 排队卡 —— 编辑型设计语言
 * 白底 · 左紫竖条 · 衬线中文章节 · 等宽号码焦点 · 前方等待紫点 · 状态语义色不喧宾
 */
export function QueueCardBubble({ card }: { card: QueueCard }) {
  const statusConfig = {
    queuing: { label: "排队中", color: "#6B8C6A", dot: "#6B8C6A", note: `预计还需约${card.estMin}分钟,到号前会提前提醒您` },
    almost: { label: "即将到号", color: "#9A7B3A", dot: "#C8A050", note: `预计还需约${card.estMin}分钟,请留意到号提醒` },
    ready: { label: "已到号", color: "#5B4DD0", dot: "#5B4DD0", note: "请尽快前往店铺,过号需重新排队" },
  }[card.status];

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
        {/* Header:排队托管 + 状态药丸 */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Hourglass size={14} strokeWidth={1.8} color="#7C6FE0" />
            <p className="text-[9px] tracking-[0.18em] text-[#A89D8A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              排队托管
            </p>
          </div>
          <span
            className="flex items-center gap-1 text-[9px] tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: `${statusConfig.color}1A`, color: statusConfig.color }}
          >
            <span className="size-1 rounded-full" style={{ background: statusConfig.dot }} />
            {statusConfig.label}
          </span>
        </div>

        {/* 店铺行 + 排队号(衬线焦点) */}
        <div className="flex items-end justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-[13px] text-[#20201C] truncate" style={{ fontWeight: 500 }}>
              {card.brand}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Store size={11} strokeWidth={1.5} color="#A89D8A" />
              <span className="text-[9px] text-[#A89D8A]">{card.floor} · {card.partySize}人位</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[8px] tracking-[0.18em] text-[#A89D8A] mb-0.5">您的号码</p>
            <p className="text-[26px] leading-none text-[#5B4DD0]" style={{ fontFamily: "'Cormorant', serif", fontWeight: 600 }}>
              {card.queueNo}
            </p>
          </div>
        </div>

        {/* 前方等待 + 预计:数据行,不强行可视化(桌数动态) */}
        <div className="flex items-stretch gap-2 mb-3 pt-3 border-t border-[#F0EBE0]">
          <div className="flex-1 px-3 py-2.5 rounded-[10px]" style={{ background: "#FCFBF6", border: "1px solid #F0EBE0" }}>
            <p className="text-[9px] tracking-wider text-[#A89D8A] mb-1">前方等待</p>
            <p className="text-[17px] text-[#20201C]" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
              {card.ahead > 0 ? `${card.ahead}组` : "—"}
            </p>
          </div>
          <div className="flex-1 px-3 py-2.5 rounded-[10px]" style={{ background: "#FCFBF6", border: "1px solid #F0EBE0" }}>
            <p className="text-[9px] tracking-wider text-[#A89D8A] mb-1">预计等候</p>
            <p className="text-[17px] text-[#20201C]" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
              {card.estMin}分钟
            </p>
          </div>
        </div>

        {/* 提示行 */}
        <div className="flex items-center gap-1.5">
          <span className="size-1 rounded-full shrink-0" style={{ background: statusConfig.dot }} />
          <p className="text-[9px] text-[#A89D8A]">{statusConfig.note}</p>
        </div>
      </div>
    </motion.section>
  );
}