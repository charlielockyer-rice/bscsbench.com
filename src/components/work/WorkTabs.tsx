"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
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

  const activeLabel = visibleTabs.find((t) => t.id === activeId)?.label ?? "";

  return (
    <>
      <nav className="sticky top-14 z-10 bg-background/95 backdrop-blur border-b">
        {/* Desktop: horizontal tab buttons */}
        <div className="hidden sm:flex gap-1 py-2">
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

        {/* Mobile: dropdown selector */}
        <div className="relative sm:hidden py-2">
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {visibleTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
