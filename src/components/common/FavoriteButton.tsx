"use client";

import { useEffect, useState } from "react";
import { isInCollection, toggleCollection, type FavoriteItem } from "@/lib/favorites";

/**
 * ⭐ toggle — adds/removes `item` from "볼거에요" (watchlist).
 * `variant="overlay"` (default) absolutely positions itself over a poster;
 * `variant="inline"` instead flows normally, for placements like 꿀맛 랭킹
 * where the button sits outside the poster rather than on top of it.
 */
export default function FavoriteButton({
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
    // Must default to false during SSR (no `window`) and only pick up the
    // real localStorage value once mounted in the browser, or hydration
    // would mismatch against the server-rendered markup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(isInCollection("watchlist", item.id));
  }, [item.id]);

  return (
    <button
      type="button"
      onClick={(event) => {
        // Posters are often wrapped in a link (search results, watch-now
        // cards) — without this, toggling would also follow that link or
        // bubble into the row's own drag/click handling.
        event.preventDefault();
        event.stopPropagation();
        const next = toggleCollection("watchlist", item);
        setActive(next);
        onToggle?.(next);
      }}
      aria-label={active ? "볼거에요에서 제거" : "볼거에요에 추가"}
      aria-pressed={active}
      className={`${
        variant === "overlay" ? "absolute right-1.5 top-1.5" : "relative"
      } z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/80 bg-black/40 backdrop-blur-[1px] transition-transform active:scale-90 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill={active ? "#FACC15" : "none"}
        stroke={active ? "#FACC15" : "#ffffff"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      >
        <path d="M12 4.2 14.47 9.7l5.98.66-4.47 4.16 1.16 5.9L12 17.4l-5.14 3.02 1.16-5.9-4.47-4.16 5.98-.66Z" />
      </svg>
    </button>
  );
}
