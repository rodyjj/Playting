export type TimeBand = "morning" | "lunch" | "dinner";

export const TIME_BANDS: TimeBand[] = ["morning", "lunch", "dinner"];

export const BAND_META: Record<TimeBand, { label: string; timeLabel: string; videoStyle: string }> = {
  morning: { label: "모닝", timeLabel: "06:00–10:00", videoStyle: "숏폼" },
  lunch: { label: "런치", timeLabel: "11:30–14:00", videoStyle: "요약 영상" },
  dinner: { label: "디너", timeLabel: "17:00–20:00", videoStyle: "정주행 영상" },
};

const BAND_WINDOWS: Record<TimeBand, { start: number; end: number }> = {
  morning: { start: 6 * 60, end: 10 * 60 },
  lunch: { start: 11 * 60 + 30, end: 14 * 60 },
  dinner: { start: 17 * 60, end: 20 * 60 },
};

/**
 * KST minute-of-day for `now`, independent of the server/browser's own
 * timezone — this app only ever means Korea time when it says "모닝/런치/디너".
 */
export function kstMinuteOfDay(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

/** Which of the three curated bands (if any) `now` falls into, in KST. */
export function getCurrentBand(now: Date = new Date()): TimeBand | null {
  const minuteOfDay = kstMinuteOfDay(now);
  for (const band of TIME_BANDS) {
    const { start, end } = BAND_WINDOWS[band];
    if (minuteOfDay >= start && minuteOfDay < end) return band;
  }
  return null;
}

export function isTimeBand(value: string): value is TimeBand {
  return (TIME_BANDS as string[]).includes(value);
}
