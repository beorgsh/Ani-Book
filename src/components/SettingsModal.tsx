import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Settings, 
  Sliders, 
  Play, 
  Volume2, 
  VolumeX, 
  Film, 
  Sparkles, 
  Check, 
  RotateCcw,
  Layers,
  HelpCircle,
  Moon,
  Sun
} from "lucide-react";
import { ReelSettings, DEFAULT_REEL_SETTINGS } from "../utils/reelSettings";

interface SettingsModalProps {
  key?: React.Key;
  isOpen: boolean;
  onClose: () => void;
  reelSettings: ReelSettings;
  onUpdateReelSettings: (newSettings: ReelSettings) => void;
  onRefreshFeed?: () => void;
  currentUser: { name: string; avatar: string };
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  reelSettings,
  onUpdateReelSettings,
  onRefreshFeed,
  currentUser,
  isDarkMode = false,
  onToggleDarkMode
}: SettingsModalProps) {
  const handleResetDefaults = () => {
    onUpdateReelSettings(DEFAULT_REEL_SETTINGS);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
        >
      {/* Backdrop click to dismiss */}
      <div 
        onClick={onClose} 
        className="fixed inset-0" 
        aria-hidden="true" 
      />

      {/* Modal Dialog Content */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.93, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        transition={{ type: "spring", damping: 26, stiffness: 340 }}
        className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        id="settings-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                AniBook Settings & Preferences
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Customize feed playback, video reels, and experience
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-5 overflow-y-auto space-y-6">
          
          {/* User Profile Mini Card */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/70 border border-blue-100">
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://api.dicebear.com/9.x/adventurer/svg?seed=OtakuExplorer_MainUser&backgroundColor=b6e3f4";
                }}
              />
              <div>
                <span className="block text-sm font-bold text-gray-900">
                  {currentUser.name}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700">
                  <Sparkles className="w-3 h-3" />
                  Otaku Explorer (Saved Locally)
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold shadow-xs">
              Active
            </span>
          </div>

          {/* Section: Dark Mode Cookie Persistence */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-purple-50/60 hover:bg-purple-50 border border-purple-100 transition-colors">
            <div className="pr-3">
              <div className="flex items-center gap-2">
                {isDarkMode ? (
                  <Moon className="w-4 h-4 text-purple-600 fill-purple-600/20" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                )}
                <span className="text-sm font-bold text-gray-900">Dark Theme Mode</span>
                {isDarkMode && (
                  <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-1.5 py-0.2 rounded">COOKIE SAVED</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Toggle dark mode interface. Preference is saved in browser cookie and remembered on refresh.
              </p>
            </div>
            <button
              onClick={onToggleDarkMode}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isDarkMode ? "bg-purple-600" : "bg-gray-300"
              }`}
              role="switch"
              aria-checked={isDarkMode}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isDarkMode ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Section: Video Reels in Feed */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Feed Video Reels
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 font-bold rounded-full border border-purple-200/50">
                Discovery Player
              </span>
            </div>

            {/* Toggle: Enable Video Reels */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-gray-100/70 border border-gray-200/80 transition-colors">
              <div className="pr-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">Enable Feed Video Reels</span>
                  {reelSettings.enabled && (
                    <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.2 rounded">ON</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Insert dynamic single-card video streams randomly chosen from 8,900+ anime directly inside your feed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUpdateReelSettings({ ...reelSettings, enabled: !reelSettings.enabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  reelSettings.enabled ? "bg-purple-600" : "bg-gray-300"
                }`}
                role="switch"
                aria-checked={reelSettings.enabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    reelSettings.enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Conditional Reel Options (when enabled) */}
            {reelSettings.enabled && (
              <div className="space-y-3 pl-2 border-l-2 border-purple-200">
                {/* Toggle: Auto-play on Viewport Scroll */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 shadow-xs">
                  <div className="pr-2">
                    <span className="block text-xs font-bold text-gray-900">
                      Auto-play on Scroll
                    </span>
                    <span className="block text-[11px] text-gray-500">
                      Automatically start playing reel videos when scrolled into view.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateReelSettings({ ...reelSettings, autoplay: !reelSettings.autoplay })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      reelSettings.autoplay ? "bg-[#1877F2]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        reelSettings.autoplay ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle: Default Audio Mute */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 shadow-xs">
                  <div className="pr-2">
                    <span className="block text-xs font-bold text-gray-900">
                      Muted by Default
                    </span>
                    <span className="block text-[11px] text-gray-500">
                      Start reels in silent mode to prevent unexpected sound.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateReelSettings({ ...reelSettings, muted: !reelSettings.muted })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      reelSettings.muted ? "bg-amber-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        reelSettings.muted ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Reel Frequency Grid */}
                <div className="p-3 rounded-xl bg-white border border-gray-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-900">
                      Reel Injection Frequency
                    </span>
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                      Every {reelSettings.frequency} posts
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-2.5">
                    Controls how often random video reel cards appear in the feed stream.
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 5, 7, 10].map((num) => (
                      <button
                        key={num}
                        onClick={() => onUpdateReelSettings({ ...reelSettings, frequency: num })}
                        className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          reelSettings.frequency === num
                            ? "bg-purple-600 text-white shadow-sm ring-2 ring-purple-300"
                            : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        <span>{num} posts</span>
                        {reelSettings.frequency === num && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Cache & Quick Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100">
              <RotateCcw className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Feed Discovery Actions
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              {onRefreshFeed && (
                <button
                  onClick={() => {
                    onRefreshFeed();
                    onClose();
                  }}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1877F2] font-bold text-xs flex items-center justify-center gap-2 border border-blue-200 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Reroll Random Discoveries</span>
                </button>
              )}

              <button
                onClick={handleResetDefaults}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Reset settings to defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
