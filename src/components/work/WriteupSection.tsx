import { renderMarkdownLite } from "@/components/traces/markdown-lite";

interface WriteupSectionProps {
  writeup: { filename: string; content: string; format: "md" | "txt" } | null;
}

export function WriteupSection({ writeup }: WriteupSectionProps) {
  if (!writeup) {
    return <p className="text-sm text-muted-foreground">No writeup submitted</p>;
  }

  return (
    <div className="text-sm leading-relaxed space-y-2">
      {writeup.format === "md" ? (
        renderMarkdownLite(writeup.content)
      ) : (
        <pre className="font-mono text-sm whitespace-pre-wrap">
          {writeup.content}
        </pre>
      )}
    </div>
  );
}
