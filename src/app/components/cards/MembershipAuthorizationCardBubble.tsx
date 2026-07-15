import { motion } from "motion/react";
import { Gift, ShieldCheck } from "lucide-react";
import type { MembershipAuthorizationCard } from "../../types";

/**
 * 入会确认卡 —— 编辑型设计语言
 * 原则:白底 · 紫色单一强调 · 衬线标题 · 序号化列表 · 1px 描边 · 无大阴影 · 字体承担信息
 */
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
      className="mt-2.5 w-full overflow-hidden rounded-[16px] border border-[#E8E3D8] bg-white"
      style={{ boxShadow: "0 1px 2px rgba(42,37,32,0.04)" }}
    >
      {/* Header:eyebrow + 衬线标题 */}
      <div className="px-5 pt-5 pb-4">
        <p className="text-[9px] tracking-[0.2em] uppercase text-[#A89D8A] mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          DTX · MEMBERSHIP
        </p>
        <h3 className="text-[18px] leading-tight text-[#20201C]" style={{ fontFamily: "'Noto Serif SC', serif", fontWeight: 500 }}>
          {card.title}
        </h3>
        <p className="mt-1.5 text-[11px] leading-[1.6] text-[#8C8278]">{card.subtitle}</p>
      </div>

        {/* Benefits:序号化编辑式列表,细线分隔。淡米芯区与上下白底形成三段节奏 */}
        <div className="px-5 py-3" style={{ background: "#FBF8F2" }}>
          <div className="divide-y divide-[#EFE8DA]">
            {card.benefits.map((benefit, index) => (
              <div key={benefit.title} className="flex items-center gap-3 py-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full" style={{ background: "rgba(124,111,224,0.10)", border: "1px solid rgba(124,111,224,0.20)" }}>
                  {index === 0 ? <Gift size={14} className="text-[#7C6FE0]" strokeWidth={1.5} /> : <ShieldCheck size={14} className="text-[#7C6FE0]" strokeWidth={1.5} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-[#20201C]" style={{ fontWeight: 500 }}>
                    {benefit.title}
                  </p>
                  <p className="mt-1 text-[10px] leading-[1.55] text-[#A89D8A]">{benefit.note}</p>
                </div>
                <span className="text-[13px] text-[#7C6FE0] shrink-0 ml-2" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 400 }}>
                  {benefit.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 授权说明 */}
        <div className="px-5 mt-4 mb-4">
          <p className="text-[9px] leading-[1.7] text-[#A89D8A]">
            加入即代表同意
            <span className="text-[#7C6FE0] underline underline-offset-2 decoration-[#7C6FE0]/40">《用户授权协议》</span>
            ，并授权使用{card.authorizedFields.join("、")}，仅用于会员注册与权益服务。
          </p>
        </div>

        {/* CTA:紫色渐变按钮 */}
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onConfirm}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] text-[13px] text-white transition active:scale-[0.98]"
            style={{
              background: "linear-gradient(180deg, #1840A0 0%, #103080 100%)",
              boxShadow: "0 4px 10px rgba(16,48,128,0.30)",
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {card.actionLabel ?? "同意授权并加入会员"}
          </button>
        </div>
    </motion.section>
  );
}