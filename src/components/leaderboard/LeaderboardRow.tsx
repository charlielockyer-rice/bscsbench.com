"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BenchmarkEntry, CourseInfo } from "@/lib/types";
import {
  formatPercent,
  formatCost,
  formatRelativeDate,
  formatGpa,
  formatTime,
} from "@/lib/formatting";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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
        const rate = course?.grade ?? 0;
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
}: {
  entry: BenchmarkEntry;
  rank: number;
  courses: Record<string, CourseInfo>;
}) {
  const courseIds = Object.keys(courses).sort();
  const href = `/models/${entry.model.id}`;

  return (
    <>
      {/* Desktop */}
      <tr className="hidden md:table-row hover:bg-muted/50">
        <td className="p-2 align-middle">
          <Link href={href} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <span
              className={cn(
                "tabular-nums text-sm font-bold w-6 text-center",
                rankStyle(rank)
              )}
            >
              {rank}
            </span>
          </Link>
        </td>
        <td className="p-2 align-middle">
          <Link href={href} className="flex items-center gap-2.5">
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
          </Link>
        </td>
        <td className="p-2 align-middle">
          <Link href={href}>
            <div className="flex flex-col">
              <span className="tabular-nums text-sm font-semibold">
                {formatPercent(entry.scores.overall)}
              </span>
              <span className="flex items-center gap-1 tabular-nums text-xs text-muted-foreground">
                {formatGpa(entry.scores.gpa)} GPA
                {entry.scores.gpa >= 2.0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <img src="/logos/degree.png" alt="Graduate!" className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent>Graduate!</TooltipContent>
                  </Tooltip>
                )}
              </span>
            </div>
          </Link>
        </td>
        <td className="p-2 align-middle tabular-nums text-sm hidden md:table-cell">
          <Link href={href}>{formatTime(entry.totals.durationMs / 1000)}</Link>
        </td>
        <td className="p-2 align-middle tabular-nums text-sm hidden md:table-cell">
          <Link href={href}>{formatCost(entry.totals.costUsd)}</Link>
        </td>
        <td className="p-2 align-middle text-sm text-muted-foreground hidden md:table-cell">
          <Link href={href}>{formatRelativeDate(entry.date)}</Link>
        </td>
        <td className="p-2 align-middle hidden md:table-cell">
          <Link href={href}>
            <MiniCourseBars entry={entry} courseIds={courseIds} />
          </Link>
        </td>
      </tr>

      {/* Mobile card */}
      <tr className="md:hidden">
        <td colSpan={7} className="p-0">
          <Link
            href={href}
            className="block border-b p-4 hover:bg-muted/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "tabular-nums text-lg font-bold",
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
                <div className="tabular-nums text-lg font-semibold">
                  {formatPercent(entry.scores.overall)}
                </div>
                <div className="flex items-center justify-end gap-1 tabular-nums text-xs text-muted-foreground">
                  {formatGpa(entry.scores.gpa)} GPA
                  {entry.scores.gpa >= 2.0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <img src="/logos/degree.png" alt="Graduate!" className="size-4" />
                      </TooltipTrigger>
                      <TooltipContent>Graduate!</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex gap-3">
                <span className="tabular-nums">
                  {formatCost(entry.totals.costUsd)}
                </span>
                <span>{formatRelativeDate(entry.date)}</span>
              </div>
              <MiniCourseBars entry={entry} courseIds={courseIds} />
            </div>
          </Link>
        </td>
      </tr>
    </>
  );
}
