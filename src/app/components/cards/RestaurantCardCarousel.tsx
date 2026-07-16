import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RestaurantCard } from "../../types";
import { RestaurantCardBubble } from "./RestaurantCardBubble";

export function RestaurantCardCarousel({ cards }: { cards: RestaurantCard[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollTo = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, cards.length - 1));
    railRef.current?.children[nextIndex]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    setActiveIndex(nextIndex);
  };

  const updateActiveCard = () => {
    const rail = railRef.current;
    if (!rail) return;
    const children = Array.from(rail.children) as HTMLElement[];
    const nearest = children.reduce((best, child, index) => {
      const distance = Math.abs(child.offsetLeft - rail.scrollLeft);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Number.POSITIVE_INFINITY });
    setActiveIndex(nearest.index);
  };

  if (cards.length === 1) {
    return <div className="mt-2.5"><RestaurantCardBubble card={cards[0]} /></div>;
  }

  return (
    <section className="mt-2.5" aria-label={`餐厅推荐，共${cards.length}家`}>
      <div
        ref={railRef}
        onScroll={updateActiveCard}
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((card) => (
          <div key={`${card.name}-${card.floor}`} className="w-[278px] shrink-0 snap-start">
            <RestaurantCardBubble card={card} />
          </div>
        ))}
      </div>

      <div className="mt-2 flex h-6 items-center justify-between px-0.5">
        <span className="text-[9px] text-[#A89D8A]">左右滑动查看更多</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => scrollTo(activeIndex - 1)} disabled={activeIndex === 0} aria-label="上一家餐厅" className="flex size-6 items-center justify-center rounded-full border border-[#E8E3D8] bg-white text-[#5B4DD0] disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          <span className="min-w-8 text-center text-[9px] tabular-nums text-[#7C7467]">{activeIndex + 1}/{cards.length}</span>
          <button type="button" onClick={() => scrollTo(activeIndex + 1)} disabled={activeIndex === cards.length - 1} aria-label="下一家餐厅" className="flex size-6 items-center justify-center rounded-full border border-[#E8E3D8] bg-white text-[#5B4DD0] disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
