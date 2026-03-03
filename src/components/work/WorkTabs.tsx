"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

export function WorkTabs({ tabs }: { tabs: Tab[] }) {
  const visibleTabs = tabs.filter((t) => !t.disabled);

  const [activeId, setActiveId] = useState(
    () => visibleTabs[0]?.id ?? ""
  );

  return (
    <>
      <nav className="sticky top-14 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex gap-1 py-2 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveId(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors",
                "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                activeId === tab.id && "text-foreground bg-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
      {visibleTabs.map((tab) => (
        <div key={tab.id} className={cn("pt-8", activeId !== tab.id && "hidden")}>
          {tab.content}
        </div>
      ))}
    </>
  );
}
