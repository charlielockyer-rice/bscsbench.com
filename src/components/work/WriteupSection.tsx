import { MarkdownWithToc } from "@/components/work/MarkdownWithToc";

interface WriteupSectionProps {
  writeup: { filename: string; content: string; format: "md" | "txt" } | null;
  highlightedBlocks?: Record<number, string>;
}

export function WriteupSection({ writeup, highlightedBlocks }: WriteupSectionProps) {
  if (!writeup) {
    return <p className="text-sm text-muted-foreground">No writeup submitted</p>;
  }

  if (writeup.format === "md") {
    return <MarkdownWithToc text={writeup.content} highlightedBlocks={highlightedBlocks} />;
  }

  return (
    <pre className="font-mono text-sm whitespace-pre-wrap">
      {writeup.content}
    </pre>
  );
}
