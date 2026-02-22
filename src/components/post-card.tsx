"use client";

import { useState } from "react";
import { GeneratedPost, Platform } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EditIcon, SkipIcon, SendIcon, CheckIcon, ExternalLinkIcon } from "./icons";
import { CONNECTED_ACCOUNTS } from "@/lib/mock-data";

interface PostCardProps {
  post: GeneratedPost;
  onPublish: (postId: string) => Promise<void>;
  onSkip: (postId: string) => void;
  onUpdate: (postId: string, content: string) => void;
}

function PlatformBadge({ platform }: { platform: Platform }) {
  const styles: Record<Platform, string> = {
    twitter: "bg-[#1d9bf0] text-white",
    instagram: "badge-instagram text-white",
    linkedin: "bg-[#0a66c2] text-white",
  };

  const labels: Record<Platform, string> = {
    twitter: "X / Twitter",
    instagram: "Instagram",
    linkedin: "LinkedIn",
  };

  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[platform]}`}>
      {labels[platform]}
    </span>
  );
}

function StatusBadge({ status }: { status: GeneratedPost["status"] }) {
  if (status === "draft") return null;

  const styles: Record<string, string> = {
    publishing: "bg-[#1a1a2e] text-[#60a5fa]",
    published: "bg-[#1a4d2e] text-[#4ade80]",
    skipped: "bg-[#333] text-[#888]",
    error: "bg-[#4d1a1a] text-[#f87171]",
  };

  return (
    <Badge variant="outline" className={`ml-2 border-0 text-[0.7rem] font-semibold ${styles[status]}`}>
      {status.toUpperCase()}
    </Badge>
  );
}

export function PostCard({ post, onPublish, onSkip, onUpdate }: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

  const { platform } = post;
  const isConnected = platform in CONNECTED_ACCOUNTS;
  const isDisabled = post.status !== "draft" && post.status !== "error";

  function handleToggleEdit() {
    if (isEditing) {
      onUpdate(post.id, editContent);
      setIsEditing(false);
    } else {
      setEditContent(post.content);
      setIsEditing(true);
    }
  }

  return (
    <div
      className={`bg-[#0d1117] border border-[#30363d] rounded-xl p-5 mb-4 transition-opacity ${
        post.status === "skipped" ? "opacity-30" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <PlatformBadge platform={platform} />
        <StatusBadge status={post.status} />
      </div>

      {isEditing ? (
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full min-h-[120px] bg-[#1a1a2e] border-[#30363d] text-[#e0e0e0] text-[0.95rem] mb-3 resize-y"
          autoFocus
        />
      ) : (
        <div className="text-[0.95rem] whitespace-pre-line mb-3">{post.content}</div>
      )}

      <div className="text-[#888] text-xs mb-3">
        Trending topic: {post.trendingTopic} &middot; Est. engagement: {post.estimatedEngagement}
      </div>

      {post.status === "published" && post.publishedUrl && (
        <a
          href={post.publishedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#4ade80] text-sm no-underline hover:underline inline-flex items-center gap-1 mb-3"
        >
          <ExternalLinkIcon className="w-3.5 h-3.5" />
          View live post
        </a>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => onPublish(post.id)}
          disabled={isDisabled || !isConnected || post.status === "publishing"}
          className="bg-[#ff6b35] hover:bg-[#e55a25] text-white disabled:bg-[#444] disabled:text-[#888]"
          size="sm"
        >
          {post.status === "publishing" ? (
            "Publishing..."
          ) : post.status === "published" ? (
            <>
              <CheckIcon className="w-4 h-4 mr-1" /> Published
            </>
          ) : (
            <>
              <SendIcon className="w-4 h-4 mr-1" />
              {isConnected
                ? `Publish to ${platform === "twitter" ? "X" : platform === "instagram" ? "Instagram" : "LinkedIn"}`
                : `${platform} (not connected)`}
            </>
          )}
        </Button>

        <Button
          onClick={handleToggleEdit}
          disabled={isDisabled}
          variant="secondary"
          size="sm"
          className="bg-[#2a2a4e] text-[#ccc] hover:bg-[#3a3a5e]"
        >
          <EditIcon className="w-4 h-4 mr-1" />
          {isEditing ? "Save" : "Edit"}
        </Button>

        <Button
          onClick={() => onSkip(post.id)}
          disabled={isDisabled}
          variant="outline"
          size="sm"
          className="bg-transparent text-[#666] border-[#333] hover:border-[#666] hover:text-[#aaa]"
        >
          <SkipIcon className="w-4 h-4 mr-1" />
          Skip
        </Button>
      </div>
    </div>
  );
}
