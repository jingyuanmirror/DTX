import { motion } from "motion/react";
import { Check, ChevronRight, Gift, ShieldCheck, Sparkles } from "lucide-react";
import type { MembershipAuthorizationCard } from "../../types";

export function MembershipAuthorizationCardBubble({
  card,
  onConfirm,
}: {
  card: MembershipAuthorizationCard;
  onConfirm: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mt-2.5 w-full overflow-hidden rounded-[16px] border border-[#E5D8C4] bg-white shadow-[0_14px_34px_rgba(44,36,25,0.12)]"
    >
      <div className="border-b border-[#EEE5D8] bg-[#F8F3EA] px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-[#173A5E] text-[#F1D394]">
            <Sparkles size={16} />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold text-[#183B61]">{card.title}</h3>
            <p className="mt-0.5 text-[9px] text-[#948676]">{card.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="space-y-2">
          {card.benefits.map((benefit, index) => (
            <div key={benefit.title} className="flex items-center gap-3 rounded-[8px] bg-[#FFF5F1] px-3 py-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-[7px] bg-white text-[#B5873D] shadow-sm">
                {index === 0 ? <Gift size={17} /> : <ShieldCheck size={17} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold text-[#352E27]">{benefit.title}</p>
                <p className="mt-0.5 text-[12px] font-semibold text-[#D0524A]">{benefit.value}</p>
                <p className="text-[8px] text-[#A09589]">{benefit.note}</p>
              </div>
              <Check size={14} className="shrink-0 text-[#B5873D]" />
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-start gap-2 border-t border-[#EEE7DD] pt-3">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#4E8C77]" />
          <p className="text-[9px] leading-[1.55] text-[#82786D]">
            加入即代表同意<span className="font-medium text-[#3976B9]">《用户授权协议》</span>，并授权使用
            {card.authorizedFields.join("、")}，仅用于会员注册与权益服务。
          </p>
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="mt-3 flex h-10 w-full items-center justify-center gap-1 rounded-full bg-[#173A5E] text-[12px] font-semibold text-white shadow-[0_6px_16px_rgba(23,58,94,0.24)] transition hover:bg-[#234D76] active:scale-[0.98]"
        >
          同意授权并加入会员 <ChevronRight size={14} />
        </button>
      </div>
    </motion.section>
  );
}
