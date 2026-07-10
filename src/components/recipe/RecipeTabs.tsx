"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import FavoriteButton from "@/components/common/FavoriteButton";
import BestButton from "@/components/common/BestButton";
import { getCollection, removeFromCollection, type CollectionKey, type FavoriteItem } from "@/lib/favorites";

const SUB_TABS = [
  { key: "best", emoji: "🏆", label: "인생작", empty: "🏆 버튼을 누른 콘텐츠가 이곳에 모여요." },
  { key: "watchlist", emoji: "⭐", label: "볼거에요", empty: "⭐ 버튼을 누른 콘텐츠가 이곳에 모여요." },
  { key: "watched", emoji: "👀", label: "봤어요", empty: "포스터나 시청하기 버튼을 눌러 외부 플랫폼으로 이동하면 이곳에 기록이 쌓여요." },
] as const;

function EmptyState({ emoji, message }: { emoji: string; message: string }) {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 px-8 text-center">
      <span className="text-4xl">{emoji}</span>
      <p className="text-sm leading-relaxed text-muted">{message}</p>
    </div>
  );
}

/**
 * 홈/꿀맛 랭킹/검색/맞춤 코스 등 서비스 전체에서 ⭐/🏆로 표시했거나, 포스터나
 * "시청하기"를 눌러 외부로 나간 콘텐츠를 포스터로 모아 보여준다. "봤어요"
 * (watched)는 수동 토글이 아니라 자동 기록이라 "제거" 버튼만 붙는다.
 */
function CollectionGrid({
  listKey,
  emptyEmoji,
  emptyMessage,
}: {
  listKey: CollectionKey;
  emptyEmoji: string;
  emptyMessage: string;
}) {
  const [items, setItems] = useState<FavoriteItem[] | null>(null);

  useEffect(() => {
    // Must default to null (nothing rendered) during SSR (no `localStorage`)
    // and only pick up the real value once mounted in the browser, or
    // hydration would mismatch against the server-rendered markup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(getCollection(listKey));
  }, [listKey]);

  if (items === null) return null;

  if (items.length === 0) {
    return <EmptyState emoji={emptyEmoji} message={emptyMessage} />;
  }

  return (
    <div className="grid grid-cols-3 gap-4 px-6 pt-4 pb-8">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-1.5">
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-border bg-surface">
            {item.posterUrl ? (
              <Image src={item.posterUrl} alt={item.title} fill sizes="120px" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl">🎬</div>
            )}
            {listKey === "watched" ? (
              <button
                type="button"
                onClick={() => {
                  removeFromCollection("watched", item.id);
                  setItems((prev) => prev?.filter((f) => f.id !== item.id) ?? prev);
                }}
                aria-label="봤어요 기록에서 제거"
                className="absolute right-1.5 top-1.5 z-20 rounded-full border border-white/80 bg-black/50 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-[1px] transition-transform active:scale-90"
              >
                제거
              </button>
            ) : (
              <>
                <FavoriteButton
                  item={item}
                  onToggle={(active) => {
                    if (listKey !== "watchlist" || active) return;
                    setItems((prev) => prev?.filter((f) => f.id !== item.id) ?? prev);
                  }}
                />
                <BestButton
                  item={item}
                  onToggle={(active) => {
                    if (listKey !== "best" || active) return;
                    setItems((prev) => prev?.filter((f) => f.id !== item.id) ?? prev);
                  }}
                />
              </>
            )}
          </div>
          <p className="line-clamp-2 text-xs font-medium text-foreground">{item.title}</p>
        </div>
      ))}
    </div>
  );
}

export default function RecipeTabs() {
  const [active, setActive] = useState<(typeof SUB_TABS)[number]["key"]>("best");
  const current = SUB_TABS.find((tab) => tab.key === active) ?? SUB_TABS[0];

  return (
    <div className="flex flex-col">
      <div className="flex gap-2 px-6 pt-2">
        {SUB_TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "border-accent-light bg-accent-soft text-accent-light"
                  : "border-border bg-surface text-muted"
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          );
        })}
      </div>

      <CollectionGrid listKey={active} emptyEmoji={current.emoji} emptyMessage={current.empty} />
    </div>
  );
}
