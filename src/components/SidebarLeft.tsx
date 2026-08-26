import React, { useState } from "react";
import { 
  X, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Shuffle,
  Clock,
  Heart,
  Dices,
  Sparkles,
  Search,
  Settings,
  Film,
  Play,
  Volume2,
  VolumeX,
  Sliders
} from "lucide-react";
import { ReelSettings } from "../utils/reelSettings";

export interface GenreItem {
  name: string;
  genre: string;
  emoji: string;
  bg: string;
}

export const ALL_GENRES: GenreItem[] = [
  { name: "Action", genre: "action", emoji: "💥", bg: "bg-red-50 text-red-500" },
  { name: "Adventure", genre: "adventure", emoji: "🗺️", bg: "bg-amber-50 text-amber-500" },
  { name: "Comedy", genre: "comedy", emoji: "😂", bg: "bg-yellow-50 text-yellow-500" },
  { name: "Drama", genre: "drama", emoji: "🎭", bg: "bg-indigo-50 text-indigo-500" },
  { name: "Fantasy", genre: "fantasy", emoji: "🧙‍♂️", bg: "bg-purple-50 text-purple-500" },
  { name: "Horror", genre: "horror", emoji: "🧟", bg: "bg-stone-100 text-stone-700" },
  { name: "Isekai", genre: "isekai", emoji: "🌀", bg: "bg-sky-50 text-sky-500" },
  { name: "Magic", genre: "magic", emoji: "🪄", bg: "bg-fuchsia-50 text-fuchsia-500" },
  { name: "Martial Arts", genre: "martial-arts", emoji: "🥋", bg: "bg-orange-50 text-orange-500" },
  { name: "Mecha", genre: "mecha", emoji: "🤖", bg: "bg-blue-50 text-blue-600" },
  { name: "Mystery", genre: "mystery", emoji: "🔍", bg: "bg-slate-100 text-slate-600" },
  { name: "Psychological", genre: "psychological", emoji: "🧠", bg: "bg-violet-50 text-violet-500" },
  { name: "Romance", genre: "romance", emoji: "💖", bg: "bg-rose-50 text-rose-500" },
  { name: "Sci-Fi", genre: "sci-fi", emoji: "🚀", bg: "bg-cyan-50 text-cyan-500" },
  { name: "Shounen", genre: "shounen", emoji: "⚡", bg: "bg-amber-100 text-amber-700" },
  { name: "Shoujo", genre: "shoujo", emoji: "🌸", bg: "bg-pink-50 text-pink-500" },
  { name: "Seinen", genre: "seinen", emoji: "⚔️", bg: "bg-zinc-100 text-zinc-700" },
  { name: "Slice of Life", genre: "slice-of-life", emoji: "🍀", bg: "bg-green-50 text-green-500" },
  { name: "Sports", genre: "sports", emoji: "⚽", bg: "bg-emerald-50 text-emerald-500" },
  { name: "Supernatural", genre: "supernatural", emoji: "👻", bg: "bg-teal-50 text-teal-500" },
  { name: "Thriller", genre: "thriller", emoji: "🔪", bg: "bg-red-100 text-red-700" },
  { name: "Demons", genre: "demons", emoji: "👿", bg: "bg-purple-100 text-purple-700" },
  { name: "Historical", genre: "historical", emoji: "🏯", bg: "bg-amber-50 text-amber-800" },
  { name: "Military", genre: "military", emoji: "🎖️", bg: "bg-lime-50 text-lime-700" },
  { name: "Parody", genre: "parody", emoji: "🤪", bg: "bg-yellow-100 text-yellow-800" },
  { name: "Space", genre: "space", emoji: "🪐", bg: "bg-indigo-100 text-indigo-800" },
  { name: "Vampire", genre: "vampire", emoji: "🧛", bg: "bg-rose-100 text-rose-800" }
];

interface SidebarLeftProps {
  currentUser: { name: string; avatar: string };
  selectedGenre: string;
  setSelectedGenre: (genre: string) => void;
  activeTab: "feed" | "latest" | "liked" | "genre";
  setActiveTab: (tab: "feed" | "latest" | "liked" | "genre") => void;
  likedCount?: number;
  reelSettings: ReelSettings;
  onUpdateReelSettings: (newSettings: ReelSettings) => void;
  onOpenSettings?: () => void;
  onRefreshFeed?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function SidebarLeft({
  currentUser,
  selectedGenre,
  setSelectedGenre,
  activeTab,
  setActiveTab,
  likedCount = 0,
  reelSettings,
  onUpdateReelSettings,
  onOpenSettings,
  onRefreshFeed,
  isOpen,
  onClose
}: SidebarLeftProps) {
  const [isGenreOpen, setIsGenreOpen] = useState(true);
  const [genreSearch, setGenreSearch] = useState("");
  const [isRolling, setIsRolling] = useState(false);

  // Main Content Views
  const mainContentViews = [
    {
      id: "feed" as const,
      name: "Feed",
      subtitle: "Random 8,000+ Discoveries",
      icon: Shuffle,
      badge: "Discovery",
      badgeBg: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
    },
    {
      id: "latest" as const,
      name: "Latest",
      subtitle: "Chronological Airing Releases",
      icon: Clock,
      badge: "Live",
      badgeBg: "bg-red-500 text-white animate-pulse"
    },
    {
      id: "liked" as const,
      name: "Liked Anime",
      subtitle: "Saved to Cookies & Storage",
      icon: Heart,
      badge: likedCount > 0 ? `${likedCount}` : undefined,
      badgeBg: "bg-rose-500 text-white font-bold"
    }
  ];

  const handleTabClick = (tab: "feed" | "latest" | "liked" | "genre") => {
    setActiveTab(tab);
    if (tab === "feed" && activeTab === "feed" && onRefreshFeed) {
      onRefreshFeed();
    }
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleSelectGenre = (genreSlug: string) => {
    setSelectedGenre(genreSlug);
    setActiveTab("genre");
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Generate a random genre from the available pool
  const handleGenerateRandomGenre = () => {
    setIsRolling(true);
    const available = ALL_GENRES.filter((g) => g.genre !== selectedGenre);
    const randomPick = available[Math.floor(Math.random() * available.length)] || ALL_GENRES[0];

    setTimeout(() => {
      setIsRolling(false);
      handleSelectGenre(randomPick.genre);
    }, 400);
  };

  const filteredGenres = ALL_GENRES.filter((g) =>
    g.name.toLowerCase().includes(genreSearch.toLowerCase()) ||
    g.genre.toLowerCase().includes(genreSearch.toLowerCase())
  );

  return (
    <>
      {/* Mobile / Tablet Backdrop Overlay with fade animation */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ease-in-out lg:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* SINGLE Unified Scroll View Sidebar */}
      <aside
        className={`fixed top-14 left-0 z-40 w-72 h-[calc(100vh-3.5rem)] p-3.5 overflow-y-auto overscroll-contain select-none border-r border-gray-200/90 dark:border-[#30363d] bg-white dark:bg-[#161b22] text-gray-900 dark:text-gray-100 shadow-2xl lg:shadow-md flex flex-col transition-all duration-300 ease-out transform shrink-0 ${
          isOpen
            ? "translate-x-0 opacity-100 pointer-events-auto"
            : "-translate-x-full opacity-0 pointer-events-none overflow-hidden"
        }`}
        id="toggleable-sidebar-left"
      >
        {/* Mobile Header with close button */}
        <div className="flex items-center justify-between pb-2.5 mb-1.5 lg:hidden border-b border-gray-100 dark:border-[#30363d]">
          <span className="font-bold text-sm text-gray-800 dark:text-gray-200">AniBook Menu</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#21262d] text-gray-500 dark:text-gray-400 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current User Card */}
        <div 
          onClick={() => handleTabClick("feed")}
          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-[#21262d] cursor-pointer transition-colors duration-150"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-xs"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://api.dicebear.com/9.x/adventurer/svg?seed=OtakuExplorer_MainUser&backgroundColor=b6e3f4";
            }}
          />
          <div className="min-w-0">
            <span className="block text-sm font-bold text-gray-900 truncate">
              {currentUser.name}
            </span>
            <span className="block text-[11px] text-gray-500 font-medium">
              Active Otaku Profile
            </span>
          </div>
        </div>

        {/* Main Content Feed / Latest / Liked Anime Switcher */}
        <div className="mt-3">
          <div className="px-2 pb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Main Feeds
            </span>
          </div>
          <div className="space-y-1">
            {mainContentViews.map((view) => {
              const IconComponent = view.icon;
              const isActive = activeTab === view.id;
              return (
                <button
                  key={view.id}
                  onClick={() => handleTabClick(view.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-150 text-left ${
                    isActive
                      ? "bg-blue-50/90 text-[#1877F2] border border-blue-200/80 font-bold shadow-xs"
                      : "hover:bg-gray-100/80 text-gray-700 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex items-center justify-center w-8.5 h-8.5 rounded-full transition-transform ${
                        isActive
                          ? "bg-[#1877F2] text-white shadow-xs scale-105"
                          : view.id === "liked"
                            ? "bg-rose-50 text-rose-500 group-hover:scale-105"
                            : "bg-blue-50 text-[#1877F2] group-hover:scale-105"
                      }`}
                    >
                      <IconComponent className={`h-4.5 w-4.5 ${view.id === "liked" && isActive ? "fill-white" : ""}`} />
                    </div>
                    <div className="min-w-0">
                      <span className={`block text-sm leading-tight truncate ${isActive ? "text-[#1877F2] font-bold" : "text-gray-800 font-semibold"}`}>
                        {view.name}
                      </span>
                      <span className="block text-[10px] text-gray-500 truncate">
                        {view.subtitle}
                      </span>
                    </div>
                  </div>
                  {view.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ml-1.5 ${view.badgeBg}`}>
                      {view.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-[1px] bg-gray-100 my-3.5 mx-1" />

        {/* Generate Genre & Anime Guilds Section (Unified Single Scroll View, No Inner Scroll) */}
        <div>
          <div className="flex items-center justify-between px-2 pb-2">
            <button
              onClick={() => setIsGenreOpen(!isGenreOpen)}
              className="flex items-center gap-1.5 text-left cursor-pointer group"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Genres & Guilds</span>
              {isGenreOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-[#1877F2]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-[#1877F2]" />
              )}
            </button>

            {selectedGenre && (
              <button 
                onClick={() => {
                  setSelectedGenre("");
                  setActiveTab("feed");
                }}
                className="text-[10px] text-[#1877F2] hover:underline font-bold uppercase bg-blue-50 px-2 py-0.5 rounded-full"
              >
                Clear
              </button>
            )}
          </div>

          {/* Interactive Generate Random Genre Button */}
          <div className="px-1 mb-2.5">
            <button
              onClick={handleGenerateRandomGenre}
              disabled={isRolling}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-98 select-none"
            >
              <Dices className={`h-4 w-4 ${isRolling ? "animate-spin" : "animate-bounce"}`} />
              <span>{isRolling ? "Generating Genre..." : "🎲 Generate Random Genre"}</span>
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
            </button>
          </div>

          {isGenreOpen && (
            <div className="space-y-1.5">
              {/* Quick Genre Search Input */}
              <div className="relative px-1 mb-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter 25+ genres..."
                  value={genreSearch}
                  onChange={(e) => setGenreSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1877F2] text-gray-800 placeholder-gray-400"
                />
              </div>

              {/* Genre List - Flow directly in single scroll view */}
              <div className="space-y-1 pr-1">
                {filteredGenres.map((sc) => {
                  const isActive = activeTab === "genre" && selectedGenre.toLowerCase() === sc.genre.toLowerCase();
                  return (
                    <button
                      key={sc.genre}
                      onClick={() => handleSelectGenre(sc.genre)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all duration-150 text-left ${
                        isActive 
                          ? 'bg-blue-50/90 text-[#1877F2] border border-blue-200 font-bold shadow-xs' 
                          : 'hover:bg-gray-100/80 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`flex items-center justify-center w-7 h-7 rounded-lg text-sm ${sc.bg} shadow-xs`}>
                          {sc.emoji}
                        </div>
                        <span className={`text-[13px] ${isActive ? 'text-[#1877F2] font-bold' : 'text-gray-700'}`}>
                          {sc.name}
                        </span>
                      </div>
                      {isActive ? (
                        <span className="w-2 h-2 rounded-full bg-[#1877F2]" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500" />
                      )}
                    </button>
                  );
                })}

                {filteredGenres.length === 0 && (
                  <div className="p-3 text-center text-xs text-gray-400">
                    No genres matching "{genreSearch}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer copyright */}
        <div className="mt-auto pt-6 px-2 pb-2 text-[11px] text-gray-400">
          <p className="hover:underline cursor-pointer">AniBook · Anime Facebook · 2026</p>
        </div>
      </aside>
    </>
  );
}
