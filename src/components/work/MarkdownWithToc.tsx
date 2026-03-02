"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { renderMarkdownLite, extractTocEntries } from "@/components/traces/markdown-lite";
import type { TocEntry } from "@/components/traces/markdown-lite";

interface MarkdownWithTocProps {
  text: string;
}

export function MarkdownWithToc({ text }: MarkdownWithTocProps) {
  const tocEntries = extractTocEntries(text);
  const [activeSlug, setActiveSlug] = useState(tocEntries[0]?.slug ?? "");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current || tocEntries.length === 0) return;

    const headings = contentRef.current.querySelectorAll("[id]");
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
  }, [tocEntries.length]);

  // No headers — just render the markdown without a TOC
  if (tocEntries.length === 0) {
    return (
      <div className="text-sm leading-relaxed space-y-2">
        {renderMarkdownLite(text)}
      </div>
    );
  }

  const minLevel = Math.min(...tocEntries.map((e) => e.level));

  return (
    <div className="flex gap-8">
      <nav className="hidden lg:block w-52 shrink-0">
        <div className="sticky top-14 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
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
        {renderMarkdownLite(text)}
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
