import { CalendarDays, CheckCircle2, Clock3, MapPin, QrCode, Users } from "lucide-react";
import { motion } from "motion/react";
import type { ActivityBookingCard } from "../../types";

export function ActivityBookingCardBubble({ card }: { card: ActivityBookingCard }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mt-2 w-full overflow-hidden rounded-[8px] border border-[#E7E0D5] bg-white shadow-[0_6px_20px_rgba(42,37,32,0.08)]"
      aria-label={`${card.activityName}预约凭证`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-[#EEE8DF] bg-[#FAF8F4] px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold text-[#8070F0]">DTX · 活动预约</p>
          <h3 className="mt-1 text-[14px] font-semibold leading-5 text-[#27241F]">{card.activityName}</h3>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#EAF6EC] px-2 py-1 text-[9px] font-medium text-[#4E8658]">
          <CheckCircle2 size={11} />
          {card.statusLabel}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-x-3 gap-y-3 px-4 py-3.5">
        <Info icon={CalendarDays} label="日期" value={card.dateLabel} />
        <Info icon={Clock3} label="时段" value={card.timeSlot} />
        <Info icon={MapPin} label="地点" value={`${card.venue} · ${card.floor}`} />
        <Info icon={Users} label="参与人数" value={card.participantLabel} />
      </div>

      <div className="mx-4 flex items-center gap-2 border-t border-dashed border-[#DED7CB] py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded bg-[#EFEEFE] text-[#6D5DE0]">
          <QrCode size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[8px] text-[#A09687]">预约码</p>
          <p className="truncate font-mono text-[11px] font-semibold tracking-wide text-[#3A3630]">{card.reservationId}</p>
        </div>
      </div>

      <footer className="border-t border-[#EEE8DF] bg-[#FFF9ED] px-4 py-2.5 text-[10px] leading-4 text-[#756851]">
        {card.checkInNote}
      </footer>
    </motion.section>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[8px] text-[#A09687]">
        <Icon size={10} />
        {label}
      </p>
      <p className="mt-0.5 text-[10px] font-medium leading-4 text-[#3A3630]">{value}</p>
    </div>
  );
}
