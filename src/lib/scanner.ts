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

const AI_KEYWORDS = /\b(ai|artificial intelligence|machine learning|llm|gpt|claude|openai|anthropic|deepfake|chatbot|neural|generative|diffusion|transformer|deep learning|neuromorphic|agentic|copilot|gemini|midjourney|stable diffusion|seedance|grok|robot|automation|AGI|superintelligence)\b/i;

function isEnglish(text: string): boolean {
  if (!text) return false;
  const latinChars = text.replace(/[^a-zA-Z]/g, "").length;
  const totalChars = text.replace(/[\s\d\W]/g, "").length;
  if (totalChars === 0) return false;
  return latinChars / totalChars > 0.6;
}

// ── Twitter/X via syndication API (no auth needed) ──
async function scanTwitter(): Promise<RawPost[]> {
  const accounts = ["OpenAI", "AnthropicAI", "GoogleDeepMind", "xaborai", "sama", "DarioAmodei", "elonmusk", "kaborai"];
  const posts: RawPost[] = [];

  for (const account of accounts) {
    try {
      const res = await fetch(
        `https://syndication.twitter.com/srv/timeline-profile/screen-name/${account}`,
        {
          headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!res.ok) continue;
      const html = await res.text();

      // Extract __NEXT_DATA__ JSON
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
      if (!match) continue;

      const data = JSON.parse(match[1]);
      const entries = data?.props?.pageProps?.timeline?.entries || [];

      for (const entry of entries) {
        const tweet = entry?.content?.tweet;
        if (!tweet?.full_text) continue;
        if (!isEnglish(tweet.full_text)) continue;

        // Skip retweets (text starts with "RT @")
        const isRT = tweet.full_text.startsWith("RT @");
        const sourceTweet = isRT ? tweet.retweeted_status : tweet;
        if (!sourceTweet) continue;

        const text = sourceTweet.full_text;
        const screenName = sourceTweet.user?.screen_name || account;

        // For non-AI-specific accounts (elonmusk), filter
        if (["elonmusk"].includes(account) && !AI_KEYWORDS.test(text)) continue;

        const created = new Date(sourceTweet.created_at).getTime();
        const hrs = (Date.now() - created) / (1000 * 60 * 60);
        if (hrs > 24 || hrs < 0) continue;

        const likes = sourceTweet.favorite_count || 0;
        const retweets = sourceTweet.retweet_count || 0;
        const replies = sourceTweet.reply_count || 0;
        const quotes = sourceTweet.quote_count || 0;

        const score = likes + retweets * 3 + replies * 2 + quotes * 4;
        const tweetId = sourceTweet.id_str || tweet.id_str;

        posts.push({
          title: text.replace(/https:\/\/t\.co\/\S+/g, "").trim().slice(0, 200),
          url: `https://x.com/${screenName}/status/${tweetId}`,
          platform: "X/Twitter",
          platformDetail: `@${screenName}`,
          engagement: score,
          engagementLabel: `${formatEngagement(likes)} likes · ${formatEngagement(retweets)} RTs · ${replies} replies`,
          hoursOld: hrs,
          velocity: score / hrs,
          discoveredAt: new Date(created).toISOString(),
        });
      }
    } catch (e) {
      console.error(`Twitter @${account} failed:`, e);
    }
  }
  return posts;
}

// ── Reddit public JSON API ──
async function scanReddit(): Promise<RawPost[]> {
  const subreddits = ["artificial", "MachineLearning", "technology", "singularity", "ChatGPT"];
  const posts: RawPost[] = [];

  for (const sub of subreddits) {
    try {
      const res = await fetch(
        `https://www.reddit.com/r/${sub}/hot.json?limit=20&raw_json=1`,
        {
          headers: { "User-Agent": "CultureSoup/0.4" },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();

      for (const child of data?.data?.children || []) {
        const p = child?.data;
        if (!p?.title || p.stickied) continue;
        if (!isEnglish(p.title)) continue;
        if (sub === "technology" && !AI_KEYWORDS.test(p.title + " " + (p.selftext || "").slice(0, 300))) continue;

        const hrs = hoursAgo(p.created_utc);
        if (hrs > 24) continue;

        const score = (p.score || 0) + (p.num_comments || 0) * 2;
        posts.push({
          title: p.title,
          url: p.url?.startsWith("https://www.reddit.com") ? p.url : `https://www.reddit.com${p.permalink}`,
          platform: "Reddit",
          platformDetail: `r/${sub} · ${formatEngagement(p.score || 0)} pts`,
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
  return posts;
}

// ── Hacker News ──
async function scanHackerNews(): Promise<RawPost[]> {
  const posts: RawPost[] = [];
  try {
    const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
      signal: AbortSignal.timeout(8000),
    });
    const ids: number[] = await res.json();

    const items = await Promise.all(
      ids.slice(0, 40).map(async (id) => {
        const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          signal: AbortSignal.timeout(5000),
        });
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

// ── YouTube Data API v3 ──
async function scanYouTube(): Promise<RawPost[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) { console.warn("No YOUTUBE_API_KEY"); return []; }

  const posts: RawPost[] = [];
  try {
    const publishedAfter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=artificial+intelligence+OR+AI+news&type=video&order=viewCount&publishedAfter=${publishedAfter}&relevanceLanguage=en&regionCode=US&maxResults=10&key=${apiKey}`;
    const res = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();

    const videoIds = (data.items || []).map((i: any) => i.id?.videoId).filter(Boolean).join(",");
    if (!videoIds) return [];

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

  // Dedupe by similar titles
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

  const top = deduped.slice(0, 15);

  const trends: TrendingTopic[] = top.map((p, i) => ({
    id: `scan-${i + 1}`,
    platform: p.platform,
    platformDetail: p.platformDetail,
    title: p.title,
    url: p.url,
    meta: p.engagementLabel,
    engagement: p.engagementLabel,
    whyTrending: `Velocity: ${Math.round(p.velocity).toLocaleString()} engagement/hr — ${p.engagementLabel} in ${Math.round(p.hoursOld)}h`,
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
