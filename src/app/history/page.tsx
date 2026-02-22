"use client";

import { useEffect, useState } from "react";
import { HistoryIcon, ExternalLinkIcon, RefreshIcon } from "@/components/icons";

interface HistoryPost {
  id: string;
  content: string;
  status: string;
  platforms: Array<{
    platform: string;
    platformPostUrl?: string;
    status: string;
  }>;
  createdAt: string;
}

export default function HistoryPage() {
  const [posts, setPosts] = useState<HistoryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchHistory() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setPosts(data.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
  }, []);

  function platformBadgeClass(platform: string) {
    switch (platform) {
      case "twitter":
        return "bg-[#1d9bf0] text-white";
      case "instagram":
        return "badge-instagram text-white";
      case "linkedin":
        return "bg-[#0a66c2] text-white";
      default:
        return "bg-[#333] text-[#ccc]";
    }
  }

  function platformLabel(platform: string) {
    switch (platform) {
      case "twitter":
        return "X / Twitter";
      case "instagram":
        return "Instagram";
      case "linkedin":
        return "LinkedIn";
      default:
        return platform;
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <HistoryIcon className="w-6 h-6 text-[#ff6b35]" />
          Published History
        </h1>
        <button
          onClick={fetchHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a1a2e] text-[#888] hover:text-white hover:bg-[#2a2a4e] transition-colors"
        >
          <RefreshIcon className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
      <p className="text-[#888] text-sm mb-6">
        Posts published through CultureSoup via the Late API.
      </p>

      {loading && (
        <div className="text-center text-[#555] py-12">Loading published posts...</div>
      )}

      {error && (
        <div className="bg-[#4d1a1a] border border-[#6d2a2a] rounded-xl p-4 text-[#f87171] text-sm mb-4">
          {error}
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="text-center text-[#555] py-12">
          No published posts yet. Go to the Posts page to publish content.
        </div>
      )}

      {!loading &&
        posts.map((post) => (
          <div
            key={post.id}
            className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 mb-4"
          >
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              {post.platforms.map((p, i) => (
                <span
                  key={i}
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${platformBadgeClass(p.platform)}`}
                >
                  {platformLabel(p.platform)}
                </span>
              ))}
              <span className="inline-block px-2 py-0.5 rounded-full text-[0.7rem] font-semibold bg-[#1a4d2e] text-[#4ade80]">
                {post.status.toUpperCase()}
              </span>
              <span className="text-[#555] text-xs ml-auto">
                {new Date(post.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="text-[0.95rem] whitespace-pre-line mb-3">{post.content}</div>
            <div className="flex gap-3">
              {post.platforms.map((p, i) =>
                p.platformPostUrl ? (
                  <a
                    key={i}
                    href={p.platformPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#4ade80] text-sm no-underline hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLinkIcon className="w-3.5 h-3.5" />
                    View on {platformLabel(p.platform)}
                  </a>
                ) : null
              )}
            </div>
          </div>
        ))}
    </>
  );
}
