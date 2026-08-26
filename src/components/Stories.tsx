import React, { useState, useEffect } from "react";
import { Plus, Sparkles, X, Heart, MessageCircle, ExternalLink } from "lucide-react";

interface StoriesProps {
  currentUser: { name: string; avatar: string };
}

interface StoryItem {
  id: string | number;
  ani_id?: string | number;
  mal_id?: string | number;
  title: string;
  poster: string; // anime poster provided directly by API
  score?: number | string;
  genres?: string[];
  description?: string;
}

export function StoriesSkeleton() {
  return (
    <div className="w-full max-w-full min-w-0 flex gap-2 sm:gap-2.5 overflow-x-auto pb-1.5 scrollbar-none select-none" id="stories-skeleton-row">
      {/* Create story item skeleton */}
      <div className="relative flex flex-col w-24 h-40 sm:w-28 sm:h-44 md:w-32 md:h-48 shrink-0 bg-gray-200 rounded-2xl overflow-hidden animate-pulse border border-gray-200">
        <div className="h-[70%] w-full bg-gray-300" />
        <div className="relative flex-1 bg-white pt-4 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-gray-300 -top-4 absolute left-1/2 -translate-x-1/2 border-2 border-white" />
          <div className="h-3 bg-gray-200 rounded-md w-14 mt-1 mx-auto" />
        </div>
      </div>
      {/* 5 Shimmering Anime Story skeleton cards */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={`story-skel-${i}`}
          className="relative flex flex-col w-24 h-40 sm:w-28 sm:h-44 md:w-32 md:h-48 shrink-0 rounded-2xl overflow-hidden bg-gray-200 animate-pulse border border-gray-200"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
          <div className="absolute top-2.5 left-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-300 border-2 border-white shadow-xs" />
          <div className="absolute bottom-2.5 left-2.5 right-2.5 space-y-1.5">
            <div className="h-3 bg-gray-300 rounded-md w-5/6" />
            <div className="h-2.5 bg-gray-300 rounded-md w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Stories({ currentUser }: StoriesProps) {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);

  // Fallback initial stories using official anime posters
  const fallbackStories: StoryItem[] = [
    {
      id: "solo-leveling",
      ani_id: "151807",
      title: "Solo Leveling",
      poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1gdaeNcCpHt.png",
      score: "8.7",
      genres: ["Action", "Fantasy"],
      description: "Sung Jinwoo wakes up in a hospital bed with a mysterious quest window visible only to him."
    },
    {
      id: "jujutsu-kaisen",
      ani_id: "145064",
      title: "Jujutsu Kaisen",
      poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx145064-7W4i8mY4tY3B.jpg",
      score: "8.8",
      genres: ["Action", "Supernatural"],
      description: "Yuji Itadori and his friends battle ancient curses in Shibuya."
    },
    {
      id: "demon-slayer",
      ani_id: "166240",
      title: "Demon Slayer",
      poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx166240-E90U7qV1a7aE.jpg",
      score: "8.6",
      genres: ["Action", "Historical"],
      description: "Tanjiro trains alongside the Hashira in preparation for the final battle."
    },
    {
      id: "frieren",
      ani_id: "154587",
      title: "Frieren: Beyond Journey's End",
      poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-n1HJZkJr9X7K.jpg",
      score: "9.3",
      genres: ["Adventure", "Fantasy", "Drama"],
      description: "An elf mage re-examines the meaning of human connections decades after defeating the Demon King."
    },
    {
      id: "chainsaw-man",
      ani_id: "127230",
      title: "Chainsaw Man",
      poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx127230-FloXFs2zH5sC.png",
      score: "8.5",
      genres: ["Action", "Supernatural"],
      description: "Denji lives a life of poverty, paying off his deceased father's debt with Pochita."
    },
  ];

  useEffect(() => {
    let isMounted = true;

    async function loadPopularStories() {
      setIsLoading(true);
      try {
        // Fetch popular anime from proxy or API
        const res = await fetch("/api/popular");
        if (!res.ok) throw new Error("Popular endpoint returned " + res.status);
        const json = await res.json();
        
        const rawList = Array.isArray(json) ? json : json.data || json.results || [];

        if (rawList && rawList.length > 0) {
          // Process top popular anime for stories directly using the provided poster
          const processedList: StoryItem[] = rawList.slice(0, 12).map((item: any, idx: number) => {
            const aniId = item.ani_id || item.id || "";
            const title = item.title?.english || item.title?.romaji || item.title || item.name || `Popular Anime #${idx + 1}`;
            // Use the poster provided by the API
            const posterImg = item.poster || item.cover || item.image || item.thumbnail || "";

            return {
              id: item.id || `popular-${idx}`,
              ani_id: aniId,
              mal_id: item.mal_id,
              title: typeof title === "string" ? title : "Popular Anime",
              poster: posterImg,
              score: item.score || item.rating || item.averageScore || "",
              genres: item.genres || item.genre || [],
              description: item.description || item.synopsis || ""
            };
          });

          if (isMounted && processedList.length > 0) {
            setStories(processedList);
          }
        } else {
          if (isMounted) setStories(fallbackStories);
        }
      } catch (e) {
        console.warn("[STORIES] Using fallback popular stories", e);
        if (isMounted) setStories(fallbackStories);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPopularStories();

    return () => {
      isMounted = false;
    };
  }, []);

  // Lock body scroll and listen for Escape key when Story modal is open
  useEffect(() => {
    if (activeStory) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setActiveStory(null);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [activeStory]);

  const displayList = stories.length > 0 ? stories : fallbackStories;

  if (isLoading) {
    return <StoriesSkeleton />;
  }

  return (
    <>
      <div className="w-full max-w-full min-w-0 flex gap-2 sm:gap-2.5 overflow-x-auto pb-1.5 scrollbar-none select-none" id="stories-section">
        {/* Create Story Card (Active User) */}
        <div className="relative flex flex-col w-24 h-40 sm:w-28 sm:h-44 md:w-32 md:h-48 shrink-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group cursor-pointer hover:shadow-md transition-all duration-200">
          <div className="h-[70%] w-full overflow-hidden bg-gray-100">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="relative flex-1 bg-white pt-4 sm:pt-5 pb-2 text-center flex flex-col justify-center">
            {/* Circular plus button absolute centered on border */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1877F2] text-white border-[3px] sm:border-4 border-white shadow-md group-hover:scale-110 transition-transform duration-200">
              <Plus className="h-4.5 w-4.5 sm:h-5 sm:w-5 font-bold" />
            </div>
            <span className="block text-[10px] sm:text-[11px] font-bold text-gray-700 leading-tight">
              Create Story
            </span>
          </div>
        </div>

        {/* Popular Anime Stories using the provided Poster */}
        {displayList.map((story) => (
          <div
            key={story.id}
            onClick={() => setActiveStory(story)}
            className="relative flex flex-col w-24 h-40 sm:w-28 sm:h-44 md:w-32 md:h-48 shrink-0 rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-gray-200/60 bg-gray-900"
          >
            {/* Provided Anime Poster */}
            <img
              src={story.poster}
              alt={`${story.title} Poster`}
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500 ease-out"
              referrerPolicy="no-referrer"
              loading="lazy"
            />

            {/* Dark gradient overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/85 pointer-events-none" />

            {/* Top Avatar of Anime with Facebook Blue Ring */}
            <div className="absolute top-2.5 left-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[#1877F2] overflow-hidden bg-gray-900 shadow-md ring-2 ring-white/30 shrink-0">
              <img
                src={story.poster}
                alt={story.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Top Score Badge if available */}
            {story.score && (
              <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-xs text-amber-400 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md border border-white/10 flex items-center gap-0.5">
                ★ {story.score}
              </div>
            )}

            {/* Title at the bottom with high contrast */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 pointer-events-none">
              <span className="block text-[10px] sm:text-[11px] font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
                {story.title}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Story View Modal */}
      {activeStory && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
          onClick={() => setActiveStory(null)}
        >
          <div 
            className="relative w-full max-w-md bg-gray-950 rounded-3xl overflow-hidden shadow-2xl border border-white/15 flex flex-col animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Story Header */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-[#1877F2] overflow-hidden shadow-lg">
                  <img 
                    src={activeStory.poster} 
                    alt={activeStory.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm leading-tight drop-shadow-sm">
                    {activeStory.title}
                  </h4>
                  <span className="text-blue-400 text-xs font-semibold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Popular Anime Story
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveStory(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Story Poster Canvas */}
            <div className="relative w-full max-h-[480px] bg-black flex items-center justify-center overflow-hidden">
              <img
                src={activeStory.poster}
                alt={`${activeStory.title} Poster`}
                className="w-full h-auto max-h-[480px] object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Story Details Card Content */}
            <div className="p-5 flex flex-col gap-3 text-white">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {activeStory.genres && activeStory.genres.slice(0, 3).map((g) => (
                    <span key={g} className="text-[10px] uppercase font-bold bg-blue-500/20 text-blue-400 border border-blue-400/30 px-2 py-0.5 rounded-full">
                      {g}
                    </span>
                  ))}
                </div>
                {activeStory.score && (
                  <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                    ★ {activeStory.score} Rating
                  </span>
                )}
              </div>

              {activeStory.description && (
                <p 
                  className="text-xs text-gray-300 leading-relaxed line-clamp-4 mt-1"
                  dangerouslySetInnerHTML={{ __html: activeStory.description }}
                />
              )}

              {/* Story interactive reaction bar */}
              <div className="mt-2 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1.5 text-white hover:text-red-400 transition-colors cursor-pointer font-semibold">
                    <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    <span>Reaction</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-white hover:text-blue-400 transition-colors cursor-pointer font-semibold">
                    <MessageCircle className="h-4 w-4 text-blue-400" />
                    <span>Discuss</span>
                  </button>
                </div>
                {activeStory.ani_id && (
                  <a
                    href={`https://anilist.co/anime/${activeStory.ani_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:underline font-bold text-[11px]"
                  >
                    <span>View Anime Info</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
