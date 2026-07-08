"use client";

import { useState } from "react";

export default function SearchBar() {
  const [value, setValue] = useState("");

  return (
    <div className="px-6 pt-5">
      <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3.5">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="작품, 배우, 감독을 검색해보세요"
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
      </div>
    </div>
  );
}
