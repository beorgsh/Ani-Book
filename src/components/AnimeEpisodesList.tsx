import React, { useState, useEffect } from "react";
import { Play, Sparkles, Tv, Clock, Star, Search, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { AnimeEpisode } from "../types";

const DICEBEAR_ART_STYLES = [
  "bottts",
  "adventurer",
  "avataaars",
  "lorelei",
  "fun-emoji",
  "pixel-art",
  "big-smile",
  "personas",
  "open-peeps",
  "thumbs",
  "micah",
  "miniavs",
  "notionists",
  "bottts-neutral",
  "shapes"
];

const AVATAR_BG_STYLES = [
  "bg-gradient-to-br from-[#1877F2]/20 to-blue-200 border-blue-300",
  "bg-gradient-to-br from-purple-200 to-indigo-200 border-purple-300",
  "bg-gradient-to-br from-amber-200 to-yellow-200 border-amber-300",
  "bg-gradient-to-br from-emerald-200 to-teal-200 border-emerald-300",
  "bg-gradient-to-br from-rose-200 to-pink-200 border-rose-300",
  "bg-gradient-to-br from-cyan-200 to-sky-200 border-cyan-300",
  "bg-gradient-to-br from-violet-200 to-fuchsia-200 border-violet-300",
  "bg-gradient-to-br from-lime-200 to-emerald-200 border-lime-300"
];

interface AnimeEpisodesListProps {
  aniId?: string | number;
  animeTitle?: string;
  poster?: string;
  onSelectEpisode?: (episode: AnimeEpisode) => void;
  compact?: boolean;
  searchQuery?: string;
  is_sub?: number;
  is_dub?: number;
  streamType?: "sub" | "dub";
  onStreamTypeChange?: (type: "sub" | "dub") => void;
}

export function EpisodesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3.5 w-full min-w-0" id="episodes-skeleton-loader">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={`ep-skeleton-${i}`}
          className="flex gap-2.5 items-start min-w-0"
        >
          <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0 border border-gray-100 animate-pulse" />
          <div className="flex-1 bg-gray-100 rounded-2xl p-3 space-y-2 animate-pulse max-w-[90%]">
            <div className="h-3.5 bg-gray-200 rounded-md w-2/3" />
            <div className="h-2.5 bg-gray-200 rounded-md w-1/3" />
            <div className="w-full max-w-xs aspect-video bg-gray-200 rounded-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnimeEpisodesList({
  aniId,
  animeTitle,
  poster,
  onSelectEpisode,
  compact = false,
  searchQuery = "",
  is_sub,
  is_dub = 0,
  streamType = "sub",
  onStreamTypeChange
}: AnimeEpisodesListProps) {
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEpId, setExpandedEpId] = useState<string | null>(null);

  const effectiveAniId = aniId && String(aniId).trim().length > 0 && String(aniId) !== "undefined" ? String(aniId) : (animeTitle || "episodes");

  useEffect(() => {
    let isMounted = true;

    async function fetchEpisodes() {
      setLoading(true);
      setError(null);

      const targetAniId = aniId && String(aniId).trim().length > 0 && String(aniId) !== "undefined" ? String(aniId) : "";

      try {
        // Request proxy route with both id and title
        let res = await fetch(`/api/anime-episodes?id=${encodeURIComponent(targetAniId)}&title=${encodeURIComponent(animeTitle || "")}`);
        
        if (!res.ok && targetAniId) {
          // Direct fallback to upstream API if ID is explicitly known
          res = await fetch(`https://anime-metadata-api.vercel.app/api/episodes/${encodeURIComponent(targetAniId)}`);
        }

        if (!res.ok) {
          throw new Error(`Episodes API responded with ${res.status}`);
        }

        const data = await res.json();
        let epList = Array.isArray(data?.data?.episodes) 
          ? data.data.episodes 
          : (Array.isArray(data?.episodes) ? data.episodes : (Array.isArray(data) ? data : []));

        // Fallback: If epList is empty or failed, generate clean structured episodes for this specific anime
        const targetEpCount = (is_sub && is_sub > 0) ? is_sub : 12;
        if (epList.length === 0 && animeTitle) {
          epList = Array.from({ length: targetEpCount }, (_, i) => ({
            id: `ep-${i + 1}`,
            number: i + 1,
            title: `Episode ${i + 1}`,
            description: `Watch Episode ${i + 1} of ${animeTitle} in full HD quality.`,
            image: `https://picsum.photos/seed/${encodeURIComponent(animeTitle)}-ep${i + 1}/400/225`
          }));
        }

        if (isMounted) {
          setEpisodes(epList);
          setLoading(false);
        }
      } catch (err: any) {
        console.warn("[EPISODES FETCH WARN]", err);
        if (isMounted) {
          // Fallback generated list if network request completely failed
          if (animeTitle) {
            const fallbackCount = (is_sub && is_sub > 0) ? is_sub : 12;
            setEpisodes(Array.from({ length: fallbackCount }, (_, i) => ({
              id: `ep-${i + 1}`,
              number: i + 1,
              title: `Episode ${i + 1}`,
              description: `Watch Episode ${i + 1} of ${animeTitle} in full HD quality.`,
              image: `https://picsum.photos/seed/${encodeURIComponent(animeTitle)}-ep${i + 1}/400/225`
            })));
            setLoading(false);
          } else {
            setError("Failed to load episodes for this anime");
            setLoading(false);
          }
        }
      }
    }

    fetchEpisodes();

    return () => {
      isMounted = false;
    };
  }, [effectiveAniId, is_sub, animeTitle]);

  // Cap episode list by sub count if specified (e.g. if total is 20 but is_sub is 10, only show 10)
  const availableEpisodes = (is_sub && is_sub > 0)
    ? episodes.filter((ep) => ep.number <= is_sub)
    : episodes;

  const activeQuery = searchQuery.trim().toLowerCase();
  const queryNum = activeQuery.match(/\d+/)?.[0];

  const filteredEpisodes = availableEpisodes.filter((ep) => {
    if (!activeQuery) return true;
    if (queryNum && String(ep.number) === queryNum) return true;
    return (
      String(ep.number).includes(activeQuery) ||
      ep.title.toLowerCase().includes(activeQuery) ||
      (ep.description && ep.description.toLowerCase().includes(activeQuery))
    );
  });

  return (
    <div className="w-full space-y-3 min-w-0" id={`episodes-list-container-${effectiveAniId}`}>
      {/* Episodes Header - Sticky at top of container */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md py-2.5 border-b border-gray-100 flex items-center justify-between shadow-2xs -mx-1 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1877F2] flex items-center justify-center shrink-0">
            <Tv className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate flex items-center gap-1.5">
              <span>{animeTitle ? `${animeTitle} Episodes` : "Anime Episodes"}</span>
              {!loading && episodes.length > 0 && (
                <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {episodes.length}
                </span>
              )}
            </h4>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeQuery && (
            <span className="hidden sm:inline-block text-[10px] font-bold text-[#1877F2] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              Filtered
            </span>
          )}
          
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 shrink-0">
            <span className="text-[10px] font-extrabold text-gray-400 select-none uppercase tracking-wider">Format</span>
            <select
              value={streamType}
              onChange={(e) => {
                const val = e.target.value as "sub" | "dub";
                onStreamTypeChange?.(val);
              }}
              className="font-extrabold text-[11px] text-gray-800 bg-transparent focus:outline-none cursor-pointer p-0 border-none"
            >
              <option value="sub">SUB</option>
              <option value="dub">DUB {is_dub && is_dub > 0 ? `(${is_dub})` : ""}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && <EpisodesSkeleton count={compact ? 3 : 4} />}

      {/* Error State */}
      {!loading && error && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty Filtered State */}
      {!loading && !error && filteredEpisodes.length === 0 && (
        <div className="py-6 text-center text-gray-400 text-xs bg-white rounded-2xl border border-gray-100">
          <Tv className="h-8 w-8 mx-auto mb-1.5 opacity-40 text-gray-400" />
          <span>No episodes matching "{searchQuery}"</span>
        </div>
      )}

      {/* Episodes Items Stream - Integrated in single scroll view */}
      {!loading && !error && filteredEpisodes.length > 0 && (
        <div className="space-y-3 min-w-0 pt-1">
          {filteredEpisodes.map((ep) => {
            const isExpanded = expandedEpId === ep.id;
            const episodeThumb = poster || `https://picsum.photos/seed/${encodeURIComponent(animeTitle || 'anime')}/400/225`;
            const isExactMatch = Boolean(queryNum && String(ep.number) === queryNum);

            const epNum = typeof ep.number === "number" ? ep.number : parseInt(String(ep.number || 1), 10) || 1;
            const styleIndex = (Math.abs(epNum) - 1) % DICEBEAR_ART_STYLES.length;
            const selectedArtStyle = DICEBEAR_ART_STYLES[styleIndex];
            const episodeUsername = `Episode_${epNum}`;

            const bgIndex = (Math.abs(epNum) - 1) % AVATAR_BG_STYLES.length;
            const avatarBgClass = AVATAR_BG_STYLES[bgIndex];
            
            const HEX_BG_COLORS = ["b6e3f4", "d8b4fe", "fde047", "6ee7b7", "fbcfe8", "bae6fd", "ddd6fe", "bef264"];
            const bgHex = HEX_BG_COLORS[bgIndex];
            const dicebearAvatarUrl = `https://api.dicebear.com/7.x/${selectedArtStyle}/png?seed=${encodeURIComponent(episodeUsername)}&backgroundColor=${bgHex}`;

            return (
              <div
                key={ep.id || `ep-${ep.number}`}
                className="flex gap-2.5 items-start min-w-0 group"
              >
                {/* Comment Avatar: DiceBear PNG Avatar with unique art style and colorful background backdrop */}
                <div 
                  className={`relative shrink-0 mt-0.5 w-9.5 h-9.5 rounded-full flex items-center justify-center p-0.5 border shadow-2xs ${avatarBgClass} ${
                    isExactMatch ? "border-[#1877F2] ring-2 ring-blue-400 scale-105" : "border-gray-200/80"
                  }`} 
                  title={`User: ${episodeUsername} (${selectedArtStyle} style)`}
                >
                  <img
                    src={dicebearAvatarUrl}
                    alt={episodeUsername}
                    className="w-full h-full rounded-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  {ep.isFiller && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full border border-white" title="Filler episode" />
                  )}
                </div>

                {/* Comment Bubble & Media Attachment */}
                <div className="flex-1 min-w-0">
                  <div className={`rounded-2xl px-3.5 py-2.5 inline-block w-full max-w-[96%] sm:max-w-[92%] shadow-2xs space-y-2 transition-all ${
                    isExactMatch 
                      ? "bg-blue-50/90 border-2 border-[#1877F2] ring-2 ring-blue-300/50 shadow-md scale-[1.01]" 
                      : "bg-gray-100/90 border border-transparent"
                  }`}>
                    {/* Highlight Tag when searched/commented */}
                    {isExactMatch && (
                      <div className="flex items-center justify-between pb-1 border-b border-blue-200/60">
                        <span className="bg-[#1877F2] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
                          ★ Selected Episode #{ep.number}
                        </span>
                        <span className="text-[10px] font-bold text-blue-700">Matched in comment</span>
                      </div>
                    )}

                    {/* Sender Name = Episode Title / Number */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span 
                        onClick={() => {
                          if (onSelectEpisode) {
                            onSelectEpisode(ep);
                          } else {
                            setExpandedEpId(isExpanded ? null : ep.id);
                          }
                        }}
                        className="font-extrabold text-[#1877F2] text-xs sm:text-[13px] hover:underline cursor-pointer leading-tight truncate"
                        title={`Click to play Episode ${ep.number}`}
                      >
                        {ep.title ? ep.title : `Episode ${ep.number}`}
                      </span>
                      {ep.title && (
                        <>
                          <span className="text-gray-400 text-[10px] font-bold">·</span>
                          <span className="text-gray-500 text-[11px] font-bold truncate">
                            Episode {ep.number}
                          </span>
                        </>
                      )}
                      {streamType === "dub" && (!is_dub || epNum > is_dub) && (
                        <span className="bg-red-50 text-red-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-red-100 select-none uppercase tracking-wide">
                          SUB Only
                        </span>
                      )}
                    </div>

                    {/* Caption = Episode Number & Meta Details */}
                    <p className="text-gray-800 text-xs leading-snug font-medium">
                      Episode {ep.number}
                      {ep.duration ? ` • ${ep.duration}m` : ""}
                      {ep.isFiller ? " • (Filler)" : ""}
                    </p>

                    {/* Image Attachment = Episode Thumbnail with Play Overlay */}
                    {episodeThumb && (
                      <div 
                        onClick={() => onSelectEpisode?.(ep)}
                        className="relative rounded-xl overflow-hidden bg-gray-950 w-full max-w-xs aspect-video cursor-pointer group/thumb shadow-xs border border-gray-200/80 mt-1.5"
                      >
                        <img
                          src={episodeThumb}
                          alt={ep.title || `Episode ${ep.number}`}
                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-200"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/35 group-hover/thumb:bg-black/20 flex items-center justify-center transition-colors">
                          <div className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-md group-hover/thumb:scale-110 transition-transform">
                            <Play className="h-4 w-4 fill-white ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-1.5 left-1.5 bg-black/80 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded backdrop-blur-xs">
                          EP {ep.number}
                        </span>
                      </div>
                    )}

                    {/* Synopsis description / Toggle */}
                    {ep.description && (
                      <div className="pt-1 border-t border-gray-200/60 text-xs text-gray-600">
                        <p className={isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"}>
                          {ep.description}
                        </p>
                        <button
                          onClick={() => setExpandedEpId(isExpanded ? null : ep.id)}
                          className="text-[10px] text-[#1877F2] hover:underline font-semibold flex items-center gap-0.5 mt-1 cursor-pointer"
                        >
                          <span>{isExpanded ? "Show less" : "Read synopsis"}</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Comment Action Footer Row */}
                  <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold ml-2 mt-1 select-none">
                    <button className="hover:underline cursor-pointer">Like</button>
                    <span>·</span>
                    <button className="hover:underline cursor-pointer">Reply</button>
                    {ep.airDate && (
                      <>
                        <span>·</span>
                        <span className="font-normal text-gray-400">{ep.airDate}</span>
                      </>
                    )}
                    {ep.rating && (
                      <>
                        <span>·</span>
                        <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400 inline" />
                          {ep.rating}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
