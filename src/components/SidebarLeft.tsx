import React, { useState } from "react";
import { 
  X, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Shuffle,
  Clock
} from "lucide-react";

interface SidebarLeftProps {
  currentUser: { name: string; avatar: string };
  selectedGenre: string;
  setSelectedGenre: (genre: string) => void;
  activeTab: "feed" | "latest";
  setActiveTab: (tab: "feed" | "latest") => void;
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
  onRefreshFeed,
  isOpen,
  onClose
}: SidebarLeftProps) {
  const [isGenreOpen, setIsGenreOpen] = useState(true);

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
    }
  ];

  // Shortcut items styled as guilds that double as genre filters
  const shortcuts = [
    { name: "All Genres", genre: "", emoji: "🌐", bg: "bg-gray-100" },
    { name: "Action", genre: "Action", emoji: "💥", bg: "bg-red-50 text-red-500" },
    { name: "Fantasy", genre: "Fantasy", emoji: "🧙‍♂️", bg: "bg-purple-50 text-purple-500" },
    { name: "Adventure", genre: "Adventure", emoji: "🗺️", bg: "bg-amber-50 text-amber-500" },
    { name: "Comedy", genre: "Comedy", emoji: "😂", bg: "bg-yellow-50 text-yellow-500" },
    { name: "Sci-Fi", genre: "Sci-Fi", emoji: "🚀", bg: "bg-cyan-50 text-cyan-500" },
    { name: "Romance", genre: "Romance", emoji: "💖", bg: "bg-rose-50 text-rose-500" },
    { name: "Mystery", genre: "Mystery", emoji: "🔍", bg: "bg-blue-50 text-blue-500" },
    { name: "Drama", genre: "Drama", emoji: "🎭", bg: "bg-indigo-50 text-indigo-500" },
    { name: "Supernatural", genre: "Supernatural", emoji: "👻", bg: "bg-teal-50 text-teal-500" },
    { name: "Slice of Life", genre: "Slice of Life", emoji: "🍀", bg: "bg-green-50 text-green-500" },
  ];

  const handleTabClick = (tab: "feed" | "latest") => {
    setActiveTab(tab);
    if (tab === activeTab && tab === "feed" && onRefreshFeed) {
      onRefreshFeed();
    }
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

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

      {/* Toggleable Sidebar Container with White Background & Smooth Slide Animation */}
      <aside
        className={`fixed top-14 left-0 z-40 w-72 h-[calc(100vh-3.5rem)] p-3.5 overflow-y-auto overscroll-contain select-none border-r border-gray-200/90 bg-white shadow-2xl lg:shadow-md flex flex-col transition-all duration-300 ease-out transform shrink-0 ${
          isOpen
            ? "translate-x-0 opacity-100 pointer-events-auto"
            : "-translate-x-full opacity-0 pointer-events-none overflow-hidden"
        }`}
        id="toggleable-sidebar-left"
      >
        {/* Mobile Header with close button */}
        <div className="flex items-center justify-between pb-2.5 mb-1.5 lg:hidden border-b border-gray-100">
          <span className="font-bold text-sm text-gray-800">AniBook Menu</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current User Card */}
        <div 
          onClick={() => handleTabClick("feed")}
          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-100/80 cursor-pointer transition-colors duration-150"
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

        {/* Main Content Feed / Latest Switcher */}
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
                          : "bg-blue-50 text-[#1877F2] group-hover:scale-105"
                      }`}
                    >
                      <IconComponent className="h-4.5 w-4.5" />
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

        {/* Shortcuts (Collapsible Genre filtering) */}
        <div>
          <button
            onClick={() => setIsGenreOpen(!isGenreOpen)}
            className="w-full flex items-center justify-between px-2 pb-2 text-left cursor-pointer group"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Genre</span>
            <div className="flex items-center gap-1.5 text-[#1877F2]">
              {selectedGenre && (
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGenre("");
                  }}
                  className="text-[10px] hover:underline font-bold uppercase bg-blue-50 px-1.5 py-0.5 rounded"
                >
                  Clear
                </span>
              )}
              {isGenreOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-[#1877F2]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-[#1877F2]" />
              )}
            </div>
          </button>

          {isGenreOpen && (
            <div className="space-y-1 max-h-[320px] overflow-y-auto overscroll-contain pr-1 scrollbar-thin">
              {shortcuts.map((sc) => {
                const isActive = selectedGenre === sc.genre;
                return (
                  <button
                    key={sc.name}
                    onClick={() => {
                      setSelectedGenre(sc.genre);
                      // On mobile, automatically close sidebar after choosing a genre
                      if (window.innerWidth < 1024) {
                        onClose();
                      }
                    }}
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

