export interface TrendingTopic {
  id: string;
  platform: string;
  platformDetail: string;
  title: string;
  url: string;
  meta: string;
  engagement: string;
  whyTrending: string;
}

export type Platform = "twitter" | "instagram" | "linkedin";

export type PostStatus = "draft" | "publishing" | "published" | "skipped" | "error";

export interface GeneratedPost {
  id: string;
  platform: Platform;
  content: string;
  trendingTopic: string;
  estimatedEngagement: string;
  status: PostStatus;
  publishedUrl?: string;
  error?: string;
}

export interface LateAccount {
  id: string;
  platform: string;
  username: string;
}

export interface LatePostResponse {
  post: {
    id: string;
    status: string;
    platforms: Array<{
      platform: string;
      platformPostUrl?: string;
      status: string;
    }>;
  };
}

export interface Stats {
  topicsFound: number;
  platformsScanned: number;
  peakEngagement: string;
  publishedCount: number;
}
