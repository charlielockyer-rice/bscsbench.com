"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  DollarSign,
  Clock,
  FlaskConical,
  Cpu,
} from "lucide-react";
import type { BenchmarkEntry, CourseInfo } from "@/lib/types";
import {
  formatCost,
  formatTime,
  formatPercent,
  formatTokens,
  formatGpa,
} from "@/lib/formatting";
import { PassRateBar } from "@/components/leaderboard/PassRateBar";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/utils";

export function ModelDetail({
  entry,
  courses,
}: {
  entry: BenchmarkEntry;
  courses: Record<string, CourseInfo>;
}) {
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const courseEntries = Object.entries(entry.courses).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  function getWrittenTotals(assignments: (typeof entry.courses)[string]["assignments"]) {
    let earned = 0, possible = 0;
    for (const a of assignments) {
      if (a.llmGrade?.status === "graded" && a.llmGrade.pointsEarned != null) {
        earned += a.llmGrade.pointsEarned;
        possible += a.llmGrade.pointsPossible!;
      }
    }
    return { earned, possible };
  }

  const totalTokens =
    entry.totals.inputTokens +
    entry.totals.outputTokens +
    entry.totals.cacheCreationTokens +
    entry.totals.cacheReadTokens;

  const timeoutCount = Object.values(entry.courses).flatMap(c => c.assignments).filter(a => a.isTimeout).length;

  return (
    <div className="space-y-8">
      {/* Summary header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          {entry.model.logo && (
            <img
              src={entry.model.logo}
              alt={entry.model.provider}
              width={48}
              height={48}
              className="rounded size-12"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {entry.model.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground">
                {entry.model.provider}
              </span>
              {entry.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs text-muted-foreground"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-4xl font-bold font-mono tabular-nums">
              {formatPercent(entry.scores.overall)}
            </div>
            <div className="text-sm text-muted-foreground font-mono tabular-nums">
              {formatGpa(entry.scores.gpa)} GPA &middot;{" "}
              {entry.scores.overallLetter}
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard
          icon={DollarSign}
          label="Total Cost"
          value={formatCost(entry.totals.costUsd)}
        />
        <StatCard
          icon={Clock}
          label="Total Time"
          value={formatTime(entry.totals.durationMs / 1000)}
          sublabel={entry.totals.durationMs > 0
            ? `${Math.round((entry.totals.durationApiMs / entry.totals.durationMs) * 100)}% API`
            : undefined}
        />
        <StatCard
          icon={FlaskConical}
          label="Tests Passed"
          value={`${entry.totals.testsPassed}/${entry.totals.testsTotal}`}
        />
        <StatCard
          icon={Cpu}
          label="Total Tokens"
          value={formatTokens(totalTokens)}
        />
        <StatCard
          icon={Clock}
          label="API Time"
          value={formatTime(entry.totals.durationApiMs / 1000)}
        />
      </div>
      {timeoutCount > 0 && (
        <div className="text-sm text-[oklch(0.75_0.15_75)]">
          {timeoutCount} assignment{timeoutCount > 1 ? "s" : ""} timed out
        </div>
      )}

      {/* Course breakdown */}
      <section>
        <h2 className="text-xl font-bold tracking-tight mb-4">
          Course Breakdown
        </h2>

        {/* Desktop table */}
        <div className="hidden md:block rounded-lg border">
          <table className="w-full text-base">
            <thead>
              <tr className="text-sm uppercase tracking-wider text-muted-foreground border-b">
                <th className="p-3 pr-4 text-left font-medium">Course</th>
                <th className="p-3 pr-4 text-left font-medium w-32">Tests</th>
                <th className="p-3 pr-4 text-left font-medium w-32">Written</th>
                <th className="p-3 pr-4 text-left font-medium w-40">Score</th>
                <th className="p-3 pr-4 text-right font-medium">Cost</th>
                <th className="p-3 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {courseEntries.map(([courseId, courseData]) => {
                const info = courses[courseId];
                const isOpen = expandedCourse === courseId;

                return (
                  <React.Fragment key={courseId}>
                    <tr
                      className="cursor-pointer border-t border-border/50 hover:bg-muted/30"
                      onClick={() =>
                        setExpandedCourse(isOpen ? null : courseId)
                      }
                    >
                      <td className="p-3 pr-4">
                        <div className="flex items-center gap-2">
                          <ChevronRight
                            className={cn(
                              "size-4 text-muted-foreground transition-transform",
                              isOpen && "rotate-90"
                            )}
                          />
                          <Link
                            href={`/courses/${courseId}`}
                            className="font-medium hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {info?.displayName ?? courseId}
                          </Link>
                          <Link
                            href={`/courses/${courseId}`}
                            className="text-xs text-muted-foreground hidden sm:inline hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {info?.title}
                          </Link>
                          {courseData.letter && (
                            <Badge
                              variant="outline"
                              className="px-1.5 py-0 text-[10px] font-mono"
                            >
                              {courseData.letter}
                            </Badge>
                          )}
                          {courseData.creditHours > 0 && (
                            <Badge variant="outline" className="px-1 py-0 text-[9px] font-mono text-muted-foreground">
                              {courseData.creditHours}cr
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 pr-4 font-mono tabular-nums">
                        {courseData.testsTotal === 0 ? (
                          <span className="text-muted-foreground">N/A</span>
                        ) : (
                          `${courseData.testsPassed}/${courseData.testsTotal}`
                        )}
                      </td>
                      <td className="p-3 pr-4 font-mono tabular-nums">
                        {(() => {
                          const { earned, possible } = getWrittenTotals(courseData.assignments);
                          return possible === 0 ? (
                            <span className="text-muted-foreground">N/A</span>
                          ) : (
                            `${earned}/${possible}`
                          );
                        })()}
                      </td>
                      <td className="p-3 pr-4">
                        <div className="flex items-center gap-2">
                          <PassRateBar
                            rate={courseData.grade}
                            className="w-20"
                          />
                          <span className="font-mono tabular-nums text-xs">
                            {formatPercent(courseData.grade)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 pr-4 text-right font-mono tabular-nums">
                        {formatCost(courseData.totalCost)}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums">
                        {formatTime(courseData.totalTimeSeconds)}
                      </td>
                    </tr>
                    {isOpen &&
                      courseData.assignments.map((a) => {
                        const hasWritten =
                          a.llmGrade?.status === "graded" &&
                          a.llmGrade.pointsEarned != null;
                        const workHref = `/work/${a.id}`;

                        return (
                          <tr
                            key={a.id}
                            className="border-t border-border/30 bg-muted/20 text-xs hover:bg-muted/30"
                          >
                              <td className="py-2 pr-4 pl-10">
                                <Link href={workHref} className="flex items-center gap-1.5 flex-wrap">
                                  <span>{a.displayName}</span>
                                  {a.weight > 1 && (
                                    <Badge variant="outline" className="px-1 py-0 text-[9px] font-mono">
                                      {a.weight}x
                                    </Badge>
                                  )}
                                  {a.isTimeout && (
                                    <Badge variant="outline" className="px-1 py-0 text-[9px] font-mono text-[oklch(0.75_0.15_75)]">
                                      timeout
                                    </Badge>
                                  )}
                                  <span className="text-[10px] text-muted-foreground font-mono ml-1">
                                    {formatTokens(a.tokens)} tokens · {a.steps} turns
                                  </span>
                                </Link>
                              </td>
                              <td className="py-2 pl-3 pr-4 font-mono tabular-nums">
                                <Link href={workHref}>
                                  {a.testsTotal === 0 ? (
                                    <span className="text-muted-foreground">N/A</span>
                                  ) : (
                                    `${a.testsPassed}/${a.testsTotal}`
                                  )}
                                </Link>
                              </td>
                              <td className="py-2 pl-3 pr-4 font-mono tabular-nums">
                                <Link href={workHref}>
                                  {hasWritten ? (
                                    `${a.llmGrade!.pointsEarned}/${a.llmGrade!.pointsPossible}`
                                  ) : (
                                    <span className="text-muted-foreground">N/A</span>
                                  )}
                                </Link>
                              </td>
                              <td className="py-2 pl-3 pr-4">
                                <Link href={workHref} className="flex items-center gap-2">
                                  <PassRateBar
                                    rate={a.score}
                                    className="w-20"
                                  />
                                  <span className="font-mono tabular-nums">
                                    {formatPercent(a.score)}
                                  </span>
                                </Link>
                              </td>
                              <td className="py-2 pl-3 pr-4 text-right font-mono tabular-nums">
                                <Link href={workHref} className="block">
                                  {formatCost(a.cost)}
                                </Link>
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">
                                <Link href={workHref} className="block">
                                  {formatTime(a.timeSeconds)}
                                </Link>
                              </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {courseEntries.map(([courseId, courseData]) => {
            const info = courses[courseId];
            const isOpen = expandedCourse === courseId;

            const { earned: writtenEarned, possible: writtenPossible } = getWrittenTotals(courseData.assignments);

            return (
              <div key={courseId} className="rounded-lg border">
                <div
                  className="cursor-pointer p-3 hover:bg-muted/30"
                  onClick={() =>
                    setExpandedCourse(isOpen ? null : courseId)
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronRight
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform",
                          isOpen && "rotate-90"
                        )}
                      />
                      <Link
                        href={`/courses/${courseId}`}
                        className="font-medium hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {info?.displayName ?? courseId}
                      </Link>
                      {courseData.letter && (
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0 text-[10px] font-mono shrink-0"
                        >
                          {courseData.letter}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PassRateBar rate={courseData.grade} className="w-16" />
                      <span className="font-mono tabular-nums text-xs">
                        {formatPercent(courseData.grade)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 ml-6 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground font-mono tabular-nums">
                    {courseData.testsTotal > 0 && (
                      <span>Tests {courseData.testsPassed}/{courseData.testsTotal}</span>
                    )}
                    {writtenPossible > 0 && (
                      <span>Written {writtenEarned}/{writtenPossible}</span>
                    )}
                    <span>{formatCost(courseData.totalCost)}</span>
                    <span>{formatTime(courseData.totalTimeSeconds)}</span>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t divide-y">
                    {courseData.assignments.map((a) => {
                      const hasWritten =
                        a.llmGrade?.status === "graded" &&
                        a.llmGrade.pointsEarned != null;
                      const workHref = `/work/${a.id}`;

                      return (
                        <Link
                          key={a.id}
                          href={workHref}
                          className="block px-3 py-2 bg-muted/20 hover:bg-muted/30"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              <span className="text-xs truncate">{a.displayName}</span>
                              {a.weight > 1 && (
                                <Badge variant="outline" className="px-1 py-0 text-[9px] font-mono">
                                  {a.weight}x
                                </Badge>
                              )}
                              {a.isTimeout && (
                                <Badge variant="outline" className="px-1 py-0 text-[9px] font-mono text-[oklch(0.75_0.15_75)]">
                                  timeout
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <PassRateBar rate={a.score} className="w-12" />
                              <span className="font-mono tabular-nums text-xs">
                                {formatPercent(a.score)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-muted-foreground font-mono tabular-nums">
                            {a.testsTotal > 0 && (
                              <span>{a.testsPassed}/{a.testsTotal} tests</span>
                            )}
                            {hasWritten && (
                              <span>{a.llmGrade!.pointsEarned}/{a.llmGrade!.pointsPossible} written</span>
                            )}
                            <span>{formatCost(a.cost)}</span>
                            <span>{formatTime(a.timeSeconds)}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
