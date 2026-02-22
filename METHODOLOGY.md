# CultureSoup Scanner Methodology

## Current vs Proposed

### Twitter/X — THE BIGGEST GAP

**Current problem:** SociaVault `user-tweets` returns 100 most popular tweets OF ALL TIME per user. After 48h filter, only 2-3 survive from 31 accounts. This is fundamentally the wrong API for "what's trending now."

**Proposed fix — multi-layered approach:**

1. **Massively expand account list to 80+ accounts** (costs 80 SociaVault credits/scan)
   - AI companies: OpenAI, AnthropicAI, GoogleDeepMind, MistralAI, MetaAI, CohereAI, stability_ai, HuggingFace, xaborai, GroqInc,Aborai, PerplexityAI, DeepSeekAI, NVIDIAAI, GoogleAI
   - AI leaders: sama, DarioAmodei, elonmusk, satyanadella, karpathy, ylecun, fchollet, drjimfan, demaborai, jeffdean, iaborai, hardmaru
   - AI media/commentators: TheAIGRID, AiBreakfast, ai__pub, rowancheung, billofalltrades, nonmayorpete, tsarnick, minchoi, emaborai, bindureddy
   - Tech journalists: zoaborai, alexaborai, karasaborai, caborai, techcrunch, waborai, veraborai
   - AI researchers: goodfellow_ian, GaryMarcus, tegmark, timnitGebru, mmitchell_ai, raaborai

2. **Brave Web Search as tweet discovery** (FREE — 1 req/sec, ~2000/day)
   - Query: `"AI" OR "artificial intelligence" OR "openai" OR "chatgpt" trending tweet`
   - Freshness filter: `pd` (past day)
   - Parse URLs from results → extract tweet IDs → use SociaVault `tweet` endpoint for engagement data
   - This catches viral tweets that news sites embed/reference

3. **SociaVault community-tweets** for large AI communities on X (1 credit each)
   - Need to find active AI community IDs on X

**Cost estimate:** ~80-90 credits per scan (80 user-tweets + ~10 tweet details from Brave discoveries)

### Reddit — GOOD BUT INCOMPLETE

**Current:** 8 AI subreddits + 1 global search = ~120 posts

**Proposed improvements:**
1. **Expand subreddits to 15+** (FREE — direct Reddit JSON API):
   - Add: `technology`, `Futurology`, `programming`, `compsci`, `datascience`, `robotics`, `transhumanism`
   - These mainstream subs catch AI posts that go viral outside the AI bubble

2. **Multiple search queries** (FREE):
   - `chatgpt OR openai OR "artificial intelligence" OR deepfake`
   - `claude AI OR anthropic OR gemini AI`  
   - `AI replace OR AI jobs OR AI regulation`
   - Sort by `top` AND `relevance` (two separate queries)

3. **r/all rising** (FREE): `reddit.com/r/all/rising.json` filtered by AI keywords catches posts gaining momentum across ALL subreddits

**Cost estimate:** 0 credits (all free APIs)

### YouTube — OVER-SAMPLED, WRONG SCORING

**Current:** 3 queries × 10 results, views-based scoring dominates everything

**Proposed improvements:**
1. **More specific queries** to reduce noise:
   - `"AI news" today` (not just "AI news today" which matches Hindi news)
   - `OpenAI announcement OR Claude update OR GPT news`
   - `artificial intelligence breakthrough`
   - `AI demo viral`
2. **Channel-based scanning** for known AI creators (FREE with API key):
   - Matt Wolfe, AI Explained, Two Minute Papers, Fireship, The AI Grip, AI Jason
   - Use YouTube `search` endpoint filtered to channel
3. **Cap YouTube to max 5 in top 25** — platform diversity matters

**Cost estimate:** 0 credits (YouTube Data API free tier: 10K units/day)

### Hacker News — FINE AS IS

Already decent. Maybe increase from top 30+20 to top 40+30.

### TikTok — NEW, NEEDS TUNING

**Proposed:**
- 5 keyword searches instead of 3: add `"AI tool"`, `"tech news"`
- Cap results like YouTube — max 3-4 in top 25

## Cross-Platform Scoring (CRITICAL)

The fundamental problem: raw scores are incomparable across platforms.

**Proposed: Percentile-based normalization per platform**

Instead of comparing raw scores, rank within each platform first, then merge:

```
Platform score = raw_engagement / hours_old (velocity)
Normalized score = platform_rank_percentile * platform_weight
```

Platform weights (tunable):
- Twitter: 1.0 (original source, high signal)
- Reddit: 0.9 (great discussion signal)
- Hacker News: 0.85 (quality filter built-in)
- YouTube: 0.7 (views inflate, lower weight)
- TikTok: 0.6 (entertainment bias)

**Simpler alternative: velocity percentile merge**
1. Compute velocity per post (engagement / hours_old)
2. Within each platform, sort by velocity and assign rank
3. Take top N from each platform: 8 Twitter, 8 Reddit, 4 HN, 3 YouTube, 2 TikTok
4. Interleave by cross-platform velocity

This guarantees platform diversity and prevents any single platform from dominating.

## Implementation Priority

1. **HIGH:** Platform-quota system (top N per platform) — 1 hour
2. **HIGH:** Expand Twitter accounts to 80+ — 30 min
3. **HIGH:** Expand Reddit subreddits + add r/all/rising — 30 min
4. **MEDIUM:** Add Brave Search tweet discovery — 2 hours
5. **MEDIUM:** Better YouTube queries + channel scanning — 1 hour  
6. **LOW:** Cross-platform percentile scoring — 1 hour
