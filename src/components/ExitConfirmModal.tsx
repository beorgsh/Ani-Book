import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, X, Sparkles, ShieldAlert } from "lucide-react";

interface ExitConfirmModalProps {
  key?: React.Key;
  isOpen: boolean;
  onClose: () => void; // Stay on AniBook
  onConfirmExit: () => void; // Exit AniBook
}

export default function ExitConfirmModal({
  isOpen,
  onClose,
  onConfirmExit
}: ExitConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-modal-title"
        >
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-10"
          >
            {/* Top brand ribbon */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 w-full" />

            <div className="p-5 sm:p-6">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1877F2] shadow-xs shrink-0">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 id="exit-modal-title" className="text-lg font-black text-gray-900 leading-snug">
                      Exit AniBook?
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      You are at the main discovery feed.
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Stay on AniBook"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Description Content */}
              <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100 mb-5 text-xs text-gray-600 leading-relaxed space-y-1.5">
                <p className="font-medium text-gray-700">
                  Are you sure you want to exit AniBook?
                </p>
                <p className="text-gray-500 text-[11px]">
                  Press <strong className="text-gray-700">Stay on Feed</strong> to continue browsing 8,000+ anime titles, reels, and discussions, or <strong className="text-gray-700">Exit</strong> to leave.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Stay on Feed
                </button>

                <button
                  type="button"
                  onClick={onConfirmExit}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#1877F2] hover:bg-blue-600 active:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Yes, Exit</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
