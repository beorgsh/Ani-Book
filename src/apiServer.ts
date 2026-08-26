import express from "express";

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

  // API Stream Proxy for Anime M3U8 & subtitles
  // Supports query: id (slug), server (hd-1 / hd-2), ep (1), type (sub / dub)
  app.get("/api/stream", async (req, res) => {
    try {
      const slug = req.query.id || req.query.slug;
      let server = (req.query.server as string) || "hd-1";
      if (server === "hd1") server = "hd-1";
      if (server === "hd2") server = "hd-2";
      const ep = req.query.ep || "1";
      const type = req.query.type === "dub" ? "dub" : "sub";

      if (!slug) {
        return res.status(400).json({ success: false, error: "Missing anime slug/id parameter" });
      }

      const targetUrl = `https://anikoto-api.vercel.app/api/stream?id=${encodeURIComponent(String(slug))}&server=${encodeURIComponent(server)}&ep=${encodeURIComponent(String(ep))}&type=${encodeURIComponent(type)}`;
      console.log(`[API STREAM] Requesting: ${targetUrl}`);

      const response = await fetch(targetUrl, {
        headers: {
          "Accept": "application/json",
          "Referer": "https://megaplay.buzz/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        throw new Error(`Stream upstream API returned status ${response.status}`);
      }

      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error("[API STREAM ERROR]", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch stream source"
      });
    }
  });

  // M3U8 Playlist & Media Segment Proxy with CORS and Referer header
  app.get("/api/m3u8-proxy", async (req, res) => {
    try {
      const streamUrl = req.query.url as string;
      if (!streamUrl) {
        return res.status(400).send("Missing url query param");
      }

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
      } else if (streamUrl.endsWith(".vtt") || contentType.includes("vtt")) {
        res.setHeader("Content-Type", "text/vtt; charset=utf-8");
        let vttText = buf.toString("utf-8");
        // Ensure standard WEBVTT header
        if (!vttText.trimStart().startsWith("WEBVTT")) {
          vttText = "WEBVTT\n\n" + vttText.replace(/^([0-9]+\r?\n)/, "");
        }
        // Normalize SRT comma timestamps (00:00:00,000 -> 00:00:00.000)
        vttText = vttText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
        // Normalize 2-segment timestamps (MM:SS.mmm -> 00:MM:SS.mmm)
        vttText = vttText.replace(/(^|\n)(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}\.\d{3})/g, "$100:$2 --> 00:$3");
        res.setHeader("Cache-Control", "public, max-age=31536000");
        return res.send(vttText);
      } else if (contentType) {
        res.setHeader("Content-Type", contentType);
      } else {
        res.setHeader("Content-Type", "application/octet-stream");
      }
      res.setHeader("Cache-Control", "public, max-age=31536000");

      return res.send(buf);
    } catch (err: any) {
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
