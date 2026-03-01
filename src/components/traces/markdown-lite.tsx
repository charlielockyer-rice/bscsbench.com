import React from "react";

/**
 * Lightweight markdown renderer — no external deps.
 * Handles code fences, inline code, bold, headers, lists, and paragraph breaks.
 */
export function renderMarkdownLite(text: string): React.ReactNode[] {
  const blocks: React.ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code fences
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(
        <pre
          key={blocks.length}
          className="bg-muted/50 rounded-lg p-4 font-mono text-xs overflow-x-auto my-2"
        >
          <code data-lang={lang || undefined}>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const Tag = `h${level + 1}` as "h2" | "h3" | "h4";
      const sizes = { h2: "text-lg font-bold", h3: "text-base font-semibold", h4: "text-sm font-semibold" };
      blocks.push(
        <Tag key={blocks.length} className={`${sizes[Tag]} mt-3 mb-1`}>
          {renderInline(headerMatch[2])}
        </Tag>
      );
      i++;
      continue;
    }

    // List items
    if (line.match(/^[-*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={blocks.length} className="list-disc list-inside space-y-0.5 my-1">
          {items.map((item, j) => (
            <li key={j}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Blank lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-empty, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("```") &&
      !lines[i].match(/^#{1,3}\s+/) &&
      !lines[i].match(/^[-*]\s+/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={blocks.length} className="my-1">
        {renderInline(paraLines.join("\n"))}
      </p>
    );
  }

  return blocks;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match inline code or bold
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("`")) {
      parts.push(
        <code
          key={parts.length}
          className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      parts.push(
        <strong key={parts.length}>{token.slice(2, -2)}</strong>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
