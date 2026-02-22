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

// Platform-specific formatting rules
const PLATFORM_RULES: Record<Platform, string> = {
  twitter: `Write a Twitter/X post (max 280 chars). Punchy, opinionated, thread-starter energy.
Use line breaks for emphasis. Include 2-4 hashtags at the end. No emojis unless they add punch.
Tone: sharp, informed, slightly provocative. Write like a tech insider, not a brand.`,

  instagram: `Write an Instagram caption (max 2200 chars but aim for 300-500).
Hook in the first line (this shows before "more"). Use line breaks liberally.
End with 5-10 relevant hashtags on a separate line. Can use emojis sparingly.
Tone: accessible, visual-thinking, slightly more casual than Twitter.`,

  linkedin: `Write a LinkedIn post (aim for 500-800 chars).
Open with a bold statement or surprising stat. Use short paragraphs.
End with a question or call to discussion. Include 3-5 hashtags.
Tone: professional but not corporate. Thought leadership, not press release.`,
};

function generateFallbackContent(
  title: string,
  whyTrending: string,
  platform: Platform
): string {
  // Simple template-based fallback when no LLM is configured
  const url = "";
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

    const posts: GeneratedPost[] = [];
    let postIndex = 0;

    for (const item of items) {
      const title = item.trend?.title || "Untitled";
      const why = item.trend?.whyTrending || "";
      const engagement = item.trend?.engagement || "Unknown";

      for (const platform of item.platforms) {
        postIndex++;
        const content = generateFallbackContent(title, why, platform);

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
      engine: "template", // will be "llm" when we add OpenAI/Claude
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
