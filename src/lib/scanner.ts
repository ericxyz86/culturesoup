import { TrendingTopic } from "./types";
import { getSupplementPosts } from "./supplement-cache";

export interface RawPost {
  title: string;
  url: string;
  platform: string;
  platformDetail: string;
  engagement: number;
  engagementLabel: string;
  hoursOld: number;
  velocity: number;
  discoveredAt: string;
  source?: string;
}

function hoursAgo(dateStr: string | number): number {
  const d = typeof dateStr === "number" ? dateStr * 1000 : new Date(dateStr).getTime();
  return Math.max(0.1, (Date.now() - d) / (1000 * 60 * 60));
}

function formatEngagement(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const AI_KEYWORDS = /\b(ai|artificial intelligence|machine learning|llm|gpt|claude|openai|anthropic|deepfake|chatbot|neural|generative|diffusion|transformer|deep learning|neuromorphic|agentic|copilot|gemini|midjourney|stable diffusion|seedance|grok|robot|automation|AGI|superintelligence|chatgpt|llama|mistral|perplexity|cursor|windsurf|devin|hugging\s?face)\b/i;

function isEnglish(text: string): boolean {
  if (!text) return false;

  // Reject if contains ANY Devanagari, Arabic, CJK, Thai, Korean, Cyrillic blocks
  if (/[\u0900-\u097F]/.test(text)) return false; // Hindi/Devanagari
  if (/[\u0600-\u06FF]/.test(text)) return false; // Arabic
  if (/[\u4E00-\u9FFF]/.test(text)) return false; // CJK (Chinese)
  if (/[\u3040-\u30FF]/.test(text)) return false; // Japanese Hiragana/Katakana
  if (/[\uAC00-\uD7AF]/.test(text)) return false; // Korean Hangul
  if (/[\u0E00-\u0E7F]/.test(text)) return false; // Thai
  if (/[\u0400-\u04FF]/.test(text)) return false; // Cyrillic (Russian etc.)
  if (/[\u0980-\u09FF]/.test(text)) return false; // Bengali
  if (/[\u0B80-\u0BFF]/.test(text)) return false; // Tamil

  // Check non-ASCII ratio (catches Turkish ç/ş/ğ/ü heavy text, accented languages)
  const nonAsciiLetters = text.replace(/[\x00-\x7F\s\d]/g, "").length;
  const allLetters = text.replace(/[\s\d\p{P}]/gu, "").length;
  if (allLetters === 0) return false;
  if (nonAsciiLetters / allLetters > 0.15) return false; // Stricter: 15% (was 30%)

  // Must have enough actual English words
  const asciiWords = text.match(/[a-zA-Z]{2,}/g) || [];
  return asciiWords.length >= 4; // Stricter: 4 words (was 3)
}

const MAX_AGE_HOURS = 48;

// ── SociaVault helper ──
// When on Coolify, routes through monitor proxy (Docker internal network).
// Falls back to direct API call if monitor URL not set.
async function fetchSociaVault(path: string, params: Record<string, string> = {}): Promise<any> {
  const monitorUrl = process.env.SOCIAVAULT_MONITOR_URL;
  const monitorKey = process.env.SOCIAVAULT_MONITOR_KEY;
  const appName = process.env.SOCIAVAULT_APP_NAME || "culturesoup";
  const directKey = process.env.SOCIAVAULT_API_KEY;

  const qs = new URLSearchParams(params).toString();
  const queryStr = qs ? `?${qs}` : "";

  if (monitorUrl && monitorKey) {
    // Route through monitor proxy
    const url = `${monitorUrl}/proxy${path}${queryStr}`;
    const res = await fetch(url, {
      headers: { "X-App-Name": appName, "X-Monitor-Key": monitorKey },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`SociaVault monitor ${res.status}: ${await res.text().catch(() => "")}`);
    return res.json();
  } else if (directKey) {
    // Direct API call (for local dev)
    const url = `https://api.sociavault.com${path}${queryStr}`;
    const res = await fetch(url, {
      headers: { "X-API-Key": directKey },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`SociaVault direct ${res.status}`);
    return res.json();
  }
  throw new Error("No SociaVault credentials configured");
}

// ── Twitter/X via SociaVault (100 most popular tweets per user) ──
const TWITTER_ACCOUNTS = [
  // AI companies & labs
  "OpenAI", "AnthropicAI", "GoogleDeepMind", "MistralAI", "MetaAI",
  "CohereAI", "stability_ai", "HuggingFace", "xaborai", "AIatMeta",
  "DeepSeek_AI", "PerplexityAI", "CursorAI",
  // AI leaders & researchers
  "sama", "DarioAmodei", "elonmusk", "satyanadella",
  "karpathy", "ylecun", "fchollet", "drjimfan",
  "emollick", "GaryMarcus", "jeffdean", "mmaborai",
  "hardmaru", "Miles_Brundage", "jackclark",
  // AI media / commentators
  "TheAIGRID", "AiBreakfast", "ai__pub", "bindureddy",
  "techreview", "emaborai", "ABORAI",
  // Tech journalists / influencers who cover AI
  "rowancheung", "billofalltrades", "maborai", "nonmayorpete",
  "tsaborai", "minchoi", "aaborai",
  "benedictevans", "kevinroose", "karaswisher",
  "ID_AA_Carmack", "naval",
];

// AI-native accounts: skip AI keyword check (everything they post is AI)
const ALWAYS_AI_ACCOUNTS = new Set([
  "OpenAI", "AnthropicAI", "GoogleDeepMind", "MistralAI", "MetaAI",
  "CohereAI", "stability_ai", "HuggingFace", "xaborai", "AIatMeta",
  "DeepSeek_AI", "PerplexityAI", "CursorAI",
  "karpathy", "AiBreakfast", "TheAIGRID", "ai__pub",
  "drjimfan", "rowancheung", "emollick", "GaryMarcus",
  "hardmaru", "Miles_Brundage", "jackclark",
]);

async function scanTwitter(): Promise<RawPost[]> {
  const posts: RawPost[] = [];
  const twitterApiKey = process.env.TWITTERAPI_IO_KEY;

  if (twitterApiKey) {
    // Primary: TwitterAPI.io — returns chronological recent tweets ($0.15/1K tweets)
    // Much better than SociaVault (all-time popular) or syndication (blocked from datacenter IPs)
    const batchSize = 5;
    for (let i = 0; i < TWITTER_ACCOUNTS.length; i += batchSize) {
      if (i > 0) await new Promise(r => setTimeout(r, 500)); // Gentle rate limiting
      const batch = TWITTER_ACCOUNTS.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (account) => {
          try {
            const res = await fetch(
              `https://api.twitterapi.io/twitter/user/last_tweets?userName=${account}`,
              {
                headers: { "x-api-key": twitterApiKey },
                cache: "no-store",
                signal: AbortSignal.timeout(15000),
              }
            );
            if (!res.ok) return [];
            const data = await res.json();
            const tweets = data?.data?.tweets || [];
            const accountPosts: RawPost[] = [];

            for (const t of tweets) {
              const text = t?.text || "";
              if (!text || !isEnglish(text)) continue;

              // Handle RTs: use retweeted_tweet data if available
              const isRT = text.startsWith("RT @");
              const src = isRT && t?.retweeted_tweet ? t.retweeted_tweet : t;
              const srcText = src?.text || text;
              if (!ALWAYS_AI_ACCOUNTS.has(account) && !AI_KEYWORDS.test(srcText)) continue;

              const created = new Date(src.createdAt || t.createdAt).getTime();
              if (isNaN(created)) continue;
              const hrs = (Date.now() - created) / (1000 * 60 * 60);
              if (hrs > MAX_AGE_HOURS || hrs < 0) continue;

              const likes = src.likeCount || t.likeCount || 0;
              const rts = src.retweetCount || t.retweetCount || 0;
              const replies = src.replyCount || t.replyCount || 0;
              const quotes = src.quoteCount || t.quoteCount || 0;
              const views = src.viewCount || t.viewCount || 0;
              const score = likes + rts * 3 + replies * 2 + quotes * 4 + views * 0.01;
              const screenName = src.author?.userName || t.author?.userName || account;

              accountPosts.push({
                title: srcText.replace(/https:\/\/t\.co\/\S+/g, "").trim().slice(0, 200),
                url: src.url || t.url || `https://x.com/${screenName}/status/${src.id || t.id}`,
                platform: "X/Twitter",
                platformDetail: `@${screenName} · ${formatEngagement(likes)} likes`,
                engagement: score,
                engagementLabel: `${formatEngagement(likes)} likes · ${formatEngagement(rts)} RTs · ${formatEngagement(views)} views`,
                hoursOld: hrs,
                velocity: score / hrs,
                discoveredAt: new Date(created).toISOString(),
              });
            }
            return accountPosts;
          } catch (e) {
            console.error(`Twitter @${account} failed:`, e);
            return [];
          }
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") posts.push(...r.value);
      }
    }
    // Part 2: Keyword search for AI tweets from ANY account (high engagement, last 48h)
    const sinceDate = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000).toISOString().split("T")[0];
    const searchQueries = [
      // Keep queries simple — too many operators breaks TwitterAPI.io search
      `"artificial intelligence" OR "AI agent" OR "AI safety" min_faves:100 lang:en since:${sinceDate}`,
      `OpenAI OR Anthropic OR "machine learning" OR AGI min_faves:100 lang:en since:${sinceDate}`,
      `ChatGPT OR "Claude AI" OR LLM OR "generative AI" min_faves:100 lang:en since:${sinceDate}`,
    ];
    const seenIds = new Set(posts.map(p => p.url));

    for (const q of searchQueries) {
      try {
        await new Promise(r => setTimeout(r, 500));
        const res = await fetch(
          `https://api.twitterapi.io/twitter/tweet/advanced_search?query=${encodeURIComponent(q)}&queryType=Top`,
          {
            headers: { "x-api-key": twitterApiKey },
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
          }
        );
        if (!res.ok) continue;
        const data = await res.json();
        const tweets = data?.tweets || [];

        for (const t of tweets) {
          const text = t?.text || "";
          if (!text || !isEnglish(text)) continue;
          if (!AI_KEYWORDS.test(text)) continue;

          // Filter out casual bot interactions ("hey @grok do X", "@chatgpt help me")
          const lowerText = text.toLowerCase();
          if (/^(hey |hi |yo )?@(grok|chatgpt|claude|gemini)\b/i.test(text)) continue;
          if (lowerText.startsWith("@grok ") || lowerText.startsWith("@chatgpt ")) continue;
          // Filter out image generation requests
          if (/\b(turn me|make me|draw me|generate|imagine)\b/i.test(lowerText) && text.length < 100) continue;

          const created = new Date(t.createdAt).getTime();
          if (isNaN(created)) continue;
          const hrs = (Date.now() - created) / (1000 * 60 * 60);
          if (hrs > MAX_AGE_HOURS || hrs < 0 || isNaN(hrs) || hrs === 0) continue;

          const url = t.url || `https://x.com/${t.author?.userName}/status/${t.id}`;
          if (seenIds.has(url)) continue;
          seenIds.add(url);

          const likes = t.likeCount || 0;
          const rts = t.retweetCount || 0;
          const replies = t.replyCount || 0;
          const quotes = t.quoteCount || 0;
          const views = t.viewCount || 0;
          const score = likes + rts * 3 + replies * 2 + quotes * 4 + views * 0.01;
          const screenName = t.author?.userName || "unknown";

          posts.push({
            title: text.replace(/https:\/\/t\.co\/\S+/g, "").trim().slice(0, 200),
            url,
            platform: "X/Twitter",
            platformDetail: `@${screenName} · ${formatEngagement(likes)} likes`,
            engagement: score,
            engagementLabel: `${formatEngagement(likes)} likes · ${formatEngagement(rts)} RTs · ${formatEngagement(views)} views`,
            hoursOld: hrs,
            velocity: hrs > 0 ? score / hrs : 0,
            discoveredAt: new Date(created).toISOString(),
            source: "search",
          });
        }
      } catch (e) {
        console.error("Twitter search failed:", e);
      }
    }

    console.log(`[Scanner] Twitter: ${posts.length} posts from ${TWITTER_ACCOUNTS.length} accounts + keyword search (TwitterAPI.io)`);
  } else {
    // Fallback: syndication API (works from residential IPs only)
    const batchSize = 6;
    for (let i = 0; i < TWITTER_ACCOUNTS.length; i += batchSize) {
      const batch = TWITTER_ACCOUNTS.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (account) => {
          try {
            const res = await fetch(
              `https://syndication.twitter.com/srv/timeline-profile/screen-name/${account}`,
              {
                headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" },
                cache: "no-store",
                signal: AbortSignal.timeout(10000),
              }
            );
            if (!res.ok) return [];
            const html = await res.text();
            const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
            if (!match) return [];
            const data = JSON.parse(match[1]);
            const entries = data?.props?.pageProps?.timeline?.entries || [];
            const accountPosts: RawPost[] = [];

            for (const entry of entries) {
              const tweet = entry?.content?.tweet;
              if (!tweet?.full_text) continue;
              const isRT = tweet.full_text.startsWith("RT @");
              const src = isRT ? tweet.retweeted_status : tweet;
              if (!src?.full_text || !isEnglish(src.full_text)) continue;
              if (!ALWAYS_AI_ACCOUNTS.has(account) && !AI_KEYWORDS.test(src.full_text)) continue;

              const created = new Date(src.created_at).getTime();
              const hrs = (Date.now() - created) / (1000 * 60 * 60);
              if (hrs > MAX_AGE_HOURS || hrs < 0) continue;

              const likes = src.favorite_count || 0;
              const rts = src.retweet_count || 0;
              const replies = src.reply_count || 0;
              const quotes = src.quote_count || 0;
              const score = likes + rts * 3 + replies * 2 + quotes * 4;
              const screenName = src.user?.screen_name || account;

              accountPosts.push({
                title: src.full_text.replace(/https:\/\/t\.co\/\S+/g, "").trim().slice(0, 200),
                url: `https://x.com/${screenName}/status/${src.id_str || tweet.id_str}`,
                platform: "X/Twitter",
                platformDetail: `@${screenName} · ${formatEngagement(likes)} likes`,
                engagement: score,
                engagementLabel: `${formatEngagement(likes)} likes · ${formatEngagement(rts)} RTs · ${replies} replies`,
                hoursOld: hrs,
                velocity: score / hrs,
                discoveredAt: new Date(created).toISOString(),
              });
            }
            return accountPosts;
          } catch {
            return [];
          }
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") posts.push(...r.value);
      }
    }
    console.log(`[Scanner] Twitter: ${posts.length} posts from ${TWITTER_ACCOUNTS.length} accounts (syndication)`);
  }
  return posts;
}

// ── TikTok via SociaVault ──
async function scanTikTok(): Promise<RawPost[]> {
  const hasSociaVault = !!(process.env.SOCIAVAULT_MONITOR_URL || process.env.SOCIAVAULT_API_KEY);
  if (!hasSociaVault) {
    console.log("[Scanner] TikTok: skipped (no SociaVault)");
    return [];
  }

  const posts: RawPost[] = [];

  // Helper to extract TikTok posts from various response shapes
  function parseTikTokVideos(data: any): any[] {
    if (!data?.success) return [];
    const d = data?.data;
    // search/keyword returns data.search_item_list[].aweme_info
    if (d?.search_item_list) {
      let items = d.search_item_list;
      if (typeof items === "object" && !Array.isArray(items)) items = Object.values(items);
      return items.map((i: any) => i?.aweme_info || i).filter(Boolean);
    }
    // trending & hashtag return data.aweme_list
    if (d?.aweme_list) {
      let items = d.aweme_list;
      if (typeof items === "object" && !Array.isArray(items)) items = Object.values(items);
      return items;
    }
    // profile videos return data.aweme_list too
    let vids = d?.videos || d || [];
    if (typeof vids === "object" && !Array.isArray(vids)) vids = Object.values(vids);
    return vids;
  }

  function tiktokPostFromVideo(v: any): RawPost | null {
    const desc = v?.desc || v?.title || "";
    if (!desc || !isEnglish(desc)) return null;

    const created = v?.createTime || v?.create_time || 0;
    if (!created) return null;
    const hrs = hoursAgo(created);
    if (hrs > MAX_AGE_HOURS) return null;

    const stats = v?.stats || v?.statistics || {};
    const plays = stats?.playCount || v?.playCount || 0;
    const likes = stats?.diggCount || v?.diggCount || 0;
    const comments = stats?.commentCount || v?.commentCount || 0;
    const shares = stats?.shareCount || v?.shareCount || 0;
    const score = plays * 0.01 + likes + comments * 5 + shares * 10;
    const author = v?.author?.uniqueId || v?.author?.unique_id || v?.author?.nickname || "unknown";
    const videoId = v?.aweme_id || v?.id || v?.video_id || "";

    return {
      title: desc.slice(0, 200),
      url: `https://www.tiktok.com/@${author}/video/${videoId}`,
      platform: "TikTok",
      platformDetail: `@${author} · ${formatEngagement(plays)} plays`,
      engagement: score,
      engagementLabel: `${formatEngagement(plays)} plays · ${formatEngagement(likes)} likes · ${comments} comments`,
      hoursOld: hrs,
      velocity: score / hrs,
      discoveredAt: new Date(created * 1000).toISOString(),
    };
  }

  // Keyword search (correct path: /search/keyword, param: query)
  const queries = ["artificial intelligence", "AI news", "chatgpt"];
  for (const q of queries) {
    try {
      const data = await fetchSociaVault("/v1/scrape/tiktok/search/keyword", { query: q, count: "10" });
      for (const v of parseTikTokVideos(data)) {
        const post = tiktokPostFromVideo(v);
        if (post) posts.push(post);
      }
    } catch (e) {
      console.error(`TikTok search "${q}" failed:`, e);
    }
  }

  // Hashtag search
  for (const tag of ["AI", "artificialintelligence"]) {
    try {
      const data = await fetchSociaVault("/v1/scrape/tiktok/search/hashtag", { hashtag: tag, count: "10" });
      for (const v of parseTikTokVideos(data)) {
        if (!AI_KEYWORDS.test(v?.desc || "")) continue;
        const post = tiktokPostFromVideo(v);
        if (post) posts.push(post);
      }
    } catch (e) {
      console.error(`TikTok hashtag "${tag}" failed:`, e);
    }
  }

  // Trending feed — filter for AI content
  try {
    const data = await fetchSociaVault("/v1/scrape/tiktok/trending", { region: "US" });
    for (const v of parseTikTokVideos(data)) {
      if (!AI_KEYWORDS.test(v?.desc || "")) continue;
      const post = tiktokPostFromVideo(v);
      if (post) posts.push(post);
    }
  } catch (e) {
    console.error("TikTok trending failed:", e);
  }

  console.log(`[Scanner] TikTok: ${posts.length} posts`);
  return posts;
}

// ── Reddit: SociaVault primary (datacenter IPs get 403 on direct API), direct fallback ──
async function scanReddit(): Promise<RawPost[]> {
  const posts: RawPost[] = [];
  const hasSociaVault = !!(process.env.SOCIAVAULT_MONITOR_URL || process.env.SOCIAVAULT_API_KEY);

  const aiSubreddits = [
    "artificial", "MachineLearning", "singularity", "ChatGPT", "OpenAI",
    "LocalLLaMA", "StableDiffusion", "ClaudeAI", "ArtificialInteligence",
    "technology", "Futurology", "programming", "datascience", "compsci",
  ];

  if (hasSociaVault) {
    // Primary: SociaVault (works from datacenter IPs, 1 credit per request)
    // Batch subreddits 3 at a time with delay to avoid rate-limiting
    const batchSize = 3;
    for (let i = 0; i < aiSubreddits.length; i += batchSize) {
      if (i > 0) await new Promise(r => setTimeout(r, 1000));
      const batch = aiSubreddits.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (sub) => {
          try {
            const data = await fetchSociaVault("/v1/scrape/reddit/subreddit", { subreddit: sub, sort: "hot", limit: "15" });
            if (!data?.success) return [];
            let children = data?.data?.posts || data?.data?.children || data?.data || [];
            if (typeof children === "object" && !Array.isArray(children)) children = Object.values(children);

            const subPosts: RawPost[] = [];
            for (const child of children) {
              const p = child?.data || child;
              const title = p?.title || "";
              if (!title || p?.stickied) continue;
              if (!isEnglish(title)) continue;
              const created = p?.created_utc || p?.created || p?.createdAt || 0;
              if (!created) continue;
              const hrs = hoursAgo(created);
              if (hrs > MAX_AGE_HOURS) continue;
              const score = (p.score || p.ups || 0) + (p.num_comments || p.comments || 0) * 2;
              const subreddit = p.subreddit || p.subreddit_name || sub;
              const permalink = p.permalink || `/r/${subreddit}/comments/${p.id}`;
              subPosts.push({
                title,
                url: permalink.startsWith("http") ? permalink : `https://www.reddit.com${permalink}`,
                platform: "Reddit",
                platformDetail: `r/${subreddit} · ${formatEngagement(p.score || p.ups || 0)} pts`,
                engagement: score,
                engagementLabel: `${formatEngagement(p.score || p.ups || 0)} pts · ${p.num_comments || p.comments || 0} comments`,
                hoursOld: hrs,
                velocity: score / hrs,
                discoveredAt: new Date(created * 1000).toISOString(),
              });
            }
            return subPosts;
          } catch (e) {
            console.error(`Reddit SV r/${sub} failed:`, e);
            return [];
          }
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") posts.push(...r.value);
      }
    }

    // Global search via SociaVault
    const searchQueries = [
      "artificial intelligence OR chatgpt OR openai",
      "AI regulation OR AI safety OR AI job",
      "LLM OR GPT OR Claude OR Gemini",
    ];
    for (const q of searchQueries) {
      try {
        await new Promise(r => setTimeout(r, 1000));
        const data = await fetchSociaVault("/v1/scrape/reddit/search", { query: q, limit: "25" });
        if (!data?.success) continue;
        let children = data?.data?.posts || data?.data?.children || data?.data || [];
        if (typeof children === "object" && !Array.isArray(children)) children = Object.values(children);

        for (const child of children) {
          const p = child?.data || child;
          const title = p?.title || "";
          if (!title || p?.stickied) continue;
          if (!isEnglish(title)) continue;
          if (!AI_KEYWORDS.test(title + " " + (p.selftext || p.body || "").slice(0, 200))) continue;
          const created = p?.created_utc || p?.created || 0;
          if (!created) continue;
          const hrs = hoursAgo(created);
          if (hrs > MAX_AGE_HOURS) continue;
          const score = (p.score || p.ups || 0) + (p.num_comments || p.comments || 0) * 2;
          const subreddit = p.subreddit || p.subreddit_name || "unknown";
          const permalink = p.permalink || `/r/${subreddit}/comments/${p.id}`;
          posts.push({
            title,
            url: permalink.startsWith("http") ? permalink : `https://www.reddit.com${permalink}`,
            platform: "Reddit",
            platformDetail: `r/${subreddit} · ${formatEngagement(p.score || p.ups || 0)} pts`,
            engagement: score,
            engagementLabel: `${formatEngagement(p.score || p.ups || 0)} pts · ${p.num_comments || p.comments || 0} comments`,
            hoursOld: hrs,
            velocity: score / hrs,
            discoveredAt: new Date(created * 1000).toISOString(),
          });
        }
      } catch (e) {
        console.error("Reddit SV search failed:", e);
      }
    }
  } else {
    // Fallback: direct Reddit API (works from residential IPs, fails from datacenter)
    const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    for (const sub of aiSubreddits) {
      try {
        const res = await fetch(
          `https://www.reddit.com/r/${sub}/hot.json?limit=15&raw_json=1`,
          { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) { console.error(`Reddit r/${sub}: HTTP ${res.status}`); continue; }
        const data = await res.json();
        for (const child of data?.data?.children || []) {
          const p = child?.data;
          if (!p?.title || p.stickied) continue;
          if (!isEnglish(p.title)) continue;
          const hrs = hoursAgo(p.created_utc);
          if (hrs > MAX_AGE_HOURS) continue;
          const score = (p.score || 0) + (p.num_comments || 0) * 2;
          posts.push({
            title: p.title,
            url: `https://www.reddit.com${p.permalink}`,
            platform: "Reddit",
            platformDetail: `r/${p.subreddit} · ${formatEngagement(p.score || 0)} pts`,
            engagement: score,
            engagementLabel: `${formatEngagement(p.score || 0)} pts · ${p.num_comments || 0} comments`,
            hoursOld: hrs,
            velocity: score / hrs,
            discoveredAt: new Date(p.created_utc * 1000).toISOString(),
          });
        }
      } catch (e) {
        console.error(`Reddit r/${sub} failed:`, e);
      }
    }
  }

  console.log(`[Scanner] Reddit: ${posts.length} posts from ${aiSubreddits.length} subs + search (${hasSociaVault ? "SociaVault" : "direct"})`);
  return posts;
}

// ── Hacker News ──
async function scanHackerNews(): Promise<RawPost[]> {
  const posts: RawPost[] = [];
  try {
    const [topRes, bestRes] = await Promise.all([
      fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { cache: "no-store", signal: AbortSignal.timeout(8000) }),
      fetch("https://hacker-news.firebaseio.com/v0/beststories.json", { cache: "no-store", signal: AbortSignal.timeout(8000) }),
    ]);
    const topIds: number[] = await topRes.json();
    const bestIds: number[] = await bestRes.json();
    const allIds = [...new Set([...topIds.slice(0, 30), ...bestIds.slice(0, 20)])];

    const items = await Promise.all(
      allIds.map(async (id) => {
        try {
          const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
          return r.json();
        } catch {
          return null;
        }
      })
    );

    for (const item of items) {
      if (!item?.title || item.type !== "story") continue;
      if (!AI_KEYWORDS.test(item.title)) continue;
      if (!isEnglish(item.title)) continue;
      const hrs = hoursAgo(item.time);
      if (hrs > MAX_AGE_HOURS) continue;
      const score = (item.score || 0) + (item.descendants || 0) * 2;
      posts.push({
        title: item.title,
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        platform: "Hacker News",
        platformDetail: `${item.score} pts · ${item.descendants || 0} comments`,
        engagement: score,
        engagementLabel: `${item.score} pts · ${item.descendants || 0} comments`,
        hoursOld: hrs,
        velocity: score / hrs,
        discoveredAt: new Date(item.time * 1000).toISOString(),
      });
    }
  } catch (e) {
    console.error("HN scan failed:", e);
  }
  console.log(`[Scanner] HN: ${posts.length} posts`);
  return posts;
}

// ── YouTube ──
async function scanYouTube(): Promise<RawPost[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];
  const posts: RawPost[] = [];
  const queries = [
    "AI news today", "artificial intelligence", "chatgpt openai claude",
    "AI explained 2026", "machine learning tutorial", "GPT Claude Gemini review",
  ];

  for (const q of queries) {
    try {
      const publishedAfter = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&order=viewCount&publishedAfter=${publishedAfter}&relevanceLanguage=en&regionCode=US&videoCaption=closedCaption&maxResults=10&key=${apiKey}`;
      const res = await fetch(searchUrl, { cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const data = await res.json();
      const videoIds = (data.items || []).map((i: any) => i.id?.videoId).filter(Boolean).join(",");
      if (!videoIds) continue;
      const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`;
      const statsRes = await fetch(statsUrl, { cache: "no-store", signal: AbortSignal.timeout(10000) });
      const statsData = await statsRes.json();

      for (const v of statsData.items || []) {
        const title = v.snippet?.title || "";
        if (!isEnglish(title)) continue;
        // Extra: reject if YouTube reports a non-English language
        const lang = v.snippet?.defaultLanguage || v.snippet?.defaultAudioLanguage || "";
        if (lang && !lang.startsWith("en")) continue;
        const views = parseInt(v.statistics?.viewCount || "0");
        const likes = parseInt(v.statistics?.likeCount || "0");
        const comments = parseInt(v.statistics?.commentCount || "0");
        const published = v.snippet?.publishedAt;
        const hrs = hoursAgo(published);
        if (hrs > MAX_AGE_HOURS) continue;
        // Normalize: use likes + comments as primary signal (not views)
        // Views inflate YouTube scores far beyond other platforms
        const score = likes + comments * 5;
        posts.push({
          title,
          url: `https://www.youtube.com/watch?v=${v.id}`,
          platform: "YouTube",
          platformDetail: `${formatEngagement(views)} views`,
          engagement: score,
          engagementLabel: `${formatEngagement(views)} views · ${formatEngagement(likes)} likes`,
          hoursOld: hrs,
          velocity: score / hrs,
          discoveredAt: published,
        });
      }
    } catch (e) {
      console.error("YouTube scan failed:", e);
    }
  }
  console.log(`[Scanner] YouTube: ${posts.length} posts`);
  return posts;
}

// ── Main ──
export async function scanAllPlatforms(): Promise<{
  trends: TrendingTopic[];
  scannedAt: string;
  sources: string[];
  rawCount: number;
}> {
  console.log("[Scanner] Starting scan...");
  const [twitter, tiktok, reddit, hn, youtube] = await Promise.all([
    scanTwitter(),
    scanTikTok(),
    scanReddit(),
    scanHackerNews(),
    scanYouTube(),
  ]);

  // Supplement: Bird keyword search + last30days (pushed from Mac Mini feeder)
  const supplement = getSupplementPosts();
  if (supplement.length > 0) {
    console.log(`[Scanner] Supplement: ${supplement.length} posts from feeder`);
  }

  const all = [...twitter, ...tiktok, ...reddit, ...hn, ...youtube, ...supplement];
  console.log(`[Scanner] Total raw: ${all.length} (Twitter:${twitter.length} TikTok:${tiktok.length} Reddit:${reddit.length} HN:${hn.length} YT:${youtube.length} Supplement:${supplement.length})`);

  // Cross-platform velocity normalization — prevent any single platform from dominating
  const platformScales: Record<string, number> = {
    "X/Twitter": 1.0,    // baseline
    "Reddit": 0.8,       // upvote cascades inflate scores fast
    "YouTube": 0.3,      // even normalized YT gets high absolute numbers
    "Hacker News": 1.5,  // HN scores modest but high-signal
    "TikTok": 0.4,       // TikTok engagement numbers are huge
  };
  for (const post of all) {
    post.velocity *= platformScales[post.platform] || 1.0;
  }

  // Dedupe by normalized title
  const seen = new Map<string, RawPost>();
  for (const post of all) {
    const key = post.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50);
    const existing = seen.get(key);
    if (!existing || post.velocity > existing.velocity) {
      seen.set(key, post);
    }
  }
  const deduped = [...seen.values()];
  deduped.sort((a, b) => b.velocity - a.velocity);
  const top = deduped.slice(0, 25);

  const trends: TrendingTopic[] = top.map((p, i) => ({
    id: `scan-${i + 1}`,
    platform: p.platform,
    platformDetail: p.platformDetail,
    title: p.title,
    url: p.url,
    meta: p.engagementLabel,
    engagement: p.engagementLabel,
    whyTrending: `Velocity: ${Math.round(p.velocity).toLocaleString()} eng/hr — ${p.engagementLabel} in ${Math.round(p.hoursOld)}h`,
    discoveredAt: p.discoveredAt,
  }));

  const sources = [...new Set(all.map((p) => p.platform))];
  return { trends, scannedAt: new Date().toISOString(), sources, rawCount: all.length };
}
// Build bump: 1771834583
