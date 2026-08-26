import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  MessageSquare,
  Share2,
  Globe,
  Check,
  Send,
  Download,
  Maximize2,
  Minimize2,
  Sparkles,
  ExternalLink,
  MoreHorizontal,
  Mic
} from "lucide-react";
import { Post, AnimeEpisode } from "../types";
import AnimeEpisodesList from "./AnimeEpisodesList";
import M3U8VideoPlayer from "./M3U8VideoPlayer";
import { getDeterministicAvatar } from "../utils";

interface FacebookPhotoModalProps {
  post: Post;
  allPosts: Post[];
  currentUser: { name: string; avatar: string };
  onClose: () => void;
  onLikeToggle: (postId: string) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onShare: (postId: string) => void;
  onSelectPost: (post: Post) => void;
  initialEpisode?: AnimeEpisode | null;
}

export default function FacebookPhotoModal({
  post,
  allPosts,
  currentUser,
  onClose,
  onLikeToggle,
  onAddComment,
  onShare,
  onSelectPost,
  initialEpisode = null
}: FacebookPhotoModalProps) {
  const [commentInput, setCommentInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<AnimeEpisode | null>(initialEpisode);
  const [streamType, setStreamType] = useState<"sub" | "dub">("sub");

  // Sync selected episode when modal receives a new initialEpisode or different post
  useEffect(() => {
    setSelectedEpisode(initialEpisode);
  }, [initialEpisode, post.id]);

  const shouldTruncateCaption = post.content.length > 200;
  const displayCaptionText = shouldTruncateCaption && !isCaptionExpanded
    ? `${post.content.slice(0, 200)}...`
    : post.content;

  // Find index in all posts
  const currentIndex = allPosts.findIndex((p) => p.id === post.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allPosts.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      setSelectedEpisode(null);
      onSelectPost(allPosts[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      setSelectedEpisode(null);
      onSelectPost(allPosts[currentIndex + 1]);
    }
  };

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Handle phone back button / swipe back gesture without leaving website
  useEffect(() => {
    try {
      window.history.pushState({ modal: "anibook_photo_modal" }, "");
    } catch {
      // ignore
    }

    const handlePopState = () => {
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasPrev) {
        handlePrev();
      } else if (e.key === "ArrowRight" && hasNext) {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, hasPrev, hasNext, currentIndex, allPosts]);

  // Lock body scroll only while modal is mounted
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevDocOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevDocOverflow;
    };
  }, []);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    onAddComment(post.id, commentInput.trim());
    setCommentInput("");
  };

  // Get image URL to display
  const imageUrl = post.bannerImage || post.backdrop || post.posterImage || post.image || (post.ani_id ? `https://img.anili.st/media/${post.ani_id}` : "");
  const studioDisplayName = post.isCustom ? (currentUser.name || "Otaku Explorer") : (post.studio || "Animation Studio");
  const studioAvatarUrl = getDeterministicAvatar(studioDisplayName);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-0 select-none overflow-hidden"
        onClick={onClose}
        id="facebook-photo-lightbox-modal"
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full h-full flex flex-col lg:flex-row overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ================= LEFT / MAIN STAGE: Black Stage Photo or M3U8 Video Canvas ================= */}
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[50vh] lg:min-h-full order-1 lg:order-1">
            {/* Ambient blurred glow in the background */}
            {imageUrl && !selectedEpisode && (
              <div
                className="absolute inset-0 opacity-20 blur-3xl scale-125 pointer-events-none"
                style={{
                  backgroundImage: `url(${imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }}
              />
            )}

            {/* Top Photo / Video Controls Bar - Arrow Left Icon Button Only */}
            <div className="absolute top-0 left-0 right-0 z-30 p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-transform hover:scale-105 cursor-pointer border border-white/10 shadow-lg"
                  title="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {allPosts.length > 0 && (
                  <span className="text-[11px] text-gray-300 font-medium bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                    {currentIndex + 1} of {allPosts.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* AniList Info Link if available */}
                {post.ani_id && (
                  <a
                    href={`https://anilist.co/anime/${post.ani_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-blue-400 bg-black/40 hover:bg-black/60 px-2.5 py-1 rounded-full border border-white/10 transition-colors font-bold"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span className="hidden sm:inline">AniList</span>
                  </a>
                )}
                {/* Fullscreen Toggle */}
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Main Stage Content: M3U8 Video Player OR Photo */}
            {selectedEpisode ? (
              <div className="w-full h-full flex items-center justify-center">
                <M3U8VideoPlayer
                  episode={selectedEpisode}
                  animeTitle={post.title}
                  aniId={post.ani_id}
                  slug={post.slug}
                  poster={imageUrl}
                  onBackToImage={() => setSelectedEpisode(null)}
                  streamType={streamType}
                  is_dub={post.is_dub}
                />
              </div>
            ) : (
              <div 
                className="relative z-10 w-full h-full flex items-center justify-center p-2 sm:p-6 cursor-zoom-in"
                onClick={() => setIsZoomed(!isZoomed)}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={post.title || "Anime Photo"}
                    className={`max-w-full max-h-[85vh] object-contain transition-transform duration-300 ${
                      isZoomed ? "scale-125 cursor-zoom-out" : "scale-100 cursor-zoom-in"
                    }`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-gray-400 text-sm flex flex-col items-center gap-2">
                    <Sparkles className="h-8 w-8 text-blue-500 animate-spin" />
                    <span>Loading Image...</span>
                  </div>
                )}
              </div>
            )}

            {/* Prev / Next Floating Navigation Arrows */}
            {hasPrev && !selectedEpisode && (
              <button
                onClick={handlePrev}
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all cursor-pointer hover:scale-110 shadow-xl"
                title="Previous Photo (Left Arrow)"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {hasNext && !selectedEpisode && (
              <button
                onClick={handleNext}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all cursor-pointer hover:scale-110 shadow-xl"
                title="Next Photo (Right Arrow)"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* ================= RIGHT / SIDEBAR: Facebook Post Details & Episodes Component (Single Scrollview) ================= */}
          <div className="w-full lg:w-[380px] xl:w-[420px] bg-white flex flex-col h-[50vh] lg:h-full border-t lg:border-t-0 lg:border-l border-gray-200 shrink-0 select-text overflow-y-auto order-2 lg:order-2 z-20">
            {/* Post Header */}
            <div className="p-3.5 sm:p-4 border-b border-gray-100 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img
                  src={studioAvatarUrl}
                  alt={studioDisplayName}
                  className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-xs shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                  {/* Studio Name with Verified Blue Badge on right */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-gray-900 text-sm hover:underline cursor-pointer truncate">
                      {studioDisplayName}
                    </span>
                    {/* Verified Blue Badge with White Check */}
                    <span 
                      className="inline-flex items-center justify-center w-3 h-3 sm:w-3.5 sm:h-3.5 bg-[#1877F2] text-white rounded-full shrink-0 shadow-2xs" 
                      title="Verified Studio"
                    >
                      <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 stroke-[3]" />
                    </span>
                  </div>

                  {/* Date / Year • CC Icon & Available Count • Dub Icon & Available Count */}
                  <div className="flex items-center flex-wrap gap-1.5 text-gray-500 text-[11px] font-medium mt-0.5 min-w-0">
                    <span>{post.year || (post.aired ? post.aired.match(/\d{4}/)?.[0] : null) || (post.timestamp ? post.timestamp.match(/\d{4}/)?.[0] : null) || "2026"}</span>
                    <span>·</span>
                    
                    {/* CC Icon & Count */}
                    <span className="inline-flex items-center gap-1 text-gray-500 font-medium">
                      <span className="font-extrabold text-xs text-gray-500">CC</span>
                      <span>{post.is_sub || (post.episodes && !isNaN(Number(post.episodes)) ? post.episodes : 1175)}</span>
                    </span>

                    {/* Dub Icon & Count (if available and > 0) */}
                    {post.is_dub !== undefined && post.is_dub !== null && post.is_dub > 0 && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 text-gray-500 font-medium">
                          <Mic className="h-3 w-3 text-gray-400 shrink-0" />
                          <span>{post.is_dub}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>

            {/* Post Content & Episodes Section in One Scrollview */}
            <div className="p-4 space-y-3.5 min-w-0 flex-1">
              {/* Anime Title */}
              {post.title && (
                <h3 className="font-bold text-gray-950 text-base leading-snug">
                  {post.title}
                </h3>
              )}

              {/* Caption Description */}
              <motion.div
                layout
                initial={false}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                onClick={() => {
                  if (shouldTruncateCaption) {
                    setIsCaptionExpanded(!isCaptionExpanded);
                  }
                }}
                className={`text-gray-800 text-[13px] sm:text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
                  shouldTruncateCaption ? "cursor-pointer group hover:opacity-95 transition-opacity" : ""
                }`}
                title={shouldTruncateCaption ? (isCaptionExpanded ? "Click text to collapse" : "Click text to expand") : undefined}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isCaptionExpanded ? "expanded" : "collapsed"}
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {displayCaptionText}
                  </motion.span>
                </AnimatePresence>
                {shouldTruncateCaption && (
                  <span className="text-[#1877F2] font-semibold hover:underline ml-1.5 inline-flex items-center select-none">
                    {isCaptionExpanded ? "See Less" : "See More"}
                  </span>
                )}
              </motion.div>

              {/* Genre and Status Tags */}
              {post.genreTags && post.genreTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {post.genreTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-semibold px-2.5 py-0.5 bg-blue-50 text-[#1877F2] rounded-full border border-blue-100"
                    >
                      #{tag}
                    </span>
                  ))}
                  {post.status && (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                      {post.status}
                    </span>
                  )}
                  {post.episodes && (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {post.episodes} eps
                    </span>
                  )}
                </div>
              )}

              {/* Social Counters */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium select-none">
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-1">
                    <span className="w-4 h-4 rounded-full bg-[#1877F2] text-white flex items-center justify-center text-[9px]">👍</span>
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px]">❤️</span>
                  </div>
                  <span>
                    {post.isLikedByUser ? `You and ${post.likesCount - 1} others` : `${post.likesCount} Otakus`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-500 inline-flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-gray-500">CC</span>
                    <span>{post.is_sub || (post.episodes && !isNaN(Number(post.episodes)) ? post.episodes : 1175)}</span>
                    {post.is_dub ? (
                      <>
                        <span>·</span>
                        <Mic className="h-3 w-3 text-gray-400 shrink-0 inline" />
                        <span>{post.is_dub}</span>
                      </>
                    ) : null}
                  </span>
                  <span>·</span>
                  <span>{post.sharesCount} shares</span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="py-1 border-t border-b border-gray-100 flex items-center justify-between text-xs font-bold text-gray-600 select-none">
                <button
                  onClick={() => onLikeToggle(post.id)}
                  className={`flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    post.isLikedByUser ? "text-[#1877F2] bg-blue-50" : "hover:bg-gray-100"
                  }`}
                >
                  <ThumbsUp className={`h-4 w-4 ${post.isLikedByUser ? "fill-[#1877F2]" : ""}`} />
                  <span>Like</span>
                </button>

                <button
                  onClick={() => {
                    const inputEl = document.getElementById("photo-modal-comment-input");
                    if (inputEl) inputEl.focus();
                  }}
                  className="flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Episodes</span>
                </button>

                <button
                  onClick={() => onShare(post.id)}
                  className="flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </button>
              </div>

              {/* Episodes List Section (Replaces comments with episodes metadata API) */}
              <div className="pt-1">
                <AnimeEpisodesList 
                  aniId={post.ani_id} 
                  animeTitle={post.title}
                  poster={imageUrl || post.bannerImage || post.image}
                  compact={true}
                  onSelectEpisode={(ep) => setSelectedEpisode(ep)}
                  searchQuery={commentInput}
                  is_sub={post.is_sub}
                  is_dub={post.is_dub}
                  streamType={streamType}
                  onStreamTypeChange={setStreamType}
                />
              </div>
            </div>

            {/* Bottom Add Comment Bar */}
            <div className="p-3 border-t border-gray-100 bg-gray-50 shrink-0">
              <form onSubmit={handleCommentSubmit} className="flex gap-2 items-center">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://api.dicebear.com/9.x/adventurer/svg?seed=OtakuExplorer_MainUser&backgroundColor=b6e3f4";
                  }}
                />
                <div className="flex-1 relative">
                  <input
                    id="photo-modal-comment-input"
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Type episode # to search or write a comment..."
                    className="w-full bg-white h-9 rounded-full pl-3.5 pr-9 text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1877F2]/25 focus:border-[#1877F2] transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!commentInput.trim()}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full transition-colors cursor-pointer ${
                      commentInput.trim() ? "bg-[#1877F2] text-white hover:bg-blue-600" : "text-gray-300"
                    }`}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
