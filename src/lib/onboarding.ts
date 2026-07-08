import { getSupabaseClient } from "./supabase";
import { getClientId } from "./client-id";

const COMPLETE_KEY = "playting_onboarding_complete";
const DATA_KEY = "playting_onboarding_data";

export type OnboardingData = {
  age: number;
  subscribedOtt: string[];
  preferredGenres: string[];
  preferredPeople: string[];
};

export async function submitOnboarding(data: OnboardingData): Promise<{ ok: boolean; error?: string }> {
  const clientId = getClientId();

  // Kept locally regardless of Supabase status — this is what the home screen
  // reads to personalize recommendations, so it must survive even without a DB.
  window.localStorage.setItem(DATA_KEY, JSON.stringify(data));

  const supabase = getSupabaseClient();
  if (!supabase) {
    // Supabase가 아직 연결되지 않은 로컬 개발 환경에서도 온보딩 UX는 계속 진행되도록 로컬 저장만 수행.
    window.localStorage.setItem(COMPLETE_KEY, "1");
    return { ok: false, error: "Supabase 환경변수가 설정되지 않았습니다." };
  }

  const { error } = await supabase.from("onboarding_profiles").upsert(
    {
      client_id: clientId,
      age: data.age,
      subscribed_ott: data.subscribedOtt,
      preferred_genres: data.preferredGenres,
      preferred_people: data.preferredPeople,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" }
  );

  if (error) {
    window.localStorage.setItem(COMPLETE_KEY, "1");
    return { ok: false, error: error.message };
  }

  window.localStorage.setItem(COMPLETE_KEY, "1");
  return { ok: true };
}

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(COMPLETE_KEY) === "1";
}

export function getOnboardingData(): OnboardingData | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DATA_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnboardingData;
  } catch {
    return null;
  }
}

/**
 * Supabase is the source of truth when configured — this is what makes
 * recommendations "DB-backed" rather than a write-only log nobody reads back.
 * localStorage is only the fast-path cache (and the sole store when no DB is
 * configured, e.g. a fresh `git clone` with no Supabase project set up yet).
 * A hit here re-hydrates localStorage so isOnboardingComplete() stays in sync.
 */
export async function fetchOnboardingData(): Promise<OnboardingData | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const clientId = getClientId();
    const { data, error } = await supabase
      .from("onboarding_profiles")
      .select("age, subscribed_ott, preferred_genres, preferred_people")
      .eq("client_id", clientId)
      .maybeSingle();

    if (!error && data) {
      const resolved: OnboardingData = {
        age: data.age,
        subscribedOtt: data.subscribed_ott ?? [],
        preferredGenres: data.preferred_genres ?? [],
        preferredPeople: data.preferred_people ?? [],
      };
      window.localStorage.setItem(DATA_KEY, JSON.stringify(resolved));
      window.localStorage.setItem(COMPLETE_KEY, "1");
      return resolved;
    }
  }

  return getOnboardingData();
}

/** Same DB-first, localStorage-fallback logic as fetchOnboardingData(), for the completion gate. */
export async function resolveOnboardingComplete(): Promise<boolean> {
  if (isOnboardingComplete()) return true;
  const data = await fetchOnboardingData();
  return data !== null;
}
