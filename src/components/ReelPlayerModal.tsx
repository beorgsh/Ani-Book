import React, { useState, useEffect, useRef, useCallback } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { 
  ArrowLeft, 
  X, 
  Heart, 
  MessageSquare, 
  Share2, 
  Sparkles, 
  ChevronUp, 
  ChevronDown, 
  Loader2, 
  AlertCircle, 
  Play, 
  ExternalLink, 
  Check,
  Film
} from "lucide-react";
import { ReelItem } from "./ReelsSection";

interface ReelPlayerModalProps {
  reels: ReelItem[];
  activeIndex: number;
  onIndexChange: (newIndex: number) => void;
  currentUser: { name: string; avatar: string };
  onClose: () => void;
  onFetchMoreReels?: () => void;
  likedReels: Record<string, boolean>;
  likeCounts: Record<string, number>;
  onToggleLike: (reelId: string) => void;
  activeComments: Record<string, { id: string; author: string; text: string; time: string }[]>;
  onAddComment: (reelId: string, text: string) => void;
  onWatchFull?: (reel: ReelItem) => void;
}

interface StreamResponse {
  success: boolean;
  data?: {
    m3u8: string;
    referer?: string;
    intro?: { start: number; end: number };
    outro?: { start: number; end: number };
    subtitles?: {
      file: string;
      label: string;
      kind: string;
      default?: boolean;
    }[];
  };
  error?: string;
}

// Global in-memory cache for resolved stream responses so pre-fetched streams play instantly
const streamCache = new Map<string, StreamResponse["data"]>();

async function prefetchStream(slug: string) {
  if (!slug || streamCache.has(slug)) return;
  try {
    const res = await fetch(`/api/stream?id=${encodeURIComponent(slug)}&server=hd-1&ep=1&type=sub`);
    if (res.ok) {
      const json: StreamResponse = await res.json();
      if (json.success && json.data?.m3u8) {
        streamCache.set(slug, json.data);
      }
    }
  } catch {
    // Ignore prefetch network errors
  }
}

// Reliable fallback poster image if poster/backdrop is missing
const FALLBACK_POSTER = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80";

// Format seconds to mm:ss
function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function ReelPlayerModal({
  reels,
  activeIndex,
  onIndexChange,
  currentUser,
  onClose,
  onFetchMoreReels,
  likedReels,
  likeCounts,
  onToggleLike,
  activeComments,
  onAddComment,
  onWatchFull
}: ReelPlayerModalProps) {
  const currentReel = reels[activeIndex] || reels[0];
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isCommentsOpen, setIsCommentsOpen] = useState<boolean>(false);
  const [commentInput, setCommentInput] = useState<string>("");

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Handle phone back button / swipe back gesture without leaving website
  useEffect(() => {
    try {
      window.history.pushState({ modal: "anibook_reel_modal" }, "");
    } catch {
      // ignore
    }

    const handlePopState = () => {
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Lock body scroll only while modal is mounted
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevDocOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowUp") {
        if (activeIndex > 0) {
          onIndexChange(activeIndex - 1);
        }
      } else if (e.key === "ArrowDown") {
        if (activeIndex < reels.length - 1) {
          onIndexChange(activeIndex + 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevDocOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, activeIndex, reels.length, onIndexChange]);

  // Programmatically scroll container when activeIndex changes via buttons / keys
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const targetEl = document.getElementById(`reel-card-${activeIndex}`);
    if (targetEl) {
      const currentScrollTop = container.scrollTop;
      const targetOffsetTop = targetEl.offsetTop;

      // ONLY programmatically scroll if we aren't already aligned with the target's scroll offset.
      // This completely eliminates the programmatic scroll-snapping fight that causes bounce & shake.
      if (Math.abs(currentScrollTop - targetOffsetTop) > 10) {
        isProgrammaticScrollRef.current = true;
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });

        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 500);
      }
    }

    // Prefetch stream for next reel in queue
    if (activeIndex + 1 < reels.length) {
      const nextItem = reels[activeIndex + 1];
      const nextSlug = nextItem.slug || (typeof nextItem.originalId === "string" ? nextItem.originalId : "") || nextItem.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      prefetchStream(nextSlug);
    }

    // Load more reels if close to bottom
    if (activeIndex >= reels.length - 2 && onFetchMoreReels) {
      onFetchMoreReels();
    }
  }, [activeIndex, reels, onFetchMoreReels]);

  // Handle native user scrolling in the vertical snap container
  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerHeight = container.clientHeight;
    if (containerHeight === 0) return;

    const scrollTop = container.scrollTop;
    const newIndex = Math.round(scrollTop / containerHeight);

    if (newIndex >= 0 && newIndex < reels.length && newIndex !== activeIndex) {
      onIndexChange(newIndex);
    }
  }, [reels.length, activeIndex, onIndexChange]);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !currentReel) return;
    onAddComment(currentReel.id, commentInput.trim());
    setCommentInput("");
  };

  const comments = currentReel ? activeComments[currentReel.id] || [] : [];
  const isLiked = currentReel ? !!likedReels[currentReel.id] : false;
  const currentLikeCount = currentReel ? likeCounts[currentReel.id] || parseInt(currentReel.likes) || 120 : 120;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black flex items-center justify-center p-0 sm:py-6 sm:px-4 lg:py-8 lg:px-6 select-none h-screen h-dvh w-screen overflow-hidden"
      onClick={onClose}
      id="fullscreen-reels-lineup-modal"
    >
      <div 
        className="relative w-full h-full max-w-md sm:max-w-lg lg:max-w-xl sm:h-[92vh] sm:rounded-2xl lg:rounded-3xl bg-black overflow-hidden shadow-2xl flex flex-col border-x sm:border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Custom CSS overrides to block VideoJS spinner flicker & animate CD notes */}
        <style dangerouslySetInnerHTML={{ __html: `
          .vjs-loading-spinner {
            display: none !important;
          }
          .vjs-big-play-button {
            display: none !important;
          }
          @keyframes float-note-1 {
            0% { transform: translate(0, 0) scale(0.5) rotate(0deg); opacity: 0; }
            20% { opacity: 1; }
            100% { transform: translate(-30px, -80px) scale(1) rotate(-20deg); opacity: 0; }
          }
          @keyframes float-note-2 {
            0% { transform: translate(0, 0) scale(0.5) rotate(0deg); opacity: 0; }
            20% { opacity: 1; }
            100% { transform: translate(30px, -100px) scale(1) rotate(20deg); opacity: 0; }
          }
          @keyframes float-note-3 {
            0% { transform: translate(0, 0) scale(0.5) rotate(0deg); opacity: 0; }
            20% { opacity: 1; }
            100% { transform: translate(-12px, -90px) scale(1.1) rotate(-10deg); opacity: 0; }
          }
          @keyframes tiktok-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes modal-fade-in {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          @keyframes modal-scale-up {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}} />

        {/* Top Floating Action Bar */}
        <div className="absolute top-0 left-0 right-0 z-40 p-3 sm:p-4 bg-gradient-to-b from-black/95 via-black/60 to-transparent flex items-center justify-between gap-2 pointer-events-auto">
          {/* Back to Feed Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/75 hover:bg-black text-white rounded-full backdrop-blur-md border border-white/20 transition-all cursor-pointer text-xs font-bold shadow-md hover:scale-105 active:scale-95"
            title="Back to Feed"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Feed</span>
          </button>

          {/* Reel Indicator Badge */}
          <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1 rounded-full border border-white/20 text-white text-[10px] sm:text-[11px] font-bold">
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400" />
            <span>Reel {activeIndex + 1} of {reels.length}</span>
          </div>

          {/* Close Button - Desktop/tablet */}
          <button
            onClick={onClose}
            className="hidden sm:flex w-8 h-8 rounded-full bg-black/75 hover:bg-black text-white items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer hover:scale-105"
            title="Close"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Vertical Scrollable Snap-Scroll Video Queue Container */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-y-auto snap-y snap-mandatory scroll-smooth no-scrollbar relative z-10 flex flex-col"
          style={{ scrollSnapType: "y mandatory", scrollbarWidth: "none" }}
        >
          {reels.map((reel, idx) => {
            const isActive = idx === activeIndex;
            const isNearby = Math.abs(idx - activeIndex) <= 3;
            return (
              <SingleReelCard
                key={reel.id}
                reel={reel}
                index={idx}
                isActive={isActive}
                isNearby={isNearby}
                liked={!!likedReels[reel.id]}
                likeCount={likeCounts[reel.id] || parseInt(reel.likes) || 120}
                commentsCount={(activeComments[reel.id] || []).length + 18}
                onToggleLike={() => onToggleLike(reel.id)}
                onOpenComments={() => setIsCommentsOpen(true)}
                onSelectThisReel={() => onIndexChange(idx)}
                hasPrev={idx > 0}
                hasNext={idx < reels.length - 1}
                onPrev={() => onIndexChange(idx - 1)}
                onNext={() => onIndexChange(idx + 1)}
                onClose={onClose}
                onWatchFull={onWatchFull}
              />
            );
          })}
        </div>

        {/* Sliding Comments Drawer */}
        {isCommentsOpen && currentReel && (
          <div 
            className="absolute inset-x-0 bottom-0 top-1/3 z-50 bg-gray-950/95 backdrop-blur-md border-t border-white/15 p-4 flex flex-col animate-slide-up rounded-t-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-bold text-white text-sm">
                Comments ({comments.length + 18})
              </span>
              <button
                onClick={() => setIsCommentsOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Comment list */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              <div className="flex gap-2.5 items-start">
                <img
                  src="https://api.dicebear.com/9.x/adventurer/svg?seed=SakuraOtaku&backgroundColor=ffb703"
                  alt="User"
                  className="w-7 h-7 rounded-full object-cover border border-white/10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://api.dicebear.com/9.x/bottts/svg?seed=SakuraOtaku";
                  }}
                />
                <div className="bg-white/10 rounded-2xl px-3 py-2 text-xs text-white flex-1">
                  <span className="font-bold block text-blue-400">SakuraOtaku</span>
                  Streaming middle highlight in HD quality! 🔥
                </div>
              </div>

              {comments.map((cmt) => (
                <div key={cmt.id} className="flex gap-2.5 items-start">
                  <img
                    src={currentUser.avatar}
                    alt={cmt.author}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <div className="bg-white/10 rounded-2xl px-3 py-2 text-xs text-white flex-1">
                    <span className="font-bold block text-blue-400">{cmt.author}</span>
                    {cmt.text}
                  </div>
                </div>
              ))}
            </div>

            {/* New comment input */}
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 pt-2 border-t border-white/10">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Add a comment on this anime reel..."
                className="flex-1 bg-white/10 text-white rounded-full px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold rounded-full transition-colors cursor-pointer"
              >
                Post
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// Single Reel Item Component in the scrollable queue
interface SingleReelCardProps {
  key?: string | number;
  reel: ReelItem;
  index: number;
  isActive: boolean;
  isNearby: boolean;
  liked: boolean;
  likeCount: number;
  commentsCount: number;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onSelectThisReel: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onWatchFull?: (reel: ReelItem) => void;
}

function SingleReelCard({
  reel,
  index,
  isActive,
  isNearby,
  liked,
  likeCount,
  commentsCount,
  onToggleLike,
  onOpenComments,
  onSelectThisReel,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  onWatchFull
}: SingleReelCardProps) {
  const effectiveSlug = reel.slug || (typeof reel.originalId === "string" ? reel.originalId : "") || reel.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const posterUrl = reel.poster || reel.backdrop || FALLBACK_POSTER;

  // Initialize state directly from global stream cache to prevent loader flickering on mount or scroll-focus!
  const cachedData = streamCache.get(effectiveSlug) || null;

  const [loadingStream, setLoadingStream] = useState<boolean>(!cachedData);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamData, setStreamData] = useState<StreamResponse["data"] | null>(cachedData);
  
  // Video playback state
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [clipStartTime, setClipStartTime] = useState<number>(0);
  const [clipProgress, setClipProgress] = useState<number>(0);

  // Watch Full modal states
  const [showWatchFullModal, setShowWatchFullModal] = useState<boolean>(false);
  const [hasShownWatchFull, setHasShownWatchFull] = useState<boolean>(false);
  const hasShownWatchFullRef = useRef<boolean>(false);
  const watchFullTimeoutRef = useRef<any>(null);

  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const clipStartRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);

  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Fetch stream when active or nearby (prefetch)
  useEffect(() => {
    if (!isActiveRef.current && !isNearby) {
      // Clean up player when card loses focus and is not nearby
      if (playerRef.current && !playerRef.current.isDisposed()) {
        try {
          playerRef.current.dispose();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
      setIsVideoReady(false);
      return;
    }

    let isCancelled = false;

    // Prefill states immediately from streamCache if present to completely bypass loading flicker!
    const cached = streamCache.get(effectiveSlug);
    if (cached) {
      setStreamData(cached);
      setLoadingStream(false);
    } else {
      setLoadingStream(true);
      setStreamData(null);
    }

    setStreamError(null);
    setIsVideoReady(false);
    setClipProgress(0);
    clipStartRef.current = 0;
    isSeekingRef.current = false;

    async function loadStream() {
      // Check in-memory cache first
      if (streamCache.has(effectiveSlug)) {
        const cachedResponse = streamCache.get(effectiveSlug);
        if (cachedResponse && !isCancelled) {
          setStreamData(cachedResponse);
          setLoadingStream(false);
          return;
        }
      }

      try {
        const res = await fetch(`/api/stream?id=${encodeURIComponent(effectiveSlug)}&server=hd-1&ep=1&type=sub`);
        if (!res.ok) throw new Error(`Stream API responded with status ${res.status}`);
        const json: StreamResponse = await res.json();

        if (isCancelled) return;

        if (json.success && json.data?.m3u8) {
          streamCache.set(effectiveSlug, json.data);
          setStreamData(json.data);
          setStreamError(null);
        } else {
          throw new Error(json.error || "Stream unavailable for HD-1");
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn(`[REEL ${index}] Error fetching stream:`, err);
          setStreamError(err.message || "Failed to load stream");
        }
      } finally {
        if (!isCancelled) {
          setLoadingStream(false);
        }
      }
    }

    loadStream();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNearby, effectiveSlug, index]);

  // Mount Video.js player when stream data is ready (supports prefetching nearby items)
  useEffect(() => {
    if ((!isActiveRef.current && !isNearby) || !videoContainerRef.current || !streamData?.m3u8) return;

    if (playerRef.current && !playerRef.current.isDisposed()) {
      try {
        playerRef.current.dispose();
      } catch {
        // ignore
      }
      playerRef.current = null;
    }

    const proxiedM3u8 = streamData.m3u8.startsWith("http")
      ? `/api/m3u8-proxy?url=${encodeURIComponent(streamData.m3u8)}`
      : streamData.m3u8;

    const tracks = (streamData.subtitles || [])
      .filter((sub: any) => {
        if (!sub.file || typeof sub.file !== "string") return false;
        const lowerLabel = (sub.label || "").toLowerCase();
        const lowerKind = (sub.kind || "").toLowerCase();
        return lowerKind !== "thumbnails" && !lowerLabel.includes("thumbnail") && !lowerLabel.includes("sprite");
      })
      .map((sub: any) => ({
        src: `/api/m3u8-proxy?url=${encodeURIComponent(sub.file)}`,
        label: sub.label || "English",
        kind: "subtitles",
        srclang: (sub.label || "en").substring(0, 2).toLowerCase(),
        default: !!sub.default
      }));

    videoContainerRef.current.innerHTML = "";
    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-default-skin", "w-full", "h-full", "object-cover", "sm:object-contain");
    videoElement.setAttribute("playsinline", "true");
    videoElement.setAttribute("webkit-playsinline", "true");
    videoElement.setAttribute("preload", "auto");
    videoContainerRef.current.appendChild(videoElement);

    const videoJsOptions = {
      autoplay: false, // Do not autoplay frame 0 before seeking to clip start
      controls: false,
      loop: false,
      muted: !isActiveRef.current, // Mute if not active
      playsinline: true,
      preload: "auto",
      fluid: true,
      responsive: true,
      sources: [
        {
          src: proxiedM3u8,
          type: "application/x-mpegURL"
        }
      ],
      tracks: tracks
    };

    const player = (playerRef.current = videojs(videoElement, videoJsOptions, function onPlayerReady() {
      player.muted(!isActiveRef.current);
    }));

    // Auto-enable first/default subtitle when tracks are added or metadata is loaded
    const enableDefaultSubtitle = () => {
      const textTracks = player.textTracks();
      let activated = false;
      for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        if (track.kind === "captions" || track.kind === "subtitles") {
          if (track.label === "English" || track.language === "en" || !activated) {
            track.mode = "showing";
            activated = true;
          } else {
            track.mode = "disabled";
          }
        }
      }
    };

    player.textTracks().on("addtrack", enableDefaultSubtitle);
    player.on("loadedmetadata", enableDefaultSubtitle);

    const setupMiddleClip = () => {
      if (isSeekingRef.current) return;
      const dur = player.duration();
      if (dur && !isNaN(dur) && dur > 0) {
        const start = dur > 60 ? Math.floor(dur / 2) : 0;
        clipStartRef.current = start;
        setClipStartTime(start);
        isSeekingRef.current = true;
        try {
          player.currentTime(start);
          if (isActiveRef.current) {
            player.play().catch(() => {});
          } else {
            player.pause();
          }
        } catch {
          // ignore
        }
      }
    };

    player.on("loadedmetadata", setupMiddleClip);
    player.on("durationchange", setupMiddleClip);
    player.on("canplay", setupMiddleClip);

    // When seek completes or time updates, mark video as ready to display
    player.on("seeked", () => {
      if (isActiveRef.current) {
        player.play().catch(() => {});
      }
    });

    // Track time and verify real video frames rendered before fading poster overlay
    player.on("timeupdate", () => {
      const current = player.currentTime();
      const start = clipStartRef.current;
      const end = start + 30;

      // Only reveal video canvas when video is actively rendering frames at seek position
      if (isSeekingRef.current) {
        if (current >= start && player.readyState() >= 2) {
          setIsVideoReady(true);
        }
      } else if (current > 0 && player.readyState() >= 2) {
        setIsVideoReady(true);
      }

      const isAtEndClip = start > 0 ? (current >= end - 5) : (current >= 25);
      const isPastLoopPoint = start > 0 ? (current >= end) : (current >= 30);

      if (isAtEndClip && !hasShownWatchFullRef.current) {
        // Trigger the Watch Full modal exactly once for 2 seconds then hide
        hasShownWatchFullRef.current = true;
        setHasShownWatchFull(true);
        setShowWatchFullModal(true);
        try {
          player.pause();
        } catch (e) {}
        setIsPlaying(false);
        setClipProgress(25);

        if (watchFullTimeoutRef.current) clearTimeout(watchFullTimeoutRef.current);
        watchFullTimeoutRef.current = setTimeout(() => {
          setShowWatchFullModal(false);
          if (playerRef.current && !playerRef.current.isDisposed()) {
            try {
              playerRef.current.currentTime(clipStartRef.current);
              playerRef.current.play().catch(() => {});
            } catch (err) {}
          }
          setClipProgress(0);
        }, 2000);
      } else if (isPastLoopPoint) {
        // Normal loop behavior
        player.currentTime(start);
        player.play().catch(() => {});
        setClipProgress(0);
      } else {
        // Normal progress update
        const rawProgress = start > 0 ? (current - start) : current;
        setClipProgress(Math.max(0, Math.min(30, rawProgress)));
      }
    });

    player.on("playing", () => {
      if (isActiveRef.current) {
        setIsPlaying(true);
      }
      const current = player.currentTime();
      if ((!isSeekingRef.current || current >= clipStartRef.current) && player.readyState() >= 2) {
        setIsVideoReady(true);
      }
    });

    player.on("pause", () => setIsPlaying(false));
    player.on("error", () => {
      console.warn("[VIDEOJS ERROR]", player.error());
      setStreamError("Video stream currently unavailable.");
    });

    return () => {
      if (watchFullTimeoutRef.current) clearTimeout(watchFullTimeoutRef.current);
      if (player && !player.isDisposed()) {
        try {
          player.dispose();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNearby, streamData]);

  // Play/Pause and Mute/Unmute transition when active index changes (instantly play prefetched streams)
  useEffect(() => {
    const player = playerRef.current;
    if (!player || player.isDisposed()) return;

    if (isActive) {
      player.muted(false);
      player.play().catch(() => {});
      setIsPlaying(true);
    } else {
      player.muted(true);
      player.pause();
      setIsPlaying(false);
      setIsVideoReady(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    if (!isActive) {
      onSelectThisReel();
      return;
    }
    if (playerRef.current) {
      if (playerRef.current.paused()) {
        playerRef.current.play();
      } else {
        playerRef.current.pause();
      }
    }
  };

  return (
    <div 
      id={`reel-card-${index}`}
      className="w-full h-full snap-start snap-always shrink-0 relative flex flex-col justify-between overflow-hidden bg-gray-950"
      style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
    >
      {/* Video / Poster Stage */}
      <div 
        className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-pointer bg-gray-950"
        onClick={togglePlay}
      >
        {/* Clean Blurred Poster Backdrop (Ambient Background) */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-gray-950 pointer-events-none select-none">
          <div 
            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-60 scale-110"
            style={{
              backgroundImage: `url(${posterUrl})`,
            }}
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>

        {/* Preloaded/Active Video.js Player Node */}
        {(isActive || isNearby) && (
          <div 
            data-vjs-player 
            className={`w-full h-full items-center justify-center pointer-events-none relative z-10 ${
              isActive ? "flex" : "hidden"
            }`}
          >
            <div ref={videoContainerRef} className="w-full h-full flex items-center justify-center pointer-events-none" />
          </div>
        )}

        {/* Robust Transparent Tap/Click Gesture Layer for Play-Pause */}
        {isActive && !loadingStream && !streamError && (
          <div 
            className="absolute inset-0 z-25 cursor-pointer bg-transparent" 
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
          />
        )}

        {/* Subtle, Non-Intrusive Top Progress Line when loading stream metadata (No blue circle with black bg) */}
        {isActive && (loadingStream || !isVideoReady) && !streamError && (
          <div className="absolute top-0 left-0 right-0 h-1 z-30 overflow-hidden bg-white/10 pointer-events-none">
            <div className="h-full bg-[#1877F2] w-2/5 animate-[pulse_1s_ease-in-out_infinite]" />
          </div>
        )}

        {/* Stream Error Overlay */}
        {isActive && streamError && !loadingStream && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 p-6 text-white text-center gap-3">
            <AlertCircle className="h-9 w-9 text-amber-400" />
            <h4 className="text-xs sm:text-sm font-bold text-gray-200">Stream Currently Unavailable</h4>
            <p className="text-[11px] sm:text-xs text-gray-400 max-w-xs">{streamError}</p>
            {hasNext && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                className="px-4 py-2 bg-[#1877F2] hover:bg-blue-600 rounded-full text-xs font-bold transition-colors cursor-pointer mt-2"
              >
                Play Next Reel
              </button>
            )}
          </div>
        )}

        {/* Play/Pause Watermark Overlay */}
        {isActive && !isPlaying && !loadingStream && !streamError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center border border-white/30 shadow-2xl">
              <Play className="h-6 w-6 sm:h-8 sm:w-8 fill-white ml-0.5 sm:ml-1" />
            </div>
          </div>
        )}

        {/* Watch Full Now Premium Overlay Card Modal when remaining 5 seconds */}
        {isActive && isVideoReady && !loadingStream && showWatchFullModal && (
          <div 
            className="absolute inset-0 z-40 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center select-none"
            style={{ animation: "modal-fade-in 0.3s ease-out forwards" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Glassmorphic Container Card */}
            <div 
              className="w-11/12 max-w-[270px] sm:max-w-[310px] bg-gray-950/90 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-3.5 sm:gap-4 shadow-2xl"
              style={{ animation: "modal-scale-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
            >
              {/* Premium Header badge */}
              <div className="text-[10px] sm:text-xs font-extrabold tracking-widest uppercase text-amber-400 bg-amber-400/15 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Watch Full Now</span>
              </div>

              {/* Poster Image */}
              <div className="relative w-28 h-38 sm:w-32 sm:h-44 rounded-xl overflow-hidden shadow-lg border border-white/20 shrink-0">
                <img 
                  src={posterUrl} 
                  alt={reel.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_POSTER;
                  }}
                />
              </div>

              {/* Title & Studio info */}
              <div className="flex flex-col gap-1">
                <h4 className="text-xs sm:text-sm font-extrabold text-white leading-tight line-clamp-2 max-w-full">
                  {reel.title}
                </h4>
                {reel.studio && (
                  <span className="text-[10px] sm:text-[11px] text-gray-400 font-semibold">
                    Studio: {reel.studio}
                  </span>
                )}
              </div>

              {/* CTA Action Buttons */}
              <div className="w-full flex flex-col gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowWatchFullModal(false);
                    onClose();
                    if (onWatchFull) {
                      onWatchFull(reel);
                    }
                  }}
                  className="w-full py-2 sm:py-2.5 px-4 bg-gradient-to-r from-blue-600 to-[#1877F2] hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                >
                  <span>Watch Full Anime</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Dismiss modal immediately
                    setShowWatchFullModal(false);
                    // Reset playhead back to the beginning of the reel clip & play instantly
                    if (playerRef.current && !playerRef.current.isDisposed()) {
                      try {
                        playerRef.current.currentTime(clipStartRef.current);
                        playerRef.current.play().catch(() => {});
                      } catch (err) {}
                    }
                    setClipProgress(0);
                  }}
                  className="w-full py-1 text-[11px] font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Replay Clip
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Right Action Floating Column */}
        {isActive && (
          <div 
            className="absolute right-2 sm:right-3.5 bottom-14 sm:bottom-20 z-30 flex flex-col items-center gap-3 sm:gap-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Like Button */}
            <button
              onClick={onToggleLike}
              className="flex flex-col items-center gap-0.5 group/btn cursor-pointer"
              title="Like Reel"
            >
              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center backdrop-blur-md border transition-transform group-hover/btn:scale-110 ${
                liked ? 'bg-red-500 border-red-400 text-white' : 'bg-black/50 border-white/20 hover:bg-black/70'
              }`}>
                <Heart className={`h-4.5 w-4.5 sm:h-5 sm:w-5 ${liked ? 'fill-white' : ''}`} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold drop-shadow">
                {likeCount}
              </span>
            </button>

            {/* Comments Button */}
            <button
              onClick={onOpenComments}
              className="flex flex-col items-center gap-0.5 group/btn cursor-pointer"
              title="Comments"
            >
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 flex items-center justify-center backdrop-blur-md transition-transform group-hover/btn:scale-110">
                <MessageSquare className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold drop-shadow">
                {commentsCount}
              </span>
            </button>

            {/* Share Button */}
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
              }}
              className="flex flex-col items-center gap-0.5 group/btn cursor-pointer"
              title="Share"
            >
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 flex items-center justify-center backdrop-blur-md transition-transform group-hover/btn:scale-110">
                <Share2 className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold drop-shadow">Share</span>
            </button>

            {/* TikTok-style Spinning CD/Vinyl with floating music notes */}
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 mt-2 flex items-center justify-center">
              {isPlaying && (
                <>
                  <span className="absolute text-blue-400 text-xs select-none pointer-events-none opacity-0 animate-[float-note-1_2.5s_infinite_ease-out]">🎵</span>
                  <span className="absolute text-purple-400 text-sm select-none pointer-events-none opacity-0 animate-[float-note-2_3s_infinite_ease-out_0.8s]">🎶</span>
                  <span className="absolute text-pink-400 text-xs select-none pointer-events-none opacity-0 animate-[float-note-3_2.8s_infinite_ease-out_1.5s]">🎵</span>
                </>
              )}
              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black border-2 border-gray-800/80 p-[3px] flex items-center justify-center shadow-lg relative ${
                isPlaying ? "animate-[tiktok-spin_4s_infinite_linear]" : ""
              }`}>
                <img 
                  src={posterUrl} 
                  alt="CD cover" 
                  className="w-full h-full rounded-full object-cover" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute w-2.5 h-2.5 rounded-full bg-gray-950 border border-black" />
              </div>
            </div>
          </div>
        )}

        {/* Left Vertical Nav Arrows (Desktop/Tablet) */}
        {isActive && (
          <div 
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {hasPrev && (
              <button
                onClick={onPrev}
                className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all cursor-pointer hover:scale-110 shadow-lg"
                title="Previous Reel"
              >
                <ChevronUp className="h-5 w-5" />
              </button>
            )}
            {hasNext && (
              <button
                onClick={onNext}
                className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all cursor-pointer hover:scale-110 shadow-lg"
                title="Next Reel"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Bottom Caption Overlay */}
        <div 
          className="absolute bottom-0 left-0 right-0 z-20 pb-3 pt-8 px-3 sm:pb-4 sm:px-4 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col gap-1.5 text-white pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-300">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white flex items-center gap-1">
                @{reel.studio || "AniBook Studio"}
                <span 
                  className="inline-flex items-center justify-center w-3.5 h-3.5 bg-[#1877F2] text-white rounded-full shrink-0 shadow-xs" 
                  title="Verified Studio"
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              </span>
              <span>·</span>
              <span className="bg-white/15 px-1.5 py-0.2 rounded text-[9.5px] font-bold">HD-1</span>
            </div>
          </div>

          <h3 className="font-bold text-xs sm:text-base leading-snug line-clamp-2 pr-12 sm:pr-14">
            {reel.title}
          </h3>

          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-300">
            <div className="flex items-center gap-1 text-blue-300 font-semibold">
              <Film className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400" />
              <span>Ep 1 · 30s Reel</span>
            </div>
            {reel.ani_id && (
              <>
                <span>·</span>
                <a
                  href={`https://anilist.co/anime/${reel.ani_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-0.5 font-bold"
                >
                  AniList <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </div>
        </div>

        {/* 30-Second Clip Progress Bar */}
        {isActive && (
          <div className="absolute bottom-0 left-0 right-0 z-30 w-full bg-white/20 h-1 sm:h-1.5 overflow-hidden">
            <div 
              className="bg-[#1877F2] h-full transition-all duration-150 rounded-r-full"
              style={{ width: `${(clipProgress / 30) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
