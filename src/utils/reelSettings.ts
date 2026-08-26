export interface ReelSettings {
  enabled: boolean;
  autoplay: boolean;
  muted: boolean;
  frequency: number; // Interval in posts (e.g. 3, 5, 7, 10)
}

const SETTINGS_KEY = "anibook_reel_feed_settings";

export const DEFAULT_REEL_SETTINGS: ReelSettings = {
  enabled: true,
  autoplay: true,
  muted: true,
  frequency: 5
};

export function getReelSettings(): ReelSettings {
  if (typeof window === "undefined") return DEFAULT_REEL_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_REEL_SETTINGS.enabled,
        autoplay: typeof parsed.autoplay === "boolean" ? parsed.autoplay : DEFAULT_REEL_SETTINGS.autoplay,
        muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULT_REEL_SETTINGS.muted,
        frequency: typeof parsed.frequency === "number" && parsed.frequency > 0 ? parsed.frequency : DEFAULT_REEL_SETTINGS.frequency
      };
    }
  } catch (e) {
    console.warn("[REEL SETTINGS] Error reading stored settings:", e);
  }
  return DEFAULT_REEL_SETTINGS;
}

export function saveReelSettings(settings: ReelSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.cookie = `anibook_reel_autoplay=${settings.autoplay}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `anibook_reel_muted=${settings.muted}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `anibook_reel_freq=${settings.frequency}; path=/; max-age=31536000; SameSite=Lax`;
  } catch (e) {
    console.warn("[REEL SETTINGS] Error saving settings:", e);
  }
}
