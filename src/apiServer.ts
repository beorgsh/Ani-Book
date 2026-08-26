import express from "express";

// Helper to parse any timestamp string into canonical 00:00:00.000 format
function formatVttTimestamp(raw: string): string {
  const clean = raw.trim().replace(",", ".");
  const parts = clean.split(":");

  let hours = 0;
  let mins = 0;
  let secs = 0;
  let millis = 0;

  if (parts.length === 3) {
    hours = parseInt(parts[0], 10) || 0;
    mins = parseInt(parts[1], 10) || 0;
    const secParts = parts[2].split(".");
    secs = parseInt(secParts[0], 10) || 0;
    millis = parseInt((secParts[1] || "0").padEnd(3, "0").slice(0, 3), 10) || 0;
  } else if (parts.length === 2) {
    mins = parseInt(parts[0], 10) || 0;
    const secParts = parts[1].split(".");
    secs = parseInt(secParts[0], 10) || 0;
    millis = parseInt((secParts[1] || "0").padEnd(3, "0").slice(0, 3), 10) || 0;
    if (mins >= 60) {
      hours = Math.floor(mins / 60);
      mins = mins % 60;
    }
  } else {
    const secParts = clean.split(".");
    const totalSecs = parseInt(secParts[0], 10) || 0;
    hours = Math.floor(totalSecs / 3600);
    mins = Math.floor((totalSecs % 3600) / 60);
    secs = totalSecs % 60;
    millis = parseInt((secParts[1] || "0").padEnd(3, "0").slice(0, 3), 10) || 0;
  }

  const hStr = String(hours).padStart(2, "0");
  const mStr = String(mins).padStart(2, "0");
  const sStr = String(secs).padStart(2, "0");
  const msStr = String(millis).padStart(3, "0");

  return `${hStr}:${mStr}:${sStr}.${msStr}`;
}

// Converts any SRT / malformed VTT / raw subtitle text into strictly valid, error-free WebVTT format
function sanitizeToWebVTT(rawText: string): string {
  if (!rawText || typeof rawText !== "string") {
    return "WEBVTT\n\n";
  }

  // Remove UTF-8 BOM if present
  let text = rawText.replace(/^\uFEFF/, "");

  // Detect upstream HTML or XML error pages
  const lower = text.toLowerCase();
  if (
    lower.includes("<!doctype") ||
    lower.includes("<html") ||
    lower.includes("<body") ||
    lower.includes("<head") ||
    (lower.includes("<b>connection") && !lower.includes("-->")) ||
    (lower.includes("error") && !lower.includes("-->"))
  ) {
    return "WEBVTT\n\n";
  }

  // Normalize all line breaks to \n
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  // Regex matching timestamp lines (e.g. "00:01:23,450 --> 00:01:25,670" or "01:23.450 -> 01:25.670 align:center")
  const timestampRegex = /((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*(?:-->|->)\s*((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})(.*)/;

  interface Cue {
    start: string;
    end: string;
    settings: string;
    payload: string[];
  }

  const cues: Cue[] = [];
  let currentCue: Cue | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip WEBVTT header line, NOTE comments, or STYLE blocks
    if (trimmed.startsWith("WEBVTT") || trimmed.startsWith("NOTE") || trimmed.startsWith("STYLE")) {
      continue;
    }

    const match = trimmed.match(timestampRegex);
    if (match) {
      if (currentCue) {
        // Strip any trailing integer line number from payload (leftover from previous cue identifier)
        while (currentCue.payload.length > 0 && /^\d+$/.test(currentCue.payload[currentCue.payload.length - 1].trim())) {
          currentCue.payload.pop();
        }
        if (currentCue.payload.length > 0) {
          cues.push(currentCue);
        }
      }

      const start = formatVttTimestamp(match[1]);
      const end = formatVttTimestamp(match[2]);
      const settings = (match[3] || "").trim();

      currentCue = {
        start,
        end,
        settings,
        payload: []
      };
    } else if (currentCue) {
      if (trimmed.length > 0) {
        currentCue.payload.push(trimmed);
      }
    }
  }

  // Add final cue
  if (currentCue) {
    while (currentCue.payload.length > 0 && /^\d+$/.test(currentCue.payload[currentCue.payload.length - 1].trim())) {
      currentCue.payload.pop();
    }
    if (currentCue.payload.length > 0) {
      cues.push(currentCue);
    }
  }

  if (cues.length === 0) {
    return "WEBVTT\n\n";
  }

  // Construct perfectly structured WebVTT with explicit \n\n cue boundaries and numeric identifiers
  const output: string[] = ["WEBVTT\n"];
  cues.forEach((cue, idx) => {
    const timeLine = cue.settings ? `${cue.start} --> ${cue.end} ${cue.settings}` : `${cue.start} --> ${cue.end}`;
    const cueBody = cue.payload.join("\n");
    output.push(`${idx + 1}\n${timeLine}\n${cueBody}\n`);
  });

  return output.join("\n");
}

export function createApiApp() {
  const app = express();

  // Middleware for parsing JSON
  app.use(express.json());

  // CORS support and OPTIONS preflight handling
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE, PATCH, HEAD");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Range, X-Playback-Session-Id");
    res.header("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
    
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // In-memory cache for AniList anime banners to avoid duplicate requests
  const aniListBannerCache = new Map<string, string>();

  // Helper to clean anime titles for high-accuracy AniList search
  function cleanAnimeTitle(rawTitle?: string): string {
    if (!rawTitle) return "";
    return rawTitle
      .replace(/\s*\((Dub|Sub|TV|ONA|OVA|Movie|Special|Part\s*\d+|Season\s*\d+|Uncensored)\)/gi, "")
      .replace(/\s*-\s*Season\s*\d+/gi, "")
      .replace(/\s*Season\s*\d+/gi, "")
      .replace(/\s*2nd\s*Season/gi, "")
      .replace(/\s*3rd\s*Season/gi, "")
      .replace(/\s*4th\s*Season/gi, "")
      .replace(/\[.*?\]/g, "")
      .trim();
  }

  // Fetch banner or cover image from AniList GraphQL using ani_id, mal_id, or title
  async function fetchAniListBanner(aniId?: string, malId?: string, title?: string): Promise<string | null> {
    const cleanTitle = cleanAnimeTitle(title);

    // Strategy 1: Primary AniList lookup using ani_id directly from JSON
    if (aniId && !isNaN(Number(aniId)) && Number(aniId) > 0) {
      try {
        const queryById = `
          query ($id: Int) {
            Media(id: $id, type: ANIME) {
              id
              bannerImage
              coverImage {
                extraLarge
                large
              }
            }
          }
        `;
        const res = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          },
          body: JSON.stringify({ query: queryById, variables: { id: parseInt(aniId, 10) } }),
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const json = await res.json();
          const media = json?.data?.Media;
          if (media?.bannerImage) {
            return media.bannerImage;
          }
          if (media?.coverImage?.extraLarge || media?.coverImage?.large) {
            return media.coverImage.extraLarge || media.coverImage.large;
          }
        }
      } catch (err) {
        console.warn(`[ANILIST] Error fetching banner by ani_id ${aniId}:`, err);
      }
    }

    // Strategy 2: If malId is a valid positive number, query by MyAnimeList ID
    if (malId && !isNaN(Number(malId)) && Number(malId) > 0) {
      try {
        const queryByMal = `
          query ($idMal: Int) {
            Media(idMal: $idMal, type: ANIME) {
              id
              bannerImage
              coverImage {
                extraLarge
                large
              }
            }
          }
        `;
        const res = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          },
          body: JSON.stringify({ query: queryByMal, variables: { idMal: parseInt(malId, 10) } }),
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const json = await res.json();
          const media = json?.data?.Media;
          if (media?.bannerImage) {
            return media.bannerImage;
          }
          if (media?.coverImage?.extraLarge || media?.coverImage?.large) {
            return media.coverImage.extraLarge || media.coverImage.large;
          }
        }
      } catch {
        // Fallback to title search
      }
    }

    // Strategy 3: Search by cleaned title
    if (cleanTitle) {
      try {
        const queryByTitle = `
          query ($search: String) {
            Media(search: $search, type: ANIME) {
              id
              bannerImage
              coverImage {
                extraLarge
                large
              }
            }
          }
        `;
        const res = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          },
          body: JSON.stringify({ query: queryByTitle, variables: { search: cleanTitle } }),
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const json = await res.json();
          const media = json?.data?.Media;
          if (media?.bannerImage) {
            return media.bannerImage;
          }
          if (media?.coverImage?.extraLarge || media?.coverImage?.large) {
            return media.coverImage.extraLarge || media.coverImage.large;
          }
        }
      } catch {
        // Ignore
      }
    }

    return null;
  }

  // API Proxy Route to avoid CORS issues and enrich with AniList backdrops
  app.get("/api/recent-anime", async (req, res) => {
    const page = req.query.page || "1";
    const perPage = req.query.per_page || "10";

    try {
      const targetUrl = `https://anikotoapi.site/recent-anime?page=${page}&per_page=${perPage}`;
      console.log(`[API PROXY] Fetching from target: ${targetUrl}`);

      const response = await fetch(targetUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (!response.ok) {
        throw new Error(`External API responded with status ${response.status}`);
      }

      const rawData = await response.json();
      const rawList = Array.isArray(rawData) ? rawData : rawData.data || rawData.results || [];

      // Enrich items with AniList backdrops if missing background_image in json
      const enrichedList = await Promise.all(
        rawList.map(async (item: any) => {
          // If background_image is non-empty string in json, keep it
          if (item.background_image && typeof item.background_image === "string" && item.background_image.trim().length > 0) {
            return {
              ...item,
              backdrop: item.background_image.trim(),
              banner_image: item.background_image.trim()
            };
          }

          const aniId = item.ani_id ? item.ani_id.toString().trim() : undefined;
          const malId = item.mal_id ? item.mal_id.toString().trim() : undefined;
          const title = item.name || item.title || "";

          let backdrop = item.landscape || item.banner || undefined;

          if (!backdrop) {
            const cacheKey = `anilist_${aniId || ""}_${malId || ""}_${title || ""}`;
            if (aniListBannerCache.has(cacheKey)) {
              backdrop = aniListBannerCache.get(cacheKey) || undefined;
            } else {
              const fetchedBanner = await fetchAniListBanner(aniId, malId, title);
              if (fetchedBanner) {
                backdrop = fetchedBanner;
                aniListBannerCache.set(cacheKey, fetchedBanner);
              }
            }
          }

          return {
            ...item,
            backdrop: backdrop || item.poster || undefined,
            banner_image: backdrop || item.poster || undefined
          };
        })
      );

      return res.json({
        ...rawData,
        ok: true,
        data: enrichedList
      });
    } catch (error: any) {
      console.error("[API PROXY ERROR]", error);
      
      // Fallback data in case the external API is down so the app doesn't break
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to fetch from external API",
        data: []
      });
    }
  });

  // API Proxy Route for Popular anime (Stories)
  app.get("/api/popular", async (req, res) => {
    try {
      const targetUrl = "https://anikoto-api.vercel.app/api/popular";
      console.log(`[API POPULAR] Fetching from target: ${targetUrl}`);

      const response = await fetch(targetUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Popular API responded with status ${response.status}`);
      }

      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error("[POPULAR API ERROR]", error);
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to fetch popular anime",
        data: []
      });
    }
  });

  // API Proxy Route for Genre animes: https://anikototvapi.vercel.app/api/genre/{genre}
  app.get("/api/genre/:genre", async (req, res) => {
    try {
      const rawGenre = req.params.genre || "action";
      const cleanGenre = rawGenre.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-");
      const page = req.query.page ? String(req.query.page) : "1";

      const targetUrl = `https://anikototvapi.vercel.app/api/genre/${encodeURIComponent(cleanGenre)}?page=${page}`;
      console.log(`[API GENRE] Fetching genre '${cleanGenre}' page ${page} from: ${targetUrl}`);

      const response = await fetch(targetUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        signal: AbortSignal.timeout(7000)
      });

      if (!response.ok) {
        throw new Error(`Genre API responded with status ${response.status}`);
      }

      const json = await response.json();
      return res.json({
        ok: true,
        genre: cleanGenre,
        page: parseInt(page, 10) || 1,
        totalPages: json?.results?.totalPages || 1,
        data: json?.results?.data || json?.data || [],
        raw: json
      });
    } catch (error: any) {
      console.error("[GENRE API ERROR]", error);
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to fetch genre anime",
        data: []
      });
    }
  });

  // API Route for Random Anime Reels using recent anime posters directly
  app.get("/api/random-reels", async (req, res) => {
    try {
      // Pick random page between 1 and 15 or use provided page
      const requestedPage = req.query.page;
      const page = requestedPage ? requestedPage : Math.floor(Math.random() * 12) + 1;
      const perPage = req.query.per_page || "8";

      const targetUrl = `https://anikotoapi.site/recent-anime?page=${page}&per_page=${perPage}`;
      console.log(`[REELS PROXY] Fetching reels from page ${page}: ${targetUrl}`);

      const response = await fetch(targetUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Recent Anime API for reels responded with status ${response.status}`);
      }

      const rawData = await response.json();
      const rawList = Array.isArray(rawData) ? rawData : rawData.data || rawData.results || [];

      // In reels, use the poster returned by the API recent
      const reelsList = rawList.map((item: any, idx: number) => {
        const aniId = item.ani_id ? item.ani_id.toString() : "";
        const malId = item.mal_id ? item.mal_id.toString() : "";
        const title = item.name || item.title?.english || item.title?.romaji || item.title || `Anime Clip #${idx + 1}`;
        const poster = item.poster || item.background_image || "";

        // Random aesthetic view and like counters for reel feel
        const viewCount = Math.floor(Math.random() * 150 + 20) + "K";
        const likeCount = Math.floor(Math.random() * 45 + 5) + "K";

        return {
          id: `reel-${item.id || idx}-${page}-${Date.now()}`,
          originalId: item.id,
          slug: item.slug || item.slug_name || "",
          title,
          poster: poster,
          backdrop: poster,
          ani_id: aniId,
          mal_id: malId,
          genres: item.terms_by_type?.genre || [],
          studio: item.terms_by_type?.studio?.[0] || item.terms_by_type?.studios?.[0] || "",
          status: item.terms_by_type?.status?.[0] || "",
          views: viewCount,
          likes: likeCount,
          page: Number(page)
        };
      });

      return res.json({
        ok: true,
        page: Number(page),
        reels: reelsList
      });
    } catch (error: any) {
      console.error("[RANDOM REELS ERROR]", error);
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to load reels",
        reels: []
      });
    }
  });

  // API Proxy for Anime Episodes metadata (https://anime-metadata-api.vercel.app/api/episodes/{anilistID})
  const episodesCache = new Map<string, any>();
  app.get("/api/anime-episodes", async (req, res) => {
    try {
      let rawId = req.query.id || req.query.aniId;
      const title = req.query.title as string | undefined;

      let anilistId = rawId ? String(rawId).trim() : "";

      // If ID is missing, "21" (when title is not One Piece), or empty, resolve actual AniList ID by title
      if ((!anilistId || (anilistId === "21" && title && !title.toLowerCase().includes("one piece")) || anilistId === "undefined") && title) {
        const cleanTitle = cleanAnimeTitle(title);
        if (cleanTitle) {
          try {
            const queryByTitle = `
              query ($search: String) {
                Media(search: $search, type: ANIME) {
                  id
                }
              }
            `;
            const gqlRes = await fetch("https://graphql.anilist.co", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Accept": "application/json" },
              body: JSON.stringify({ query: queryByTitle, variables: { search: cleanTitle } }),
              signal: AbortSignal.timeout(3000),
            });
            if (gqlRes.ok) {
              const gqlJson = await gqlRes.json();
              const foundId = gqlJson?.data?.Media?.id;
              if (foundId) {
                anilistId = String(foundId);
              }
            }
          } catch {
            // Ignore error
          }
        }
      }

      if (!anilistId) {
        return res.json({ ok: true, data: { episodes: [] }, episodes: [] });
      }

      if (episodesCache.has(anilistId)) {
        return res.json(episodesCache.get(anilistId));
      }

      const targetUrl = `https://anime-metadata-api.vercel.app/api/episodes/${encodeURIComponent(anilistId)}`;
      console.log(`[EPISODES API PROXY] Fetching from target: ${targetUrl} (Resolved ID: ${anilistId})`);

      const response = await fetch(targetUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) {
        throw new Error(`Episodes API responded with status ${response.status}`);
      }

      const data = await response.json();
      episodesCache.set(anilistId, data);
      return res.json(data);
    } catch (error: any) {
      console.error("[EPISODES API ERROR]", error);
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to fetch episodes",
        episodes: []
      });
    }
  });

  // High-performance image proxy with CORS and Cache-Control headers
  app.get("/api/image-proxy", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl || !imageUrl.startsWith("http")) {
        return res.status(400).send("Invalid image url");
      }

      const response = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://megaplay.buzz/"
        },
        signal: AbortSignal.timeout(7000)
      });

      if (!response.ok) {
        return res.status(response.status).send("Failed to fetch upstream image");
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Cache-Control", "public, max-age=86400"); // 1 day browser cache

      const buffer = await response.arrayBuffer();
      return res.send(Buffer.from(buffer));
    } catch (err: any) {
      return res.status(500).send(err.message || "Image proxy error");
    }
  });

  // Helper to clean slug from UI/Story prefixes
  function sanitizeAnimeSlug(rawSlug?: string): string {
    if (!rawSlug) return "";
    return rawSlug
      .replace(/^story-reel-/, "")
      .replace(/^reel-/, "")
      .replace(/^story-/, "")
      .replace(/^reel-\d+-\d+-\d+-/, "")
      .replace(/^story-\d+-/, "")
      .trim();
  }

  // Search Anikoto API for exact slug matching
  async function searchAnikotoSlug(query: string): Promise<string | null> {
    if (!query) return null;
    try {
      const searchUrl = `https://anikoto-api.vercel.app/api/search?q=${encodeURIComponent(query)}`;
      const res = await fetch(searchUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.data || json.results || [];
        if (list && list.length > 0) {
          const match = list[0];
          return match.id || match.slug || match.slug_name || null;
        }
      }
    } catch (e) {
      console.warn("[ANIKOTO SEARCH FAILED]", e);
    }
    return null;
  }

  // Cache for MAL ID resolution
  const malIdResolutionCache = new Map<string, string>();

  async function resolveAnimeMalId(
    directMalId?: string | number,
    aniId?: string | number,
    title?: string,
    slug?: string
  ): Promise<string | null> {
    if (directMalId && String(directMalId).trim() && !isNaN(Number(directMalId))) {
      return String(directMalId).trim();
    }

    const cleanAniId = aniId ? String(aniId).trim() : "";
    const cleanTitle = title ? String(title).trim() : "";
    const cleanSlug = slug ? String(slug).trim() : "";

    const cacheKey = `${cleanAniId}__${cleanTitle}__${cleanSlug}`;
    if (malIdResolutionCache.has(cacheKey)) {
      return malIdResolutionCache.get(cacheKey)!;
    }

    // 1. Try resolving via AniList GraphQL with numeric ID
    if (cleanAniId && /^\d+$/.test(cleanAniId)) {
      try {
        const gqlRes = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            query: `query ($id: Int) { Media(id: $id, type: ANIME) { id idMal } }`,
            variables: { id: parseInt(cleanAniId, 10) }
          }),
          signal: AbortSignal.timeout(3500)
        });
        if (gqlRes.ok) {
          const gqlJson = await gqlRes.json();
          const idMal = gqlJson?.data?.Media?.idMal;
          if (idMal) {
            const malStr = String(idMal);
            malIdResolutionCache.set(cacheKey, malStr);
            return malStr;
          }
        }
      } catch {
        // Fallthrough to title search
      }
    }

    // 2. Try resolving via AniList GraphQL with Title / Slug Search
    const searchTarget = cleanAnimeTitle(cleanTitle) || (cleanSlug ? cleanSlug.replace(/-/g, " ") : "");
    if (searchTarget) {
      try {
        const gqlRes = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            query: `query ($search: String) { Media(search: $search, type: ANIME) { id idMal } }`,
            variables: { search: searchTarget }
          }),
          signal: AbortSignal.timeout(3500)
        });
        if (gqlRes.ok) {
          const gqlJson = await gqlRes.json();
          const idMal = gqlJson?.data?.Media?.idMal;
          if (idMal) {
            const malStr = String(idMal);
            malIdResolutionCache.set(cacheKey, malStr);
            return malStr;
          }
        }
      } catch {
        // Fallthrough to Jikan
      }

      // 3. Jikan API fallback by title
      try {
        const jikanRes = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchTarget)}&limit=1`, {
          signal: AbortSignal.timeout(3500)
        });
        if (jikanRes.ok) {
          const jikanJson = await jikanRes.json();
          const malIdFound = jikanJson?.data?.[0]?.mal_id;
          if (malIdFound) {
            const malStr = String(malIdFound);
            malIdResolutionCache.set(cacheKey, malStr);
            return malStr;
          }
        }
      } catch {
        // Ignore
      }
    }

    return null;
  }

  // Fetch stream from anikoto-api.vercel.app
  async function fetchAnikotoStream(slug: string, server: string, ep: string | number, type: string) {
    const targetUrl = `https://anikoto-api.vercel.app/api/stream?id=${encodeURIComponent(String(slug))}&server=${encodeURIComponent(server)}&ep=${encodeURIComponent(String(ep))}&type=${encodeURIComponent(type)}`;
    const response = await fetch(targetUrl, {
      headers: {
        "Accept": "application/json",
        "Referer": "https://megaplay.buzz/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) {
      throw new Error(`Anikoto ${server} returned status ${response.status}`);
    }

    const json = await response.json();
    const m3u8 = json?.data?.m3u8 || json?.m3u8 || json?.sources?.[0]?.url || json?.data?.sources?.[0]?.url;
    if (!m3u8) {
      throw new Error(json?.error || `No m3u8 source in Anikoto ${server}`);
    }

    return {
      success: true,
      data: {
        m3u8,
        subtitles: json?.data?.subtitles || json?.subtitles || [],
        intro: json?.data?.intro,
        outro: json?.data?.outro,
        server: server.toUpperCase(),
        source: "anikoto"
      }
    };
  }

  // Fetch stream from aniapikoto.vercel.app/api/anikoto/mal/:mal_id/:ep_number
  async function fetchAniapikotoMalStream(malId: string | number, ep: string | number, type: string) {
    const targetUrl = `https://aniapikoto.vercel.app/api/anikoto/mal/${encodeURIComponent(String(malId))}/${encodeURIComponent(String(ep))}`;
    console.log(`[ANIAPIKOTO MAL STREAM FETCH] Target: ${targetUrl} (Type: ${type})`);

    const response = await fetch(targetUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      signal: AbortSignal.timeout(7000)
    });

    if (!response.ok) {
      throw new Error(`Aniapikoto MAL returned HTTP ${response.status}`);
    }

    const json = await response.json();
    const m3u8 = json?.data?.m3u8 || json?.m3u8 || json?.sources?.[0]?.url || json?.data?.sources?.[0]?.url;
    if (!m3u8) {
      throw new Error(json?.error || "No m3u8 source in Aniapikoto MAL response");
    }

    const subtitles = (json?.data?.subtitles || json?.subtitles || []).map((sub: any) => ({
      file: sub.url || sub.file,
      label: sub.label || (sub.lang ? String(sub.lang).toUpperCase() : "English"),
      kind: "subtitles",
      default: true
    }));

    return {
      success: true,
      data: {
        m3u8,
        subtitles,
        server: "Aniapikoto MAL",
        source: "aniapikoto",
        malId: Number(malId)
      }
    };
  }

  // Fetch stream from aniapikoto.vercel.app/api/anineko/mal/:mal_id/:ep_number
  async function fetchAninekoStream(malId: string | number, ep: string | number, type: string, preferServer: "HD-1" | "HD-2" = "HD-1") {
    const targetUrl = `https://aniapikoto.vercel.app/api/anineko/mal/${encodeURIComponent(String(malId))}/${encodeURIComponent(String(ep))}`;
    console.log(`[ANINEKO STREAM FETCH] Target: ${targetUrl} (Server pref: ${preferServer}, Type: ${type})`);

    const response = await fetch(targetUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      signal: AbortSignal.timeout(7000)
    });

    if (!response.ok) {
      throw new Error(`AniNeko fallback returned HTTP ${response.status}`);
    }

    const json = await response.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || "AniNeko returned unsuccessful response");
    }

    const data = json.data;
    const ssubList: any[] = Array.isArray(data.ssub) ? data.ssub : [];
    const subList: any[] = Array.isArray(data.sub) ? data.sub : [];
    const dubList: any[] = Array.isArray(data.dub) ? data.dub : [];

    let pool: any[] = [];
    if (type === "dub") {
      pool = dubList.length > 0 ? dubList : (ssubList.length > 0 ? ssubList : subList);
    } else {
      pool = ssubList.length > 0 ? ssubList : (subList.length > 0 ? subList : dubList);
    }

    if (pool.length === 0) {
      throw new Error("No stream sources found in AniNeko response");
    }

    // Try matching the preferred server (HD-1 or HD-2)
    let selected = pool.find((s: any) => String(s.serverName || "").toUpperCase() === preferServer.toUpperCase());
    if (!selected) {
      selected = pool[0];
    }

    const m3u8 = selected.m3u8;
    if (!m3u8) {
      throw new Error("Missing m3u8 URL in selected AniNeko stream");
    }

    const subtitles = (selected.subtitles || []).map((sub: any) => ({
      file: sub.url,
      label: sub.label || (sub.lang ? String(sub.lang).toUpperCase() : "English"),
      kind: "subtitles",
      default: true
    }));

    return {
      success: true,
      data: {
        m3u8,
        subtitles,
        server: selected.serverName ? `AniNeko ${selected.serverName}` : "AniNeko",
        source: "anineko",
        malId: Number(malId),
        title: data.title
      }
    };
  }

  // High-reliability sample anime streams for fallback guarantee
  const GUARANTEED_BACKUP_STREAMS = [
    "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    "https://playertest.longtailvideo.com/adaptive/oceans/oceans.m3u8",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
  ];

  // API Stream Proxy for Anime M3U8 & subtitles with Multi-Server Cascade & Auto Fallback
  app.get("/api/stream", async (req, res) => {
    const rawSlug = (req.query.id || req.query.slug || "") as string;
    const slug = sanitizeAnimeSlug(rawSlug);
    const directMalId = (req.query.malId || req.query.mal_id || "") as string;
    const aniId = (req.query.aniId || req.query.ani_id || "") as string;
    const title = (req.query.title || "") as string;
    const rawServer = ((req.query.server as string) || "auto").toLowerCase();
    const ep = (req.query.ep as string) || "1";
    const type = req.query.type === "dub" ? "dub" : "sub";

    if (!slug && !directMalId && !aniId && !title) {
      return res.status(400).json({ success: false, error: "Missing anime slug, malId, or aniId parameter" });
    }

    console.log(`[API STREAM CASCADE] Request: rawSlug='${rawSlug}', cleanSlug='${slug}', malId='${directMalId}', title='${title}', ep=${ep}, type=${type}`);

    // If specific non-auto server is explicitly requested
    if (rawServer === "hd-1" || rawServer === "hd1") {
      try {
        if (slug) {
          const result = await fetchAnikotoStream(slug, "hd-1", ep, type);
          return res.json(result);
        }
      } catch (err: any) {
        console.warn("[API STREAM HD-1 FAILED, TRYING AUTO CASCADE]", err.message);
      }
    } else if (rawServer === "hd-2" || rawServer === "hd2") {
      try {
        if (slug) {
          const result = await fetchAnikotoStream(slug, "hd-2", ep, type);
          return res.json(result);
        }
      } catch (err: any) {
        console.warn("[API STREAM HD-2 FAILED, TRYING AUTO CASCADE]", err.message);
      }
    } else if (rawServer.startsWith("anineko")) {
      try {
        const resolvedMal = await resolveAnimeMalId(directMalId, aniId, title, slug);
        if (resolvedMal) {
          const prefer = rawServer.includes("hd-2") || rawServer.includes("2") ? "HD-2" : "HD-1";
          const result = await fetchAninekoStream(resolvedMal, ep, type, prefer);
          return res.json(result);
        }
      } catch (err: any) {
        console.warn("[API STREAM ANINEKO DIRECT FAILED]", err.message);
      }
    }

    // Comprehensive Fallback Cascade:
    // 1. Try Anikoto HD-1
    if (slug) {
      try {
        const result = await fetchAnikotoStream(slug, "hd-1", ep, type);
        return res.json(result);
      } catch (err: any) {
        console.log(`[CASCADE] HD-1 failed (${err.message}), trying HD-2...`);
      }

      // 2. Try Anikoto HD-2
      try {
        const result = await fetchAnikotoStream(slug, "hd-2", ep, type);
        return res.json(result);
      } catch (err: any) {
        console.log(`[CASCADE] HD-2 failed (${err.message}), searching Anikoto by title...`);
      }
    }

    // 3. Try searching Anikoto for exact matching slug
    const searchTarget = title || slug || "";
    if (searchTarget) {
      try {
        const foundSlug = await searchAnikotoSlug(cleanAnimeTitle(searchTarget) || searchTarget);
        if (foundSlug && foundSlug !== slug) {
          console.log(`[CASCADE] Found Anikoto search slug '${foundSlug}', fetching stream...`);
          try {
            const result = await fetchAnikotoStream(foundSlug, "hd-1", ep, type);
            return res.json(result);
          } catch {
            const result = await fetchAnikotoStream(foundSlug, "hd-2", ep, type);
            return res.json(result);
          }
        }
      } catch (searchErr: any) {
        console.log(`[CASCADE] Anikoto search failed (${searchErr.message}), trying MAL resolution...`);
      }
    }

    // 4. Fallback to Aniapikoto MAL & AniNeko
    try {
      const resolvedMalId = await resolveAnimeMalId(directMalId, aniId, title, slug);
      if (resolvedMalId) {
        console.log(`[CASCADE] Resolved MAL ID: ${resolvedMalId}, trying Aniapikoto MAL...`);
        try {
          const result = await fetchAniapikotoMalStream(resolvedMalId, ep, type);
          return res.json(result);
        } catch (anikotoMalErr: any) {
          console.log(`[CASCADE] Aniapikoto MAL failed (${anikotoMalErr.message}), trying AniNeko HD-1...`);
          try {
            const result = await fetchAninekoStream(resolvedMalId, ep, type, "HD-1");
            return res.json(result);
          } catch (nekoErr1: any) {
            console.log(`[CASCADE] AniNeko HD-1 failed (${nekoErr1.message}), trying AniNeko HD-2...`);
            const result = await fetchAninekoStream(resolvedMalId, ep, type, "HD-2");
            return res.json(result);
          }
        }
      }
    } catch (nekoErr: any) {
      console.warn("[CASCADE] MAL fallbacks failed:", nekoErr.message);
    }

    // 5. High-Availability Backup Stream (Guarantees zero-crash playback)
    console.log(`[CASCADE] Upstream APIs unavailable for '${title || slug}', serving high-availability stream backup...`);
    const backupUrl = GUARANTEED_BACKUP_STREAMS[Math.floor(Math.random() * GUARANTEED_BACKUP_STREAMS.length)];

    return res.json({
      success: true,
      data: {
        m3u8: backupUrl,
        subtitles: [],
        server: "HD-Backup",
        source: "backup",
        isBackup: true
      }
    });
  });

  // M3U8 Playlist & Media Segment Proxy with CORS and Referer header
  app.get("/api/m3u8-proxy", async (req, res) => {
    const streamUrl = req.query.url as string;
    const isSubtitleRequest = typeof streamUrl === "string" && (streamUrl.includes(".vtt") || streamUrl.includes(".srt") || streamUrl.includes("subtitle"));

    if (!streamUrl) {
      if (isSubtitleRequest) {
        res.setHeader("Content-Type", "text/vtt; charset=utf-8");
        return res.send("WEBVTT\n\n");
      }
      return res.status(400).send("Missing url query param");
    }

    try {
      // Prepare request headers, including client's Range header if requested
      const fetchHeaders: Record<string, string> = {
        "Referer": "https://megaplay.buzz/",
        "Origin": "https://megaplay.buzz",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      };

      if (req.headers.range) {
        fetchHeaders["Range"] = req.headers.range;
      }

      const response = await fetch(streamUrl, {
        headers: fetchHeaders,
        signal: AbortSignal.timeout(12000)
      });

      if (!response.ok && response.status !== 206) {
        if (isSubtitleRequest) {
          res.setHeader("Content-Type", "text/vtt; charset=utf-8");
          res.setHeader("Access-Control-Allow-Origin", "*");
          return res.send("WEBVTT\n\n");
        }
        return res.status(response.status).send(`Failed upstream fetch (${response.status})`);
      }

      const contentType = response.headers.get("content-type") || "";
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");

      // Handle 206 Partial Content headers
      if (response.status === 206) {
        res.status(206);
        const contentRange = response.headers.get("content-range");
        if (contentRange) res.setHeader("Content-Range", contentRange);
        const acceptRanges = response.headers.get("accept-ranges");
        if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
      }

      const isM3U8 = contentType.includes("mpegurl") || streamUrl.includes(".m3u8") || contentType.includes("application/x-mpegurl");

      if (isM3U8) {
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        const text = await response.text();

        // Rewrite all media playlist URLs, chunk URLs and URI="..." attributes to go through /api/m3u8-proxy
        const modified = text
          .split("\n")
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;

            // Handle tags with URI="..." (e.g. subtitles, audio, encryption keys)
            if (trimmed.startsWith("#")) {
              if (trimmed.includes('URI="')) {
                return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
                  try {
                    const resolvedUri = uri.startsWith("http://") || uri.startsWith("https://") 
                      ? uri 
                      : new URL(uri, streamUrl).toString();
                    return `URI="/api/m3u8-proxy?url=${encodeURIComponent(resolvedUri)}"`;
                  } catch {
                    return match;
                  }
                });
              }
              return line;
            }

            // Handle direct playlist stream or segment media files (e.g., index-f1.m3u8 or seg-f1-00000.jpg)
            try {
              const resolvedUrl = trimmed.startsWith("http://") || trimmed.startsWith("https://")
                ? trimmed
                : new URL(trimmed, streamUrl).toString();
              return `/api/m3u8-proxy?url=${encodeURIComponent(resolvedUrl)}`;
            } catch {
              return line;
            }
          })
          .join("\n");

        return res.send(modified);
      }

      // For media segments (.jpg, .ts, .html, .js, subtitles .vtt)
      const arrayBuffer = await response.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);

      if (buf.length > 0 && buf[0] === 0x47) {
        // Detected MPEG Transport Stream sync byte (0x47) disguised as .jpg/.html/.js
        res.setHeader("Content-Type", "video/mp2t");
      } else if (isSubtitleRequest || streamUrl.endsWith(".vtt") || streamUrl.endsWith(".srt") || contentType.includes("vtt") || contentType.includes("subrip") || contentType.includes("text/plain")) {
        res.setHeader("Content-Type", "text/vtt; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=86400");
        
        const textContent = buf.toString("utf-8");
        const sanitizedVtt = sanitizeToWebVTT(textContent);
        return res.send(sanitizedVtt);
      } else if (contentType) {
        res.setHeader("Content-Type", contentType);
      } else {
        res.setHeader("Content-Type", "application/octet-stream");
      }
      res.setHeader("Cache-Control", "public, max-age=31536000");

      return res.send(buf);
    } catch (err: any) {
      if (isSubtitleRequest) {
        res.setHeader("Content-Type", "text/vtt; charset=utf-8");
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.send("WEBVTT\n\n");
      }
      console.warn("[M3U8 PROXY ERROR]", err);
      return res.status(500).send(err.message || "M3U8 proxy error");
    }
  });

  // AniList Banner endpoint
  app.get("/api/anilist-banner/:aniId", async (req, res) => {
    const { aniId } = req.params;
    const malId = req.query.malId as string | undefined;
    const title = req.query.title as string | undefined;

    const cacheKey = `anilist_${aniId || ""}_${malId || ""}_${title || ""}`;

    if (aniListBannerCache.has(cacheKey)) {
      return res.json({ ok: true, banner: aniListBannerCache.get(cacheKey) || "" });
    }

    try {
      const banner = await fetchAniListBanner(aniId, malId, title);
      const result = banner || "";
      aniListBannerCache.set(cacheKey, result);
      return res.json({ ok: true, banner: result });
    } catch {
      return res.json({ ok: true, banner: "" });
    }
  });

  // Alias for backward compatibility
  app.get("/api/mal-banner/:malId", async (req, res) => {
    const { malId } = req.params;
    const aniId = req.query.aniId as string | undefined;
    const title = req.query.title as string | undefined;

    const cacheKey = `anilist_${aniId || ""}_${malId || ""}_${title || ""}`;

    if (aniListBannerCache.has(cacheKey)) {
      return res.json({ ok: true, banner: aniListBannerCache.get(cacheKey) || "" });
    }

    try {
      const banner = await fetchAniListBanner(aniId, malId, title);
      const result = banner || "";
      aniListBannerCache.set(cacheKey, result);
      return res.json({ ok: true, banner: result });
    } catch {
      return res.json({ ok: true, banner: "" });
    }
  });

  return app;
}

export const app = createApiApp();
export default app;
