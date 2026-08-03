import { BookOpen, CalendarDays, Coffee, Flag, Gamepad2, MapPin, ShoppingBag, Sparkles, Utensils } from "lucide-react";
import type { ComponentType } from "react";
import type { PlanCard } from "../../types";

const ICONS: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  activity: CalendarDays,
  coffee: Coffee,
  dining: Utensils,
  end: Flag,
  reading: BookOpen,
  retail: ShoppingBag,
  start: Sparkles,
  play: Gamepad2,
  walk: MapPin,
};

export function PlanCardBubble({ card }: { card: PlanCard }) {
  return (
    <section
      className="mt-2 w-full overflow-hidden rounded-[8px] border border-[#E8E2D8] bg-white shadow-[0_6px_20px_rgba(42,37,32,0.08)]"
      aria-label={card.title}
    >
      <header className="border-b border-[#EEE9E1] bg-[#FAF8F4] px-4 py-3">
        <p className="text-[9px] font-semibold uppercase text-[#8070F0]">{card.eyebrow}</p>
        <h3 className="mt-0.5 text-[15px] font-semibold text-[#24221F]">{card.title}</h3>
      </header>

      <div className="px-4 py-3">
        {card.segments.map((segment, index) => {
          const Icon = ICONS[segment.iconKey] ?? MapPin;
          const isLast = index === card.segments.length - 1;

          return (
            <div key={`${segment.title}-${index}`} className="relative flex gap-3 pb-3 last:pb-0">
              {!isLast && <span className="absolute left-[13px] top-7 h-[calc(100%-18px)] w-px bg-[#DDD7F8]" />}
              <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#EFEEFE] text-[#6D5DE0]">
                <Icon size={14} strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-[12px] font-semibold text-[#292622]">{segment.title}</h4>
                  {segment.floor && <span className="shrink-0 text-[10px] font-medium text-[#9B8463]">{segment.floor}</span>}
                </div>
                <div className="mt-1 space-y-1.5">
                  {segment.items.map((item, itemIndex) => (
                    <div key={`${item.name}-${itemIndex}`}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[11px] font-semibold leading-4 text-[#3A3732]">{item.name}</p>
                        {item.type && (
                          <span className="rounded bg-[#F3F0EA] px-1.5 py-0.5 text-[8px] leading-none text-[#8B7E6D]">
                            {item.type}
                          </span>
                        )}
                      </div>
                      {item.note && (
                        <p className="mt-0.5 text-[10px] leading-4 text-[#777067]">
                          <span className="font-medium text-[#7A69E2]">推荐 · </span>{item.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {card.hint && (
        <footer className="flex gap-2 border-t border-[#EEE9E1] bg-[#FFF9ED] px-4 py-2.5 text-[10px] leading-4 text-[#756851]">
          <Sparkles className="mt-0.5 shrink-0 text-[#D59A2B]" size={12} />
          <span>{card.hint}</span>
        </footer>
      )}
    </section>
  );
}
