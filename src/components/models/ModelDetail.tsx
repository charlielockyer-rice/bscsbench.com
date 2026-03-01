"use client";

import React, { useState } from "react";
import {
  ChevronRight,
  Check,
  X,
  DollarSign,
  Clock,
  FlaskConical,
  Cpu,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import type { BenchmarkEntry, CourseInfo, TestResult } from "@/lib/types";
import {
  formatCost,
  formatTime,
  formatPercent,
  formatTokens,
  formatGpa,
} from "@/lib/formatting";
import { PassRateBar, rateColor } from "@/components/leaderboard/PassRateBar";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/utils";

function TestResultRows({ tests }: { tests: TestResult[] }) {
  return (
    <>
      {tests.map((t) => (
        <tr
          key={t.name}
          className="border-t border-border/20 bg-muted/10 text-[11px]"
        >
          <td className="py-1.5 pr-4 pl-14" colSpan={4}>
            <div className="flex items-center gap-1.5">
              {t.status === "pass" ? (
                <Check className="size-3 text-[oklch(0.72_0.19_142)]" />
              ) : (
                <X className="size-3 text-[oklch(0.63_0.21_25)]" />
              )}
              <span className="font-mono">{t.name}</span>
              {t.inputDescription && (
                <span className="text-muted-foreground ml-1">
                  ({t.inputDescription})
                </span>
              )}
            </div>
            {t.status === "fail" && t.errorMessage && (
              <div className="mt-0.5 pl-[18px] text-[oklch(0.63_0.21_25)] font-mono break-all">
                {t.errorMessage}
              </div>
            )}
          </td>
          <td className="py-1.5 pr-4 text-right font-mono tabular-nums text-muted-foreground">
            {t.pointsEarned}/{t.pointsPossible}
          </td>
          <td className="py-1.5 text-right font-mono tabular-nums text-muted-foreground">
            {t.executionTimeMs < 1
              ? `${t.executionTimeMs.toFixed(3)}ms`
              : `${t.executionTimeMs.toFixed(1)}ms`}
          </td>
        </tr>
      ))}
    </>
  );
}

export function ModelDetail({
  entry,
  courses,
}: {
  entry: BenchmarkEntry;
  courses: Record<string, CourseInfo>;
}) {
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(
    null
  );

  const courseEntries = Object.entries(entry.courses).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  const totalTokens =
    entry.totals.inputTokens +
    entry.totals.outputTokens +
    entry.totals.cacheCreationTokens +
    entry.totals.cacheReadTokens;

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Total Cost"
          value={formatCost(entry.totals.costUsd)}
        />
        <StatCard
          icon={Clock}
          label="Total Time"
          value={formatTime(entry.totals.durationMs / 1000)}
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
      </div>

      {/* Course breakdown */}
      <section>
        <h2 className="text-xl font-bold tracking-tight mb-4">
          Course Breakdown
        </h2>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b">
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
                      onClick={() => {
                        setExpandedCourse(isOpen ? null : courseId);
                        setExpandedAssignment(null);
                      }}
                    >
                      <td className="p-3 pr-4">
                        <div className="flex items-center gap-2">
                          <ChevronRight
                            className={cn(
                              "size-4 text-muted-foreground transition-transform",
                              isOpen && "rotate-90"
                            )}
                          />
                          <span className="font-medium">
                            {info?.displayName ?? courseId}
                          </span>
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {info?.title}
                          </span>
                          {courseData.letter && (
                            <Badge
                              variant="outline"
                              className="px-1.5 py-0 text-[10px] font-mono"
                            >
                              {courseData.letter}
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
                          let earned = 0, possible = 0;
                          for (const a of courseData.assignments) {
                            if (a.llmGrade?.status === "graded" && a.llmGrade.pointsEarned != null) {
                              earned += a.llmGrade.pointsEarned;
                              possible += a.llmGrade.pointsPossible!;
                            }
                          }
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
                        const hasTests =
                          a.testResults && a.testResults.length > 0;
                        const hasWritten =
                          a.llmGrade?.status === "graded" &&
                          a.llmGrade.pointsEarned != null;
                        const hasFeedback =
                          hasWritten && !!a.llmGrade!.feedback;
                        const isExpandable = hasTests || hasFeedback;
                        const isAssignmentOpen = expandedAssignment === a.id;

                        return (
                          <React.Fragment key={a.id}>
                            <tr
                              className={cn(
                                "border-t border-border/30 bg-muted/20 text-xs",
                                isExpandable &&
                                  "cursor-pointer hover:bg-muted/30"
                              )}
                              onClick={
                                isExpandable
                                  ? (e) => {
                                      e.stopPropagation();
                                      setExpandedAssignment(
                                        isAssignmentOpen ? null : a.id
                                      );
                                    }
                                  : undefined
                              }
                            >
                              <td className="py-2 pr-4 pl-10">
                                <div className="flex items-center gap-1.5">
                                  {isExpandable && (
                                    <ChevronRight
                                      className={cn(
                                        "size-3 text-muted-foreground transition-transform",
                                        isAssignmentOpen && "rotate-90"
                                      )}
                                    />
                                  )}
                                  <span>{a.displayName}</span>
                                  <Link
                                    href={`/work/${a.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
                                    title="View agent trace"
                                  >
                                    <ScrollText className="size-3" />
                                  </Link>
                                </div>
                              </td>
                              <td className="py-2 pl-3 pr-4 font-mono tabular-nums">
                                {a.testsTotal === 0 ? (
                                  <span className="text-muted-foreground">N/A</span>
                                ) : (
                                  `${a.testsPassed}/${a.testsTotal}`
                                )}
                              </td>
                              <td className="py-2 pl-3 pr-4 font-mono tabular-nums">
                                {hasWritten ? (
                                  `${a.llmGrade!.pointsEarned}/${a.llmGrade!.pointsPossible}`
                                ) : (
                                  <span className="text-muted-foreground">N/A</span>
                                )}
                              </td>
                              <td className="py-2 pl-3 pr-4">
                                <div className="flex items-center gap-2">
                                  <PassRateBar
                                    rate={a.score}
                                    className="w-20"
                                  />
                                  <span className="font-mono tabular-nums">
                                    {formatPercent(a.score)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 pl-3 pr-4 text-right font-mono tabular-nums">
                                {formatCost(a.cost)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">
                                {formatTime(a.timeSeconds)}
                              </td>
                            </tr>
                            {isAssignmentOpen && a.testResults && (
                              <TestResultRows tests={a.testResults} />
                            )}
                            {isAssignmentOpen && hasFeedback && (
                              <tr className="border-t border-border/20 bg-muted/10">
                                <td colSpan={6} className="py-2 px-10">
                                  <div className="text-[11px] font-mono whitespace-pre-wrap text-muted-foreground leading-relaxed">
                                    {a.llmGrade!.feedback}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
