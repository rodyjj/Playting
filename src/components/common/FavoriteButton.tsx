"use client";

import { useEffect, useState } from "react";
import { isFavorite, toggleFavorite } from "@/lib/favorites";

export default function FavoriteButton({ id, className = "" }: { id: string; className?: string }) {
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    // Must default to false during SSR (no `window`) and only pick up the
    // real localStorage value once mounted in the browser — an effect (not a
    // lazy initial state) is what keeps this from mismatching the server-rendered markup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavorited(isFavorite(id));
  }, [id]);

  return (
    <button
      type="button"
      onClick={(event) => {
        // Posters are often wrapped in a link (search results, watch-now
        // cards) — without this, toggling a favorite would also follow that
        // link or bubble into the row's own drag/click handling.
        event.preventDefault();
        event.stopPropagation();
        setFavorited(toggleFavorite(id));
      }}
      aria-label={favorited ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      aria-pressed={favorited}
      className={`absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/80 bg-black/40 backdrop-blur-[1px] transition-transform active:scale-90 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill={favorited ? "#FACC15" : "none"}
        stroke={favorited ? "#FACC15" : "#ffffff"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      >
        <path d="M12 4.2 14.47 9.7l5.98.66-4.47 4.16 1.16 5.9L12 17.4l-5.14 3.02 1.16-5.9-4.47-4.16 5.98-.66Z" />
      </svg>
    </button>
  );
}
