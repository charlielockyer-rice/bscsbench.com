"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { renderMarkdownLite, extractTocEntries } from "@/components/traces/markdown-lite";
import type { TocEntry } from "@/components/traces/markdown-lite";

const HEADING_SELECTOR = "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]";

interface MarkdownWithTocProps {
  text: string;
  highlightedBlocks?: Record<number, string>;
}

export function MarkdownWithToc({ text, highlightedBlocks }: MarkdownWithTocProps) {
  const tocEntries = useMemo(() => extractTocEntries(text), [text]);
  const [activeSlug, setActiveSlug] = useState(tocEntries[0]?.slug ?? "");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current || tocEntries.length === 0) return;

    const headings = contentRef.current.querySelectorAll(HEADING_SELECTOR);
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSlug(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [text, tocEntries.length]);

  // No headers — just render the markdown without a TOC
  if (tocEntries.length === 0) {
    return (
      <div className="text-sm leading-relaxed space-y-2">
        {renderMarkdownLite(text, highlightedBlocks)}
      </div>
    );
  }

  const minLevel = Math.min(...tocEntries.map((e) => e.level));

  return (
    <div className="flex gap-8">
      <nav className="hidden lg:block w-52 shrink-0">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Contents
          </p>
          <ul className="space-y-1">
            {tocEntries.map((entry) => (
              <TocItem
                key={entry.slug}
                entry={entry}
                minLevel={minLevel}
                isActive={activeSlug === entry.slug}
              />
            ))}
          </ul>
        </div>
      </nav>

      <div ref={contentRef} className="min-w-0 flex-1 text-sm leading-relaxed space-y-2">
        {renderMarkdownLite(text, highlightedBlocks)}
      </div>

      {/* Spacer matching TOC width to center the content */}
      <div className="hidden lg:block w-52 shrink-0" />
    </div>
  );
}

function TocItem({
  entry,
  minLevel,
  isActive,
}: {
  entry: TocEntry;
  minLevel: number;
  isActive: boolean;
}) {
  const indent = (entry.level - minLevel) * 12;

  return (
    <li style={{ paddingLeft: indent }}>
      <a
        href={`#${entry.slug}`}
        onClick={(e) => {
          e.preventDefault();
          document.getElementById(entry.slug)?.scrollIntoView({ behavior: "smooth" });
        }}
        className={cn(
          "block py-0.5 text-xs leading-snug transition-colors truncate",
          isActive
            ? "text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground"
        )}
        title={entry.text}
      >
        {entry.text}
      </a>
    </li>
  );
}
