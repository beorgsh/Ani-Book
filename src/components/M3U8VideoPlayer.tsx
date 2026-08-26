import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, AlertCircle, Loader2, Sparkles, Tv, Check } from "lucide-react";
import { AnimeEpisode } from "../types";

interface M3U8VideoPlayerProps {
  episode: AnimeEpisode;
  animeTitle?: string;
  aniId?: string | number;
  slug?: string;
  poster?: string;
  onBackToImage?: () => void;
  streamType?: "sub" | "dub";
  is_dub?: number;
}

export default function M3U8VideoPlayer({
  episode,
  animeTitle = "Anime Episode",
  aniId = "21",
  slug = "one-piece",
  poster,
  onBackToImage,
  streamType = "sub",
  is_dub
}: M3U8VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [activeTrackIndex, setActiveTrackIndex] = useState<number>(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  // Derive target identifier for stream endpoint
  const targetId = slug || (aniId ? `anime-${aniId}` : "one-piece");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setStreamUrl(null);

    async function resolveStream() {
      // Validate Dub availability first
      if (streamType === "dub") {
        const parsedDubCount = typeof is_dub === "number" ? is_dub : parseInt(String(is_dub || "0"), 10);
        if (parsedDubCount > 0 && episode.number > parsedDubCount) {
          if (isMounted) {
            setError(`🎙️ English Dub for Episode ${episode.number} is unavailable. Only Episodes 1-${parsedDubCount} are dubbed for this series. Please toggle to SUB in the sidebar.`);
            setLoading(false);
          }
          return;
        } else if (!is_dub || parsedDubCount === 0) {
          if (isMounted) {
            setError(`🎙️ Dub format is currently unavailable for Episode ${episode.number}. Please toggle the audio format to SUB in the sidebar.`);
            setLoading(false);
          }
          return;
        }
      }

      try {
        // Try requesting stream source from server proxy with targetId or title slug
        const candidates = [
          targetId,
          animeTitle ? animeTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : null,
          slug,
          aniId ? `anime-${aniId}` : null
        ].filter(Boolean) as string[];

        let foundM3u8: string | null = null;
        let foundSubtitles: any[] = [];

        for (const candidateSlug of Array.from(new Set(candidates))) {
          if (!candidateSlug || foundM3u8) break;

          try {
            const res = await fetch(`/api/stream?id=${encodeURIComponent(candidateSlug)}&ep=${episode.number}&type=${streamType}`);
            if (res.ok) {
              const data = await res.json();
              const rawUrl = 
                data?.data?.m3u8 || 
                data?.m3u8 || 
                data?.result?.sources?.[0]?.url || 
                data?.sources?.[0]?.url || 
                data?.data?.sources?.[0]?.url;

              if (rawUrl && typeof rawUrl === "string") {
                foundM3u8 = rawUrl;
                foundSubtitles = data?.data?.subtitles || data?.subtitles || [];
                break;
              }
            }
          } catch {
            // Try next candidate
          }
        }

        if (foundM3u8 && isMounted) {
          const finalM3u8 = foundM3u8.includes(".m3u8")
            ? `/api/m3u8-proxy?url=${encodeURIComponent(foundM3u8)}`
            : foundM3u8;
          setStreamUrl(finalM3u8);
          setSubtitles(foundSubtitles);
          setLoading(false);
          return;
        }

        if (isMounted) {
          setError(`Episode ${episode.number} (${streamType.toUpperCase()}) stream source currently buffering or unavailable.`);
          setLoading(false);
        }
      } catch (err: any) {
        console.warn("[M3U8 RESOLVER WARN]", err);
        if (isMounted) {
          setError(`Stream playback error for Episode ${episode.number} (${streamType.toUpperCase()})`);
          setLoading(false);
        }
      }
    }

    resolveStream();

    return () => {
      isMounted = false;
    };
  }, [episode.number, episode.id, targetId, streamType, is_dub]);

  // Attach HLS stream to HTML5 Video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.warn("[HLS FATAL ERROR]", data.type);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setError("Stream playback error");
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari iOS/Mac)
      video.src = streamUrl;
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      setError("HLS playback is not supported on this browser");
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl]);

  // Auto-enable first/default subtitle track once metadata is loaded or when subtitles/streamUrl are changed
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl || subtitles.length === 0) return;

    const handleTracksLoaded = () => {
      const textTracks = video.textTracks;
      let hasActivated = false;
      let activeIndex = -1;
      for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        if (track.kind === "captions" || track.kind === "subtitles") {
          // If the matching subtitle in subtitles array has default: true, or if no track has been activated yet
          const matchedSub = subtitles[i];
          if ((matchedSub && matchedSub.default) || !hasActivated) {
            track.mode = "showing";
            hasActivated = true;
            activeIndex = i;
          } else {
            track.mode = "disabled";
          }
        }
      }
      setActiveTrackIndex(activeIndex);
    };

    video.addEventListener("loadedmetadata", handleTracksLoaded);
    // Trigger immediately in case metadata is already loaded
    handleTracksLoaded();

    return () => {
      video.removeEventListener("loadedmetadata", handleTracksLoaded);
    };
  }, [subtitles, streamUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div 
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden group select-none"
      onMouseMove={() => setShowControls(true)}
      id="m3u8-video-player-container"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={episode.image || poster}
        className="w-full h-full max-h-[85vh] object-contain"
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            setDuration(videoRef.current.duration || 0);
          }
        }}
        onEnded={() => setIsPlaying(false)}
        onClick={togglePlay}
        playsInline
      >
        {subtitles.map((sub, idx) => (
          <track
            key={idx}
            src={`/api/m3u8-proxy?url=${encodeURIComponent(sub.file)}`}
            label={sub.label || `Track ${idx + 1}`}
            kind={sub.kind || "captions"}
            srcLang={(sub.label || "en").substring(0, 2).toLowerCase()}
            default={!!sub.default}
          />
        ))}
      </video>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 text-white z-20">
          <Loader2 className="w-10 h-10 text-[#1877F2] animate-spin" />
          <div className="text-center space-y-1">
            <p className="font-bold text-sm">Loading Episode Stream...</p>
            <p className="text-xs text-gray-400">EP {episode.number}: {episode.title}</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && !loading && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3 text-white z-20 p-4">
          <AlertCircle className="w-10 h-10 text-amber-500" />
          <p className="text-sm font-bold">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#1877F2] text-white rounded-full text-xs font-bold hover:bg-blue-600 transition-colors"
          >
            Retry Stream
          </button>
        </div>
      )}

      {/* Center Play/Pause Big Floating Button when Paused */}
      {!isPlaying && !loading && !error && (
        <button
          onClick={togglePlay}
          className="absolute z-20 w-16 h-16 rounded-full bg-[#1877F2]/90 hover:bg-[#1877F2] text-white flex items-center justify-center shadow-2xl backdrop-blur-sm transition-transform hover:scale-110 cursor-pointer"
        >
          <Play className="w-8 h-8 fill-white ml-1" />
        </button>
      )}

      {/* Custom Video Controls Bar */}
      <div className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2 z-20 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {/* Progress Bar with Blue Line Fill & Single Blue Dot Handle */}
        {(() => {
          const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
          return (
            <div className="relative w-full flex items-center py-1.5 group/progress">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                style={{
                  background: `linear-gradient(to right, #1877F2 0%, #1877F2 ${progressPercent}%, rgba(255, 255, 255, 0.25) ${progressPercent}%, rgba(255, 255, 255, 0.25) 100%)`
                }}
                className="w-full h-1 rounded-full appearance-none cursor-pointer focus:outline-none transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:h-0"
              />
              {/* Single Floating Blue Dot Handle */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#1877F2] border-2 border-white rounded-full shadow-md pointer-events-none transition-transform group-hover/progress:scale-125"
                style={{ left: `calc(${Math.min(Math.max(progressPercent, 0), 100)}% - 6px)` }}
              />
            </div>
          );
        })()}

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-3">
            <button 
              onClick={togglePlay} 
              className="hover:text-blue-400 transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            <button 
              onClick={toggleMute} 
              className="hover:text-blue-400 transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <span className="font-medium text-[11px] text-gray-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {subtitles.length > 0 && (
              <div className="relative group/sub">
                <button 
                  className="hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-[10px] font-bold"
                  title="Subtitles / Captions"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>CC</span>
                </button>
                {/* Dropdown list */}
                <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover/sub:flex flex-col bg-black/95 border border-white/10 rounded py-1 min-w-[120px] shadow-2xl z-30">
                  {subtitles.map((sub, i) => {
                    const isSelected = activeTrackIndex === i;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          const video = videoRef.current;
                          if (!video) return;
                          const tracks = video.textTracks;
                          for (let t = 0; t < tracks.length; t++) {
                            tracks[t].mode = t === i ? "showing" : "disabled";
                          }
                          setActiveTrackIndex(i);
                        }}
                        className={`px-3 py-1.5 text-left text-[11px] hover:bg-white/10 transition-colors w-full flex items-center justify-between ${
                          isSelected ? "text-[#1877F2] font-bold" : "text-gray-300"
                        }`}
                      >
                        <span>{sub.label || `Track ${i + 1}`}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#1877F2]" />}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => {
                      const video = videoRef.current;
                      if (!video) return;
                      const tracks = video.textTracks;
                      for (let t = 0; t < tracks.length; t++) {
                        tracks[t].mode = "disabled";
                      }
                      setActiveTrackIndex(-1);
                    }}
                    className="px-3 py-1.5 text-left text-[11px] hover:bg-white/10 text-gray-400 transition-colors w-full border-t border-white/5"
                  >
                    Off
                  </button>
                </div>
              </div>
            )}

            <span className="bg-red-600/80 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded tracking-wider">
              HLS M3U8
            </span>
            <button 
              onClick={toggleFullscreen} 
              className="hover:text-blue-400 transition-colors cursor-pointer"
              title="Fullscreen"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
