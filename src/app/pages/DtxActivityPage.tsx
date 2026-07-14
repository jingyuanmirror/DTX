interface DtxActivityPageProps {
  onBack: () => void;
}

export function DtxActivityPage({ onBack }: DtxActivityPageProps) {
  return (
    <div className="flex flex-col h-full" style={{ background: "#F5F2ED" }}>
      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-3">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center" style={{ color: "#8C8278" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-[14px] tracking-[0.15em] text-[#1A1713]" style={{ fontFamily: "'Cormorant', serif", fontWeight: 500 }}>
          活动中心
        </span>
        <div className="w-8" />
      </div>

      {/* ── Screenshot Image ── */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <img
          src="/activity.png"
          alt="活动中心"
          className="w-full"
          style={{ display: "block" }}
        />
      </div>
    </div>
  );
}