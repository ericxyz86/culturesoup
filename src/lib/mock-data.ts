import { TrendingTopic, GeneratedPost } from "./types";

// Helper: hours ago from now
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

export const MOCK_TRENDS: TrendingTopic[] = [
  {
    id: "trend-1",
    platform: "Entertainment / Legal",
    platformDetail: "Breaking",
    title: "Hollywood studios threaten ByteDance with litigation over Seedance 2.0 deepfakes",
    url: "https://variety.com/2026/tv/news/netflix-bytedance-immediate-litigation-seedance-ai-1236666084/",
    meta: "",
    engagement: "Breaking",
    whyTrending:
      "Netflix, Disney, Paramount all firing cease-and-desist letters. ByteDance scrambling to add safeguards. First major legal showdown over AI video gen using celebrity likenesses without consent.",
    discoveredAt: hoursAgo(6),
  },
  {
    id: "trend-2",
    platform: "X/Twitter + LinkedIn",
    platformDetail: "Sentiment",
    title: '"84% of devs use AI, only 29% trust it" — the AI trust gap is widening',
    url: "https://siliconangle.com/2026/02/21/ai-trust-gap-developers-grapple-issues-around-security-memory-cost-interoperability/",
    meta: "",
    engagement: "Viral",
    whyTrending:
      "New survey showing massive disconnect between AI adoption and AI trust. Counter-narrative to hype gaining serious traction — developers themselves don't trust what they're building with.",
    discoveredAt: hoursAgo(3),
  },
  {
    id: "trend-3",
    platform: "X/Twitter + Reddit",
    platformDetail: "India AI Summit",
    title: "Indian university kicked out of AI Summit for passing off Chinese robot dog as their own",
    url: "https://www.reuters.com/world/china/india-tells-university-leave-ai-summit-after-presenting-chinese-robot-its-own-2026-02-18/",
    meta: "",
    engagement: "Viral",
    whyTrending:
      "Galgotias University professor claimed a commercially available Chinese robot dog was developed at their lab — caught on state TV. Kicked out of India AI Summit. Peak meme fuel.",
    discoveredAt: hoursAgo(2),
  },
  {
    id: "trend-4",
    platform: "X/Twitter",
    platformDetail: "Controversy",
    title: "Grok falsely flags real Kamal Haasan movie promo as AI-generated",
    url: "https://www.hindustantimes.com/entertainment/tamil-cinema/is-kamal-haasan-rajinikanth-reunion-promo-ai-generated-grok-indictment-has-fans-up-in-arms-nelson-kh-x-rk-reunion-101771736101655.html",
    meta: "",
    engagement: "High",
    whyTrending:
      "Elon's own AI chatbot Grok told users a real movie promo starring Kamal Haasan and Rajinikanth was AI-generated. Fans furious. The AI detection arms race is eating itself.",
    discoveredAt: hoursAgo(3),
  },
  {
    id: "trend-5",
    platform: "Science / Tech",
    platformDetail: "Research",
    title: "Brain-inspired neuromorphic chips now solve complex physics without supercomputers",
    url: "https://www.sciencedaily.com/releases/2026/02/260213223923.htm",
    meta: "",
    engagement: "High",
    whyTrending:
      "Neuromorphic computing breakthrough — brain-like chips solving PDEs that normally need massive GPU clusters. 'Post-NVIDIA' narrative gaining traction in AI hardware circles.",
    discoveredAt: hoursAgo(16),
  },
  {
    id: "trend-6",
    platform: "The Atlantic + Substack",
    platformDetail: "Contrarian",
    title: '"The AI-Panic Cycle" — sustained backlash against AI hype is going mainstream',
    url: "https://www.theatlantic.com/podcasts/2026/02/the-ai-panic-cycle-and-whats-actually-different-now/686077/",
    meta: "",
    engagement: "Growing",
    whyTrending:
      "The Atlantic, Blood in the Machine, and The Free Press all running anti-hype pieces this week. Counter-narrative content consistently outperforms pure AI optimism right now.",
    discoveredAt: hoursAgo(18),
  },
];

export const MOCK_POSTS: GeneratedPost[] = [
  {
    id: "post-1",
    platform: "twitter",
    content: `Netflix just threatened ByteDance with \"immediate litigation\" over Seedance 2.0.

Disney and Paramount already sent cease-and-desists.

AI-generated Tom Cruise and Brad Pitt in promotional demos without consent crossed the line.

This is the case that defines AI copyright law for a generation.

#AI #Seedance #Copyright #Hollywood`,
    trendingTopic: "Hollywood vs Seedance 2.0",
    estimatedEngagement: "Very High",
    status: "draft",
  },
  {
    id: "post-2",
    platform: "twitter",
    content: `Grok just told users a real movie trailer was \"AI-generated.\"

The movie stars Kamal Haasan and Rajinikanth — two of India's biggest actors. Fans are livid.

We've entered the era where AI detection is as unreliable as the AI it's trying to catch.

The ouroboros is complete.`,
    trendingTopic: "Grok false accusation",
    estimatedEngagement: "High",
    status: "draft",
  },
  {
    id: "post-3",
    platform: "linkedin",
    content: `New data: 84% of developers now use AI tools.

Only 29% trust the accuracy of what they produce.

This trust gap is the single biggest risk to AI adoption — and most companies aren't even measuring it.

If your AI strategy doesn't include a trust strategy, you don't have a strategy.

#AI #TrustGap #Leadership #AIStrategy`,
    trendingTopic: "AI Trust Gap",
    estimatedEngagement: "High",
    status: "draft",
  },
  {
    id: "post-4",
    platform: "twitter",
    content: `A university professor got caught passing off a Chinese-made robot dog as her own creation at India's AI Summit.

On state TV.

She was kicked out.

In 2026. At an AI summit. We're speedrunning the credibility crisis.`,
    trendingTopic: "Fake AI robot dog",
    estimatedEngagement: "Very High (meme potential)",
    status: "draft",
  },
  {
    id: "post-5",
    platform: "twitter",
    content: `Neuromorphic chips just solved complex physics simulations without a supercomputer.

Brain-inspired computing isn't a research curiosity anymore — it's a real alternative to GPU-everything.

The post-NVIDIA era might arrive sooner than anyone expected.

#Neuromorphic #AIHardware #Computing`,
    trendingTopic: "Neuromorphic computing",
    estimatedEngagement: "High",
    status: "draft",
  },
  {
    id: "post-6",
    platform: "instagram",
    content: `The AI backlash went mainstream this week.

The Atlantic, Blood in the Machine, and The Free Press all running pieces questioning the hype.

The most viral AI content right now isn't optimism — it's skepticism.

Maybe the real disruption is the trust we lost along the way.

#AI #TechBacklash #HotTake`,
    trendingTopic: "AI backlash",
    estimatedEngagement: "High (contrarian)",
    status: "draft",
  },
];

export const CONNECTED_ACCOUNTS = {
  twitter: { accountId: "699a9e088ab8ae478b3bc009", username: "@menoob" },
  instagram: { accountId: "699a9e2f8ab8ae478b3bc01d", username: "@menoob" },
} as const;
