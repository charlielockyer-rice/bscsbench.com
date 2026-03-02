import { MarkdownWithToc } from "@/components/work/MarkdownWithToc";

interface WriteupSectionProps {
  writeup: { filename: string; content: string; format: "md" | "txt" } | null;
}

export function WriteupSection({ writeup }: WriteupSectionProps) {
  if (!writeup) {
    return <p className="text-sm text-muted-foreground">No writeup submitted</p>;
  }

  if (writeup.format === "md") {
    return <MarkdownWithToc text={writeup.content} />;
  }

  return (
    <pre className="font-mono text-sm whitespace-pre-wrap">
      {writeup.content}
    </pre>
  );
}
