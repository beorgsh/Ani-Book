import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Menu, 
  X, 
  Settings, 
  ChevronDown, 
  Sparkles, 
  Heart, 
  Shuffle, 
  Clock, 
  Film,
  Sliders,
  Check
} from "lucide-react";

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentUser: { name: string; avatar: string };
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onLogoClick?: () => void;
  onOpenSettings?: () => void;
  onTabSelect?: (tab: "feed" | "latest" | "liked" | "genre") => void;
}

export default function Header({
  searchQuery,
  setSearchQuery,
  currentUser,
  isSidebarOpen,
  onToggleSidebar,
  onLogoClick,
  onOpenSettings,
  onTabSelect
}: HeaderProps) {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY =
            window.pageYOffset ||
            document.documentElement.scrollTop ||
            document.body.scrollTop ||
            0;

          const diff = currentScrollY - lastScrollY.current;

          // Always visible at the very top of the page
          if (currentScrollY <= 40) {
            setIsVisible(true);
          } else if (diff > 8 && currentScrollY > 70) {
            // Scrolling down -> hide header
            setIsVisible(false);
          } else if (diff < -8) {
            // Scrolling up -> show header
            setIsVisible(true);
          }

          lastScrollY.current = Math.max(0, currentScrollY);
          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Keep header always fixed top-0 for continuous accessibility during long scrolls
  const isHeaderVisible = true;

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white px-3 sm:px-6 h-14 border-b border-gray-200 shadow-sm transition-transform duration-300 ease-in-out ${
        isHeaderVisible ? "translate-y-0" : "-translate-y-full"
      }`} 
      id="anibook-header"
    >
      {/* Left section: Sidebar Toggle & Brand Name */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Toggle Sidebar Button */}
        <button
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 cursor-pointer ${
            isSidebarOpen 
              ? "bg-blue-100 text-[#1877F2] rotate-90" 
              : "bg-[#F0F2F5] hover:bg-[#E4E6EB] text-gray-700 hover:text-gray-900"
          }`}
          title="Toggle Sidebar Menu"
          id="sidebar-toggle-button"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* AniBook Brand Name */}
        <div 
          onClick={onLogoClick} 
          className="flex items-center gap-2 select-none cursor-pointer hover:opacity-90 transition-opacity"
          title="AniBook Home Feed"
        >
          <span className="font-sans font-black tracking-tight text-xl sm:text-2xl text-[#1877F2]">
            AniBook
          </span>
        </div>
      </div>

      {/* Center / Search Bar Section */}
      <div className="flex-1 max-w-md mx-2 sm:mx-6">
        {/* Desktop / Tablet Search Bar */}
        <div className="relative hidden sm:block w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4.5 w-4.5 text-gray-400" />
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anime, genres, studios on AniBook..."
            className="w-full h-9.5 rounded-full bg-[#F0F2F5] pl-10 pr-9 text-sm text-gray-900 placeholder-gray-500 border border-transparent focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20 transition-all"
            id="header-search-bar"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Mobile Search Toggle & Input */}
        <div className="sm:hidden flex justify-end">
          {isMobileSearchOpen ? (
            <div className="fixed inset-x-0 top-0 h-14 bg-white z-50 px-3 flex items-center gap-2 border-b border-gray-200 shadow-sm animate-fade-in">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search AniBook..."
                  autoFocus
                  className="w-full h-9 rounded-full bg-[#F0F2F5] pl-9 pr-8 text-sm text-gray-900 border border-transparent focus:bg-white focus:border-blue-300 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsMobileSearchOpen(false)}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-[#F0F2F5] hover:bg-[#E4E6EB] text-gray-700 transition-colors"
              title="Search"
            >
              <Search className="h-4.5 w-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right section: Header Settings Button & User Avatar Dropdown */}
      <div className="flex items-center gap-1.5 sm:gap-2 select-none relative" ref={dropdownRef}>
        
        {/* Dedicated Quick Settings Button in Header */}
        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-[#F0F2F5] hover:bg-[#E4E6EB] text-gray-700 hover:text-[#1877F2] transition-colors cursor-pointer"
          title="AniBook Settings & Reel Options"
          aria-label="Settings"
          id="header-settings-button"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* User Avatar with interactive dropdown trigger */}
        <div 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`flex items-center gap-1.5 p-1 pr-1.5 rounded-full hover:bg-gray-100 cursor-pointer transition-all ${
            isDropdownOpen ? "bg-gray-100" : ""
          }`} 
          title="Account & Settings Menu"
          id="header-avatar-dropdown-trigger"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full object-cover border border-gray-200 shadow-sm"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://api.dicebear.com/9.x/adventurer/svg?seed=OtakuExplorer_MainUser&backgroundColor=b6e3f4";
            }}
          />
          <ChevronDown className={`w-3.5 h-3.5 text-gray-600 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
        </div>

        {/* Avatar Dropdown Menu */}
        {isDropdownOpen && (
          <div 
            className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 animate-scale-up overflow-hidden"
            id="avatar-dropdown-menu"
          >
            {/* User Info Header */}
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-xs"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <span className="block text-sm font-bold text-gray-900 truncate">
                  {currentUser.name}
                </span>
                <span className="block text-[11px] text-blue-600 font-semibold truncate">
                  Otaku Explorer (Online)
                </span>
              </div>
            </div>

            {/* Quick Navigation options */}
            <div className="py-1 border-b border-gray-100">
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  onTabSelect?.("feed");
                }}
                className="w-full px-4 py-2 flex items-center gap-3 text-left text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <Shuffle className="w-4 h-4 text-blue-600" />
                <span>Discovery Feed</span>
              </button>

              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  onTabSelect?.("latest");
                }}
                className="w-full px-4 py-2 flex items-center gap-3 text-left text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <Clock className="w-4 h-4 text-red-500" />
                <span>Latest Airing Anime</span>
              </button>

              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  onTabSelect?.("liked");
                }}
                className="w-full px-4 py-2 flex items-center gap-3 text-left text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span>Liked Anime Collection</span>
              </button>
            </div>

            {/* Primary Settings Option */}
            <div className="py-1">
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  onOpenSettings?.();
                }}
                className="w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-bold text-gray-900 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer"
                id="dropdown-settings-option"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold">Settings & Reel Options</span>
                    <span className="block text-[10px] text-gray-500 font-normal">Video playback & frequency</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

      </div>
    </header>
  );
}


