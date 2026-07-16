import { useRef, useState } from "react";
import type { BrandCard } from "../../types";
import { BrandCardBubble } from "./BrandCardBubble";

export function BrandCardCarousel({ cards }: { cards: BrandCard[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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
    return <div className="mt-2.5"><BrandCardBubble card={cards[0]} /></div>;
  }

  return (
    <section className="mt-2.5" aria-label={`品牌推荐，共${cards.length}个`}>
      <div ref={railRef} onScroll={updateActiveCard} className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((card) => (
          <div key={`${card.brand}-${card.floor}`} className="w-full shrink-0 snap-center">
            <BrandCardBubble card={card} />
          </div>
        ))}
      </div>

      <div className="mt-2 flex h-5 items-center justify-center">
        <div className="flex items-center gap-1" aria-label={`第${activeIndex + 1}张，共${cards.length}张`}>
          {cards.map((card, index) => (
            <span key={card.brand} className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-3 bg-[#8070F0]" : "w-1.5 bg-[#D8D1C7]"}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
