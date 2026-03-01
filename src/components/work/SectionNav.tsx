"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  label: string;
}

export function SectionNav({ sections }: { sections: Section[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
      <div className="flex gap-1 py-2 overflow-x-auto">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              document
                .getElementById(s.id)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors",
              "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              activeId === s.id && "text-foreground bg-muted"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
