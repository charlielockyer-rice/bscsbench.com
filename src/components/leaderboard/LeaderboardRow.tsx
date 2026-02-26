"use client";

import { ChevronRight } from "lucide-react";
import type { BenchmarkEntry, CourseInfo } from "@/lib/types";
import {
  formatPercent,
  formatCost,
  formatRelativeDate,
  formatGpa,
} from "@/lib/formatting";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ExpandedRow } from "./ExpandedRow";
import { PassRateBar, rateColor } from "./PassRateBar";

function rankStyle(rank: number): string {
  if (rank === 1) return "text-[oklch(0.75_0.15_85)]"; // gold
  if (rank === 2) return "text-[oklch(0.65_0.02_260)]"; // silver
  if (rank === 3) return "text-[oklch(0.65_0.10_55)]"; // bronze
  return "text-muted-foreground";
}

function MiniCourseBars({
  entry,
  courseIds,
}: {
  entry: BenchmarkEntry;
  courseIds: string[];
}) {
  return (
    <div className="flex items-end gap-0.5 h-8">
      {courseIds.map((id) => {
        const course = entry.courses[id];
        const rate = course?.passRate ?? 0;
        const heightPx = Math.max(2, Math.round((rate / 100) * 32));
        return (
          <div
            key={id}
            className="w-1.5 rounded-sm"
            style={{ height: `${heightPx}px` }}
            title={`${id}: ${formatPercent(rate)}`}
          >
            <div
              className={cn(
                "h-full w-full rounded-sm",
                rate > 0 ? rateColor(rate) : "bg-muted"
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

export function LeaderboardRow({
  entry,
  rank,
  courses,
  expanded,
  onToggle,
}: {
  entry: BenchmarkEntry;
  rank: number;
  courses: Record<string, CourseInfo>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const courseIds = Object.keys(courses).sort();

  return (
    <>
      {/* Desktop */}
      <tr
        className="hidden cursor-pointer hover:bg-muted/50 md:table-row"
        onClick={onToggle}
      >
        <td className="p-2 align-middle">
          <div className="flex items-center gap-1.5">
            <ChevronRight
              className={cn(
                "size-3.5 text-muted-foreground transition-transform",
                expanded && "rotate-90"
              )}
            />
            <span
              className={cn(
                "font-mono tabular-nums text-sm font-bold w-6 text-center",
                rankStyle(rank)
              )}
            >
              {rank}
            </span>
          </div>
        </td>
        <td className="p-2 align-middle">
          <div className="flex items-center gap-2.5">
            {entry.model.logo ? (
              <img
                src={entry.model.logo}
                alt={entry.model.provider}
                width={32}
                height={32}
                className="rounded size-8"
              />
            ) : (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                {entry.model.provider}
              </Badge>
            )}
            <div className="flex flex-col">
              <span className="font-medium text-sm">{entry.model.name}</span>
              {entry.tags.length > 0 && (
                <div className="flex gap-1 mt-0.5">
                  {entry.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-[10px] px-1 py-0 text-muted-foreground"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="p-2 align-middle">
          <div className="flex flex-col">
            <span className="font-mono tabular-nums text-sm font-semibold">
              {formatPercent(entry.scores.overall)}
            </span>
            <span className="font-mono tabular-nums text-xs text-muted-foreground">
              {formatGpa(entry.scores.gpa)} GPA
            </span>
          </div>
        </td>
        <td className="p-2 align-middle font-mono tabular-nums text-sm hidden md:table-cell">
          {entry.assignmentsSolved}/{entry.assignmentsTotal}
        </td>
        <td className="p-2 align-middle font-mono tabular-nums text-sm hidden md:table-cell">
          {formatCost(entry.totals.costUsd)}
        </td>
        <td className="p-2 align-middle text-sm text-muted-foreground hidden md:table-cell">
          {formatRelativeDate(entry.date)}
        </td>
        <td className="p-2 align-middle hidden md:table-cell">
          <MiniCourseBars entry={entry} courseIds={courseIds} />
        </td>
      </tr>

      {/* Desktop expanded */}
      {expanded && (
        <tr className="hidden md:table-row">
          <td colSpan={7} className="bg-muted/30 p-0">
            <ExpandedRow entry={entry} courses={courses} />
          </td>
        </tr>
      )}

      {/* Mobile card */}
      <tr className="md:hidden">
        <td colSpan={7} className="p-0">
          <div
            className="border-b p-4 cursor-pointer hover:bg-muted/50"
            onClick={onToggle}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "font-mono tabular-nums text-lg font-bold",
                    rankStyle(rank)
                  )}
                >
                  {rank}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    {entry.model.logo ? (
                      <img
                        src={entry.model.logo}
                        alt={entry.model.provider}
                        width={24}
                        height={24}
                        className="rounded size-6"
                      />
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1 py-0"
                      >
                        {entry.model.provider}
                      </Badge>
                    )}
                    <span className="font-medium text-sm">
                      {entry.model.name}
                    </span>
                  </div>
                  {entry.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {entry.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[10px] px-1 py-0 text-muted-foreground"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono tabular-nums text-lg font-semibold">
                  {formatPercent(entry.scores.overall)}
                </div>
                <div className="font-mono tabular-nums text-xs text-muted-foreground">
                  {entry.assignmentsSolved}/
                  {entry.assignmentsTotal} solved
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex gap-3">
                <span className="font-mono tabular-nums">
                  {formatCost(entry.totals.costUsd)}
                </span>
                <span>{formatRelativeDate(entry.date)}</span>
              </div>
              <MiniCourseBars entry={entry} courseIds={courseIds} />
            </div>

            {expanded && (
              <div className="mt-3 -mx-4 -mb-4 border-t">
                <ExpandedRow entry={entry} courses={courses} />
              </div>
            )}
          </div>
        </td>
      </tr>
    </>
  );
}
