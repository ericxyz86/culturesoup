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

const AI_KEYWORDS = /\b(ai|artificial intelligence|machine learning|llm|gpt|claude|openai|anthropic|deepfake|chatbot|neural|generative|diffusion|transformer|deep learning|neuromorphic|agentic|copilot|gemini|midjourney|stable diffusion|seedance|grok|robot|automation|AGI|superintelligence|chatgpt|llama|mistral|perplexity|cursor|windsurf|devin)\b/i;

function isEnglish(text: string): boolean {
  if (!text) return false;
  const latinChars = text.replace(/[^a-zA-Z]/g, "").length;
  const totalChars = text.replace(/[\s\d\W]/g, "").length;
  if (totalChars === 0) return false;
  return latinChars / totalChars > 0.6;
}

// ── Twitter/X: Broad coverage via syndication timelines ──
// Scrapes 50+ key AI accounts — catches all major viral AI content
const TWITTER_ACCOUNTS = [
  // AI companies
  "OpenAI", "AnthropicAI", "GoogleDeepMind", "xaborai", "MistralAI", "MetaAI",
  "peraborai", "CohereAI", "stability_ai", "MidJourney",
  // CEOs / leaders
  "sama", "DarioAmodei", "elonmusk", "demaborai", "sataborai",
  // AI researchers / influencers
  "karpathy", "ylecun", "fchollet", "emaborai", "goodfellow_ian",
  // AI journalists / commentators
  "techreview", "waborai", "veraborai",
  // AI-focused accounts
  "AiBreakfast", "TheAIGRID", "ai__pub",
];

async function scanTwitter(): Promise<RawPost[]> {
  const posts: RawPost[] = [];
  const batchSize = 5;

  for (let i = 0; i < TWITTER_ACCOUNTS.length; i += batchSize) {
    const batch = TWITTER_ACCOUNTS.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (account) => {
        const res = await fetch(
          `https://syndication.twitter.com/srv/timeline-profile/screen-name/${account}`,
          {
            headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
            signal: AbortSignal.timeout(6000),
          }
        );
        if (!res.ok) return [];
        const html = await res.text();
        const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        if (!match) return [];
        const data = JSON.parse(match[1]);
        const entries = data?.props?.pageProps?.timeline?.entries || [];
        const accountPosts: RawPost[] = [];

        for (const entry of entries) {
          const tweet = entry?.content?.tweet;
          if (!tweet?.full_text) continue;
          const isRT = tweet.full_text.startsWith("RT @");
          const src = isRT ? tweet.retweeted_status : tweet;
          if (!src?.full_text) continue;
          if (!isEnglish(src.full_text)) continue;

          // Filter non-AI-specific accounts
          const alwaysAI = ["OpenAI", "AnthropicAI", "GoogleDeepMind", "xaborai", "MistralAI", "MetaAI", "karpathy", "AiBreakfast", "TheAIGRID", "ai__pub"];
          if (!alwaysAI.includes(account) && !AI_KEYWORDS.test(src.full_text)) continue;

          const created = new Date(src.created_at).getTime();
          const hrs = (Date.now() - created) / (1000 * 60 * 60);
          if (hrs > 24 || hrs < 0) continue;

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
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") posts.push(...r.value);
    }
  }
  return posts;
}

// ── Reddit: Global search across ALL subreddits ──
async function scanReddit(): Promise<RawPost[]> {
  const posts: RawPost[] = [];
  const queries = [
    "AI OR artificial intelligence OR chatgpt OR openai",
    "machine learning OR deep learning OR LLM",
    "GPT OR Claude OR Gemini OR Grok",
  ];

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=top&t=day&limit=25&raw_json=1`,
        {
          headers: { "User-Agent": "CultureSoup/0.5" },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();

      for (const child of data?.data?.children || []) {
        const p = child?.data;
        if (!p?.title || p.stickied) continue;
        if (!isEnglish(p.title)) continue;
        if (!AI_KEYWORDS.test(p.title + " " + (p.selftext || "").slice(0, 300))) continue;

        const hrs = hoursAgo(p.created_utc);
        if (hrs > 24) continue;

        const score = (p.score || 0) + (p.num_comments || 0) * 2;
        posts.push({
          title: p.title,
          url: p.url?.startsWith("https://www.reddit.com") ? p.url : `https://www.reddit.com${p.permalink}`,
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
      console.error("Reddit search failed:", e);
    }
  }
  return posts;
}

// ── Hacker News: Top stories (already broad) ──
async function scanHackerNews(): Promise<RawPost[]> {
  const posts: RawPost[] = [];
  try {
    // Check both top and best stories
    const [topRes, newRes] = await Promise.all([
      fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { signal: AbortSignal.timeout(8000) }),
      fetch("https://hacker-news.firebaseio.com/v0/beststories.json", { signal: AbortSignal.timeout(8000) }),
    ]);
    const topIds: number[] = await topRes.json();
    const bestIds: number[] = await newRes.json();
    const allIds = [...new Set([...topIds.slice(0, 30), ...bestIds.slice(0, 20)])];

    const items = await Promise.all(
      allIds.map(async (id) => {
        const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(5000) });
        return r.json();
      })
    );

    for (const item of items) {
      if (!item?.title || item.type !== "story") continue;
      if (!AI_KEYWORDS.test(item.title)) continue;
      if (!isEnglish(item.title)) continue;

      const hrs = hoursAgo(item.time);
      if (hrs > 24) continue;

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
  return posts;
}

// ── YouTube: Broad search, English only ──
async function scanYouTube(): Promise<RawPost[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const posts: RawPost[] = [];
  const queries = ["AI news today", "artificial intelligence", "chatgpt openai"];

  for (const q of queries) {
    try {
      const publishedAfter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&order=viewCount&publishedAfter=${publishedAfter}&relevanceLanguage=en&regionCode=US&maxResults=10&key=${apiKey}`;
      const res = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const data = await res.json();

      const videoIds = (data.items || []).map((i: any) => i.id?.videoId).filter(Boolean).join(",");
      if (!videoIds) continue;

      const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`;
      const statsRes = await fetch(statsUrl, { signal: AbortSignal.timeout(10000) });
      const statsData = await statsRes.json();

      for (const v of statsData.items || []) {
        const title = v.snippet?.title || "";
        if (!isEnglish(title)) continue;

        const views = parseInt(v.statistics?.viewCount || "0");
        const likes = parseInt(v.statistics?.likeCount || "0");
        const comments = parseInt(v.statistics?.commentCount || "0");
        const published = v.snippet?.publishedAt;
        const hrs = hoursAgo(published);
        if (hrs > 24) continue;

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
  return posts;
}

// ── Main scanner ──
export async function scanAllPlatforms(): Promise<{
  trends: TrendingTopic[];
  scannedAt: string;
  sources: string[];
  rawCount: number;
}> {
  const [twitter, reddit, hn, youtube] = await Promise.all([
    scanTwitter(),
    scanReddit(),
    scanHackerNews(),
    scanYouTube(),
  ]);

  const all = [...twitter, ...reddit, ...hn, ...youtube];

  // Dedupe by normalized title prefix
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

  const top = deduped.slice(0, 20);

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

  return {
    trends,
    scannedAt: new Date().toISOString(),
    sources,
    rawCount: all.length,
  };
}
