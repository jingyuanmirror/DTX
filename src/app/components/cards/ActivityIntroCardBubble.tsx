import { motion } from "motion/react";
import { ChevronRight, Gift, Sparkles, TicketCheck, Zap } from "lucide-react";
import type { ActivityIntroCard } from "../../types";

const BENEFIT_ICONS = [Gift, Zap, TicketCheck];

export function ActivityIntroCardBubble({
  card,
  onJoin,
}: {
  card: ActivityIntroCard;
  onJoin: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="mt-2.5 w-full overflow-hidden rounded-[16px] border border-[#E7C4C8] bg-white shadow-[0_16px_38px_rgba(94,43,55,0.14)]"
    >
      <div className="relative h-[154px] overflow-hidden">
        <img src="/qixi-activity.jpg" alt={card.title} className="size-full object-cover object-[center_48%]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(49,17,30,0.88)_0%,rgba(49,17,30,0.18)_62%,rgba(0,0,0,0.08)_100%)]" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3.5 text-white">
          <span className="rounded-full border border-white/45 bg-black/15 px-2 py-1 text-[8px] backdrop-blur-sm">{card.eyebrow}</span>
          <span className="text-[8px] text-white/85">{card.dateLabel}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <div className="mb-1 flex items-center gap-1 text-[8px] text-[#FFD9C8]"><Sparkles size={11} /> 七夕主题活动</div>
          <h3 className="text-[19px] font-semibold leading-tight">{card.title}</h3>
          <p className="mt-1 text-[10px] text-white/82">{card.slogan}</p>
        </div>
      </div>

      <div className="px-4 py-3.5">
        <div className="mb-2 text-[10px] font-semibold text-[#49363D]">新人专享礼遇</div>
        <div className="divide-y divide-[#F1E6E5]">
          {card.benefits.map((benefit, index) => {
            const Icon = BENEFIT_ICONS[index] ?? Gift;
            return (
              <div key={benefit.title} className="flex items-center gap-2.5 py-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#FFF0ED] text-[#BD5B65]"><Icon size={13} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-semibold text-[#3E3336]">{benefit.title}</p>
                  <p className="mt-0.5 truncate text-[8px] text-[#9A898A]">{benefit.note}</p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onJoin}
          className="mt-3 flex h-10 w-full items-center justify-center gap-1 rounded-full bg-[#B83F5A] text-[12px] font-semibold text-white shadow-[0_7px_16px_rgba(184,63,90,0.24)] transition hover:bg-[#A73750] active:scale-[0.98]"
        >
          {card.actionLabel} <ChevronRight size={14} />
        </button>
        <p className="mt-2 text-center text-[8px] text-[#A69899]">点击后进入支付宝个人信息授权确认</p>
      </div>
    </motion.section>
  );
}
