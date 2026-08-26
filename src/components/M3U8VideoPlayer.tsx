import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, AlertCircle, Loader2, Sparkles, Tv, Check, Server, Radio, ArrowRightLeft } from "lucide-react";
import { AnimeEpisode } from "../types";

export interface M3U8VideoPlayerProps {
  episode: AnimeEpisode;
  animeTitle?: string;
  aniId?: string | number;
  malId?: string | number;
  slug?: string;
  poster?: string;
  onBackToImage?: () => void;
  streamType?: "sub" | "dub";
  is_dub?: number;
}

const SERVER_ORDER = [
  { id: "hd-1", label: "HD-1", provider: "Anikoto", badge: "HD 1" },
  { id: "hd-2", label: "HD-2", provider: "Anikoto", badge: "HD 2" },
  { id: "anineko-hd-1", label: "AniNeko 1", provider: "AniNeko (MAL)", badge: "AniNeko 1" },
  { id: "anineko-hd-2", label: "AniNeko 2", provider: "AniNeko (MAL)", badge: "AniNeko 2" }
];

export default function M3U8VideoPlayer({
  episode,
  animeTitle = "Anime Episode",
  aniId = "21",
  malId,
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

  // Server switching states
  const [selectedServer, setSelectedServer] = useState<string>("auto");
  const [activeServerName, setActiveServerName] = useState<string>("HD-1");
  const [autoSwitchNotice, setAutoSwitchNotice] = useState<string | null>(null);
  const [isServerMenuOpen, setIsServerMenuOpen] = useState(false);
  const [retryAttemptCount, setRetryAttemptCount] = useState(0);

  // Derive target identifier for stream endpoint
  const targetId = slug || (aniId ? `anime-${aniId}` : "one-piece");

  // Auto server failover index tracker
  const currentFailoverIndexRef = useRef<number>(0);
  const isAutoSwitchingRef = useRef<boolean>(false);

  const switchServerAndRetry = useCallback((targetServerId: string, reason?: string) => {
    if (reason) {
      const serverObj = SERVER_ORDER.find(s => s.id === targetServerId);
      const name = serverObj ? `${serverObj.label} (${serverObj.provider})` : targetServerId;
      setAutoSwitchNotice(`⚡ ${reason} ➜ Auto-switching to ${name}...`);
      setTimeout(() => {
        setAutoSwitchNotice(null);
      }, 4000);
    }
    setSelectedServer(targetServerId);
    setRetryAttemptCount(prev => prev + 1);
  }, []);

  const triggerNextServerFailover = useCallback((failedServer: string) => {
    if (isAutoSwitchingRef.current) return;
    isAutoSwitchingRef.current = true;

    // Find current index in SERVER_ORDER
    let currIdx = SERVER_ORDER.findIndex(s => s.id === failedServer || failedServer.toLowerCase().includes(s.id.replace("-", "")));
    if (currIdx === -1) currIdx = currentFailoverIndexRef.current;

    const nextIdx = currIdx + 1;
    if (nextIdx < SERVER_ORDER.length) {
      currentFailoverIndexRef.current = nextIdx;
      const nextServer = SERVER_ORDER[nextIdx];
      console.log(`[STREAM AUTO SWITCH] Failover triggered: ${failedServer} failed. Switching to ${nextServer.id}`);
      switchServerAndRetry(nextServer.id, `${failedServer.toUpperCase()} error`);
    } else {
      setError(`All stream servers (HD-1, HD-2, AniNeko) are currently unavailable for Episode ${episode.number}.`);
      setLoading(false);
    }

    setTimeout(() => {
      isAutoSwitchingRef.current = false;
    }, 1500);
  }, [episode.number, switchServerAndRetry]);

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
            setError(`🎙️ English Dub for Episode ${episode.number} is unavailable. Only Episodes 1-${parsedDubCount} are dubbed for this series. Please toggle to SUB.`);
            setLoading(false);
          }
          return;
        } else if (!is_dub || parsedDubCount === 0) {
          if (isMounted) {
            setError(`🎙️ Dub format is currently unavailable for Episode ${episode.number}. Please toggle audio to SUB.`);
            setLoading(false);
          }
          return;
        }
      }

      try {
        const queryParams = new URLSearchParams({
          id: targetId,
          malId: malId ? String(malId) : "",
          aniId: aniId ? String(aniId) : "",
          title: animeTitle || "",
          server: selectedServer,
          ep: String(episode.number),
          type: streamType
        });

        const res = await fetch(`/api/stream?${queryParams.toString()}`);
        if (!res.ok) {
          throw new Error(`Stream API returned status ${res.status}`);
        }

        const data = await res.json();
        const rawUrl = 
          data?.data?.m3u8 || 
          data?.m3u8 || 
          data?.result?.sources?.[0]?.url || 
          data?.sources?.[0]?.url || 
          data?.data?.sources?.[0]?.url;

        if (rawUrl && typeof rawUrl === "string" && isMounted) {
          const finalM3u8 = rawUrl.includes(".m3u8")
            ? `/api/m3u8-proxy?url=${encodeURIComponent(rawUrl)}`
            : rawUrl;
          setStreamUrl(finalM3u8);
          setSubtitles(data?.data?.subtitles || data?.subtitles || []);
          setActiveServerName(data?.data?.server || (selectedServer === "auto" ? "HD-1" : selectedServer.toUpperCase()));
          setLoading(false);
          return;
        }

        throw new Error(data?.error || "Stream returned empty source");
      } catch (err: any) {
        console.warn("[M3U8 RESOLVER FAILED]", err.message);
        if (isMounted) {
          // If in auto mode or early server, auto switch to next fallback server
          const currentTriedServer = selectedServer === "auto" ? "hd-1" : selectedServer;
          triggerNextServerFailover(currentTriedServer);
        }
      }
    }

    resolveStream();

    return () => {
      isMounted = false;
    };
  }, [episode.number, episode.id, targetId, malId, aniId, animeTitle, streamType, is_dub, selectedServer, retryAttemptCount, triggerNextServerFailover]);

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
          console.warn("[HLS FATAL ERROR]", data.type, data.details);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Network 404 or manifest load error on current server! Auto failover!
              console.log("[HLS NETWORK ERROR] Auto-switching server fallback...");
              triggerNextServerFailover(activeServerName);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              try {
                hls.recoverMediaError();
              } catch {
                triggerNextServerFailover(activeServerName);
              }
              break;
            default:
              hls.destroy();
              triggerNextServerFailover(activeServerName);
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
  }, [streamUrl, activeServerName, triggerNextServerFailover]);

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
        onError={() => {
          if (!loading && streamUrl) {
            console.log("[VIDEO TAG ERROR] Playback failed, auto-switching server...");
            triggerNextServerFailover(activeServerName);
          }
        }}
        onEnded={() => setIsPlaying(false)}
        onClick={togglePlay}
        playsInline
      >
        {subtitles
          .filter((sub) => {
            if (!sub.file || typeof sub.file !== "string") return false;
            const lowerLabel = (sub.label || "").toLowerCase();
            const lowerKind = (sub.kind || "").toLowerCase();
            return lowerKind !== "thumbnails" && !lowerLabel.includes("thumbnail") && !lowerLabel.includes("sprite");
          })
          .map((sub, idx) => (
            <track
              key={idx}
              src={`/api/m3u8-proxy?url=${encodeURIComponent(sub.file)}`}
              label={sub.label || `Track ${idx + 1}`}
              kind="subtitles"
              srcLang={(sub.label || "en").substring(0, 2).toLowerCase()}
              default={!!sub.default}
            />
          ))}
      </video>

      {/* Floating Auto-Switch Server Notification Banner */}
      {autoSwitchNotice && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-blue-600/95 text-white px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 border border-white/20 animate-bounce text-xs font-semibold">
          <ArrowRightLeft className="w-3.5 h-3.5 animate-spin" />
          <span>{autoSwitchNotice}</span>
        </div>
      )}

      {/* Top Floating Server Indicator & Switcher */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsServerMenuOpen(!isServerMenuOpen);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-white/90 text-[11px] font-medium border border-white/15 backdrop-blur-md transition-colors cursor-pointer shadow-lg"
            title="Change Streaming Server"
          >
            <Server className="w-3 h-3 text-[#1877F2]" />
            <span>Server: <strong className="text-white font-bold">{activeServerName}</strong></span>
          </button>

          {/* Server Selection Dropdown */}
          {isServerMenuOpen && (
            <div 
              className="absolute top-full right-0 mt-1.5 w-52 bg-gray-900/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-md p-1.5 z-50 text-white flex flex-col gap-1 animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/10 flex items-center justify-between">
                <span>Select Server</span>
                <span className="text-blue-400 lowercase font-normal">auto-failover on</span>
              </div>

              {SERVER_ORDER.map((srv) => {
                const isSelected = selectedServer === srv.id || (selectedServer === "auto" && activeServerName.toLowerCase().includes(srv.id.replace("-", "")));
                return (
                  <button
                    key={srv.id}
                    onClick={() => {
                      setIsServerMenuOpen(false);
                      switchServerAndRetry(srv.id);
                    }}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#1877F2] text-white font-bold shadow-md"
                        : "hover:bg-white/10 text-gray-200"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">{srv.label}</span>
                      <span className={`text-[10px] ${isSelected ? "text-blue-100" : "text-gray-400"}`}>{srv.provider}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}

              <button
                onClick={() => {
                  setIsServerMenuOpen(false);
                  currentFailoverIndexRef.current = 0;
                  switchServerAndRetry("auto");
                }}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer border-t border-white/10 mt-0.5 ${
                  selectedServer === "auto"
                    ? "bg-blue-600/30 text-blue-300 font-bold"
                    : "hover:bg-white/10 text-gray-300"
                }`}
              >
                <div className="flex flex-col">
                  <span>Smart Auto Fallback</span>
                  <span className="text-[10px] text-gray-400">HD-1 ➜ HD-2 ➜ AniNeko</span>
                </div>
                {selectedServer === "auto" && <Radio className="w-3.5 h-3.5 text-blue-400" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading Skeleton Player Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-gray-950 flex flex-col justify-between p-4 sm:p-6 z-20 select-none overflow-hidden">
          {/* Ambient Shimmer Background */}
          <div className="absolute inset-0 bg-gradient-to-tr from-gray-950 via-gray-900 to-black animate-pulse" />
          
          {/* Top Video Header Skeleton */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
              <div className="space-y-1">
                <div className="h-3.5 w-32 rounded bg-white/20 animate-pulse" />
                <div className="h-2.5 w-20 rounded bg-white/10 animate-pulse" />
              </div>
            </div>
            <div className="h-6 w-20 rounded-full bg-white/10 animate-pulse" />
          </div>

          {/* Center Play Pulse & Stream Loader */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-3 my-auto">
            <div className="w-16 h-16 rounded-full bg-black/60 border border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-md">
              <Loader2 className="w-8 h-8 text-[#1877F2] animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-bold text-sm text-white">
                Connecting to {selectedServer === "auto" ? "Stream Server..." : `${selectedServer.toUpperCase()}...`}
              </p>
              <p className="text-xs text-gray-400">EP {episode.number}: {episode.title}</p>
            </div>
          </div>

          {/* Bottom Controls Bar Skeleton */}
          <div className="relative z-10 space-y-2 pt-2">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-[#1877F2] w-1/3 animate-[pulse_1.5s_infinite]" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-white/15 animate-pulse" />
                <div className="w-5 h-5 rounded bg-white/15 animate-pulse" />
                <div className="h-3 w-16 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-12 rounded bg-white/15 animate-pulse" />
                <div className="w-5 h-5 rounded bg-white/15 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Overlay with Server Selection Fallbacks */}
      {error && !loading && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3 text-white z-20 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500" />
          <p className="text-sm font-bold max-w-sm">{error}</p>
          
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {SERVER_ORDER.map((srv) => (
              <button
                key={srv.id}
                onClick={() => switchServerAndRetry(srv.id)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Server className="w-3 h-3 text-blue-400" />
                <span>Try {srv.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              currentFailoverIndexRef.current = 0;
              switchServerAndRetry("auto");
            }}
            className="px-5 py-2 bg-[#1877F2] text-white rounded-full text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg mt-2 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Auto-Fallback (HD-1 ➜ HD-2 ➜ AniNeko)</span>
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

            <button
              onClick={() => setIsServerMenuOpen(!isServerMenuOpen)}
              className="bg-blue-600/80 hover:bg-blue-600 text-white font-bold text-[9px] px-2 py-1 rounded tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
              title="Streaming Server"
            >
              <Server className="w-2.5 h-2.5" />
              <span>{activeServerName}</span>
            </button>

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
