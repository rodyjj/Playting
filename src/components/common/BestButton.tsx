"use client";

import { useEffect, useState } from "react";
import { isInCollection, toggleCollection, type FavoriteItem } from "@/lib/favorites";

/**
 * 🏆 toggle — adds/removes `item` from "인생작" (best). Sits immediately to
 * the left of FavoriteButton (⭐ "볼거에요") on the same poster, at `right-9`
 * rather than that button's `right-1.5`.
 * `variant="overlay"` (default) absolutely positions itself over a poster;
 * `variant="inline"` instead flows normally, for placements like 꿀맛 랭킹
 * where the button sits outside the poster rather than on top of it.
 */
export default function BestButton({
  item,
  className = "",
  onToggle,
  variant = "overlay",
}: {
  item: FavoriteItem;
  className?: string;
  onToggle?: (active: boolean) => void;
  variant?: "overlay" | "inline";
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(isInCollection("best", item.id));
  }, [item.id]);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = toggleCollection("best", item);
        setActive(next);
        onToggle?.(next);
      }}
      aria-label={active ? "인생작에서 제거" : "인생작으로 추가"}
      aria-pressed={active}
      className={`${
        variant === "overlay" ? "absolute right-9 top-1.5" : "relative"
      } z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/80 bg-black/40 backdrop-blur-[1px] transition-transform active:scale-90 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill={active ? "#FACC15" : "none"}
        stroke={active ? "#FACC15" : "#ffffff"}
        strokeWidth="1.3"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M7 3h10v2h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4h-.34A5.98 5.98 0 0 1 13 15.9V18h2a1 1 0 0 1 1 1v1H8v-1a1 1 0 0 1 1-1h2v-2.1A5.98 5.98 0 0 1 7.34 11H7a4 4 0 0 1-4-4V6a1 1 0 0 1 1-1h3V3Zm0 4H5v1a2 2 0 0 0 2 2h.06A6.02 6.02 0 0 1 7 9V7Zm10 0v2c0 .34.02.67.06 1H17a2 2 0 0 0 2-2V7h-2Z" />
      </svg>
    </button>
  );
}
