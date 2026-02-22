import { NextRequest, NextResponse } from "next/server";
import { GeneratedPost, Platform } from "@/lib/types";

interface GenerateItem {
  trend: {
    id?: string;
    title?: string;
    url?: string;
    whyTrending?: string;
    platform?: string;
    engagement?: string;
  };
  platforms: Platform[];
}

const PLATFORM_RULES: Record<Platform, string> = {
  twitter: `Write a Twitter/X post (max 280 chars). Punchy, opinionated, thread-starter energy.
Use line breaks for emphasis. Include 2-4 relevant hashtags at the end. No emojis unless they add punch.
Tone: sharp, informed, slightly provocative. Write like a tech insider, not a brand.`,

  instagram: `Write an Instagram caption (aim for 300-500 chars, max 2200).
Hook in the first line (this shows before "more"). Use line breaks liberally.
End with 5-10 relevant hashtags on a separate line. Can use emojis sparingly.
Tone: accessible, visual-thinking, slightly more casual than Twitter.`,

  linkedin: `Write a LinkedIn post (aim for 500-800 chars).
Open with a bold statement or surprising stat. Use short paragraphs.
End with a question or call to discussion. Include 3-5 hashtags.
Tone: professional but not corporate. Thought leadership, not press release.`,
};

const PLATFORM_LABELS: Record<Platform, string> = {
  twitter: "X/Twitter",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

async function generateWithLLM(
  title: string,
  whyTrending: string,
  url: string,
  platform: Platform
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const systemPrompt = `You are a social media content strategist who writes viral, high-engagement posts about AI and technology trends.
You write original, opinionated content — never generic filler. Every post should feel like it was written by someone who deeply understands the topic.
Do NOT include the source URL in the post body. Do NOT wrap in quotes. Just output the post text directly.`;

  const userPrompt = `Write a ${PLATFORM_LABELS[platform]} post about this trending AI topic:

TOPIC: ${title}
WHY IT'S TRENDING: ${whyTrending}
SOURCE: ${url}

${PLATFORM_RULES[platform]}

Output ONLY the post text. No preamble, no "Here's a post:", no quotes around it.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `OpenAI ${res.status}: ${err?.error?.message || res.statusText}`
    );
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from OpenAI");
  return content;
}

function generateFallbackContent(
  title: string,
  whyTrending: string,
  platform: Platform
): string {
  switch (platform) {
    case "twitter":
      return `${title}\n\n${whyTrending.split(".")[0]}.\n\nThis matters more than people think.\n\n#AI #Tech #Trending`;
    case "instagram":
      return `${title}\n\n${whyTrending}\n\nWhat do you think — is this the future or the beginning of the end?\n\n.\n.\n.\n#AI #ArtificialIntelligence #Tech #Innovation #Trending`;
    case "linkedin":
      return `${title}\n\n${whyTrending}\n\nThe implications for our industry are significant. What's your take?\n\n#AI #Innovation #Technology #Leadership`;
    default:
      return title;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { items } = (await req.json()) as { items: GenerateItem[] };

    if (!items?.length) {
      return NextResponse.json(
        { error: "No items to generate" },
        { status: 400 }
      );
    }

    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const posts: GeneratedPost[] = [];
    let postIndex = 0;

    for (const item of items) {
      const title = item.trend?.title || "Untitled";
      const why = item.trend?.whyTrending || "";
      const url = item.trend?.url || "";
      const engagement = item.trend?.engagement || "Unknown";

      for (const platform of item.platforms) {
        postIndex++;
        let content: string;

        if (hasOpenAI) {
          try {
            content = await generateWithLLM(title, why, url, platform);
          } catch (e) {
            console.error(`LLM generation failed for ${platform}:`, e);
            content = generateFallbackContent(title, why, platform);
          }
        } else {
          content = generateFallbackContent(title, why, platform);
        }

        posts.push({
          id: `gen-${postIndex}`,
          platform,
          content,
          trendingTopic: title.slice(0, 80),
          estimatedEngagement: engagement,
          status: "draft",
        });
      }
    }

    return NextResponse.json({
      posts,
      generatedAt: new Date().toISOString(),
      engine: hasOpenAI ? "gpt-5.2" : "template",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
