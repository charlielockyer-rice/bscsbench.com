import { renderMarkdownLite } from "./markdown-lite";

export function TraceTextBlock({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="text-sm leading-relaxed">
      {renderMarkdownLite(text)}
    </div>
  );
}
