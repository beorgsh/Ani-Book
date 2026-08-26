import React, { useState, useEffect, useRef } from "react";
import { Image, Smile, Video, X, Tag, Heart } from "lucide-react";

interface CreatePostProps {
  currentUser: { name: string; avatar: string };
  onSubmitPost: (content: string, image?: string, tags?: string[]) => void;
}

export default function CreatePost({ currentUser, onSubmitPost }: CreatePostProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [imageInput, setImageInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showImageInput, setShowImageInput] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    try {
      window.history.pushState({ modal: "anibook_create_post_modal" }, "");
    } catch {
      // ignore
    }

    const handlePopState = () => {
      setIsOpen(false);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isOpen]);

  // Available genre tags for user custom post
  const availableTags = ["Action", "Fantasy", "Adventure", "Comedy", "Sci-Fi", "Slice of Life"];

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !imageInput) return;
    
    onSubmitPost(text, imageInput || undefined, selectedTags);
    
    // Reset state
    setText("");
    setImageInput("");
    setSelectedTags([]);
    setShowImageInput(false);
    setIsOpen(false);
  };

  return (
    <div className="w-full max-w-full bg-white dark:bg-[#161b22] text-gray-900 dark:text-gray-100 rounded-2xl shadow-sm border border-gray-200 dark:border-[#30363d] p-3 sm:p-4 min-w-0 box-border" id="create-post-container">
      {/* Mini Top Row */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-gray-100 dark:border-[#30363d] shrink-0"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://api.dicebear.com/9.x/adventurer/svg?seed=OtakuExplorer_MainUser&backgroundColor=b6e3f4";
          }}
        />
        <button
          onClick={() => setIsOpen(true)}
          className="flex-1 bg-[#F0F2F5] dark:bg-[#21262d] hover:bg-[#E4E6EB] dark:hover:bg-[#30363d] text-left text-gray-500 dark:text-gray-300 rounded-full h-9 sm:h-10 px-3.5 sm:px-4 text-xs sm:text-sm font-medium transition-colors duration-150 cursor-pointer min-w-0 truncate"
        >
          What's on your mind, {currentUser.name.split(" ")[0]}?
        </button>
      </div>

      <div className="h-[1px] bg-gray-100 dark:bg-[#30363d] my-2.5 sm:my-3" />

      {/* Mini Quick-actions Row */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-semibold min-w-0 gap-1">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center gap-1.5 sm:gap-2 flex-1 py-1.5 sm:py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-colors duration-150 cursor-pointer min-w-0"
        >
          <Video className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 shrink-0" />
          <span className="truncate">Live Video</span>
        </button>
        <button
          onClick={() => {
            setIsOpen(true);
            setShowImageInput(true);
          }}
          className="flex items-center justify-center gap-1.5 sm:gap-2 flex-1 py-1.5 sm:py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-colors duration-150 cursor-pointer min-w-0"
        >
          <Image className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />
          <span className="truncate">Photo/Video</span>
        </button>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center gap-1.5 sm:gap-2 flex-1 py-1.5 sm:py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-colors duration-150 cursor-pointer min-w-0"
        >
          <Smile className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 shrink-0" />
          <span className="truncate">Feeling</span>
        </button>
      </div>

      {/* Creation Modal (Facebook Styled Overlay) */}
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#161b22] text-gray-900 dark:text-gray-100 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-[#30363d] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center h-14 border-b border-gray-100 dark:border-[#30363d] px-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Create Post</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-[#21262d] hover:bg-gray-200 dark:hover:bg-[#30363d] text-gray-500 dark:text-gray-300 transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 flex flex-col">
              {/* Profile info */}
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-11 h-11 rounded-full object-cover border border-gray-100"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://api.dicebear.com/9.x/adventurer/svg?seed=OtakuExplorer_MainUser&backgroundColor=b6e3f4";
                  }}
                />
                <div>
                  <span className="block font-bold text-gray-900 text-sm leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold mt-1">
                    🌍 Public Feed
                  </span>
                </div>
              </div>

              {/* Text Area */}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`What's on your mind about anime, ${currentUser.name.split(" ")[0]}?`}
                className="w-full flex-1 min-h-[120px] text-gray-800 placeholder-gray-400 text-base resize-none focus:outline-none leading-relaxed"
                autoFocus
              />

              {/* Tags Selector */}
              <div className="mb-4">
                <span className="text-xs font-bold text-gray-400 block mb-2 uppercase tracking-wide">Add Anime Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => handleToggleTag(tag)}
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer ${isSelected ? 'bg-blue-500 text-white shadow-sm' : 'bg-[#F0F2F5] hover:bg-[#E4E6EB] text-gray-600'}`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Image Url field */}
              {showImageInput ? (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mb-4 flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Anime Image URL</label>
                    <input
                      type="url"
                      value={imageInput}
                      onChange={(e) => setImageInput(e.target.value)}
                      placeholder="Paste any high-quality anime image link..."
                      className="w-full bg-white border border-gray-200 h-9 rounded-lg px-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImageInput("");
                      setShowImageInput(false);
                    }}
                    className="self-end h-9 w-9 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowImageInput(true)}
                  className="mb-4 flex items-center gap-2.5 px-3 py-2 bg-blue-50/50 hover:bg-blue-50 border border-dashed border-blue-200 text-blue-600 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer"
                >
                  <Image className="h-4 w-4" />
                  <span>Attach an anime poster or meme image link...</span>
                </button>
              )}

              {/* Add to your post panel */}
              <div className="border border-gray-200 rounded-xl p-3 flex items-center justify-between mb-4 shadow-sm bg-white">
                <span className="text-xs font-bold text-gray-700">Add to your post</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowImageInput(true)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-green-500 cursor-pointer"
                    title="Add Photo"
                  >
                    <Image className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded-full hover:bg-gray-100 text-blue-500 cursor-pointer"
                    title="Tag Friends"
                  >
                    <Tag className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded-full hover:bg-gray-100 text-red-400 cursor-pointer"
                    title="Add Love"
                  >
                    <Heart className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={!text.trim() && !imageInput}
                className={`w-full h-10 rounded-lg text-sm font-bold text-white shadow-md transition-all cursor-pointer ${text.trim() || imageInput ? 'bg-[#1877F2] hover:bg-[#166FE5] hover:scale-[1.01]' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                Post to AniBook Feed
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
