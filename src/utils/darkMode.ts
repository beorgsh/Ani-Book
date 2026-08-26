// Dark Mode Cookie & Theme Management Utility

export function getStoredDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // 1. Check cookies
    const match = document.cookie.match(/(?:^|; )anibook_dark_mode=([^;]*)/);
    if (match && match[1]) {
      return match[1] === "true";
    }
    // 2. Check localStorage
    const local = localStorage.getItem("anibook_dark_mode");
    if (local !== null) {
      return local === "true";
    }
    // 3. Fallback to system preference if non-cookie
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function setStoredDarkMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    // Store in cookie (1 year max-age)
    document.cookie = `anibook_dark_mode=${enabled}; path=/; max-age=31536000; SameSite=Lax`;
    // Also sync to localStorage
    localStorage.setItem("anibook_dark_mode", String(enabled));
    
    // Apply .dark class to document root
    if (enabled) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch (err) {
    console.error("Failed to store dark mode preference:", err);
  }
}

export function initDarkMode(): boolean {
  const isDark = getStoredDarkMode();
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  return isDark;
}
