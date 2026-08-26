import React, { useState, useEffect, useRef, useCallback } from "react";
import Header from "./components/Header";
import SidebarLeft from "./components/SidebarLeft";
import Stories from "./components/Stories";
import CreatePost from "./components/CreatePost";
import PostCard from "./components/PostCard";
import ReelsSection from "./components/ReelsSection";
import FeedSkeleton from "./components/FeedSkeleton";
import FacebookPhotoModal from "./components/FacebookPhotoModal";
import { Post, Comment, ApiResponse, AnimeItem, AnimeEpisode } from "./types";
import { Sparkles, RefreshCw, AlertTriangle, Shuffle, Clock, Compass } from "lucide-react";

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
  const defaultAvatar = "https://api.dicebear.com/7.x/adventurer/png?seed=OtakuExplorer_MainUser&backgroundColor=b6e3f4";
  if (typeof window === "undefined") return defaultAvatar;
  try {
    // 1. Check cookies
    const cookieMatch = document.cookie.match(/(?:^|; )anibook_user_avatar=([^;]*)/);
    if (cookieMatch && cookieMatch[1]) {
      const stored = decodeURIComponent(cookieMatch[1]);
      return stored.includes("backgroundColor") ? stored : `${stored}&backgroundColor=b6e3f4`;
    }
    // 2. Check sessionStorage
    const sessionAvatar = sessionStorage.getItem("anibook_user_avatar");
    if (sessionAvatar) {
      return sessionAvatar.includes("backgroundColor") ? sessionAvatar : `${sessionAvatar}&backgroundColor=b6e3f4`;
    }

    // 3. Check localStorage
    const localAvatar = localStorage.getItem("anibook_user_avatar");
    if (localAvatar) {
      return localAvatar.includes("backgroundColor") ? localAvatar : `${localAvatar}&backgroundColor=b6e3f4`;
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
  // Main content active tab: "feed" (default with random pages & shuffle) vs "latest" (chronological)
  const [activeTab, setActiveTab] = useState<"feed" | "latest">("feed");
  
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);
  const [feedHasMore, setFeedHasMore] = useState<boolean>(true);
  const [latestHasMore, setLatestHasMore] = useState<boolean>(true);

  // Derived active state
  const posts = activeTab === "feed" ? feedPosts : latestPosts;
  const hasMore = activeTab === "feed" ? feedHasMore : latestHasMore;

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination bounds & tracking
  const [maxTotalPages, setMaxTotalPages] = useState<number>(890); // default based on ~8,900 anime library
  const [latestPage, setLatestPage] = useState<number>(1);
  const usedFeedPages = useRef<Set<number>>(new Set());

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

  const [currentUser] = useState({
    name: "Otaku Explorer",
    avatar: getStoredUserAvatar(),
  });

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Show temporary toast alert
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Convert raw API recent anime item into AniBook styled Post
  const formatAnimeToPost = (item: AnimeItem): Post => {
    const studioList = item.terms_by_type?.studios || item.terms_by_type?.producers || [];
    const studioName = studioList.length > 0 ? studioList[0] : "AniBook Studio";

    // Landscape backdrop detection:
    // 1. If background_image from JSON is a non-empty string, use it
    // 2. Otherwise use ani_id from JSON to fetch the AniList backdrop (https://img.anili.st/media/{ani_id})
    const rawBg = item.background_image && item.background_image.trim().length > 0 ? item.background_image.trim() : undefined;
    const aniIdStr = item.ani_id ? item.ani_id.toString().trim() : undefined;
    const anilistBackdrop = aniIdStr && !isNaN(Number(aniIdStr)) && Number(aniIdStr) > 0 ? `https://img.anili.st/media/${aniIdStr}` : undefined;
    const landscapeBackdrop = rawBg || item.backdrop || anilistBackdrop || item.banner_image || (item as any).banner || undefined;
    const fallbackPoster = item.poster || (item as any).cover || (item as any).image || (item as any).thumbnail || "";

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
      isLikedByUser: false,
      commentsList: presetComments,
      type: item.terms_by_type?.type?.[0] || "ONA",
      episodes: item.episodes || "?",
      status: item.status || "Currently Airing",
      is_sub: item.is_sub !== undefined ? item.is_sub : (item.episodes && !isNaN(Number(item.episodes)) ? Number(item.episodes) : (item.id === 21 ? 1175 : 24)),
      is_dub: (item as any).is_dub !== undefined ? (item as any).is_dub : (item.id === 21 ? 1175 : (item.id % 2 === 0 ? 12 : undefined)),
      year: item.year || (item.aired ? item.aired.match(/\d{4}/)?.[0] : "2026"),
      aired: item.aired || (item.year ? String(item.year) : "2026")
    };
  };

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

  // Primary API Data Fetching loop: supports Random Pages & Shuffling (Feed) or Chronological (Latest)
  const fetchAnimeData = useCallback(async (isInitial: boolean = false) => {
    if (loading) return;
    setLoading(true);
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

        // Update total pages available from pagination metadata
        if (resData.pagination?.total_pages) {
          setMaxTotalPages(resData.pagination.total_pages);
        }

        if (activeTab === "feed") {
          setFeedPosts((prevPosts) => {
            if (isInitial) {
              return formattedPosts;
            }
            const existingIds = new Set(prevPosts.map((p) => p.id));
            const uniqueNewPosts = formattedPosts.filter((p) => !existingIds.has(p.id));
            return [...prevPosts, ...uniqueNewPosts];
          });
          setFeedHasMore(true);
        } else {
          setLatestPosts((prevPosts) => {
            if (isInitial) {
              return formattedPosts;
            }
            const existingIds = new Set(prevPosts.map((p) => p.id));
            const uniqueNewPosts = formattedPosts.filter((p) => !existingIds.has(p.id));
            return [...prevPosts, ...uniqueNewPosts];
          });
          setLatestPage(targetPage + 1);
          if (resData.pagination) {
            setLatestHasMore(targetPage < resData.pagination.total_pages);
          } else {
            setLatestHasMore(resData.data.length > 0);
          }
        }
      } else {
        throw new Error(resData.error || "Malformed API response structure.");
      }
    } catch (err: any) {
      console.error("[FETCH ANIME ERROR]", err);
      setError(err.message || "Failed to sync anime feed.");
      if (isInitial) {
        if (activeTab === "feed") {
          setFeedHasMore(false);
        } else {
          setLatestHasMore(false);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, latestPage, maxTotalPages, loading]);

  // When activeTab changes, load initial batch if empty
  useEffect(() => {
    const currentPosts = activeTab === "feed" ? feedPosts : latestPosts;
    if (currentPosts.length === 0) {
      fetchAnimeData(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Handler to manually randomize / shuffle feed
  const handleShuffleFeed = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      let targetPage = 1;
      if (activeTab === "feed") {
        usedFeedPages.current.clear();
        targetPage = getRandomPage(maxTotalPages);
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
      }
    } catch (err: any) {
      setError(err.message || "Failed to refresh feed.");
    } finally {
      setLoading(false);
    }
  };

  // Infinite scroll Intersection Observer hook
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && posts.length > 0) {
          fetchAnimeData(false);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
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
  }, [hasMore, loading, posts.length, fetchAnimeData]);

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

  // Interactive Like toggle handler
  const handleLikeToggle = (postId: string) => {
    const updater = (prevPosts: Post[]) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const nextLiked = !post.isLikedByUser;
          return {
            ...post,
            isLikedByUser: nextLiked,
            likesCount: nextLiked ? post.likesCount + 1 : post.likesCount - 1
          };
        }
        return post;
      });

    setFeedPosts(updater);
    setLatestPosts(updater);
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
    triggerToast("🌐 Shared to your AniBook timeline!");
  };

  // Open full episode details modal from Reel selection
  const handleSelectAnimeFromReel = (reel: any) => {
    // 1. Check if we already have a loaded post matching by slug, ani_id, or original id
    const existingPost = posts.find((p) => 
      (reel.slug && p.slug === reel.slug) || 
      (reel.ani_id && p.ani_id === reel.ani_id) || 
      p.id === String(reel.originalId)
    );

    if (existingPost) {
      setSelectedEpisodeForModal(null);
      setSelectedPhotoPost(existingPost);
    } else {
      // 2. Build a complete compatible Post object on the fly using Reel data
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
        isLikedByUser: false,
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

  // Filter posts based on search query AND selected sidebar shortcut
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGenre = selectedGenre
      ? post.genreTags.some((g) => g.toLowerCase() === selectedGenre.toLowerCase())
      : true;

    return matchesSearch && matchesGenre;
  });

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-gray-900 font-sans flex flex-col w-full overflow-x-hidden">
      {/* Top Header Navigation (AniBook, Search, Avatar, Sidebar Toggle) */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentUser={currentUser}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Centered Content Layout */}
      <div className="flex-1 flex w-full relative min-w-0 max-w-full pt-14">
        
        {/* Toggleable Left Sidebar */}
        <SidebarLeft
          currentUser={currentUser}
          selectedGenre={selectedGenre}
          setSelectedGenre={setSelectedGenre}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onRefreshFeed={handleShuffleFeed}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Center Main Anime Feed (Centered on screen, auto-adjusting) */}
        <main className={`flex-1 w-full max-w-2xl mx-auto px-2.5 sm:px-4 py-3 sm:py-6 space-y-3.5 sm:space-y-5 flex flex-col min-w-0 min-h-[calc(100vh-3.5rem)] box-border transition-all duration-300 ${
          isSidebarOpen ? "lg:ml-72" : ""
        }`}>
          
          {/* Stories reel */}
          <Stories currentUser={currentUser} />

          {/* Create Post composer */}
          <CreatePost
            currentUser={currentUser}
            onSubmitPost={handleCreatePostSubmit}
          />

          {/* Quick Active Filter Pill indicator if selected */}
          {selectedGenre && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-xs animate-fade-in min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-4 w-4 text-[#1877F2] shrink-0 animate-pulse" />
                <span className="text-xs font-semibold text-[#1877F2] truncate">
                  Guild: <strong className="font-bold uppercase">{selectedGenre}</strong>
                </span>
              </div>
              <button
                onClick={() => setSelectedGenre("")}
                className="text-[11px] bg-white border border-blue-200 hover:bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 ml-2"
              >
                Clear
              </button>
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

          {/* Main Feed Cards stream with Facebook-style Reels carousel embedded */}
          {filteredPosts.length > 0 && (
            <div className="space-y-3.5 sm:space-y-4 flex flex-col w-full min-w-0" id="cards-stream-container">
              {filteredPosts.map((post, index) => {
                // Symmetrical & pseudo-randomized placement based on gaps of 3, 5, 7 posts
                const reelConfig = reelsPositions.find((p) => p.index === index);
                const isReelsPosition = !!reelConfig;
                const reelPageNumber = reelConfig ? reelConfig.page : 1;

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
                    {/* Embed Reels Section across feed pages with different reel batches */}
                    {isReelsPosition && (
                      <ReelsSection 
                        key={`reels-feed-batch-${reelPageNumber}`}
                        pageNumber={reelPageNumber}
                        currentUser={currentUser}
                        title={reelPageNumber === 1 ? "Reels and short videos" : "Explore more anime reels"}
                        onSelectAnime={handleSelectAnimeFromReel}
                      />
                    )}
                  </React.Fragment>
                );
              })}

              {/* Fallback placement if less than 2 posts */}
              {filteredPosts.length < 2 && filteredPosts.length > 0 && (
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
                onClick={() => fetchAnimeData(true)}
                className="h-9 px-4 bg-[#1877F2] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Syncing
              </button>
            </div>
          )}

          {/* Infinite Scroll / Lazy Loading Sentinel Detector */}
          <div
            ref={sentinelRef}
            className="w-full py-6 flex justify-center items-center select-none min-w-0"
            id="lazy-load-sentinel"
          >
            {loading ? (
              <div className="flex flex-col items-center gap-2 text-gray-500 text-xs font-semibold">
                <RefreshCw className="h-6 w-6 text-[#1877F2] animate-spin" />
                <span>Loading {activeTab === "feed" ? "random anime discoveries" : "more recent releases"}...</span>
              </div>
            ) : hasMore ? (
              <div className="h-[2px] w-full bg-transparent" />
            ) : (
              <div className="text-center text-xs font-bold text-gray-400 py-4 uppercase tracking-wider">
                🎉 You've reached the end of the recent anime feed!
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Facebook Style Photo Lightbox Modal */}
      {selectedPhotoPost && (
        <FacebookPhotoModal
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

      {/* Floating Micro Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-white/10 animate-slide-up text-xs font-semibold max-w-[90vw] truncate">
          <div className="bg-blue-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px] shrink-0">✨</div>
          <span className="truncate">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

