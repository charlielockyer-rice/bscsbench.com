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
  const [activeId, setActiveId] = useState(
    () => tabs.find((t) => !t.disabled)?.id ?? tabs[0]?.id ?? ""
  );

  return (
    <>
      <nav className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex gap-1 py-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && setActiveId(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors",
                tab.disabled
                  ? "text-muted-foreground/40 cursor-default"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                activeId === tab.id && !tab.disabled && "text-foreground bg-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
      {tabs.map((tab) => (
        <div key={tab.id} className={cn("pt-8", activeId !== tab.id && "hidden")}>
          {tab.content}
        </div>
      ))}
    </>
  );
}
