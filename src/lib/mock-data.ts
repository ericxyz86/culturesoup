import { TrendingTopic, GeneratedPost } from "./types";

export const MOCK_TRENDS: TrendingTopic[] = [
  {
    id: "trend-1",
    platform: "X/Twitter",
    platformDetail: "17M+ views",
    title: 'Elon Musk\'s viral AI post: "Robots could make everyone richer than today\'s richest"',
    url: "https://www.moneycontrol.com/technology/elon-musk-s-viral-ai-post-predicts-robots-could-make-everyone-richer-than-the-world-s-article-13836781.html",
    meta: "2 days ago - Reshared with 17M+ views, thousands of reposts",
    engagement: "17M+",
    whyTrending:
      "Musk reshared his AI-utopia prediction at peak attention. Polarizing take on AI economics driving massive engagement — people either love or hate it.",
  },
  {
    id: "trend-2",
    platform: "CNN / Global Media",
    platformDetail: "Breaking",
    title: 'Seedance 2.0: China\'s AI video gen "so good it spooked Hollywood"',
    url: "https://www.cnn.com/2026/02/20/china/china-ai-seedance-intl-hnk-dst",
    meta: "2 days ago - CNN, BBC, Reuters all covering",
    engagement: "Breaking",
    whyTrending:
      "Deepfake-level video gen showing Tom Cruise, Brad Pitt, Trump in AI-generated scenes. Hollywood is terrified. China AI arms race narrative exploding.",
  },
  {
    id: "trend-3",
    platform: "X/Twitter + LinkedIn",
    platformDetail: "India AI Summit",
    title: "Awkward onstage moment: Sam Altman vs Dario Amodei at India AI Summit",
    url: "https://www.pcmag.com/news/u-mad-onstage-snub-between-openai-and-anthropic-ceos-has-a-backstory",
    meta: '2 days ago - The "U Mad?" moment going viral',
    engagement: "Viral",
    whyTrending:
      'OpenAI vs Anthropic CEO beef caught on camera at India AI Summit. Modi tried to broker a handshake — it got awkward. AI Twitter is having a field day.',
  },
  {
    id: "trend-4",
    platform: "CNBC / Financial Media",
    platformDetail: "$210B+",
    title: "India AI Summit: $210B+ in AI infrastructure commitments",
    url: "https://www.cnbc.com/2026/02/21/india-ai-summit-tech-giants-billion-dollar-investments.html",
    meta: "1 day ago - Reliance $110B, Adani $100B, OpenAI + Tata partnership",
    engagement: "$210B+",
    whyTrending:
      "India positioning as the next AI superpower. Biggest single-event AI investment announcement ever. Finance Twitter + geopolitics = engagement magnet.",
  },
  {
    id: "trend-5",
    platform: "Science / Medical AI",
    platformDetail: "Research",
    title: "AI reads brain MRI scans in seconds — identifies neurological conditions instantly",
    url: "https://www.sciencedaily.com/news/computers_math/artificial_intelligence/",
    meta: "Today - University of Michigan research",
    engagement: "High",
    whyTrending:
      '"AI saving lives" content consistently outperforms doom content. Brain scan → instant diagnosis is visceral and shareable.',
  },
  {
    id: "trend-6",
    platform: "X/Twitter + Substack",
    platformDetail: "Think Pieces",
    title: '"Something Big Is Happening" — viral AI hype essay sparks backlash',
    url: "https://www.infinitescroll.us/p/ai-hype-and-the-search-for-meaning",
    meta: "4 days ago - Counter-narrative going viral",
    engagement: "High",
    whyTrending:
      "The AI hype vs reality debate is the engagement meta right now. Every hot take spawns a counter-take.",
  },
  {
    id: "trend-7",
    platform: "Industry / Enterprise AI",
    platformDetail: "Survey Data",
    title: "38% of companies will deploy AI agents in 2026 — the year of agentic AI",
    url: "https://radicaldatascience.wordpress.com/2026/02/20/ai-news-briefs-bulletin-board-for-february-2026/",
    meta: "1 day ago - Enterprise survey data",
    engagement: "High",
    whyTrending:
      '"Agentic AI" is the buzzword of 2026. LinkedIn engagement through the roof on this data point.',
  },
];

export const MOCK_POSTS: GeneratedPost[] = [
  {
    id: "post-1",
    platform: "twitter",
    content: `China's Seedance 2.0 is generating AI video so realistic that Hollywood is genuinely spooked.

We're past the "AI art looks weird" phase. We're in the "wait, that's not a real movie?" phase.

The creative industry isn't being disrupted — it's being redefined.

#AI #Seedance #GenerativeAI`,
    trendingTopic: "Seedance 2.0",
    estimatedEngagement: "High",
    status: "draft",
  },
  {
    id: "post-2",
    platform: "twitter",
    content: `India just committed $210 BILLION to AI infrastructure in a single summit.

Reliance: $110B
Adani: $100B
OpenAI + Tata: First DC customer deal

The AI superpower race isn't just US vs China anymore.

#IndiaAI #ArtificialIntelligence`,
    trendingTopic: "India AI Summit",
    estimatedEngagement: "High",
    status: "draft",
  },
  {
    id: "post-3",
    platform: "twitter",
    content: `AI just learned to read brain MRI scans in seconds.

Not "assist doctors" — actually identify neurological conditions instantly.

This is the AI story that matters more than any chatbot war.

#MedicalAI #HealthTech`,
    trendingTopic: "Medical AI",
    estimatedEngagement: "High (feel-good + shareable)",
    status: "draft",
  },
  {
    id: "post-4",
    platform: "linkedin",
    content: `38% of companies that haven't deployed AI agents yet say they'll start in 2026.

We're building exactly this at Agile Intelligence — AI agents that listen to social media, analyze trends, generate reports, and act on insights. No prompting required.

The shift from "AI as a tool" to "AI as a teammate" is happening faster than anyone expected.

What's your company's agent strategy?

#AgenticAI #DataAnalytics #MarTech #AIAgents`,
    trendingTopic: "Agentic AI",
    estimatedEngagement: "High",
    status: "draft",
  },
  {
    id: "post-5",
    platform: "instagram",
    content: `Sam Altman and Dario Amodei

Just kidding. The OpenAI vs Anthropic CEO "handshake" at India's AI Summit was peak awkward.

When your competition is also your ex-colleague... things get weird on stage.

The AI race isn't just about models anymore — it's about geopolitics, partnerships, and apparently, personal beef.

#AI #OpenAI #Anthropic #TechDrama #IndiaAISummit`,
    trendingTopic: "Altman vs Amodei",
    estimatedEngagement: "Very high (drama + meme)",
    status: "draft",
  },
  {
    id: "post-6",
    platform: "twitter",
    content: `The current AI discourse meta:

"AI will change everything!" → 17M views
"Actually, slow down" → Goes viral as counter-narrative
"Here's what AI ACTUALLY does today" → Crickets

We don't reward nuance. We reward takes.

Maybe that's the real AI problem.`,
    trendingTopic: "AI hype backlash",
    estimatedEngagement: "High (meta-commentary)",
    status: "draft",
  },
];

export const CONNECTED_ACCOUNTS = {
  twitter: { accountId: "699a9e088ab8ae478b3bc009", username: "@menoob" },
  instagram: { accountId: "699a9e2f8ab8ae478b3bc01d", username: "@menoob" },
} as const;
