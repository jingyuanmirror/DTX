import { motion } from "motion/react";
import { Wallet, Nfc, Sparkles, Check, Info } from "lucide-react";
import type { RedPacketFlowCard } from "../../types";

const ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>> = {
  wallet: Wallet,
  nfc: Nfc,
  deduct: Sparkles,
  done: Check,
};

/**
 * 专属红包"碰一下"使用流程卡 —— 编辑型设计语言
 * 白底 · 左紫竖条 · 衬线标题 · 横向四步流程 · 紫焦点数字 · 底部温馨tip
 */
export function RedPacketFlowCardBubble({ card }: { card: RedPacketFlowCard }) {
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
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-[9px] tracking-[0.18em] text-[#A89D8A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {card.eyebrow}
          </span>
        </div>
        <h3 className="text-[22px] leading-none text-[#20201C]" style={{ fontFamily: "'Noto Serif SC', serif", fontWeight: 500 }}>
          {card.title}
        </h3>
        <p className="mt-1.5 text-[10px] text-[#7C6FE0]" style={{ fontWeight: 500 }}>{card.subtitle}</p>

        {/* 流程四步 */}
        <div className="mt-4 flex items-stretch gap-1">
          {card.steps.map((step, index) => {
            const Icon = ICONS[step.icon] ?? Sparkles;
            return (
              <div key={step.title} className="flex flex-1 items-stretch">
                <div className="flex-1 min-w-0">
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 28,
                      height: 28,
                      background: "linear-gradient(135deg, #8070F0 0%, #5B4DD0 100%)",
                      boxShadow: "0 2px 6px rgba(91,77,208,0.28)",
                    }}
                  >
                    <Icon size={14} strokeWidth={2} color="#FFFFFF" />
                  </div>
                  <p className="mt-2 text-[11px] text-[#20201C]" style={{ fontWeight: 500 }}>{step.title}</p>
                  <p className="mt-0.5 text-[8px] leading-[1.5] text-[#A89D8A]">{step.desc}</p>
                </div>
                {index < card.steps.length - 1 && (
                  <div className="flex items-start pt-[14px] px-0.5">
                    <span className="text-[10px] text-[#C8BFAE]" style={{ fontFamily: "'DM Mono', monospace" }}>→</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 底部 tip */}
        <div className="mt-4 flex items-start gap-1.5 rounded-[10px] px-3 py-2.5" style={{ background: "#F5F2FF", border: "1px solid rgba(128,112,240,0.16)" }}>
          <Info size={12} strokeWidth={1.8} color="#7C6FE0" className="mt-0.5 shrink-0" />
          <p className="text-[9px] leading-[1.6] text-[#5B4DD0]">{card.tip}</p>
        </div>
      </div>
    </motion.section>
  );
}