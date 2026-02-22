import { TrendingTopic } from "./types";

interface RawPost {
  title: string;
  url: string;
  platform: string;
  platformDetail: string;
  engagement: number;
  engagementLabel: string;
  hoursOld: number;
  velocity: number;
  discoveredAt: string;
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
  const nonAsciiLetters = text.replace(/[\x00-\x7F\s\d]/g, "").length;
  const allLetters = text.replace(/[\s\d\p{P}]/gu, "").length;
  if (allLetters === 0) return false;
  if (nonAsciiLetters / allLetters > 0.3) return false;
  const asciiWords = text.match(/[a-zA-Z]{2,}/g) || [];
  return asciiWords.length >= 3;
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
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`SociaVault monitor ${res.status}: ${await res.text().catch(() => "")}`);
    return res.json();
  } else if (directKey) {
    // Direct API call (for local dev)
    const url = `https://api.sociavault.com${path}${queryStr}`;
    const res = await fetch(url, {
      headers: { "X-API-Key": directKey },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`SociaVault direct ${res.status}`);
    return res.json();
  }
  throw new Error("No SociaVault credentials configured");
}

// ── Twitter/X via SociaVault (100 most popular tweets per user) ──
const TWITTER_ACCOUNTS = [
  // AI companies
  "OpenAI", "AnthropicAI", "GoogleDeepMind", "MistralAI", "MetaAI",
  "CohereAI", "stability_ai", "HuggingFace", "xaborai",
  // AI leaders
  "sama", "DarioAmodei", "elonmusk", "satyanadella",
  "karpathy", "ylecun", "fchollet", "drjimfan",
  // AI media / commentators
  "TheAIGRID", "AiBreakfast", "ai__pub", "bindureddy",
  "techreview", "emaborai", "ABORAI",
  // Tech journalists / influencers who cover AI
  "rowancheung", "billofalltrades", "maborai", "nonmayorpete",
  "tsaborai", "minchoi", "aaborai",
];

// AI-native accounts: skip AI keyword check (everything they post is AI)
const ALWAYS_AI_ACCOUNTS = new Set([
  "OpenAI", "AnthropicAI", "GoogleDeepMind", "MistralAI", "MetaAI",
  "CohereAI", "stability_ai", "HuggingFace", "xaborai",
  "karpathy", "AiBreakfast", "TheAIGRID", "ai__pub",
  "drjimfan", "AIatMeta", "rowancheung",
]);

async function scanTwitter(): Promise<RawPost[]> {
  const posts: RawPost[] = [];
  const hasSociaVault = !!(process.env.SOCIAVAULT_MONITOR_URL || process.env.SOCIAVAULT_API_KEY);

  if (hasSociaVault) {
    // SociaVault: 100 most popular tweets per user
    const batchSize = 4; // Be gentle on credits
    for (let i = 0; i < TWITTER_ACCOUNTS.length; i += batchSize) {
      const batch = TWITTER_ACCOUNTS.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (account) => {
          try {
            const data = await fetchSociaVault("/v1/scrape/twitter/user-tweets", { handle: account });
            if (!data?.success) return [];
            let tweets = data?.data?.tweets || [];
            if (typeof tweets === "object" && !Array.isArray(tweets)) {
              tweets = Object.values(tweets);
            }

            const accountPosts: RawPost[] = [];
            for (const t of tweets) {
              const legacy = t?.legacy || {};
              const text = legacy.full_text || "";
              if (!text || !isEnglish(text)) continue;
              if (!ALWAYS_AI_ACCOUNTS.has(account) && !AI_KEYWORDS.test(text)) continue;

              const created = new Date(legacy.created_at).getTime();
              if (isNaN(created)) continue;
              const hrs = (Date.now() - created) / (1000 * 60 * 60);
              if (hrs > MAX_AGE_HOURS || hrs < 0) continue;

              const likes = legacy.favorite_count || 0;
              const rts = legacy.retweet_count || 0;
              const replies = legacy.reply_count || 0;
              const views = parseInt(t?.views?.count || "0");
              const score = likes + rts * 3 + replies * 2 + views * 0.01;
              const screenName = t?.core?.user_results?.result?.legacy?.screen_name || account;
              const idStr = legacy.id_str || t?.rest_id || "";

              accountPosts.push({
                title: text.replace(/https:\/\/t\.co\/\S+/g, "").trim().slice(0, 200),
                url: `https://x.com/${screenName}/status/${idStr}`,
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
            console.error(`Twitter SV @${account} failed:`, e);
            return [];
          }
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") posts.push(...r.value);
      }
    }
  } else {
    // Fallback: syndication API (no auth, but limited data)
    const batchSize = 6;
    for (let i = 0; i < TWITTER_ACCOUNTS.length; i += batchSize) {
      const batch = TWITTER_ACCOUNTS.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (account) => {
          try {
            const res = await fetch(
              `https://syndication.twitter.com/srv/timeline-profile/screen-name/${account}`,
              {
                headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
                cache: "no-store",
                signal: AbortSignal.timeout(6000),
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
  }

  console.log(`[Scanner] Twitter: ${posts.length} posts from ${TWITTER_ACCOUNTS.length} accounts (${hasSociaVault ? "SociaVault" : "syndication"})`);
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
  const queries = ["artificial intelligence", "AI news", "chatgpt"];

  for (const q of queries) {
    try {
      const data = await fetchSociaVault("/v1/scrape/tiktok/search-keyword", { keyword: q, count: "10" });
      if (!data?.success) continue;
      let videos = data?.data?.videos || data?.data || [];
      if (typeof videos === "object" && !Array.isArray(videos)) {
        videos = Object.values(videos);
      }

      for (const v of videos) {
        const desc = v?.desc || v?.title || "";
        if (!desc || !isEnglish(desc)) continue;

        const created = v?.createTime || v?.create_time || 0;
        const hrs = hoursAgo(created);
        if (hrs > MAX_AGE_HOURS) continue;

        const plays = v?.stats?.playCount || v?.playCount || 0;
        const likes = v?.stats?.diggCount || v?.diggCount || 0;
        const comments = v?.stats?.commentCount || v?.commentCount || 0;
        const shares = v?.stats?.shareCount || v?.shareCount || 0;
        const score = plays * 0.01 + likes + comments * 5 + shares * 10;
        const author = v?.author?.uniqueId || v?.author?.nickname || "unknown";
        const videoId = v?.id || v?.video_id || "";

        posts.push({
          title: desc.slice(0, 200),
          url: `https://www.tiktok.com/@${author}/video/${videoId}`,
          platform: "TikTok",
          platformDetail: `@${author} · ${formatEngagement(plays)} plays`,
          engagement: score,
          engagementLabel: `${formatEngagement(plays)} plays · ${formatEngagement(likes)} likes · ${comments} comments`,
          hoursOld: hrs,
          velocity: score / hrs,
          discoveredAt: new Date(created * 1000).toISOString(),
        });
      }
    } catch (e) {
      console.error(`TikTok search "${q}" failed:`, e);
    }
  }

  // Also check trending/popular videos for AI content
  try {
    const data = await fetchSociaVault("/v1/scrape/tiktok/popular-videos", { period: "7", country: "us" });
    if (data?.success) {
      let videos = data?.data?.videos || data?.data || [];
      if (typeof videos === "object" && !Array.isArray(videos)) {
        videos = Object.values(videos);
      }
      for (const v of videos) {
        const desc = v?.desc || v?.title || "";
        if (!isEnglish(desc) || !AI_KEYWORDS.test(desc)) continue;
        const created = v?.createTime || v?.create_time || 0;
        const hrs = hoursAgo(created);
        if (hrs > MAX_AGE_HOURS) continue;

        const plays = v?.stats?.playCount || v?.playCount || 0;
        const likes = v?.stats?.diggCount || v?.diggCount || 0;
        const comments = v?.stats?.commentCount || v?.commentCount || 0;
        const shares = v?.stats?.shareCount || v?.shareCount || 0;
        const score = plays * 0.01 + likes + comments * 5 + shares * 10;
        const author = v?.author?.uniqueId || v?.author?.nickname || "unknown";
        const videoId = v?.id || "";

        posts.push({
          title: desc.slice(0, 200),
          url: `https://www.tiktok.com/@${author}/video/${videoId}`,
          platform: "TikTok",
          platformDetail: `@${author} · ${formatEngagement(plays)} plays`,
          engagement: score,
          engagementLabel: `${formatEngagement(plays)} plays · ${formatEngagement(likes)} likes`,
          hoursOld: hrs,
          velocity: score / hrs,
          discoveredAt: new Date(created * 1000).toISOString(),
        });
      }
    }
  } catch (e) {
    console.error("TikTok popular failed:", e);
  }

  console.log(`[Scanner] TikTok: ${posts.length} posts`);
  return posts;
}

// ── Reddit: Hot from AI subreddits + global search ──
async function scanReddit(): Promise<RawPost[]> {
  const posts: RawPost[] = [];
  const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

  // Part 1: Hot posts from AI-specific subreddits
  const aiSubreddits = ["artificial", "MachineLearning", "singularity", "ChatGPT", "OpenAI", "LocalLLaMA", "StableDiffusion", "ClaudeAI"];
  for (const sub of aiSubreddits) {
    try {
      const res = await fetch(
        `https://www.reddit.com/r/${sub}/hot.json?limit=15&raw_json=1`,
        { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) continue;
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

  // Part 2: Global search
  try {
    const res = await fetch(
      `https://www.reddit.com/search.json?q=chatgpt+OR+openai+OR+%22artificial+intelligence%22+OR+deepfake&sort=top&t=day&limit=25&raw_json=1`,
      { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(8000) }
    );
    if (res.ok) {
      const data = await res.json();
      for (const child of data?.data?.children || []) {
        const p = child?.data;
        if (!p?.title || p.stickied) continue;
        if (!isEnglish(p.title)) continue;
        if (!AI_KEYWORDS.test(p.title + " " + (p.selftext || "").slice(0, 200))) continue;
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
    }
  } catch (e) {
    console.error("Reddit global search failed:", e);
  }

  console.log(`[Scanner] Reddit: ${posts.length} posts from ${aiSubreddits.length} subs + global search`);
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
  const queries = ["AI news today", "artificial intelligence", "chatgpt openai claude"];

  for (const q of queries) {
    try {
      const publishedAfter = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&order=viewCount&publishedAfter=${publishedAfter}&relevanceLanguage=en&regionCode=US&maxResults=10&key=${apiKey}`;
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
        const views = parseInt(v.statistics?.viewCount || "0");
        const likes = parseInt(v.statistics?.likeCount || "0");
        const comments = parseInt(v.statistics?.commentCount || "0");
        const published = v.snippet?.publishedAt;
        const hrs = hoursAgo(published);
        if (hrs > MAX_AGE_HOURS) continue;
        const score = views + likes * 10 + comments * 20;
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

  const all = [...twitter, ...tiktok, ...reddit, ...hn, ...youtube];
  console.log(`[Scanner] Total raw: ${all.length} (Twitter:${twitter.length} TikTok:${tiktok.length} Reddit:${reddit.length} HN:${hn.length} YT:${youtube.length})`);

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
