import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ThumbsUp, Heart, MessageSquare, Share2, MoreHorizontal, Globe, Check, Send, Sparkles, Image as ImageIcon, Tv, Mic, Star, Play, Film } from "lucide-react";
import { Post } from "../types";
import AnimeEpisodesList from "./AnimeEpisodesList";

import { getDeterministicAvatar } from "../utils";

interface PostCardProps {
  key?: React.Key;
  post: Post;
  currentUser: { name: string; avatar: string };
  onLikeToggle: (postId: string) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onShare: (postId: string) => void;
  onImageClick?: (post: Post) => void;
  onSelectEpisode?: (post: Post, episode: any) => void;
}

export default function PostCard({
  post,
  currentUser,
  onLikeToggle,
  onAddComment,
  onShare,
  onImageClick,
  onSelectEpisode
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const initialBackdrop = post.bannerImage || post.backdrop || post.posterImage || post.image || (post.ani_id ? `https://img.anili.st/media/${post.ani_id}` : "");
  const [activeImage, setActiveImage] = useState<string>(initialBackdrop);
  const [isLoadingMalBanner, setIsLoadingMalBanner] = useState(false);
  const [hasTriedProxy, setHasTriedProxy] = useState(false);

  // Helper to proxy image URLs for CORS
  const getProxiedUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("/api/image-proxy") || url.startsWith("data:") || url.startsWith("blob:")) {
      return url;
    }
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  };

  // If no background image was directly provided, ensure AniList backdrop/cover is loaded using ani_id
  useEffect(() => {
    // If background image or backdrop was already provided directly, use it
    if (post.bannerImage || post.backdrop) {
      setActiveImage(post.bannerImage || post.backdrop);
      setIsLoadingMalBanner(false);
      return;
    }

    // For custom user posts with direct image uploads
    if (post.isCustom) {
      setActiveImage(post.image || "");
      setIsLoadingMalBanner(false);
      return;
    }

    // If posterImage is available, use it directly as primary/cover image
    if (post.posterImage) {
      setActiveImage(post.posterImage);
    }

    // If ani_id exists or mal_id exists, attempt AniList query for banner or high-res cover image
    let isMounted = true;
    setIsLoadingMalBanner(true);

    const targetAniId = post.ani_id || "";
    const params = new URLSearchParams();
    if (post.mal_id) params.set("malId", post.mal_id);
    if (post.title) params.set("title", post.title);

    fetch(`/api/anilist-banner/${targetAniId || "0"}?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data.ok && data.banner) {
            setActiveImage(data.banner);
          } else {
            setActiveImage(post.posterImage || post.image || "");
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setActiveImage(post.posterImage || post.image || "");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingMalBanner(false);
      });

    return () => {
      isMounted = false;
    };
  }, [post.bannerImage, post.backdrop, post.image, post.posterImage, post.ani_id, post.mal_id, post.title, post.isCustom]);

  // Shorten long descriptions unless expanded
  const shouldTruncate = post.content.length > 220;
  const displayText = shouldTruncate && !isExpanded 
    ? `${post.content.slice(0, 220)}...` 
    : post.content;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    onAddComment(post.id, commentInput.trim());
    setCommentInput("");
  };

  const handleImageError = () => {
    // If direct external image failed, try using our CORS image proxy
    if (!hasTriedProxy && activeImage && !activeImage.startsWith("/api/image-proxy")) {
      setHasTriedProxy(true);
      setActiveImage(getProxiedUrl(activeImage));
      return;
    }

    // If banner/proxy failed and we have posterImage not yet tried
    if (post.posterImage && activeImage !== post.posterImage && activeImage !== getProxiedUrl(post.posterImage)) {
      setActiveImage(getProxiedUrl(post.posterImage));
    } else if (post.ani_id && !activeImage.includes(`img.anili.st/media/${post.ani_id}`)) {
      setActiveImage(getProxiedUrl(`https://img.anili.st/media/${post.ani_id}`));
    }
  };

  const studioDisplayName = post.isCustom ? (currentUser.name || "Otaku Explorer") : (post.studio || "Animation Studio");
  const studioAvatarUrl = getDeterministicAvatar(studioDisplayName);

  // Check if post is from a genre category
  const isGenrePost = Boolean(post.isGenre || post.id.startsWith("genre-") || (post.studio && post.studio.includes("Guild")));

  return (
    <div className="w-full max-w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-3.5 sm:mb-4 transition-all min-w-0 box-border" id={`post-${post.id}`}>
      {/* Post Header */}
      <div className="p-3 sm:p-4 flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            <img
              src={studioAvatarUrl}
              alt={studioDisplayName}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-gray-100 shadow-sm"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(studioDisplayName)}`;
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            {/* Studio Name with Verified Badge on right */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-gray-900 text-xs sm:text-sm hover:underline cursor-pointer leading-tight truncate">
                {studioDisplayName}
              </span>
              <span 
                className="inline-flex items-center justify-center w-3 h-3 sm:w-3.5 sm:h-3.5 bg-[#1877F2] text-white rounded-full shrink-0 shadow-2xs" 
                title="Verified Studio"
              >
                <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 stroke-[3]" />
              </span>
            </div>
            
            {/* Date / Year • CC Icon & Available Count • Dub Icon & Available Count (Grayish text, no bg, no Sub/Dub text) */}
            <div className="flex items-center flex-wrap gap-1.5 text-gray-500 text-[10px] sm:text-[11px] font-medium mt-0.5 min-w-0">
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

        {/* Liked status badge & Options Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {post.isLikedByUser && (
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full border border-rose-200/80 shadow-2xs animate-fade-in">
              <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
              <span>Liked</span>
            </span>
          )}
          <button className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 sm:p-2 rounded-full cursor-pointer transition-colors shrink-0">
            <MoreHorizontal className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>

      {/* Post Body Text */}
      <div className="px-3 sm:px-4 pb-3 min-w-0">
        {/* Anime Title in description bolded (if not genre post) */}
        {post.title && !isGenrePost && (
          <h3 
            onClick={() => shouldTruncate && setIsExpanded(!isExpanded)}
            className={`font-bold text-gray-950 text-sm sm:text-base leading-snug mb-1 ${
              shouldTruncate ? "cursor-pointer hover:text-[#1877F2] transition-colors" : ""
            }`}
          >
            {post.title}
          </h3>
        )}

        <motion.div 
          layout
          initial={false}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          onClick={() => {
            if (shouldTruncate) {
              setIsExpanded(!isExpanded);
            }
          }}
          className={`relative text-gray-800 text-[13px] sm:text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
            shouldTruncate ? "cursor-pointer group hover:opacity-95 transition-opacity" : ""
          }`}
          title={shouldTruncate ? (isExpanded ? "Click text to collapse" : "Click text to expand") : undefined}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={isExpanded ? "expanded" : "collapsed"}
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {displayText}
            </motion.span>
          </AnimatePresence>
          {shouldTruncate && (
            <span
              className="text-[#1877F2] font-semibold hover:underline ml-1.5 inline-flex items-center gap-0.5 select-none"
            >
              {isExpanded ? "See Less" : "See More"}
            </span>
          )}
        </motion.div>

        {/* Tags row */}
        {post.genreTags && post.genreTags.length > 0 && (
          <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2.5 sm:mt-3 min-w-0">
            {post.genreTags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-[#1877F2] rounded-full border border-blue-50/50"
              >
                #{tag}
              </span>
            ))}
            {post.status && (
              <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full border ${post.status === 'Currently Airing' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                {post.status}
              </span>
            )}
            {post.episodes && (
              <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full border border-gray-100">
                {post.episodes} eps
              </span>
            )}
          </div>
        )}
      </div>

      {/* Media Display: Genre Blurred Backdrop with Portrait Poster & Info OR Standard Landscape Banner */}
      {activeImage ? (
        isGenrePost ? (
          /* Genre Post: Ambient Blurred Background with Sharp Portrait Poster on Left & Title/Details on Right */
          <div
            onClick={() => onImageClick?.(post)}
            className="relative bg-slate-950 flex items-center overflow-hidden border-t border-b border-gray-100 w-full min-h-[210px] sm:min-h-[240px] md:min-h-[260px] group select-none cursor-pointer p-3 sm:p-4.5 md:p-5 transition-all"
            title="Click to view full anime details & episodes"
          >
            {/* Layer 1: Ambient Blurred Background */}
            <img
              src={activeImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-45 scale-125 pointer-events-none transition-transform duration-700 group-hover:scale-135"
              referrerPolicy="no-referrer"
            />
            {/* Layer 2: Deep Dark Gradient Overlay for Maximum Legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/80 to-black/60 pointer-events-none" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors pointer-events-none" />

            {/* Layer 3: Foreground Content (Left Portrait Poster + Right Details) */}
            <div className="relative z-10 w-full flex items-center gap-3 sm:gap-4 md:gap-5 min-w-0">
              {/* Left Side: Sharp Portrait Poster */}
              <div className="relative shrink-0 aspect-[2/3] w-24 sm:w-32 md:w-36 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 border-white/25 ring-1 ring-black/50 group-hover:scale-103 group-hover:border-white/50 transition-all duration-300">
                <img
                  src={activeImage}
                  alt={post.title ? `${post.title} Poster` : "Anime Poster"}
                  onError={handleImageError}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                {/* Type badge on poster corner */}
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[9px] font-extrabold uppercase tracking-wider border border-white/15 shadow-sm">
                  {post.type || "TV"}
                </span>
                {/* Hover Play Button Indicator */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 flex items-center justify-center transition-colors">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-lg">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Right Side: Title & Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 sm:gap-1.5 md:gap-2 text-white">
                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {post.genreTags && post.genreTags.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/25 border border-blue-400/40 text-blue-300 backdrop-blur-xs">
                      <Sparkles className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{post.genreTags[0]}</span>
                    </span>
                  )}
                  {(post.rating || post.timestamp?.includes("★")) && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 backdrop-blur-xs">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
                      <span>{post.rating || (post.timestamp ? post.timestamp.match(/[\d.]+\s*★/)?.[0] : "7.8 ★")}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-gray-200 backdrop-blur-xs">
                    {post.status || "Available"}
                  </span>
                </div>

                {/* Main Anime Title */}
                <h3 className="font-extrabold text-sm sm:text-base md:text-lg text-white leading-snug line-clamp-2 tracking-tight group-hover:text-blue-200 transition-colors drop-shadow-xs">
                  {post.title}
                </h3>

                {/* Japanese / Alternative Title (if available) */}
                {post.japaneseTitle && post.japaneseTitle !== post.title && (
                  <p className="text-[11px] sm:text-xs text-gray-300/80 font-medium truncate italic -mt-0.5">
                    {post.japaneseTitle}
                  </p>
                )}

                {/* Episodes, Dub & Studio Info */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-gray-300 font-medium mt-0.5">
                  <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md border border-white/10 font-semibold">
                    <Tv className="w-3 h-3 text-blue-400 shrink-0" />
                    <span>{post.episodes || post.is_sub || 12} Episodes</span>
                  </span>
                  {post.is_dub !== undefined && post.is_dub !== null && post.is_dub > 0 && (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                      <Mic className="w-3 h-3 shrink-0" />
                      <span>Dub</span>
                    </span>
                  )}
                  <span className="text-gray-400 text-[11px] truncate">
                    · {post.studio || "Anime Guild"}
                  </span>
                </div>

                {/* Interactive Action CTA */}
                <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1877F2] hover:bg-[#166fe5] text-white text-[11px] sm:text-xs font-bold rounded-lg shadow-md group-hover:shadow-blue-500/30 transition-all">
                    <Play className="w-3 h-3 fill-white shrink-0" />
                    <span>Watch Episodes</span>
                  </span>
                  <span className="text-[11px] text-gray-300/90 font-medium group-hover:text-white transition-colors">
                    View details →
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Landscape Banner / Post Media */
          <div 
            onClick={() => onImageClick?.(post)}
            className="relative bg-gray-950 flex items-center justify-center overflow-hidden border-t border-b border-gray-100 aspect-video max-h-[420px] w-full min-w-0 group select-none cursor-pointer"
            title="Click to view photo in full view"
          >
            {/* Ambient blurred backdrop for aesthetic fit */}
            <img
              src={activeImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-110 pointer-events-none"
              referrerPolicy="no-referrer"
            />
            {/* Crisp foreground media */}
            <img
              src={activeImage}
              alt={post.title ? `${post.title} Media` : "Anime Media"}
              onError={handleImageError}
              className="relative z-10 w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
            {/* Subtle hover overlay hint */}
            <div className="absolute inset-0 z-20 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
          </div>
        )
      ) : isLoadingMalBanner ? (
        <div className="aspect-video max-h-[300px] w-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 gap-2 border-t border-b border-gray-100 min-w-0">
          <Sparkles className="h-5 w-5 animate-spin text-blue-500" />
          <span className="text-xs font-medium text-gray-500">Loading AniList Backdrop...</span>
        </div>
      ) : null}

      {/* Social Statistics Counter */}
      <div className="px-3 sm:px-4 py-2 border-b border-gray-200 flex items-center justify-between text-[11px] sm:text-xs text-gray-500 font-medium select-none min-w-0 gap-2">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <div className="flex -space-x-1 shrink-0">
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#1877F2] text-white text-[9px]">👍</span>
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px]">❤️</span>
          </div>
          <span className="truncate">
            {post.isLikedByUser 
              ? `You and ${post.likesCount - 1} others` 
              : `${post.likesCount} Otakus`}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setShowComments(!showComments)}
            className="hover:underline cursor-pointer font-medium text-gray-500 inline-flex items-center gap-1.5"
          >
            <span className="font-extrabold text-xs text-gray-500">CC</span>
            <span>{post.is_sub || (post.episodes && !isNaN(Number(post.episodes)) ? post.episodes : 1175)}</span>
            {post.is_dub ? (
              <>
                <span>·</span>
                <Mic className="h-3 w-3 text-gray-400 shrink-0 inline" />
                <span>{post.is_dub}</span>
              </>
            ) : null}
          </button>
          <span>·</span>
          <span>{post.sharesCount} shares</span>
        </div>
      </div>

      {/* Interactive Action Controls Row */}
      <div className="flex items-center justify-between px-1 sm:px-2 py-1 text-gray-600 font-bold text-xs sm:text-sm select-none min-w-0">
        <button
          onClick={() => onLikeToggle(post.id)}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 flex-1 py-1.5 sm:py-2 rounded-xl transition-all duration-150 cursor-pointer min-w-0 ${
            post.isLikedByUser 
              ? 'text-rose-600 bg-rose-50/80 hover:bg-rose-100/80 border border-rose-200/60 shadow-2xs scale-101' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title={post.isLikedByUser ? "Liked! Saved in browser cookies" : "Like this anime and save to cookies"}
        >
          {post.isLikedByUser ? (
            <Heart className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0 fill-rose-500 text-rose-500 animate-pulse" />
          ) : (
            <ThumbsUp className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0" />
          )}
          <span className="truncate">{post.isLikedByUser ? "Liked" : "Like Anime"}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center justify-center gap-1.5 sm:gap-2 flex-1 py-1.5 sm:py-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer min-w-0"
        >
          <MessageSquare className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0" />
          <span className="truncate">Episodes</span>
        </button>

        <button
          onClick={() => onShare(post.id)}
          className="flex items-center justify-center gap-1.5 sm:gap-2 flex-1 py-1.5 sm:py-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer min-w-0"
        >
          <Share2 className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0" />
          <span className="truncate">Share</span>
        </button>
      </div>

      {/* Drawer panel showing Anime Episodes from API */}
      {showComments && (
        <div className="border-t border-gray-100 bg-gray-50 p-3 sm:p-4 transition-all min-w-0 box-border" id={`comments-panel-${post.id}`}>
          <AnimeEpisodesList 
            aniId={post.ani_id} 
            animeTitle={post.title}
            poster={post.bannerImage || post.image}
            compact={true}
            onSelectEpisode={(ep) => {
              if (onSelectEpisode) {
                onSelectEpisode(post, ep);
              } else {
                onImageClick?.(post);
              }
            }}
            is_sub={post.is_sub}
          />
        </div>
      )}
    </div>
  );
}

