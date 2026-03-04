import { renderMarkdownLite } from "@/components/traces/markdown-lite";

interface GraderReviewProps {
  graderReview: { content: string } | null;
}

export function GraderReview({ graderReview }: GraderReviewProps) {
  if (!graderReview) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Grader review not yet available
      </p>
    );
  }

  const isMarkdown = /^#{1,6}\s/m.test(graderReview.content);

  if (!isMarkdown) {
    return (
      <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
        {graderReview.content}
      </pre>
    );
  }

  return (
    <div className="text-sm leading-relaxed space-y-2">
      {renderMarkdownLite(graderReview.content)}
    </div>
  );
}
