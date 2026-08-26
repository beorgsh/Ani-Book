import React, { useState, useEffect, useRef, useCallback } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Heart, 
  MessageSquare, 
  Share2, 
  RefreshCw, 
  Sparkles, 
  Maximize2, 
  Film, 
  Send, 
  Check, 
  Tv, 
  ExternalLink,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { Post, Comment, AnimeItem } from "../types";
import { ReelSettings } from "../utils/reelSettings";
import { getDeterministicAvatar } from "../utils";

interface SingleReelFeedCardProps {
  key?: React.Key;
  cardIndex: number;
  maxTotalPages?: number;
  reelSettings: ReelSettings;
  currentUser: { name: string; avatar: string };
  onLikeToggle: (postId: string) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onShare: (postId: string) => void;
  onWatchFull?: (post: Post) => void;
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

// Global stream cache to speed up playback
const streamCache = new Map<string, StreamResponse["data"]>();

export default function SingleReelFeedCard({
  cardIndex,
  maxTotalPages = 8929,
  reelSettings,
  currentUser,
  onLikeToggle,
  onAddComment,
  onShare,
  onWatchFull
}: SingleReelFeedCardProps) {
  const [animeData, setAnimeData] = useState<AnimeItem | null>(null);
  const [loadingAnime, setLoadingAnime] = useState<boolean>(true);
  const [animeError, setAnimeError] = useState<string | null>(null);

  const [streamData, setStreamData] = useState<StreamResponse["data"] | null>(null);
  const [loadingStream, setLoadingStream] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(reelSettings.muted);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedEnd, setBufferedEnd] = useState<number>(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState<boolean>(false);
  const [commentInput, setCommentInput] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);

  // Local comments state
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(142 + (cardIndex * 37) % 300);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const isSeekingRef = useRef<boolean>(false);
  const isInViewportRef = useRef<boolean>(false);

  // Pick a random page from 1 to maxTotalPages
  const fetchRandomReelAnime = useCallback(async () => {
    setLoadingAnime(true);
    setAnimeError(null);
    setStreamData(null);
    setStreamError(null);
    setIsPlaying(false);

    try {
      const validMax = Math.max(1, maxTotalPages);
      // Get a random page between 1 and validMax
      const randomPage = Math.floor(Math.random() * validMax) + 1;
      const res = await fetch(`/api/recent-anime?page=${randomPage}&per_page=1`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();

      if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
        const item: AnimeItem = json.data[0];
        setAnimeData(item);
        setLocalComments([
          {
            id: `c1-${item.id}`,
            authorName: "Reel Explorer",
            authorAvatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=AnimeReelFan&backgroundColor=b6e3f4",
            text: `Awesome random reel discovery from page ${randomPage}! ✨`,
            timestamp: "Just now"
          }
        ]);
      } else {
        throw new Error("No anime data found on random page");
      }
    } catch (err: any) {
      console.warn("[SINGLE REEL CARD] Error fetching anime:", err);
      setAnimeError(err.message || "Failed to load reel");
    } finally {
      setLoadingAnime(false);
    }
  }, [maxTotalPages]);

  // Initial load of random reel
  useEffect(() => {
    fetchRandomReelAnime();
  }, [fetchRandomReelAnime]);

  // Fetch streaming source when animeData is available
  useEffect(() => {
    if (!animeData) return;

    const slug = animeData.slug || (animeData as any).slug_name || "";
    const malId = animeData.mal_id ? String(animeData.mal_id) : "";
    const aniId = animeData.ani_id ? String(animeData.ani_id) : "";
    const title = animeData.title || "";
    const cacheKey = `${slug}-${malId}`;

    if (streamCache.has(cacheKey)) {
      setStreamData(streamCache.get(cacheKey) || null);
      return;
    }

    let isCancelled = false;
    setLoadingStream(true);
    setStreamError(null);

    async function loadStream() {
      try {
        const params = new URLSearchParams({
          id: slug,
          malId: malId,
          aniId: aniId,
          title: title,
          server: "auto",
          ep: "1",
          type: "sub"
        });

        const res = await fetch(`/api/stream?${params.toString()}`);
        if (!res.ok) throw new Error(`Stream responded with status ${res.status}`);
        const json: StreamResponse = await res.json();

        if (isCancelled) return;

        if (json.success && json.data?.m3u8) {
          streamCache.set(cacheKey, json.data);
          if (slug) streamCache.set(slug, json.data);
          setStreamData(json.data);
        } else {
          throw new Error(json.error || "No playable stream available");
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn("[SINGLE REEL] Stream load error:", err);
          setStreamError(err.message || "Stream unavailable");
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
  }, [animeData]);

  // Initialize Video.js player when stream data is ready
  useEffect(() => {
    if (!videoContainerRef.current || !streamData?.m3u8) return;

    if (playerRef.current && !playerRef.current.isDisposed()) {
      try {
        playerRef.current.dispose();
      } catch {}
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
    videoElement.classList.add("vjs-default-skin", "w-full", "h-full", "object-cover");
    videoElement.setAttribute("playsinline", "true");
    videoElement.setAttribute("webkit-playsinline", "true");
    videoElement.setAttribute("preload", "auto");
    videoContainerRef.current.appendChild(videoElement);

    const videoJsOptions = {
      autoplay: false,
      controls: false,
      loop: true,
      muted: isMuted,
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
      player.muted(isMuted);
      // If card is already in viewport and autoplay is on, play!
      if (isInViewportRef.current && reelSettings.autoplay) {
        player.play().catch(() => {
          player.muted(true);
          player.play().catch(() => {});
        });
      }
    }));

    player.on("play", () => setIsPlaying(true));
    player.on("pause", () => setIsPlaying(false));
    player.on("ended", () => setIsPlaying(false));

    player.on("timeupdate", () => {
      if (!isSeekingRef.current) {
        const ct = player.currentTime() || 0;
        setCurrentTime(ct);
        const dur = player.duration() || 0;
        setDuration(dur);

        const buffered = player.buffered();
        if (buffered && buffered.length > 0) {
          setBufferedEnd(buffered.end(buffered.length - 1));
        }
      }
    });

    return () => {
      if (player && !player.isDisposed()) {
        try {
          player.dispose();
        } catch {}
      }
      playerRef.current = null;
    };
  }, [streamData, isMuted, reelSettings.autoplay]);

  // Viewport Intersection Observer for Auto-play / Auto-pause
  useEffect(() => {
    const cardEl = cardRef.current;
    if (!cardEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.45;
        isInViewportRef.current = isVisible;

        if (playerRef.current && !playerRef.current.isDisposed()) {
          if (isVisible) {
            if (reelSettings.autoplay) {
              playerRef.current.play().catch(() => {
                // If browser blocks unmuted autoplay, mute and play
                playerRef.current.muted(true);
                setIsMuted(true);
                playerRef.current.play().catch(() => {});
              });
            }
          } else {
            // Pause video when out of viewport
            playerRef.current.pause();
          }
        }
      },
      {
        threshold: [0.1, 0.45, 0.7]
      }
    );

    observer.observe(cardEl);

    return () => {
      observer.unobserve(cardEl);
    };
  }, [reelSettings.autoplay]);

  // Toggle Play / Pause
  const handleTogglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!playerRef.current || playerRef.current.isDisposed()) return;
    if (playerRef.current.paused()) {
      playerRef.current.play().catch(() => {});
    } else {
      playerRef.current.pause();
    }
  };

  // Toggle Mute / Unmute
  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (playerRef.current && !playerRef.current.isDisposed()) {
      playerRef.current.muted(nextMuted);
    }
  };

  // Seek bar scrubber
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTo = parseFloat(e.target.value);
    setCurrentTime(seekTo);
    if (playerRef.current && !playerRef.current.isDisposed()) {
      playerRef.current.currentTime(seekTo);
    }
  };

  const handleLikeClick = () => {
    if (!animeData) return;
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikeCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    onLikeToggle(String(animeData.id));
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !animeData) return;

    const newComment: Comment = {
      id: `comment-reel-${Date.now()}`,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      text: commentInput.trim(),
      timestamp: "Just now"
    };

    setLocalComments((prev) => [...prev, newComment]);
    onAddComment(String(animeData.id), commentInput.trim());
    setCommentInput("");
  };

  const handleShareClick = () => {
    if (!animeData) return;
    onShare(String(animeData.id));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenFullModal = () => {
    if (!animeData || !onWatchFull) return;
    const postObj: Post = {
      id: String(animeData.id),
      slug: animeData.slug || (animeData as any).slug_name || undefined,
      title: animeData.title,
      avatar: animeData.poster || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=100&q=80",
      isVerified: animeData.status === "Currently Airing",
      timestamp: animeData.aired || "Airing now",
      content: animeData.description || `Meet ${animeData.title} from AniBook Random Reel discovery.`,
      image: animeData.background_image || animeData.backdrop || animeData.poster,
      bannerImage: animeData.background_image || animeData.backdrop || animeData.poster,
      backdrop: animeData.background_image || animeData.backdrop || animeData.poster,
      posterImage: animeData.poster,
      mal_id: animeData.mal_id ? String(animeData.mal_id) : undefined,
      ani_id: animeData.ani_id ? String(animeData.ani_id) : undefined,
      genreTags: animeData.terms_by_type?.genre || [],
      studio: animeData.terms_by_type?.studios?.[0] || "AniBook Reel Studio",
      isCustom: false,
      likesCount: likeCount,
      commentsCount: localComments.length,
      sharesCount: 12,
      isLikedByUser: isLiked,
      commentsList: localComments,
      type: animeData.terms_by_type?.type?.[0] || "ONA",
      episodes: animeData.episodes || "?",
      status: animeData.status || "Currently Airing"
    };
    onWatchFull(postObj);
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const posterImage = animeData?.poster || animeData?.backdrop || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80";
  const studioName = animeData?.terms_by_type?.studios?.[0] || animeData?.terms_by_type?.genre?.[0] || "AniBook Studio";
  const studioAvatar = getDeterministicAvatar(studioName);

  return (
    <article
      ref={cardRef}
      className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden flex flex-col transition-all duration-200 hover:border-gray-300 select-none"
      id={`single-reel-card-${cardIndex}`}
    >
      {/* Top Header with Studio Name & DiceBear Avatar */}
      <div className="p-3 sm:p-4 flex items-center justify-between gap-3 border-b border-gray-100/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              src={studioAvatar}
              alt={studioName}
              className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-xs"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getDeterministicAvatar("Anime Studio");
              }}
            />
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full p-1 text-white shadow-xs">
              <Film className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 
                className="font-bold text-sm sm:text-base text-gray-900 truncate"
                title={studioName}
              >
                {studioName}
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-gradient-to-r from-purple-50 to-indigo-50 text-indigo-700 rounded-full border border-indigo-200/80 shadow-2xs">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                <span>Reel Discovery</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium truncate mt-0.5">
              <span className="text-[#1877F2] font-semibold">Reel Discovery</span>
              <span>·</span>
              <span className="text-gray-500">HD Clip</span>
              {animeData?.rating && (
                <>
                  <span>·</span>
                  <span className="bg-gray-100 px-1 rounded text-gray-600 text-[10px]">{animeData.rating}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action button: Roll new random reel */}
        <button
          onClick={fetchRandomReelAnime}
          disabled={loadingAnime}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200/90 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          title="Get another random reel"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-purple-600 ${loadingAnime ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">New Reel</span>
        </button>
      </div>

      {/* Post Caption: Anime Title & Description (Collapsible) */}
      <div className="px-3.5 sm:px-4 py-2.5 border-b border-gray-100 bg-gray-50/40">
        {animeData?.title && (
          <h4 
            onClick={handleOpenFullModal}
            className="font-bold text-sm sm:text-base text-gray-900 hover:text-[#1877F2] cursor-pointer transition-colors mb-1 leading-snug"
            title={animeData.title}
          >
            {animeData.title}
          </h4>
        )}

        {animeData?.description && (
          <div className="text-xs text-gray-700 leading-relaxed">
            <p className={!isDescriptionExpanded ? "line-clamp-2" : ""}>
              {animeData.description}
            </p>
            {animeData.description.length > 80 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDescriptionExpanded(!isDescriptionExpanded);
                }}
                className="text-[#1877F2] font-bold text-xs mt-1 hover:underline cursor-pointer inline-block focus:outline-none"
              >
                {isDescriptionExpanded ? "See less" : "...See more"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Video Reel Player Container (Portrait Scope Box) */}
      <div 
        className="relative w-full aspect-[4/5] sm:aspect-[9/16] max-h-[560px] bg-black overflow-hidden flex items-center justify-center cursor-pointer group"
        onClick={handleTogglePlay}
      >
        {/* Full portrait poster thumbnail - Fades out when video plays */}
        <img
          src={posterImage}
          alt={animeData?.title || "Anime Reel Thumbnail"}
          className={`absolute inset-0 z-20 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
            isPlaying ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          referrerPolicy="no-referrer"
        />

        {/* Video.js player root */}
        <div 
          ref={videoContainerRef} 
          className="relative w-full h-full flex items-center justify-center z-10"
        />

        {/* Loading Spinner / Stream Resolver */}
        {(loadingAnime || loadingStream) && (
          <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2.5 text-white pointer-events-none">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="text-xs font-bold tracking-wide">
              {loadingAnime ? "Loading random anime reel..." : "Connecting HD video stream..."}
            </span>
          </div>
        )}

        {/* Stream Error Overlay with Retry */}
        {streamError && !loadingStream && (
          <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center text-white gap-2">
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <span className="text-xs font-bold">Clip stream temporarily offline</span>
            <p className="text-[11px] text-gray-300 max-w-xs">
              Tap below to try another random anime clip from the 8,900+ library.
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchRandomReelAnime();
              }}
              className="mt-1 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Next Random Reel</span>
            </button>
          </div>
        )}

        {/* Center Play / Pause Indicator (Icon ONLY - No border & No background) */}
        {!isPlaying && !loadingStream && !loadingAnime && !streamError && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <Play className="w-16 h-16 sm:w-20 sm:h-20 text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] fill-white transition-transform group-hover:scale-110 opacity-90" />
          </div>
        )}

        {/* Top Overlay Controls (Sound Toggle & Fullscreen) */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          {/* Mute / Unmute Button */}
          <button
            onClick={handleToggleMute}
            className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-transform active:scale-90 cursor-pointer shadow-md"
            title={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
          </button>

          {/* Expand to Fullscreen Modal Button */}
          {onWatchFull && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenFullModal();
              }}
              className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-transform active:scale-90 cursor-pointer shadow-md"
              title="Watch full episode"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bottom Floating Time Indicator inside Player (Title overlay removed) */}
        <div className="absolute bottom-3 right-3 z-30 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-white text-[11px] font-bold">
            <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>
        </div>

        {/* Video Scrubber Progress Bar */}
        {duration > 0 && (
          <div 
            className="absolute bottom-0 left-0 right-0 z-30 h-1 bg-white/20 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="h-full bg-purple-500 transition-all"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Stats Counter Line */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1">
            <div className="w-4.5 h-4.5 rounded-full bg-rose-500 flex items-center justify-center text-white text-[9px] ring-2 ring-white">
              <Heart className="w-2.5 h-2.5 fill-white" />
            </div>
            <div className="w-4.5 h-4.5 rounded-full bg-purple-600 flex items-center justify-center text-white text-[9px] ring-2 ring-white">
              <Sparkles className="w-2.5 h-2.5 fill-white" />
            </div>
          </div>
          <span className="font-semibold text-gray-700">{likeCount} likes</span>
        </div>

        <div className="flex items-center gap-3 font-medium">
          <button 
            onClick={() => setIsCommentsOpen(!isCommentsOpen)}
            className="hover:underline cursor-pointer"
          >
            {localComments.length} comments
          </button>
          <span>·</span>
          <span>12 shares</span>
        </div>
      </div>

      {/* Social Action Buttons (Like / Comment / Share / Full Episode) */}
      <div className="flex items-center justify-between px-2 py-1 text-gray-600 font-bold text-xs sm:text-sm select-none">
        {/* Like Button with Cookie Persistence */}
        <button
          onClick={handleLikeClick}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 flex-1 py-2 rounded-xl transition-all duration-150 cursor-pointer min-w-0 ${
            isLiked 
              ? "text-rose-600 bg-rose-50/80 hover:bg-rose-100/80 font-bold" 
              : "hover:bg-gray-100 text-gray-700"
          }`}
          title="Like this anime reel"
        >
          <Heart className={`h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0 ${isLiked ? "fill-rose-500 text-rose-500 animate-pulse" : ""}`} />
          <span className="truncate">{isLiked ? "Liked Reel" : "Like Reel"}</span>
        </button>

        {/* Comment Button */}
        <button
          onClick={() => setIsCommentsOpen(!isCommentsOpen)}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 flex-1 py-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer min-w-0 ${
            isCommentsOpen ? "text-[#1877F2] bg-blue-50/60" : ""
          }`}
        >
          <MessageSquare className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0" />
          <span className="truncate">Comment</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShareClick}
          className="flex items-center justify-center gap-1.5 sm:gap-2 flex-1 py-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer min-w-0"
        >
          {copiedLink ? (
            <Check className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0 text-green-600" />
          ) : (
            <Share2 className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0" />
          )}
          <span className="truncate">{copiedLink ? "Copied!" : "Share"}</span>
        </button>
      </div>

      {/* Expandable Comment Section */}
      {isCommentsOpen && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-3 sm:p-4 space-y-3 animate-fade-in">
          {/* Comment List */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {localComments.map((cmt) => (
              <div key={cmt.id} className="flex items-start gap-2.5 text-xs">
                <img
                  src={cmt.authorAvatar}
                  alt={cmt.authorName}
                  className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 bg-white p-2.5 rounded-xl border border-gray-200/70 shadow-2xs">
                  <span className="font-bold text-gray-900 block">{cmt.authorName}</span>
                  <p className="text-gray-700 mt-0.5">{cmt.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Comment Composer Input */}
          <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 relative">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Write a comment about this reel..."
                className="w-full pl-3 pr-9 py-1.5 text-xs bg-white border border-gray-200 rounded-full focus:outline-none focus:border-[#1877F2]"
              />
              <button
                type="submit"
                disabled={!commentInput.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-[#1877F2] disabled:text-gray-300 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
}
