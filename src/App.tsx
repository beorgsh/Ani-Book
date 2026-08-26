import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import Header from "./components/Header";
import SidebarLeft, { ALL_GENRES } from "./components/SidebarLeft";
import Stories from "./components/Stories";
import CreatePost from "./components/CreatePost";
import PostCard from "./components/PostCard";
import ReelsSection from "./components/ReelsSection";
import SingleReelFeedCard from "./components/SingleReelFeedCard";
import FeedSkeleton from "./components/FeedSkeleton";
import FacebookPhotoModal from "./components/FacebookPhotoModal";
import ExitConfirmModal from "./components/ExitConfirmModal";
import SettingsModal from "./components/SettingsModal";
import { Post, Comment, ApiResponse, AnimeItem, AnimeEpisode } from "./types";
import { 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  Heart, 
  Dices, 
  Bookmark,
  Layers
} from "lucide-react";
import { 
  getLikedAnimeList, 
  getLikedAnimeIds, 
  toggleAnimeLike 
} from "./utils/cookieLikes";
import { 
  getReelSettings, 
  saveReelSettings, 
  ReelSettings 
} from "./utils/reelSettings";

// Fisher-Yates array shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Helper to get or set persistent user avatar in cookie, sessionStorage, and localStorage
const getStoredUserAvatar = (): string => {
  const defaultAvatar = "https://api.dicebear.com/9.x/adventurer/svg?seed=OtakuExplorer_MainUser&backgroundColor=b6e3f4";
  if (typeof window === "undefined") return defaultAvatar;
  try {
    // 1. Check cookies
    const cookieMatch = document.cookie.match(/(?:^|; )anibook_user_avatar=([^;]*)/);
    if (cookieMatch && cookieMatch[1]) {
      let stored = decodeURIComponent(cookieMatch[1]);
      if (stored.includes("/7.x/") || stored.includes("/png?")) {
        stored = defaultAvatar;
      }
      return stored.includes("backgroundColor") ? stored : `${stored}&backgroundColor=b6e3f4`;
    }
    // 2. Check sessionStorage
    const sessionAvatar = sessionStorage.getItem("anibook_user_avatar");
    if (sessionAvatar) {
      let stored = sessionAvatar;
      if (stored.includes("/7.x/") || stored.includes("/png?")) {
        stored = defaultAvatar;
      }
      return stored.includes("backgroundColor") ? stored : `${stored}&backgroundColor=b6e3f4`;
    }

    // 3. Check localStorage
    const localAvatar = localStorage.getItem("anibook_user_avatar");
    if (localAvatar) {
      let stored = localAvatar;
      if (stored.includes("/7.x/") || stored.includes("/png?")) {
        stored = defaultAvatar;
      }
      return stored.includes("backgroundColor") ? stored : `${stored}&backgroundColor=b6e3f4`;
    }

    // Save to localStorage, sessionStorage, and cookie
    localStorage.setItem("anibook_user_avatar", defaultAvatar);
    sessionStorage.setItem("anibook_user_avatar", defaultAvatar);
    document.cookie = `anibook_user_avatar=${encodeURIComponent(defaultAvatar)}; path=/; max-age=31536000; SameSite=Lax`;

    return defaultAvatar;
  } catch {
    return defaultAvatar;
  }
};

export default function App() {
  // Main content active tab: "feed" | "latest" | "liked" | "genre"
  const [activeTab, setActiveTab] = useState<"feed" | "latest" | "liked" | "genre">("feed");
  
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>(() => getLikedAnimeList());
  const [genrePosts, setGenrePosts] = useState<Post[]>([]);
  
  const [feedHasMore, setFeedHasMore] = useState<boolean>(true);
  const [latestHasMore, setLatestHasMore] = useState<boolean>(true);
  const [genreHasMore, setGenreHasMore] = useState<boolean>(true);

  // Genre pagination & metadata
  const [genrePage, setGenrePage] = useState<number>(1);
  const [genreTotalPages, setGenreTotalPages] = useState<number>(1);
  const [genreLoading, setGenreLoading] = useState<boolean>(false);

  // Derived active state
  const posts = 
    activeTab === "feed" 
      ? feedPosts 
      : activeTab === "latest" 
        ? latestPosts 
        : activeTab === "liked" 
          ? likedPosts 
          : genrePosts;

  const hasMore = 
    activeTab === "feed" 
      ? feedHasMore 
      : activeTab === "latest" 
        ? latestHasMore 
        : activeTab === "liked" 
          ? false 
          : genreHasMore;

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination bounds & tracking
  const [maxTotalPages, setMaxTotalPages] = useState<number>(890); // default based on ~8,900 anime library
  const [latestPage, setLatestPage] = useState<number>(1);
  const usedFeedPages = useRef<Set<number>>(new Set());

  // Reel Video Settings state (saved in localStorage / cookies)
  const [reelSettings, setReelSettings] = useState<ReelSettings>(() => getReelSettings());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  const handleUpdateReelSettings = (newSettings: ReelSettings) => {
    setReelSettings(newSettings);
    saveReelSettings(newSettings);
    triggerToast(`Reel settings: ${newSettings.enabled ? (newSettings.autoplay ? "Auto-play on" : "Tap to play") : "Disabled"} (every ${newSettings.frequency} posts)`);
  };

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedGenre, setSelectedGenre] = useState<string>("");

  // Deterministic stable reels injection positions using randomized gaps of 3, 5, or 7
  const reelsPositions = React.useMemo(() => {
    const indices: { index: number; page: number }[] = [];
    let currentIdx = 2; // Show first reel after index 2 (3rd post)
    let pageCount = 1;
    // Sequential pseudo-random steps of 3, 5, 7 gaps
    const gaps = [3, 5, 7, 5, 3, 7, 5, 7, 3, 5, 7, 3, 5, 7, 3, 5, 7, 5, 3, 7];
    let gapPointer = 0;
    while (currentIdx < 500) {
      indices.push({ index: currentIdx, page: pageCount });
      const gap = gaps[gapPointer % gaps.length];
      currentIdx += gap;
      pageCount++;
      gapPointer++;
    }
    return indices;
  }, []);

  // Sidebar toggle state (closed by default on mobile, can be toggled on all screen sizes)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Toast / alert notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Facebook Photo Lightbox Modal state
  const [selectedPhotoPost, setSelectedPhotoPost] = useState<Post | null>(null);
  const [selectedEpisodeForModal, setSelectedEpisodeForModal] = useState<AnimeEpisode | null>(null);

  // App Exit Confirmation Modal state
  const [showExitModal, setShowExitModal] = useState<boolean>(false);

  const [currentUser] = useState({
    name: "Otaku Explorer",
    avatar: getStoredUserAvatar(),
  });

  const sentinelRef = useRef<HTMLDivElement>(null);

  // State refs to ensure popstate listener always accesses freshest values without stale closures
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const isSidebarOpenRef = useRef(isSidebarOpen);
  isSidebarOpenRef.current = isSidebarOpen;

  const selectedPhotoPostRef = useRef(selectedPhotoPost);
  selectedPhotoPostRef.current = selectedPhotoPost;

  const selectedGenreRef = useRef(selectedGenre);
  selectedGenreRef.current = selectedGenre;

  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const showExitModalRef = useRef(showExitModal);
  showExitModalRef.current = showExitModal;

  // Show temporary toast alert
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Convert raw API recent anime item into AniBook styled Post with cookie like check
  const formatAnimeToPost = useCallback((item: AnimeItem): Post => {
    const studioList = item.terms_by_type?.studios || item.terms_by_type?.producers || [];
    const studioName = studioList.length > 0 ? studioList[0] : "AniBook Studio";

    const rawBg = item.background_image && item.background_image.trim().length > 0 ? item.background_image.trim() : undefined;
    const aniIdStr = item.ani_id ? item.ani_id.toString().trim() : undefined;
    const anilistBackdrop = aniIdStr && !isNaN(Number(aniIdStr)) && Number(aniIdStr) > 0 ? `https://img.anili.st/media/${aniIdStr}` : undefined;
    const landscapeBackdrop = rawBg || item.backdrop || anilistBackdrop || item.banner_image || (item as any).banner || undefined;
    const fallbackPoster = item.poster || (item as any).cover || (item as any).image || (item as any).thumbnail || "";

    const rawId = item.id.toString();
    const rawSlug = item.slug || (item as any).slug_name;
    const likedIds = getLikedAnimeIds();
    const isLiked = likedIds.has(rawId) || (rawSlug && likedIds.has(rawSlug)) || likedIds.has(item.title);

    // Preset social comments
    const presetComments: Comment[] = [
      {
        id: `${item.id}-c1`,
        authorName: "Son Goku",
        authorAvatar: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=80&q=80",
        text: `Whoa! ${item.title} looks so strong! Let's check out the animation! 🥊`,
        timestamp: "2h ago"
      },
      {
        id: `${item.id}-c2`,
        authorName: "Nezuko Kamado",
        authorAvatar: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=80&q=80",
        text: "Mmh mmh! 🎋✨ (Highly recommended for anime lovers!)",
        timestamp: "1h ago"
      }
    ];

    return {
      id: item.id.toString(),
      slug: item.slug || (item as any).slug_name || undefined,
      title: item.title,
      avatar: item.poster || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=100&q=80",
      isVerified: item.status === "Currently Airing",
      timestamp: item.aired || "Airing now",
      content: item.description || `Meet ${item.title}, categorized under ${item.terms_by_type?.genre?.join(", ") || "Anime"}. Aired in ${item.year || "2026"} with a rating of ${item.rating || "PG"}. Check it out on AniBook!`,
      image: landscapeBackdrop || fallbackPoster,
      bannerImage: landscapeBackdrop,
      backdrop: landscapeBackdrop,
      posterImage: fallbackPoster,
      mal_id: item.mal_id ? item.mal_id.toString() : undefined,
      ani_id: item.ani_id ? item.ani_id.toString() : undefined,
      genreTags: item.terms_by_type?.genre || [],
      studio: studioName,
      isCustom: false,
      likesCount: Math.abs((item.id * 7) % 650) + 15,
      commentsCount: presetComments.length,
      sharesCount: Math.abs((item.id * 2) % 180) + 3,
      isLikedByUser: isLiked,
      commentsList: presetComments,
      type: item.terms_by_type?.type?.[0] || "ONA",
      episodes: item.episodes || "?",
      status: item.status || "Currently Airing",
      is_sub: item.is_sub !== undefined ? item.is_sub : (item.episodes && !isNaN(Number(item.episodes)) ? Number(item.episodes) : (item.id === 21 ? 1175 : 24)),
      is_dub: (item as any).is_dub !== undefined ? (item as any).is_dub : (item.id === 21 ? 1175 : (item.id % 2 === 0 ? 12 : undefined)),
      year: item.year || (item.aired ? item.aired.match(/\d{4}/)?.[0] : "2026"),
      aired: item.aired || (item.year ? String(item.year) : "2026")
    };
  }, []);

  // Format items from https://anikototvapi.vercel.app/api/genre/{genre} into AniBook Posts
  const formatGenreItemToPost = useCallback((item: any, genreName: string, likedIds: Set<string>): Post => {
    const animeId = item.animeId ? String(item.animeId) : String(Math.floor(Math.random() * 10000));
    const rawSlug = item.slug ? String(item.slug).split("/")[0] : "";
    const isLiked = likedIds.has(animeId) || (rawSlug && likedIds.has(rawSlug)) || likedIds.has(item.title);
    const rating = item.rating && item.rating !== "0" ? item.rating : "7.8";
    const totalEps = item.total || item.sub || 12;
    const posterUrl = item.poster || "";

    const displayGenre = genreName.charAt(0).toUpperCase() + genreName.slice(1);

    return {
      id: `genre-${genreName}-${animeId}`,
      slug: rawSlug,
      title: item.title || "Anime Title",
      japaneseTitle: item.japaneseTitle || item.name || undefined,
      avatar: posterUrl || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=100&q=80",
      isVerified: true,
      timestamp: item.type ? `${item.type} · ${rating} ★` : "Anime Series",
      content: `${item.title} (${item.japaneseTitle || item.title}) · Rated ${rating} ★ with ${totalEps} episodes. Official release in the ${displayGenre} Anime Guild on AniBook.`,
      image: posterUrl,
      bannerImage: posterUrl,
      backdrop: posterUrl,
      posterImage: posterUrl,
      mal_id: item.mal_id ? String(item.mal_id) : undefined,
      ani_id: item.ani_id ? String(item.ani_id) : undefined,
      genreTags: [displayGenre, item.type || "TV"],
      studio: `${displayGenre} Guild`,
      isCustom: false,
      isGenre: true,
      rating: rating,
      likesCount: Math.abs((parseInt(animeId || "1", 10) * 17) % 480) + 30,
      commentsCount: 2,
      sharesCount: Math.abs((parseInt(animeId || "1", 10) * 4) % 90) + 6,
      isLikedByUser: isLiked,
      commentsList: [
        {
          id: `c1-${animeId}`,
          authorName: "AniBook Guild Master",
          authorAvatar: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=80&q=80",
          text: `Top pick for ${displayGenre} otakus! Rating: ${rating} ★ · Tap to watch episodes or explore clips! 🔥`,
          timestamp: "2h ago"
        }
      ],
      type: item.type || "TV",
      episodes: String(totalEps),
      status: "Available",
      is_sub: item.sub || totalEps,
      is_dub: item.dub || 0,
      year: "2026",
      aired: "2026"
    };
  }, []);

  // Helper to pick a random unused page number from the 8,000+ library pool
  const getRandomPage = (maxPages: number): number => {
    const validMax = Math.max(1, maxPages);
    if (usedFeedPages.current.size >= validMax) {
      usedFeedPages.current.clear();
    }

    let attempts = 0;
    while (attempts < 50) {
      const candidate = Math.floor(Math.random() * validMax) + 1;
      if (!usedFeedPages.current.has(candidate)) {
        usedFeedPages.current.add(candidate);
        return candidate;
      }
      attempts++;
    }

    const fallback = Math.floor(Math.random() * validMax) + 1;
    usedFeedPages.current.add(fallback);
    return fallback;
  };

  const isFetchingRef = useRef<boolean>(false);

  // Preload post images into browser cache seamlessly in idle time
  const preloadPostImages = useCallback((postsToPreload: Post[]) => {
    if (typeof window === "undefined") return;
    const run = () => {
      postsToPreload.forEach((p) => {
        if (p.image) {
          const img = new window.Image();
          img.src = p.image;
        }
      });
    };
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(run);
    } else {
      setTimeout(run, 100);
    }
  }, []);

  // Fetch anime data for main feeds (feed / latest)
  const fetchAnimeData = useCallback(async (isInitial: boolean = false, isBackgroundPreload: boolean = false) => {
    if (activeTab === "liked" || activeTab === "genre") return;
    if (isFetchingRef.current && !isBackgroundPreload) return;
    isFetchingRef.current = true;

    if (!isBackgroundPreload) {
      setLoading(true);
    }
    setError(null);

    try {
      let targetPage = 1;

      if (activeTab === "feed") {
        // Feed mode: pick a random page from the 8,000+ anime library
        targetPage = getRandomPage(maxTotalPages);
      } else {
        // Latest mode: sequential page numbering
        targetPage = isInitial ? 1 : latestPage;
      }

      const response = await fetch(`/api/recent-anime?page=${targetPage}&per_page=10`);
      if (!response.ok) {
        throw new Error(`Proxy returned error status: ${response.status}`);
      }

      const resData: ApiResponse = await response.json();

      if (resData.ok && Array.isArray(resData.data)) {
        let formattedPosts = resData.data.map(formatAnimeToPost);

        // In Feed mode: shuffle the list items
        if (activeTab === "feed") {
          formattedPosts = shuffleArray(formattedPosts);
        }

        // Cache images in background
        preloadPostImages(formattedPosts);

        // Update total pages available from pagination metadata
        if (resData.pagination?.total_pages) {
          setMaxTotalPages(resData.pagination.total_pages);
        }

        if (activeTab === "feed") {
          setFeedPosts((prevPosts: Post[]) => {
            if (isInitial) {
              return formattedPosts;
            }
            const existingIds = new Set<string>(prevPosts.map((p: Post) => p.id));
            const uniqueNewPosts = formattedPosts.filter((p: Post) => !existingIds.has(p.id));
            return [...prevPosts, ...uniqueNewPosts];
          });
          setFeedHasMore(true);
        } else {
          setLatestPosts((prevPosts: Post[]) => {
            if (isInitial) {
              return formattedPosts;
            }
            const existingIds = new Set<string>(prevPosts.map((p: Post) => p.id));
            const uniqueNewPosts = formattedPosts.filter((p: Post) => !existingIds.has(p.id));
            return [...prevPosts, ...uniqueNewPosts];
          });
          setLatestPage(targetPage + 1);
          if (resData.pagination) {
            setLatestHasMore(targetPage < resData.pagination.total_pages);
          } else {
            setLatestHasMore(resData.data.length > 0);
          }
        }

        // If this was an initial load or regular scroll batch, preload next items
        if (isInitial || !isBackgroundPreload) {
          setTimeout(() => {
            fetchAnimeData(false, true);
          }, 300);
        }
      } else {
        throw new Error(resData.error || "Malformed API response structure.");
      }
    } catch (err: any) {
      console.error("[FETCH ANIME ERROR]", err);
      if (!isBackgroundPreload) {
        setError(err.message || "Failed to sync anime feed.");
      }
      if (isInitial) {
        if (activeTab === "feed") {
          setFeedHasMore(false);
        } else {
          setLatestHasMore(false);
        }
      }
    } finally {
      isFetchingRef.current = false;
      if (!isBackgroundPreload) {
        setLoading(false);
      }
    }
  }, [activeTab, latestPage, maxTotalPages, preloadPostImages, formatAnimeToPost]);

  // Fetch anime by genre from https://anikototvapi.vercel.app/api/genre/{genre}
  const fetchGenreData = useCallback(async (genreSlug: string, targetPage: number = 1, isInitial: boolean = false) => {
    if (!genreSlug) return;
    if (isFetchingRef.current && !isInitial) return;
    isFetchingRef.current = true;

    if (isInitial) {
      setGenreLoading(true);
      setLoading(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setError(null);

    try {
      const cleanGenre = genreSlug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-");
      const response = await fetch(`/api/genre/${encodeURIComponent(cleanGenre)}?page=${targetPage}`);
      
      if (!response.ok) {
        throw new Error(`Genre API returned error status: ${response.status}`);
      }

      const resData = await response.json();
      if (resData.ok && Array.isArray(resData.data)) {
        const likedIds = getLikedAnimeIds();
        const formatted = resData.data.map((item: any) => formatGenreItemToPost(item, cleanGenre, likedIds));
        
        preloadPostImages(formatted);

        setGenreTotalPages(resData.totalPages || 1);
        setGenrePage(targetPage);
        setGenreHasMore(targetPage < (resData.totalPages || 1) && resData.data.length > 0);

        setGenrePosts((prev: Post[]) => {
          if (isInitial) return formatted;
          const existingIds = new Set<string>(prev.map((p: Post) => p.id));
          const unique = formatted.filter((p: Post) => !existingIds.has(p.id));
          return [...prev, ...unique];
        });
      } else {
        throw new Error("No anime found for this genre.");
      }
    } catch (err: any) {
      console.error("[FETCH GENRE ERROR]", err);
      setError(err.message || "Failed to load genre anime.");
      if (isInitial) setGenreHasMore(false);
    } finally {
      isFetchingRef.current = false;
      setGenreLoading(false);
      setLoading(false);
    }
  }, [formatGenreItemToPost, preloadPostImages]);

  // When activeTab changes, load initial batch if empty
  useEffect(() => {
    if (activeTab === "feed" || activeTab === "latest") {
      const currentPosts = activeTab === "feed" ? feedPosts : latestPosts;
      if (currentPosts.length === 0) {
        fetchAnimeData(true, false);
      }
    } else if (activeTab === "genre" && selectedGenre) {
      if (genrePosts.length === 0) {
        fetchGenreData(selectedGenre, 1, true);
      }
    } else if (activeTab === "liked") {
      // Re-read liked posts from cookies/localStorage to ensure perfect synchronization
      setLikedPosts(getLikedAnimeList());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // When selectedGenre is chosen, automatically activate genre tab and fetch
  useEffect(() => {
    if (selectedGenre) {
      setActiveTab("genre");
      fetchGenreData(selectedGenre, 1, true);
    }
  }, [selectedGenre, fetchGenreData]);

  // Tab change handler with history recording
  const handleTabChange = useCallback((newTab: "feed" | "latest" | "liked" | "genre") => {
    if (newTab === activeTabRef.current) {
      if (newTab === "feed") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        handleShuffleFeed();
      }
      return;
    }
    if (newTab !== "genre") {
      setSelectedGenre("");
    }
    setActiveTab(newTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      window.history.pushState({ anibook_tab: newTab }, "");
    } catch {
      // ignore
    }
  }, []);

  // Browser / Hardware Back Navigation & Exit Confirmation Interceptor
  useEffect(() => {
    try {
      window.history.replaceState({ anibook_root: true, anibook_tab: "feed" }, "");
      window.history.pushState({ anibook_page: "feed", anibook_tab: "feed" }, "");
    } catch {
      // ignore
    }

    const handlePopState = () => {
      // 1. If Exit Confirmation Modal is already visible, dismiss it
      if (showExitModalRef.current) {
        setShowExitModal(false);
        return;
      }

      // 2. If photo lightbox modal is open, its own popstate handler handles closing it
      if (selectedPhotoPostRef.current) {
        return;
      }

      // 3. If mobile sidebar is open, close sidebar
      if (isSidebarOpenRef.current && window.innerWidth < 1024) {
        setIsSidebarOpen(false);
        try {
          window.history.pushState({ anibook_page: activeTabRef.current, anibook_tab: activeTabRef.current }, "");
        } catch {}
        return;
      }

      // 4. If an active genre or search filter is set, clear it first
      if (selectedGenreRef.current) {
        setSelectedGenre("");
        setActiveTab("feed");
        try {
          window.history.pushState({ anibook_page: "feed", anibook_tab: "feed" }, "");
        } catch {}
        return;
      }
      if (searchQueryRef.current) {
        setSearchQuery("");
        try {
          window.history.pushState({ anibook_page: activeTabRef.current, anibook_tab: activeTabRef.current }, "");
        } catch {}
        return;
      }

      // 5. If user is currently on another tab, back navigation returns to 'feed'
      if (activeTabRef.current !== "feed") {
        setActiveTab("feed");
        try {
          window.history.pushState({ anibook_page: "feed", anibook_tab: "feed" }, "");
        } catch {}
        return;
      }

      // 6. If user is on 'feed' (the default root view), show the exit confirmation modal
      try {
        window.history.pushState({ anibook_page: "feed", anibook_tab: "feed" }, "");
      } catch {}
      setShowExitModal(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Exit application action
  const handleConfirmExit = () => {
    setShowExitModal(false);
    try {
      if (window.history.length > 2) {
        window.history.go(-2);
      } else {
        window.close();
      }
    } catch {
      window.close();
    }
  };

  // Dedicated Shuffle feed action
  const handleShuffleFeed = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      let targetPage = 1;
      if (activeTab === "feed") {
        targetPage = getRandomPage(maxTotalPages);
      } else if (activeTab === "genre" && selectedGenre) {
        targetPage = Math.floor(Math.random() * Math.min(5, genreTotalPages)) + 1;
        fetchGenreData(selectedGenre, targetPage, true);
        return;
      } else {
        targetPage = 1;
      }

      triggerToast(activeTab === "feed" ? "🎲 Shuffling random pages from 8,000+ anime..." : "🔄 Refreshing latest anime releases...");

      const response = await fetch(`/api/recent-anime?page=${targetPage}&per_page=10`);
      if (!response.ok) {
        throw new Error(`Proxy returned error status: ${response.status}`);
      }
      const resData: ApiResponse = await response.json();
      if (resData.ok && Array.isArray(resData.data)) {
        let formattedPosts = resData.data.map(formatAnimeToPost);
        if (activeTab === "feed") {
          formattedPosts = shuffleArray(formattedPosts);
          setFeedPosts(formattedPosts);
          setFeedHasMore(true);
        } else {
          setLatestPosts(formattedPosts);
          setLatestPage(2);
          if (resData.pagination) {
            setLatestHasMore(1 < resData.pagination.total_pages);
          } else {
            setLatestHasMore(resData.data.length > 0);
          }
        }
        preloadPostImages(formattedPosts);

        setTimeout(() => {
          fetchAnimeData(false, true);
        }, 300);
      }
    } catch (err: any) {
      setError(err.message || "Failed to refresh feed.");
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  // High-performance Infinite scroll Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingRef.current && posts.length > 0) {
          if (activeTab === "genre" && selectedGenre) {
            fetchGenreData(selectedGenre, genrePage + 1, false);
          } else if (activeTab === "feed" || activeTab === "latest") {
            fetchAnimeData(false, false);
          }
        }
      },
      { threshold: 0.01, rootMargin: "1200px" }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [hasMore, posts.length, activeTab, selectedGenre, genrePage, fetchAnimeData, fetchGenreData]);

  // Create local custom post from composer
  const handleCreatePostSubmit = (content: string, image?: string, tags?: string[]) => {
    const newCustomPost: Post = {
      id: `custom-${Date.now()}`,
      title: `${currentUser.name} (Creator)`,
      avatar: currentUser.avatar,
      isVerified: true,
      timestamp: "Just now",
      content: content,
      image: image || undefined,
      bannerImage: image || undefined,
      genreTags: tags || ["General"],
      studio: "Personal Timeline",
      isCustom: true,
      likesCount: 1,
      commentsCount: 0,
      sharesCount: 0,
      isLikedByUser: true,
      commentsList: []
    };

    setFeedPosts((prev) => [newCustomPost, ...prev]);
    setLatestPosts((prev) => [newCustomPost, ...prev]);
    triggerToast("✨ Your anime post was shared!");
  };

  // Interactive Like toggle handler with COOKIE PERSISTENCE
  const handleLikeToggle = (postId: string) => {
    // Look up target post across all active collections
    const allCollections = [...feedPosts, ...latestPosts, ...genrePosts, ...likedPosts];
    const targetPost = allCollections.find((p) => p.id === postId);
    if (!targetPost) return;

    // Toggle in cookies & storage
    const { isLiked, allLiked } = toggleAnimeLike(targetPost);
    setLikedPosts(allLiked);

    // Synchronize isLiked state across all post collections
    const updater = (prevPosts: Post[]) =>
      prevPosts.map((post) => {
        if (post.id === postId || (targetPost.slug && post.slug === targetPost.slug) || (post.title && post.title === targetPost.title)) {
          return {
            ...post,
            isLikedByUser: isLiked,
            likesCount: isLiked ? post.likesCount + 1 : Math.max(0, post.likesCount - 1)
          };
        }
        return post;
      });

    setFeedPosts(updater);
    setLatestPosts(updater);
    setGenrePosts(updater);

    if (selectedPhotoPost && (selectedPhotoPost.id === postId || selectedPhotoPost.title === targetPost.title)) {
      setSelectedPhotoPost({
        ...selectedPhotoPost,
        isLikedByUser: isLiked,
        likesCount: isLiked ? selectedPhotoPost.likesCount + 1 : Math.max(0, selectedPhotoPost.likesCount - 1)
      });
    }

    triggerToast(
      isLiked 
        ? `❤️ Liked "${targetPost.title}"! Saved in browser cookies.` 
        : `Removed "${targetPost.title}" from Liked Anime.`
    );
  };

  // Add Comment handler
  const handleAddComment = (postId: string, commentText: string) => {
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      text: commentText,
      timestamp: "Just now"
    };

    const updater = (prevPosts: Post[]) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            commentsList: [...post.commentsList, newComment],
            commentsCount: post.commentsCount + 1
          };
        }
        return post;
      });

    setFeedPosts(updater);
    setLatestPosts(updater);
    setGenrePosts(updater);
    triggerToast("💬 Comment posted!");
  };

  // Share post handler
  const handleShare = (postId: string) => {
    const updater = (prevPosts: Post[]) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            sharesCount: post.sharesCount + 1
          };
        }
        return post;
      });

    setFeedPosts(updater);
    setLatestPosts(updater);
    setGenrePosts(updater);
    triggerToast("🌐 Shared to your AniBook timeline!");
  };

  // Open full episode details modal from Reel selection
  const handleSelectAnimeFromReel = (reel: any) => {
    const existingPost = posts.find((p) => 
      (reel.slug && p.slug === reel.slug) || 
      (reel.ani_id && p.ani_id === reel.ani_id) || 
      p.id === String(reel.originalId)
    );

    if (existingPost) {
      setSelectedEpisodeForModal(null);
      setSelectedPhotoPost(existingPost);
    } else {
      const likedIds = getLikedAnimeIds();
      const isLiked = likedIds.has(String(reel.originalId || reel.id)) || (reel.slug && likedIds.has(reel.slug)) || likedIds.has(reel.title);

      const postFromReel: Post = {
        id: reel.originalId ? String(reel.originalId) : reel.id,
        slug: reel.slug || undefined,
        title: reel.title,
        avatar: reel.poster || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=100&q=80",
        isVerified: reel.status === "Currently Airing",
        timestamp: "Airing now",
        content: `Stream and watch full high-definition episodes of ${reel.title} on AniBook!`,
        image: reel.backdrop || reel.poster,
        bannerImage: reel.backdrop,
        backdrop: reel.backdrop,
        posterImage: reel.poster,
        mal_id: reel.mal_id || undefined,
        ani_id: reel.ani_id || undefined,
        genreTags: reel.genres || [],
        studio: reel.studio || "AniBook Studio",
        isCustom: false,
        likesCount: 150,
        commentsCount: 2,
        sharesCount: 15,
        isLikedByUser: isLiked,
        commentsList: [
          {
            id: `${reel.id}-c1`,
            authorName: "Son Goku",
            authorAvatar: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=80&q=80",
            text: `Whoa! ${reel.title} looks so strong! Let's check out the animation! 🥊`,
            timestamp: "2h ago"
          }
        ],
        type: "ONA",
        episodes: "?",
        status: reel.status || "Currently Airing"
      };
      setSelectedEpisodeForModal(null);
      setSelectedPhotoPost(postFromReel);
    }
  };

  // Close photo modal callback
  const handleClosePhotoModal = useCallback(() => {
    setSelectedPhotoPost(null);
    setSelectedEpisodeForModal(null);
  }, []);

  // Filter posts based on search query
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-gray-900 font-sans flex flex-col w-full overflow-x-hidden">
      {/* Top Header Navigation (AniBook, Search, Avatar, Sidebar Toggle, Settings) */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentUser={currentUser}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onLogoClick={() => handleTabChange("feed")}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onTabSelect={handleTabChange}
      />

      {/* Main Centered Content Layout */}
      <div className="flex-1 flex w-full relative min-w-0 max-w-full pt-14">
        
        {/* Toggleable Left Sidebar */}
        <SidebarLeft
          currentUser={currentUser}
          selectedGenre={selectedGenre}
          setSelectedGenre={setSelectedGenre}
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          likedCount={likedPosts.length}
          reelSettings={reelSettings}
          onUpdateReelSettings={handleUpdateReelSettings}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onRefreshFeed={handleShuffleFeed}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Center Main Anime Feed (Centered on screen, auto-adjusting) */}
        <main className={`flex-1 w-full max-w-2xl mx-auto px-2.5 sm:px-4 py-3 sm:py-6 space-y-3.5 sm:space-y-5 flex flex-col min-w-0 min-h-[calc(100vh-3.5rem)] box-border transition-all duration-300 ${
          isSidebarOpen ? "lg:ml-72" : ""
        }`}>
          
          {/* Stories reel (hidden on Liked Anime view for focus) */}
          {activeTab !== "liked" && <Stories currentUser={currentUser} />}

          {/* Create Post composer */}
          {activeTab === "feed" && (
            <CreatePost
              currentUser={currentUser}
              onSubmitPost={handleCreatePostSubmit}
            />
          )}

          {/* Dedicated Liked Anime Header Banner */}
          {activeTab === "liked" && (
            <div className="bg-gradient-to-r from-rose-500 via-pink-600 to-purple-600 rounded-2xl p-4 sm:p-5 text-white shadow-md flex items-center justify-between min-w-0 animate-fade-in">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Heart className="w-5 h-5 fill-white text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-extrabold text-base sm:text-lg leading-tight truncate">
                      My Liked Anime
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 bg-white/25 rounded-full font-bold uppercase tracking-wider">
                      {likedPosts.length} Saved
                    </span>
                  </div>
                  <p className="text-[11px] text-white/90 font-medium truncate">
                    Saved in browser cookies · Persists across reloads
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleTabChange("feed")}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl backdrop-blur-xs transition-colors shrink-0 cursor-pointer"
              >
                Back to Feed
              </button>
            </div>
          )}

          {/* Active Genre Guild Banner with API Info & Random Switcher */}
          {activeTab === "genre" && selectedGenre && (
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-3.5 sm:p-4 text-white shadow-md flex items-center justify-between min-w-0 animate-fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-lg shrink-0">
                  {ALL_GENRES.find((g) => g.genre.toLowerCase() === selectedGenre.toLowerCase())?.emoji || "🎭"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-extrabold text-sm sm:text-base capitalize leading-tight truncate">
                      {selectedGenre} Anime
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded-full font-bold uppercase tracking-wider">
                      API Verified
                    </span>
                  </div>
                  <p className="text-[11px] text-white/80 font-medium truncate">
                    Curated {selectedGenre} feed · Page {genrePage} of {genreTotalPages}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  onClick={() => {
                    const available = ALL_GENRES.filter((g) => g.genre !== selectedGenre);
                    const randomPick = available[Math.floor(Math.random() * available.length)] || ALL_GENRES[0];
                    setSelectedGenre(randomPick.genre);
                  }}
                  className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold rounded-lg backdrop-blur-xs transition-colors flex items-center gap-1 cursor-pointer"
                  title="Generate another random genre"
                >
                  <Dices className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Random</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedGenre("");
                    setActiveTab("feed");
                  }}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Search results summary */}
          {searchQuery && (
            <div className="bg-white rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-600 shadow-xs border border-gray-200/80 min-w-0 truncate">
              Found {filteredPosts.length} results matching "{searchQuery}"
            </div>
          )}

          {/* Initial Loading Skeleton */}
          {loading && posts.length === 0 && (
            <FeedSkeleton count={3} />
          )}

          {/* Empty State for Liked Anime tab */}
          {activeTab === "liked" && likedPosts.length === 0 && !loading && (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center flex flex-col items-center gap-3 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-2xs">
                <Heart className="w-7 h-7 fill-rose-500 text-rose-500 animate-pulse" />
              </div>
              <h3 className="font-bold text-gray-900 text-base sm:text-lg">No Liked Anime Yet</h3>
              <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                Browse through the Feed, Latest releases, or generated Genres and tap <strong>Like Anime</strong> on any card to save your favorite anime permanently in your cookies!
              </p>
              <div className="flex gap-2.5 mt-2">
                <button
                  onClick={() => handleTabChange("feed")}
                  className="px-4 py-2 bg-[#1877F2] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Explore Feed
                </button>
                <button
                  onClick={() => {
                    const randomGenre = ALL_GENRES[Math.floor(Math.random() * ALL_GENRES.length)].genre;
                    setSelectedGenre(randomGenre);
                    setActiveTab("genre");
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Generate Genre</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Feed Cards stream with Facebook-style Reels carousel embedded */}
          {filteredPosts.length > 0 && (
            <div className="space-y-3.5 sm:space-y-4 flex flex-col w-full min-w-0" id="cards-stream-container">
              {filteredPosts.map((post, index) => {
                // Check if single random reel card should be injected (e.g. every 5 items in Feed/Latest)
                const isSingleReelPosition = 
                  reelSettings.enabled && 
                  (activeTab === "feed" || activeTab === "latest") && 
                  (index + 1) % reelSettings.frequency === 0;

                return (
                  <React.Fragment key={post.id}>
                    <PostCard
                      post={post}
                      currentUser={currentUser}
                      onLikeToggle={handleLikeToggle}
                      onAddComment={handleAddComment}
                      onShare={handleShare}
                      onImageClick={(p) => {
                        setSelectedEpisodeForModal(null);
                        setSelectedPhotoPost(p);
                      }}
                      onSelectEpisode={(p, ep) => {
                        setSelectedEpisodeForModal(ep);
                        setSelectedPhotoPost(p);
                      }}
                    />

                    {/* Single Video Reel Discovery Card (Random page / 1-item stream video) */}
                    {isSingleReelPosition && (
                      <SingleReelFeedCard
                        key={`single-reel-feed-card-${post.id}-${index}`}
                        cardIndex={index}
                        maxTotalPages={maxTotalPages}
                        reelSettings={reelSettings}
                        currentUser={currentUser}
                        onLikeToggle={handleLikeToggle}
                        onAddComment={handleAddComment}
                        onShare={handleShare}
                        onWatchFull={(p) => {
                          setSelectedEpisodeForModal(null);
                          setSelectedPhotoPost(p);
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}

              {/* Fallback placement if less than 2 posts in feed */}
              {activeTab === "feed" && filteredPosts.length < 2 && filteredPosts.length > 0 && (
                <ReelsSection 
                  key="reels-fallback-single"
                  pageNumber={1}
                  currentUser={currentUser}
                  onSelectAnime={handleSelectAnimeFromReel}
                />
              )}
            </div>
          )}

          {/* Error fallback notifier */}
          {error && posts.length === 0 && (
            <div className="bg-white border-2 border-red-100 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center gap-3 w-full">
              <AlertTriangle className="h-10 w-10 text-red-500 animate-bounce" />
              <h4 className="font-bold text-gray-900">Unable to load anime feed</h4>
              <p className="text-xs text-gray-500 max-w-sm">
                The anime API is temporarily unavailable. Please retry.
              </p>
              <button
                onClick={() => activeTab === "genre" ? fetchGenreData(selectedGenre, 1, true) : fetchAnimeData(true)}
                className="h-9 px-4 bg-[#1877F2] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Syncing
              </button>
            </div>
          )}

          {/* Infinite Scroll / Lazy Loading Sentinel Detector */}
          {activeTab !== "liked" && (
            <div
              ref={sentinelRef}
              className="w-full py-6 flex justify-center items-center select-none min-w-0"
              id="lazy-load-sentinel"
            >
              {loading ? (
                <div className="flex flex-col items-center gap-2 text-gray-500 text-xs font-semibold">
                  <RefreshCw className="h-6 w-6 text-[#1877F2] animate-spin" />
                  <span>Loading {activeTab === "genre" ? `${selectedGenre} anime...` : activeTab === "feed" ? "random anime discoveries..." : "more releases..."}</span>
                </div>
              ) : hasMore ? (
                <div className="h-[2px] w-full bg-transparent" />
              ) : (
                <div className="text-center text-xs font-bold text-gray-400 py-4 uppercase tracking-wider">
                  🎉 You've reached the end of the {activeTab === "genre" ? `${selectedGenre} genre` : "recent"} anime feed!
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Facebook Style Photo Lightbox Modal */}
      <AnimatePresence>
        {selectedPhotoPost && (
          <FacebookPhotoModal
            key="facebook-photo-modal"
            post={selectedPhotoPost}
            allPosts={posts}
            currentUser={currentUser}
            onClose={handleClosePhotoModal}
            onLikeToggle={handleLikeToggle}
            onAddComment={handleAddComment}
            onShare={handleShare}
            onSelectPost={(post) => setSelectedPhotoPost(post)}
            initialEpisode={selectedEpisodeForModal}
          />
        )}
      </AnimatePresence>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitModal && (
          <ExitConfirmModal
            key="exit-confirm-modal"
            isOpen={showExitModal}
            onClose={() => setShowExitModal(false)}
            onConfirmExit={handleConfirmExit}
          />
        )}
      </AnimatePresence>

      {/* Preferences & Reel Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <SettingsModal
            key="settings-modal"
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            reelSettings={reelSettings}
            onUpdateReelSettings={handleUpdateReelSettings}
            onRefreshFeed={handleShuffleFeed}
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>

      {/* Floating Micro Toast notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key="toast-notification"
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 15, x: "-50%" }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-4 left-1/2 z-50 bg-gray-900/95 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-white/10 text-xs font-semibold max-w-[90vw] truncate"
          >
            <div className="bg-blue-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px] shrink-0">✨</div>
            <span className="truncate">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
