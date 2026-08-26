import { Post } from "../types";

const COOKIE_NAME = "anibook_liked_animes";
const COOKIE_IDS_NAME = "anibook_liked_ids";
const STORAGE_BACKUP_KEY = "anibook_liked_animes_store";

// Helper to read cookie value by key
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
  return match ? decodeURIComponent(match[3]) : null;
}

// Helper to set cookie with 1 year expiration and Lax SameSite
export function setCookie(name: string, value: string, days: number = 365): void {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

// Helper to remove cookie
export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

// Compact structure for cookie storage to stay within safe cookie limits
export interface StoredLikedAnime {
  id: string;
  slug?: string;
  title: string;
  avatar?: string;
  image?: string;
  posterImage?: string;
  bannerImage?: string;
  backdrop?: string;
  mal_id?: string;
  ani_id?: string;
  genreTags?: string[];
  studio?: string;
  episodes?: string;
  status?: string;
  is_sub?: number;
  is_dub?: number;
  year?: number | string;
  likesCount?: number;
  likedAt?: number;
  type?: string;
}

/**
 * Retrieve the Set of all liked Anime IDs from cookies (with localStorage sync fallback)
 */
export function getLikedAnimeIds(): Set<string> {
  const idsSet = new Set<string>();

  // Try reading concise IDs cookie first
  try {
    const rawIdsCookie = getCookie(COOKIE_IDS_NAME);
    if (rawIdsCookie) {
      const parsed = JSON.parse(rawIdsCookie);
      if (Array.isArray(parsed)) {
        parsed.forEach((id: any) => {
          if (typeof id === "string" || typeof id === "number") idsSet.add(String(id));
        });
      }
    }
  } catch (err) {
    console.warn("[COOKIE LIKES] Error parsing liked ids cookie:", err);
  }

  // Also read full liked list cookie / localStorage
  try {
    const list = getLikedAnimeList();
    list.forEach((p) => {
      if (p.id) idsSet.add(String(p.id));
      if (p.slug) idsSet.add(String(p.slug));
    });
  } catch (err) {
    console.warn("[COOKIE LIKES] Error reading liked items:", err);
  }

  return idsSet;
}

/**
 * Retrieve the full list of liked Anime posts from cookies & storage
 */
export function getLikedAnimeList(): Post[] {
  if (typeof window === "undefined") return [];

  // Try cookie first
  let storedItems: StoredLikedAnime[] = [];
  try {
    const rawCookie = getCookie(COOKIE_NAME);
    if (rawCookie) {
      const parsed = JSON.parse(rawCookie);
      if (Array.isArray(parsed)) {
        storedItems = parsed;
      }
    }
  } catch (e) {
    console.warn("[COOKIE LIKES] Failed parsing full cookie:", e);
  }

  // Fallback / sync with localStorage for resilience
  if (storedItems.length === 0) {
    try {
      const localData = localStorage.getItem(STORAGE_BACKUP_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) {
          storedItems = parsed;
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }

  return storedItems.map((item) => {
    const image = item.bannerImage || item.backdrop || item.image || item.posterImage || "";
    return {
      id: String(item.id),
      slug: item.slug,
      title: item.title,
      avatar: item.avatar || item.posterImage || image,
      isVerified: item.status === "Currently Airing",
      timestamp: "Liked Anime",
      content: `Your saved favorite anime: ${item.title}. Categorized in ${item.genreTags?.join(", ") || "Anime"}.`,
      image,
      bannerImage: item.bannerImage || image,
      backdrop: item.backdrop || image,
      posterImage: item.posterImage || image,
      mal_id: item.mal_id,
      ani_id: item.ani_id,
      genreTags: item.genreTags || ["Liked Anime", "Favorite"],
      studio: item.studio || "Saved Favorite",
      isCustom: false,
      likesCount: (item.likesCount || 100) + 1,
      commentsCount: 2,
      sharesCount: 15,
      isLikedByUser: true,
      commentsList: [
        {
          id: `${item.id}-liked-note`,
          authorName: "AniBook System",
          authorAvatar: "https://api.dicebear.com/9.x/bottts/svg?seed=AniBookFavs",
          text: `Saved to your Liked Anime favorites library on ${item.likedAt ? new Date(item.likedAt).toLocaleDateString() : "AniBook"}. ❤️`,
          timestamp: "Saved"
        }
      ],
      type: item.type || "TV",
      episodes: item.episodes || "?",
      status: item.status || "Liked Favorite",
      is_sub: item.is_sub || 12,
      is_dub: item.is_dub,
      year: item.year || "2026",
      aired: item.year ? String(item.year) : "2026"
    };
  });
}

/**
 * Persist the liked animes in both cookies and localStorage
 */
export function saveLikedAnimeList(posts: Post[]): void {
  if (typeof window === "undefined") return;

  const storedList: StoredLikedAnime[] = posts.map((p) => ({
    id: String(p.id),
    slug: p.slug,
    title: p.title,
    avatar: p.avatar,
    image: p.image,
    posterImage: p.posterImage,
    bannerImage: p.bannerImage,
    backdrop: p.backdrop,
    mal_id: p.mal_id,
    ani_id: p.ani_id,
    genreTags: p.genreTags,
    studio: p.studio,
    episodes: p.episodes,
    status: p.status,
    is_sub: p.is_sub,
    is_dub: p.is_dub,
    year: p.year,
    likesCount: p.likesCount,
    likedAt: Date.now(),
    type: p.type
  }));

  // Store ID array in cookie for fast lookup
  const ids = storedList.map((i) => String(i.id));
  try {
    setCookie(COOKIE_IDS_NAME, JSON.stringify(ids), 365);
    // Keep most recent 50 liked animes in the cookie payload to respect cookie length limits
    const safeCookieList = storedList.slice(0, 50);
    setCookie(COOKIE_NAME, JSON.stringify(safeCookieList), 365);
  } catch (err) {
    console.warn("[COOKIE LIKES] Cookie save warning:", err);
  }

  // Also sync entire collection in localStorage
  try {
    localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(storedList));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Toggle like for an anime: returns updated liked state and full list of liked anime
 */
export function toggleAnimeLike(post: Post): { isLiked: boolean; allLiked: Post[] } {
  const currentList = getLikedAnimeList();
  const targetId = String(post.id);
  const targetSlug = post.slug;

  const existingIndex = currentList.findIndex(
    (item) => String(item.id) === targetId || (targetSlug && item.slug && item.slug === targetSlug)
  );

  let updatedList: Post[];
  let isNowLiked: boolean;

  if (existingIndex >= 0) {
    // Remove from liked
    updatedList = currentList.filter((_, idx) => idx !== existingIndex);
    isNowLiked = false;
  } else {
    // Add to liked (at front of list)
    const newLikedPost: Post = {
      ...post,
      isLikedByUser: true,
      likesCount: (post.likesCount || 0) + 1
    };
    updatedList = [newLikedPost, ...currentList];
    isNowLiked = true;
  }

  saveLikedAnimeList(updatedList);
  return { isLiked: isNowLiked, allLiked: updatedList };
}
