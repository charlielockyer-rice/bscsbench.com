import React from "react";

export interface TocEntry {
  level: number;
  text: string;
  slug: string;
}

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "section";
}

/** Deduplicate a slug against a running count map, returning a unique slug. */
function uniqueSlug(text: string, slugCounts: Map<string, number>): string {
  let slug = slugify(text);
  const count = slugCounts.get(slug) ?? 0;
  slugCounts.set(slug, count + 1);
  if (count > 0) slug += `-${count}`;
  return slug;
}

/** Extract a table-of-contents from raw markdown text. */
export function extractTocEntries(text: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const slugCounts = new Map<string, number>();
  let inCodeFence = false;
  for (const line of text.split("\n")) {
    if (line.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const rawText = match[2].replace(/[`*]/g, "");
      entries.push({ level, text: rawText, slug: uniqueSlug(match[2], slugCounts) });
    }
  }
  return entries;
}

/**
 * Lightweight markdown renderer — no external deps.
 * Handles code fences, inline code, bold, headers (h1-h6), lists, tables,
 * and paragraph breaks.
 */
export function renderMarkdownLite(
  text: string,
  highlightedBlocks?: Record<number, string>
): React.ReactNode[] {
  const blocks: React.ReactNode[] = [];
  const lines = text.split("\n");
  const slugCounts = new Map<string, number>();
  let codeBlockIndex = 0;
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
      const highlighted = highlightedBlocks?.[codeBlockIndex];
      codeBlockIndex++;
      if (highlighted) {
        blocks.push(
          <div
            key={blocks.length}
            className="rounded-lg border overflow-hidden my-2 [&_pre]:p-4 [&_pre]:m-0 [&_code]:text-xs"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        );
      } else {
        blocks.push(
          <pre
            key={blocks.length}
            className="bg-muted/50 rounded-lg p-4 font-mono text-xs overflow-x-auto my-2"
          >
            <code data-lang={lang || undefined}>{codeLines.join("\n")}</code>
          </pre>
        );
      }
      continue;
    }

    // Headers (h1-h6)
    const headerMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headerMatch) {
      const level = Math.min(headerMatch[1].length, 6);
      const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
      const sizes: Record<string, string> = {
        h1: "text-xl font-bold",
        h2: "text-lg font-bold",
        h3: "text-base font-semibold",
        h4: "text-sm font-semibold",
        h5: "text-sm font-medium",
        h6: "text-xs font-medium uppercase tracking-wider",
      };
      const headerSlug = uniqueSlug(headerMatch[2], slugCounts);
      blocks.push(
        <Tag key={blocks.length} id={headerSlug} className={`${sizes[`h${level}`]} mt-3 mb-1 scroll-mt-16`}>
          {renderInline(headerMatch[2])}
        </Tag>
      );
      i++;
      continue;
    }

    // Tables — detect pipe-delimited rows
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const parseRow = (row: string) =>
          row.split("|").slice(1, -1).map((cell) => cell.trim());

        const headerCells = parseRow(tableLines[0]);
        // Skip separator row (e.g., |---|---|)
        const isSeparator = (row: string) =>
          /^\|[\s\-:|]+\|$/.test(row.trim()) &&
          row.trim().split("|").slice(1, -1).every((cell) => /^[\s\-:]+$/.test(cell));
        const dataStart = isSeparator(tableLines[1]) ? 2 : 1;
        const bodyRows = tableLines.slice(dataStart).map(parseRow);

        blocks.push(
          <div key={blocks.length} className="my-2 overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {headerCells.map((cell, j) => (
                    <th key={j} className="px-3 py-2 text-left font-medium">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, j) => (
                  <tr key={j} className="border-t border-border/50">
                    {row.map((cell, k) => (
                      <td key={k} className="px-3 py-2">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
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
      !lines[i].match(/^#{1,6}\s+/) &&
      !lines[i].match(/^[-*]\s+/) &&
      !(lines[i].includes("|") && lines[i].trim().startsWith("|"))
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
