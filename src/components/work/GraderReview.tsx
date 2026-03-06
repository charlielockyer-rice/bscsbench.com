"use client";

import { useState } from "react";
import { renderMarkdownLite } from "@/components/traces/markdown-lite";
import { cn } from "@/lib/utils";
import { getModelMeta } from "@/lib/model-names";
import type { ModelReview } from "@/lib/solution-types";

interface GraderReviewProps {
  reviews: ModelReview[];
}

function ReviewContent({ content }: { content: string }) {
  const isMarkdown = /^#{1,6}\s/m.test(content);

  if (!isMarkdown) {
    return (
      <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
        {content}
      </pre>
    );
  }

  return (
    <div className="text-sm leading-relaxed space-y-2">
      {renderMarkdownLite(content)}
    </div>
  );
}

export function GraderReview({ reviews }: GraderReviewProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Review not yet available
      </p>
    );
  }

  // Single review: render directly without model tabs
  if (reviews.length === 1) {
    return <ReviewContent content={reviews[0].content} />;
  }

  // Multiple reviews: show model selector pills
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {reviews.map((review, index) => {
          const meta = getModelMeta(review.modelId);
          return (
            <button
              key={review.modelId}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                "border",
                activeIndex === index
                  ? "bg-muted text-foreground border-border"
                  : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:border-border"
              )}
            >
              {meta.logo && (
                <img
                  src={meta.logo}
                  alt=""
                  width={16}
                  height={16}
                  className="size-4 rounded-sm shrink-0"
                />
              )}
              {meta.name}
            </button>
          );
        })}
      </div>
      <ReviewContent content={reviews[activeIndex].content} />
    </div>
  );
}
