"use client";

import { useState, useEffect } from "react";
import { PostCard } from "@/components/post-card";
import { TopicPicker } from "@/components/topic-picker";
import { useToast } from "@/components/toast";
import { MOCK_TRENDS } from "@/lib/mock-data";
import { GeneratedPost, Platform, TrendingTopic } from "@/lib/types";
import { FileTextIcon, SparklesIcon } from "@/components/icons";

interface QueueSelection {
  trendId: string;
  platforms: Platform[];
}

export default function PostsPage() {
  const [trends, setTrends] = useState<TrendingTopic[]>(MOCK_TRENDS);
  const [selections, setSelections] = useState<QueueSelection[]>([]);
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [generating, setGenerating] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<Platform | "all">("all");
  const { showToast } = useToast();

  // Load trends from last scan
  useEffect(() => {
    async function loadTrends() {
      try {
        const res = await fetch("/api/scan/latest");
        if (res.ok) {
          const data = await res.json();
          if (data.trends?.length) setTrends(data.trends);
        }
      } catch {
        // Use mock data as fallback
      }
    }
    loadTrends();
  }, []);

  function handleToggleTrend(trendId: string) {
    setSelections((prev) => {
      const existing = prev.find((s) => s.trendId === trendId);
      if (existing) {
        return prev.filter((s) => s.trendId !== trendId);
      }
      return [...prev, { trendId, platforms: ["twitter"] }];
    });
  }

  function handleTogglePlatform(trendId: string, platform: Platform) {
    setSelections((prev) =>
      prev.map((s) => {
        if (s.trendId !== trendId) return s;
        const has = s.platforms.includes(platform);
        const updated = has
          ? s.platforms.filter((p) => p !== platform)
          : [...s.platforms, platform];
        // Must have at least one platform
        return { ...s, platforms: updated.length > 0 ? updated : s.platforms };
      })
    );
  }

  async function handleGenerate() {
    const validSelections = selections.filter((s) => s.platforms.length > 0);
    if (validSelections.length === 0) {
      showToast("Select at least one trend and platform", true);
      return;
    }

    setGenerating(true);
    try {
      const items = validSelections.map((s) => {
        const trend = trends.find((t) => t.id === s.trendId);
        return {
          trend: {
            id: trend?.id,
            title: trend?.title,
            url: trend?.url,
            whyTrending: trend?.whyTrending,
            platform: trend?.platform,
            engagement: trend?.engagement,
          },
          platforms: s.platforms,
        };
      });

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Generation failed");

      setPosts(data.posts || []);
      showToast(`Generated ${data.posts?.length || 0} posts!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      showToast(msg, true);
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublish(postId: string) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: "publishing" as const } : p))
    );

    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: post.content, platform: post.platform }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish");

      const platformPostUrl = data.post?.platforms?.[0]?.platformPostUrl || "";
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, status: "published" as const, publishedUrl: platformPostUrl }
            : p
        )
      );
      showToast(`Published to ${post.platform}!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, status: "error" as const, error: message } : p))
      );
      showToast(message, true);
    }
  }

  function handleSkip(postId: string) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: "skipped" as const } : p))
    );
  }

  function handleUpdate(postId: string, content: string) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, content } : p))
    );
  }

  const filteredPosts =
    filterPlatform === "all" ? posts : posts.filter((p) => p.platform === filterPlatform);

  const selectedCount = selections.filter((s) => s.platforms.length > 0).length;
  const totalPosts = selections.reduce((sum, s) => sum + s.platforms.length, 0);

  return (
    <>
      <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
        <FileTextIcon className="w-6 h-6 text-[#ff6b35]" />
        Content Queue
      </h1>
      <p className="text-[#888] text-sm mb-6">
        Pick trending topics, choose platforms, and let AI craft your posts.
      </p>

      {/* Step 1: Topic + Platform Selection */}
      {posts.length === 0 && (
        <>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white mb-1">
              1. Select trends &amp; platforms
            </h2>
            <p className="text-[#666] text-xs">
              Pick the trends you want to post about and which platforms to target.
            </p>
          </div>

          <TopicPicker
            trends={trends}
            selections={selections}
            onToggleTrend={handleToggleTrend}
            onTogglePlatform={handleTogglePlatform}
          />

          {/* Generate button */}
          <div className="sticky bottom-4 mt-6 flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={generating || selectedCount === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#ff6b35] text-white hover:bg-[#e55a25] disabled:bg-[#333] disabled:text-[#666] transition-all shadow-lg shadow-[#ff6b35]/20 disabled:shadow-none"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4" />
                  Generate {totalPosts} post{totalPosts !== 1 ? "s" : ""} from {selectedCount} trend
                  {selectedCount !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* Step 2: Review & Publish */}
      {posts.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">
                2. Review &amp; publish
              </h2>
              <p className="text-[#666] text-xs">
                Edit content, then publish or skip.
              </p>
            </div>
            <button
              onClick={() => {
                setPosts([]);
                setSelections([]);
              }}
              className="text-xs text-[#888] hover:text-white px-3 py-1.5 rounded-lg bg-[#1a1a2e] hover:bg-[#2a2a4e] transition-colors"
            >
              ← Back to selection
            </button>
          </div>

          {/* Platform filter tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(["all", "twitter", "instagram", "linkedin"] as const).map((p) => {
              const label =
                p === "all"
                  ? "All Platforms"
                  : p === "twitter"
                    ? "X / Twitter"
                    : p === "instagram"
                      ? "Instagram"
                      : "LinkedIn";
              const count =
                p === "all" ? posts.length : posts.filter((x) => x.platform === p).length;
              if (p !== "all" && count === 0) return null;
              return (
                <button
                  key={p}
                  onClick={() => setFilterPlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterPlatform === p
                      ? "bg-[#ff6b35] text-white"
                      : "bg-[#1a1a2e] text-[#888] hover:text-white hover:bg-[#2a2a4e]"
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          <div>
            {filteredPosts.length === 0 ? (
              <div className="text-center text-[#555] py-12">No posts for this filter.</div>
            ) : (
              filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPublish={handlePublish}
                  onSkip={handleSkip}
                  onUpdate={handleUpdate}
                />
              ))
            )}
          </div>
        </>
      )}
    </>
  );
}
