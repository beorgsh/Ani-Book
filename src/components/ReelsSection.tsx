import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import { 
  Film, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Loader2 
} from "lucide-react";
import ReelPlayerModal from "./ReelPlayerModal";

export interface ReelItem {
  id: string;
  originalId: string | number;
  slug?: string;
  title: string;
  poster: string;
  backdrop: string;
  ani_id?: string;
  mal_id?: string;
  genres?: string[];
  studio?: string;
  status?: string;
  views: string;
  likes: string;
  page?: number;
}

interface ReelsSectionProps {
  key?: React.Key;
  currentUser: { name: string; avatar: string };
  pageNumber?: number;
  title?: string;
  onSelectAnime?: (reel: ReelItem) => void;
}

export default function ReelsSection({ 
  currentUser, 
  pageNumber = 1,
  title = "Reels and short videos",
  onSelectAnime
}: ReelsSectionProps) {
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalQueue, setModalQueue] = useState<ReelItem[] | null>(null);
  const [modalActiveIndex, setModalActiveIndex] = useState<number>(0);
  const [likedReels, setLikedReels] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [activeComments, setActiveComments] = useState<Record<string, { id: string; author: string; text: string; time: string }[]>>({});
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadedPagesRef = useRef<Set<number>>(new Set());

  // Helper to fetch random reels from backend
  const fetchReelsBatch = useCallback(async (targetPage?: number) => {
    if (loading) return;
    setLoading(true);

    try {
      // Pick page based on targetPage, prop pageNumber, or random page
      let chosenPage = targetPage || (loadedPagesRef.current.size === 0 ? pageNumber : Math.floor(Math.random() * 20) + 1);
      let attempts = 0;
      while (loadedPagesRef.current.has(chosenPage) && attempts < 5) {
        chosenPage = Math.floor(Math.random() * 25) + 1;
        attempts++;
      }
      loadedPagesRef.current.add(chosenPage);

      const res = await fetch(`/api/random-reels?page=${chosenPage}&per_page=8`);
      if (!res.ok) throw new Error("Failed to load reels batch");
      const json = await res.json();

      if (json.ok && Array.isArray(json.reels) && json.reels.length > 0) {
        setReels((prev) => {
          // Filter duplicates
          const existingIds = new Set(prev.map((r) => r.originalId));
          const newItems = json.reels.filter((r: ReelItem) => !existingIds.has(r.originalId));
          return [...prev, ...(newItems.length > 0 ? newItems : json.reels)];
        });

        // Append newly fetched reels to active modal lineup if open
        setModalQueue((prev) => {
          if (!prev) return null;
          const existingIds = new Set(prev.map((r) => r.originalId));
          const newItems = json.reels.filter((r: ReelItem) => !existingIds.has(r.originalId));
          return [...prev, ...(newItems.length > 0 ? newItems : json.reels)];
        });
      }
    } catch (err) {
      console.warn("[REELS] Error loading reels batch:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, pageNumber]);

  // Initial load
  useEffect(() => {
    // Pick a random page from 1 to 25 to ensure randomized, fresh anime reels on every single reload
    const initialRandomPage = Math.floor(Math.random() * 25) + 1;
    fetchReelsBatch(initialRandomPage);
  }, []);

  // Handle horizontal scroll to load more reels seamlessly as user scrolls
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container || loading) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    if (scrollLeft + clientWidth >= scrollWidth - 300) {
      fetchReelsBatch();
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  const handleToggleLikeReel = (reelId: string) => {
    setLikedReels((prev) => {
      const isCurrentlyLiked = !!prev[reelId];
      const newStatus = !isCurrentlyLiked;
      
      setLikeCounts((cPrev) => {
        const currentCount = cPrev[reelId] || 120;
        return {
          ...cPrev,
          [reelId]: newStatus ? currentCount + 1 : Math.max(0, currentCount - 1)
        };
      });

      return { ...prev, [reelId]: newStatus };
    });
  };

  const handleAddReelComment = (reelId: string, commentText: string) => {
    if (!commentText.trim()) return;

    const newComment = {
      id: `comment-${Date.now()}`,
      author: currentUser.name,
      text: commentText.trim(),
      time: "Just now"
    };

    setActiveComments((prev) => ({
      ...prev,
      [reelId]: [...(prev[reelId] || []), newComment]
    }));
  };

  const handleOpenReel = (clickedIdx: number) => {
    // Slices from clicked index so clicked reel plays first (Index 0), followed by remaining queue
    const slicedQueue = reels.slice(clickedIdx);
    setModalQueue(slicedQueue);
    setModalActiveIndex(0);
  };

  if (reels.length === 0 && !loading) {
    return null;
  }

  return (
    <>
      {/* Facebook Reels Carousel Section */}
      <div 
        className="w-full max-w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-2.5 sm:p-3.5 select-none min-w-0 box-border overflow-hidden" 
        id="reels-and-short-videos-section"
      >
        {/* Header with Title, Icon & Navigation controls */}
        <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-gray-100 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-amber-500 flex items-center justify-center text-white shadow-xs shrink-0">
              <Film className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight truncate flex items-center gap-1.5">
                {title}
                <span className="bg-red-50 text-red-600 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border border-red-100">
                  {pageNumber > 1 ? `Reels • Batch #${pageNumber}` : "Video.js M3U8"}
                </span>
              </h3>
              <p className="text-[11px] text-gray-500 font-medium truncate">
                Stream trending anime scenes & episodes in high quality
              </p>
            </div>
          </div>

          {/* Left / Right Carousel Arrow Navigation */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={scrollLeft}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={scrollRight}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Horizontal Slides Carousel */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-2.5 sm:gap-3 overflow-x-auto pt-2.5 sm:pt-3 pb-1.5 sm:pb-2.5 scrollbar-none snap-x snap-mandatory min-w-0"
          id="reels-slides-carousel"
        >
          {reels.map((reel, idx) => (
            <div
              key={reel.id}
              onClick={() => handleOpenReel(idx)}
              className="relative flex flex-col w-36 h-60 sm:w-44 sm:h-72 shrink-0 rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 bg-gray-950 snap-start border border-gray-100"
            >
              {/* Reel Media / Recent Anime Poster */}
              <img
                src={reel.poster || reel.backdrop}
                alt={reel.title}
                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-out"
                referrerPolicy="no-referrer"
                loading="lazy"
              />

              {/* Dynamic Gradient Shading */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90 pointer-events-none" />

              {/* Top View Count Pill */}
              <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10">
                <Play className="h-2.5 w-2.5 fill-white text-white" />
                <span>{reel.views}</span>
              </div>

              {/* Play Badge Icon Center on Hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="w-11 h-11 rounded-full bg-[#1877F2]/90 text-white flex items-center justify-center shadow-xl backdrop-blur-xs transform scale-90 group-hover:scale-100 transition-transform">
                  <Play className="h-5 w-5 fill-white ml-0.5" />
                </div>
              </div>

              {/* Bottom Reel Details info */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 pointer-events-none flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full border border-white/80 overflow-hidden shrink-0 bg-gray-800">
                    <img
                      src={reel.poster || reel.backdrop}
                      alt={reel.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-blue-300 truncate">
                    {reel.studio || "Anime Official"}
                  </span>
                </div>

                <h4 className="text-[11px] sm:text-xs font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
                  {reel.title}
                </h4>

                {reel.genres && reel.genres.length > 0 && (
                  <span className="text-[9px] text-gray-300 font-semibold truncate">
                    #{reel.genres[0]} · Video.js Stream
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator at end of horizontal scroll */}
          {loading && (
            <div className="w-36 h-60 sm:w-44 sm:h-72 shrink-0 rounded-2xl bg-gray-100 flex flex-col items-center justify-center text-gray-400 gap-2 border border-gray-200 animate-pulse">
              <Loader2 className="h-6 w-6 animate-spin text-[#1877F2]" />
              <span className="text-[11px] font-semibold text-gray-500">Loading reels...</span>
            </div>
          )}
        </div>
      </div>

      {/* Video.js M3U8 Stream Fullscreen Reel Viewer Modal */}
      <AnimatePresence>
        {modalQueue !== null && modalQueue.length > 0 && (
          <ReelPlayerModal
            key="reel-player-fullscreen-modal"
            reels={modalQueue}
            activeIndex={modalActiveIndex}
            onIndexChange={setModalActiveIndex}
            currentUser={currentUser}
            onClose={() => setModalQueue(null)}
            onFetchMoreReels={fetchReelsBatch}
            likedReels={likedReels}
            likeCounts={likeCounts}
            onToggleLike={handleToggleLikeReel}
            activeComments={activeComments}
            onAddComment={handleAddReelComment}
            onWatchFull={onSelectAnime}
          />
        )}
      </AnimatePresence>
    </>
  );
}
