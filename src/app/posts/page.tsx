"use client";

import { useState } from "react";
import { PostCard } from "@/components/post-card";
import { FilterBar } from "@/components/filter-bar";
import { useToast } from "@/components/toast";
import { MOCK_POSTS } from "@/lib/mock-data";
import { GeneratedPost, Platform } from "@/lib/types";
import { FileTextIcon } from "@/components/icons";

export default function PostsPage() {
  const [posts, setPosts] = useState<GeneratedPost[]>(MOCK_POSTS);
  const [filter, setFilter] = useState<Platform | "all">("all");
  const { showToast } = useToast();

  const filteredPosts = filter === "all" ? posts : posts.filter((p) => p.platform === filter);

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
        body: JSON.stringify({
          content: post.content,
          platform: post.platform,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to publish");
      }

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

  return (
    <>
      <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
        <FileTextIcon className="w-6 h-6 text-[#ff6b35]" />
        Content Queue
      </h1>
      <p className="text-[#888] text-sm mb-6">
        Review, edit, then publish to your connected accounts via Late API.
      </p>

      <FilterBar selectedPlatform={filter} onPlatformChange={setFilter} />

      <div>
        {filteredPosts.length === 0 ? (
          <div className="text-center text-[#555] py-12">
            No posts matching the current filter.
          </div>
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
  );
}
