import React, { useState, useEffect, useRef } from "react";
import { Search, Menu, X } from "lucide-react";

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentUser: { name: string; avatar: string };
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function Header({
  searchQuery,
  setSearchQuery,
  currentUser,
  isSidebarOpen,
  onToggleSidebar
}: HeaderProps) {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

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
        <div className="flex items-center gap-2 select-none cursor-pointer">
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

      {/* Right section: Avatar ONLY */}
      <div className="flex items-center gap-2 select-none">
        <div className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors" title={currentUser.name}>
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-9 h-9 rounded-full object-cover border-2 border-blue-500 shadow-sm"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://api.dicebear.com/9.x/adventurer/svg?seed=OtakuExplorer_MainUser&backgroundColor=b6e3f4";
            }}
          />
        </div>
      </div>
    </header>
  );
}

