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

  return (
    <pre className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
      {graderReview.content}
    </pre>
  );
}
