import React, { useState, useEffect, useRef, useCallback } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { 
  Plus, 
  Sparkles, 
  X, 
  Heart, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Loader2
} from "lucide-react";

interface StoriesProps {
  currentUser: { name: string; avatar: string };
}

export interface StoryItem {
  id: string | number;
  ani_id?: string | number;
  mal_id?: string | number;
  slug?: string;
  title: string;
  poster: string;
  backdrop?: string;
  score?: number | string;
  genres?: string[];
  description?: string;
  dicebearAvatar: string;
}

// Generate unique DiceBear adventurer avatar URL for each anime story
function getDiceBearAvatar(seed: string): string {
  const cleanSeed = encodeURIComponent(seed || "AniBook_Anime");
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${cleanSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

export function StoriesSkeleton() {
  return (
    <div className="w-full max-w-full min-w-0 flex gap-2 sm:gap-2.5 overflow-x-auto pb-1.5 scrollbar-none select-none" id="stories-skeleton-row">
      {/* Create story item skeleton */}
      <div className="relative flex flex-col w-24 h-40 sm:w-28 sm:h-44 md:w-32 md:h-48 shrink-0 bg-gray-900 rounded-2xl overflow-hidden animate-pulse border border-[#30363d]">
        <div className="h-[70%] w-full bg-[#21262d]" />
        <div className="relative flex-1 bg-[#161b22] pt-4 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-[#30363d] -top-4 absolute left-1/2 -translate-x-1/2 border-2 border-[#161b22]" />
          <div className="h-3 bg-[#30363d] rounded-md w-14 mt-1 mx-auto" />
        </div>
      </div>
      {/* 5 Shimmering Anime Story skeleton cards */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={`story-skel-${i}`}
          className="relative flex flex-col w-24 h-40 sm:w-28 sm:h-44 md:w-32 md:h-48 shrink-0 rounded-2xl overflow-hidden bg-gray-900 animate-pulse border border-[#30363d]"
        >
          <div className="absolute top-2.5 left-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#30363d] border-2 border-[#161b22] shadow-xs" />
          <div className="absolute bottom-2.5 left-2.5 right-2.5 space-y-1.5">
            <div className="h-3 bg-[#30363d] rounded-md w-5/6" />
            <div className="h-2.5 bg-[#30363d] rounded-md w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Fallback initial stories featuring popular AniReels with custom DiceBear avatars
const FALLBACK_STORIES: StoryItem[] = [
  {
    id: "solo-leveling",
    ani_id: "151807",
    mal_id: "52299",
    slug: "solo-leveling",
    title: "Solo Leveling",
    poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1gdaeNcCpHt.png",
    score: "8.7",
    genres: ["Action", "Fantasy"],
    description: "Sung Jinwoo wakes up in a hospital bed with a mysterious quest window visible only to him.",
    dicebearAvatar: getDiceBearAvatar("Solo Leveling")
  },
  {
    id: "jujutsu-kaisen",
    ani_id: "145064",
    mal_id: "51009",
    slug: "jujutsu-kaisen-2nd-season",
    title: "Jujutsu Kaisen S2",
    poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx145064-7W4i8mY4tY3B.jpg",
    score: "8.8",
    genres: ["Action", "Supernatural"],
    description: "Yuji Itadori and his friends battle ancient curses in Shibuya.",
    dicebearAvatar: getDiceBearAvatar("Jujutsu Kaisen S2")
  },
  {
    id: "demon-slayer",
    ani_id: "166240",
    mal_id: "55959",
    slug: "demon-slayer-kimetsu-no-yaiba-hashira-training-arc",
    title: "Demon Slayer: Hashira",
    poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx166240-E90U7qV1a7aE.jpg",
    score: "8.6",
    genres: ["Action", "Historical"],
    description: "Tanjiro trains alongside the Hashira in preparation for the final battle.",
    dicebearAvatar: getDiceBearAvatar("Demon Slayer Hashira")
  },
  {
    id: "frieren",
    ani_id: "154587",
    mal_id: "52991",
    slug: "frieren-beyond-journeys-end",
    title: "Frieren: Beyond End",
    poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-n1HJZkJr9X7K.jpg",
    score: "9.3",
    genres: ["Adventure", "Fantasy"],
    description: "An elf mage re-examines the meaning of human connections after defeating the Demon King.",
    dicebearAvatar: getDiceBearAvatar("Frieren Beyond End")
  },
  {
    id: "chainsaw-man",
    ani_id: "127230",
    mal_id: "44511",
    slug: "chainsaw-man",
    title: "Chainsaw Man",
    poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx127230-FloXFs2zH5sC.png",
    score: "8.5",
    genres: ["Action", "Supernatural"],
    description: "Denji lives a life of poverty, paying off his deceased father's debt with Pochita.",
    dicebearAvatar: getDiceBearAvatar("Chainsaw Man")
  },
  {
    id: "one-piece",
    ani_id: "21",
    mal_id: "21",
    slug: "one-piece",
    title: "One Piece",
    poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/nx21-tXMN3l1fTilm.jpg",
    score: "8.9",
    genres: ["Action", "Adventure"],
    description: "Luffy and the Straw Hat Pirates set sail in search of the legendary One Piece treasure.",
    dicebearAvatar: getDiceBearAvatar("One Piece")
  }
];

const STORY_CLIP_DURATION = 20; // Exactly 20 seconds auto swipe per story

export default function Stories({ currentUser }: StoriesProps) {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);

  // Story playback timer & states for Facebook-style Story viewer
  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [isStreamLoading, setIsStreamLoading] = useState<boolean>(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);

  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Fetch stories / reels from backend or fall back to curated list
  useEffect(() => {
    let isMounted = true;

    async function loadPopularStories() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/random-reels?page=1&per_page=8");
        if (!res.ok) throw new Error("Reels endpoint returned " + res.status);
        const json = await res.json();
        
        const rawList = json.reels || (Array.isArray(json) ? json : json.data || []);

        if (rawList && rawList.length > 0) {
          const processedList: StoryItem[] = rawList.map((item: any, idx: number) => {
            const aniId = item.ani_id || item.id || "";
            const title = item.title?.english || item.title?.romaji || item.title || item.name || `AniReel #${idx + 1}`;
            const posterImg = item.poster || item.cover || item.image || item.backdrop || "";

            return {
              id: item.id || item.originalId || `reel-${idx}`,
              ani_id: aniId,
              mal_id: item.mal_id,
              slug: item.slug || (typeof title === "string" ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : ""),
              title: typeof title === "string" ? title : "AniReel",
              poster: posterImg,
              backdrop: item.backdrop || posterImg,
              score: item.score || item.rating || "8.5",
              genres: item.genres || ["Anime", "Reels"],
              description: item.description || item.synopsis || "",
              dicebearAvatar: getDiceBearAvatar(title)
            };
          });

          if (isMounted && processedList.length > 0) {
            setStories(processedList);
          }
        } else {
          if (isMounted) setStories(FALLBACK_STORIES);
        }
      } catch (e) {
        console.warn("[STORIES] Using fallback AniReels stories", e);
        if (isMounted) setStories(FALLBACK_STORIES);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPopularStories();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayList = stories.length > 0 ? stories : FALLBACK_STORIES;
  const currentStory = activeStoryIndex !== null ? displayList[activeStoryIndex] : null;

  // Next & Previous Story Handlers (Left / Right swipe)
  const handleNextStory = useCallback(() => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex < displayList.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else {
      // Loop back to start or finish stories
      setActiveStoryIndex(0);
    }
  }, [activeStoryIndex, displayList.length]);

  const handlePrevStory = useCallback(() => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    } else {
      setActiveStoryIndex(displayList.length - 1);
    }
  }, [activeStoryIndex, displayList.length]);

  const streamCacheRef = useRef<Record<string, { m3u8: string; subtitles: any[] }>>({});

  // Helper function to fetch and cache stream data for stories
  const fetchAndCacheStream = useCallback(async (story: StoryItem) => {
    const key = story.slug || story.id || story.title;
    if (!key) return null;
    if (streamCacheRef.current[key]) {
      return streamCacheRef.current[key];
    }

    const params = new URLSearchParams({
      id: story.slug || "",
      malId: story.mal_id ? String(story.mal_id) : "",
      aniId: story.ani_id ? String(story.ani_id) : "",
      title: story.title || "",
      server: "auto",
      ep: "1",
      type: "sub"
    });

    try {
      const res = await fetch(`/api/stream?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data?.m3u8) {
        const resData = {
          m3u8: data.data.m3u8,
          subtitles: data.data.subtitles || []
        };
        streamCacheRef.current[key] = resData;
        return resData;
      }
    } catch (err) {
      console.warn("[STORY STREAM PRELOAD FAILED]", key, err);
    }
    return null;
  }, []);

  // Preload all stories in background as soon as displayList is available
  useEffect(() => {
    if (displayList && displayList.length > 0) {
      displayList.forEach((story, idx) => {
        setTimeout(() => {
          fetchAndCacheStream(story);
        }, idx * 150);
      });
    }
  }, [displayList, fetchAndCacheStream]);

  // Fetch or serve cached stream for current active story
  useEffect(() => {
    if (activeStoryIndex === null || !currentStory) {
      setStreamUrl(null);
      setSubtitles([]);
      setIsVideoPlaying(false);
      return;
    }

    let isSubscribed = true;
    const key = currentStory.slug || currentStory.id || currentStory.title;

    setProgress(0);
    setIsVideoPlaying(false);

    // Serve immediately from cache if available
    if (key && streamCacheRef.current[key]) {
      const cached = streamCacheRef.current[key];
      setStreamUrl(cached.m3u8);
      setSubtitles(cached.subtitles);
      setIsStreamLoading(false);
    } else {
      setIsStreamLoading(true);
      fetchAndCacheStream(currentStory).then((data) => {
        if (!isSubscribed) return;
        if (data) {
          setStreamUrl(data.m3u8);
          setSubtitles(data.subtitles);
        } else {
          setStreamUrl(null);
          setSubtitles([]);
        }
        setIsStreamLoading(false);
      });
    }

    // Preload next story in sequence
    const nextIdx = (activeStoryIndex + 1) % displayList.length;
    if (displayList[nextIdx]) {
      fetchAndCacheStream(displayList[nextIdx]);
    }

    return () => {
      isSubscribed = false;
    };
  }, [activeStoryIndex, currentStory, displayList, fetchAndCacheStream]);

  // Video.js Initialization for Story playback with Subtitles Support
  useEffect(() => {
    if (!videoContainerRef.current || !streamUrl) return;

    if (playerRef.current && !playerRef.current.isDisposed()) {
      try {
        playerRef.current.dispose();
      } catch {
        // ignore
      }
      playerRef.current = null;
    }

    const proxiedM3u8 = streamUrl.startsWith("http")
      ? `/api/m3u8-proxy?url=${encodeURIComponent(streamUrl)}`
      : streamUrl;

    const isMp4 = streamUrl.toLowerCase().includes(".mp4") || !streamUrl.toLowerCase().includes(".m3u8");

    // Filter and map English/Subtitle tracks for Video.js
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tracks = (subtitles || [])
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
    videoElement.classList.add("vjs-default-skin", "w-full", "h-full", "object-contain");
    videoElement.setAttribute("playsinline", "true");
    videoElement.setAttribute("webkit-playsinline", "true");
    videoElement.setAttribute("preload", "auto");
    videoContainerRef.current.appendChild(videoElement);

    const videoJsOptions = {
      autoplay: true,
      controls: false,
      loop: false,
      muted: isMuted,
      playsinline: true,
      preload: "auto",
      fluid: true,
      responsive: true,
      sources: [
        {
          src: proxiedM3u8,
          type: isMp4 ? "video/mp4" : "application/x-mpegURL"
        }
      ],
      tracks: tracks
    };

    let isSeeking = false;
    const player = (playerRef.current = videojs(videoElement, videoJsOptions, function onPlayerReady() {
      player.muted(isMuted);
      player.play().catch(() => {
        player.muted(true);
        setIsMuted(true);
        player.play().catch(() => {});
      });
    }));

    const enableDefaultSubtitle = () => {
      const textTracks = player.textTracks();
      let activated = false;
      for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        if (track.kind === "subtitles" || track.kind === "captions") {
          if (!activated || track.default) {
            track.mode = "showing";
            activated = true;
          } else {
            track.mode = "disabled";
          }
        }
      }
    };

    const setupClipTimestamp = () => {
      if (isSeeking) return;
      const dur = player.duration();
      if (dur && !isNaN(dur) && dur > 10) {
        isSeeking = true;
        const targetTime = Math.min(dur * 0.3, Math.max(0, dur - 15));
        try {
          player.currentTime(targetTime);
          player.play().catch(() => {
            player.muted(true);
            setIsMuted(true);
            player.play().catch(() => {});
          });
        } catch {
          // ignore
        }
      }
    };

    player.on("playing", () => {
      setIsVideoPlaying(true);
    });

    player.on("waiting", () => {
      setIsVideoPlaying(false);
    });

    player.on("loadedmetadata", () => {
      setupClipTimestamp();
      enableDefaultSubtitle();
    });

    player.on("canplay", () => {
      setupClipTimestamp();
      enableDefaultSubtitle();
    });

    player.on("ended", () => {
      handleNextStory();
    });

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        try {
          playerRef.current.dispose();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [streamUrl, subtitles, handleNextStory]);

  // Sync Pause & Mute controls with Video.js player instance
  useEffect(() => {
    if (playerRef.current && !playerRef.current.isDisposed()) {
      try {
        if (isPaused) {
          playerRef.current.pause();
        } else {
          playerRef.current.play().catch(() => {});
        }
      } catch {
        // ignore
      }
    }
  }, [isPaused]);

  useEffect(() => {
    if (playerRef.current && !playerRef.current.isDisposed()) {
      try {
        playerRef.current.muted(isMuted);
      } catch {
        // ignore
      }
    }
  }, [isMuted]);

  // 20-Second Auto-Swipe Timer (Facebook Story Progress Bar)
  useEffect(() => {
    if (activeStoryIndex === null || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = 50;
    const increment = (intervalMs / (STORY_CLIP_DURATION * 1000)) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timerRef.current);
          handleNextStory();
          return 100;
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeStoryIndex, isPaused, handleNextStory]);

  // Handle escape & arrow keys for story navigation
  useEffect(() => {
    if (activeStoryIndex !== null) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setActiveStoryIndex(null);
        } else if (e.key === "ArrowRight") {
          handleNextStory();
        } else if (e.key === "ArrowLeft") {
          handlePrevStory();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = origOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [activeStoryIndex, handleNextStory, handlePrevStory]);

  if (isLoading) {
    return <StoriesSkeleton />;
  }

  return (
    <>
      {/* Top Stories Row */}
      <div className="w-full max-w-full min-w-0 flex gap-2 sm:gap-2.5 overflow-x-auto pb-1.5 scrollbar-none select-none" id="stories-section">
        {/* Create Story Card (Active User) */}
        <div className="relative flex flex-col w-24 h-40 sm:w-28 sm:h-44 md:w-32 md:h-48 shrink-0 bg-[#161b22] rounded-2xl shadow-sm border border-[#30363d] overflow-hidden group cursor-pointer hover:shadow-md transition-all duration-200">
          <div className="h-[70%] w-full overflow-hidden bg-[#21262d]">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://api.dicebear.com/9.x/adventurer/svg?seed=OtakuExplorer_MainUser&backgroundColor=b6e3f4";
              }}
            />
          </div>
          <div className="relative flex-1 bg-[#161b22] pt-4 sm:pt-5 pb-2 text-center flex flex-col justify-center">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1877F2] text-white border-[3px] sm:border-4 border-[#161b22] shadow-md group-hover:scale-110 transition-transform duration-200">
              <Plus className="h-4.5 w-4.5 sm:h-5 sm:w-5 font-bold" />
            </div>
            <span className="block text-[10px] sm:text-[11px] font-bold text-gray-200 leading-tight">
              Create Story
            </span>
          </div>
        </div>

        {/* Popular AniReels Stories with DiceBear Avatars */}
        {displayList.map((story, index) => (
          <div
            key={story.id}
            onClick={() => setActiveStoryIndex(index)}
            className="relative flex flex-col w-24 h-40 sm:w-28 sm:h-44 md:w-32 md:h-48 shrink-0 rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-[#30363d] bg-gray-950"
          >
            {/* Anime Poster */}
            <img
              src={story.poster}
              alt={`${story.title} Poster`}
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500 ease-out"
              referrerPolicy="no-referrer"
              loading="lazy"
            />

            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/10 to-black/85 pointer-events-none" />

            {/* Top Avatar of Anime Card using DiceBear */}
            <div className="absolute top-2.5 left-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[#1877F2] overflow-hidden bg-gray-900 shadow-md ring-2 ring-white/30 shrink-0">
              <img
                src={story.dicebearAvatar}
                alt={`${story.title} DiceBear Avatar`}
                className="w-full h-full object-cover bg-blue-50"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Title at the bottom limited to 1 line with truncation */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 pointer-events-none">
              <span 
                className="block text-[10px] sm:text-[11px] font-extrabold text-white leading-tight truncate drop-shadow-md"
                title={story.title}
              >
                {story.title}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Facebook-Style Stories Viewer Modal with 20s Auto-Swipe & Video.js Player */}
      {activeStoryIndex !== null && currentStory && (
        <div 
          className="fixed inset-0 z-50 bg-black flex items-center justify-center p-0 sm:py-6 sm:px-4 select-none h-screen h-[100dvh] w-screen overflow-hidden"
          onClick={() => setActiveStoryIndex(null)}
        >
          {/* Custom CSS overrides to hide default Video.js chrome, style subtitles with text-shadow (no bg box), & ensure clean framing */}
          <style dangerouslySetInnerHTML={{ __html: `
            .vjs-loading-spinner, .vjs-big-play-button, .vjs-control-bar {
              display: none !important;
            }
            .video-js {
              background-color: transparent !important;
              width: 100% !important;
              height: 100% !important;
            }
            .video-js video {
              object-fit: contain !important;
            }
            .vjs-text-track-display {
              pointer-events: none !important;
              bottom: 3.5rem !important;
            }
            .vjs-text-track-cue {
              background: transparent !important;
              background-color: transparent !important;
              color: #ffffff !important;
              font-size: 15px !important;
              font-weight: 800 !important;
              padding: 2px 4px !important;
              text-shadow: 0 0 6px #000, 0 0 10px #000, 1px 1px 3px #000, -1px -1px 3px #000, 1px -1px 3px #000, -1px 1px 3px #000 !important;
              -webkit-text-stroke: 0.5px rgba(0, 0, 0, 0.8) !important;
            }
          `}} />

          {/* Story Card Container - Fullscreen on Mobile (no space on all sides), floating card on desktop */}
          <div 
            className="relative w-full h-full h-screen h-[100dvh] sm:h-[92vh] max-w-md sm:max-w-lg bg-black sm:rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between border-x sm:border border-white/10 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {/* 1. Facebook Multi-Segment Top Progress Bars (20s duration) */}
            <div className="absolute top-0 left-0 right-0 z-30 p-3 pt-3 bg-gradient-to-b from-black/90 via-black/50 to-transparent space-y-2">
              <div className="flex gap-1.5 w-full">
                {displayList.map((st, idx) => {
                  let barWidth = "0%";
                  if (idx < activeStoryIndex) {
                    barWidth = "100%";
                  } else if (idx === activeStoryIndex) {
                    barWidth = `${progress}%`;
                  }
                  return (
                    <div 
                      key={st.id || idx}
                      className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-xs"
                    >
                      <div 
                        className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                        style={{ width: barWidth }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Story Header: DiceBear Avatar, Title, AniReel timestamp tag */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-[#1877F2] overflow-hidden shadow-lg shrink-0 bg-blue-100">
                    <img 
                      src={currentStory.dicebearAvatar} 
                      alt={currentStory.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-bold text-xs sm:text-sm leading-tight truncate drop-shadow-md">
                      {currentStory.title}
                    </h4>
                    <span className="text-blue-400 text-[10px] sm:text-[11px] font-bold flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      <span>AniReel Story • Video.js Clip</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Play/Pause toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPaused(!isPaused);
                    }}
                    className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                    title={isPaused ? "Resume story" : "Pause story"}
                  >
                    {isPaused ? <Play className="h-4 w-4 fill-white" /> : <Pause className="h-4 w-4 fill-white" />}
                  </button>

                  {/* Sound Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMuted(!isMuted);
                    }}
                    className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-white" />}
                  </button>

                  {/* Close button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveStoryIndex(null);
                    }}
                    className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                    title="Close story"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Story Video Stage powered by Video.js */}
            <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden py-14 sm:py-16 px-3">
              {/* Video.js Player Container */}
              <div 
                ref={videoContainerRef}
                className="w-full h-full relative z-10 flex items-center justify-center overflow-hidden scale-90 sm:scale-95 max-h-[86%] rounded-2xl"
              />

              {/* Loader Overlay - Solid Black Background with Centered Spinner Only when Video is Not Playing */}
              {(!isVideoPlaying || isStreamLoading || !streamUrl) && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black p-6 text-center text-white">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 text-[#1877F2] animate-spin" />
                    <span className="text-xs font-bold text-gray-300">Loading AniReel Story...</span>
                  </div>
                </div>
              )}

              {/* Tap Left to Swipe Previous / Tap Right to Swipe Next */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevStory();
                }}
                className="absolute left-0 top-16 bottom-20 w-1/3 z-20 cursor-pointer"
                title="Previous Story"
              />
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextStory();
                }}
                className="absolute right-0 top-16 bottom-20 w-1/3 z-20 cursor-pointer"
                title="Next Story"
              />

              {/* Pause Indicator overlay on long press */}
              {isPaused && (
                <div className="absolute z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full text-white font-extrabold text-xs flex items-center gap-2 border border-white/20 shadow-xl pointer-events-none">
                  <Pause className="h-4 w-4 fill-white" /> Paused
                </div>
              )}
            </div>

            {/* 3. Story Interactive Reaction Footer */}
            <div className="absolute bottom-0 left-0 right-0 z-30 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Reply to ${currentStory.title}...`}
                  className="flex-1 bg-white/15 hover:bg-white/20 text-white placeholder-gray-400 text-xs rounded-full px-4 py-2 border border-white/20 focus:outline-none focus:border-blue-400 transition-all"
                />
                <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-rose-500 transition-colors cursor-pointer">
                  <Heart className="h-5 w-5 fill-rose-500" />
                </button>
                <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-amber-400 transition-colors cursor-pointer">
                  👍
                </button>
                <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-yellow-400 transition-colors cursor-pointer">
                  🔥
                </button>
              </div>
            </div>

            {/* Left & Right Chevrons for Desktop Swiping */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevStory();
              }}
              className="hidden sm:flex absolute -left-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white items-center justify-center backdrop-blur-md transition-all cursor-pointer z-40"
              title="Previous Story"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextStory();
              }}
              className="hidden sm:flex absolute -right-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white items-center justify-center backdrop-blur-md transition-all cursor-pointer z-40"
              title="Next Story"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
