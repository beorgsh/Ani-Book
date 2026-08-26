export interface AnimeEpisode {
  id: string;
  number: number;
  title: string;
  titleJa?: string;
  description?: string;
  image?: string;
  airDate?: string;
  duration?: number;
  isFiller?: boolean;
  rating?: string;
  hasAired?: boolean;
  season?: number;
}

export interface AnimeItem {
  id: number;
  title: string;
  alternative?: string;
  titles?: string;
  native?: string;
  slug?: string;
  rating?: string;
  poster?: string;
  is_sub?: number;
  description?: string;
  aired?: string;
  season?: string;
  year?: number;
  duration?: string;
  status?: string;
  mal_id?: string;
  episodes?: string;
  ani_id?: string;
  source?: string;
  s_id?: number;
  background_image?: string;
  backdrop?: string;
  banner_image?: string;
  updated_at?: string;
  terms_by_type?: {
    genre?: string[];
    producers?: string[];
    studios?: string[];
    type?: string[];
  };
}

export interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ApiResponse {
  ok: boolean;
  anikoto_domains?: string[];
  data: AnimeItem[];
  pagination?: PaginationInfo;
  error?: string;
}

export interface Comment {
  id: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  timestamp: string;
}

export interface Post {
  id: string; // can be number as string, or custom uuid
  slug?: string;
  title: string;
  japaneseTitle?: string;
  avatar: string;
  isVerified?: boolean;
  timestamp: string;
  content: string;
  image?: string;
  bannerImage?: string;
  backdrop?: string;
  posterImage?: string;
  mal_id?: string;
  ani_id?: string;
  genreTags?: string[];
  studio?: string;
  isCustom?: boolean; // True if created by current user
  isGenre?: boolean; // True if from genre feed
  rating?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLikedByUser?: boolean;
  commentsList: Comment[];
  type?: string; // e.g. "ONA", "TV", "Movie"
  episodes?: string;
  status?: string;
  is_sub?: number;
  is_dub?: number;
  year?: number | string;
  aired?: string;
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "offline";
  lastActive?: string;
  characterSeries: string;
  greetingMessage?: string;
}

export interface ChatMessage {
  id: string;
  sender: "me" | "friend";
  text: string;
  timestamp: string;
}
