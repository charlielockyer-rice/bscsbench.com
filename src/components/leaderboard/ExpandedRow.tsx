"use client";

import React, { useState } from "react";
import { ChevronRight, Check, X, PenLine } from "lucide-react";
import type { BenchmarkEntry, CourseInfo, TestResult } from "@/lib/types";
import { formatCost, formatTime, formatPercent } from "@/lib/formatting";
import { PassRateBar } from "./PassRateBar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function TestResultRows({ tests }: { tests: TestResult[] }) {
  return (
    <>
      {tests.map((t) => (
        <tr
          key={t.name}
          className="border-t border-border/20 bg-muted/10 text-[11px]"
        >
          <td className="py-1 pr-4 pl-14" colSpan={3}>
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
          <td className="py-1 pr-4 text-right font-mono tabular-nums text-muted-foreground">
            {t.pointsEarned}/{t.pointsPossible}
          </td>
          <td className="py-1 text-right font-mono tabular-nums text-muted-foreground">
            {t.executionTimeMs < 1
              ? `${t.executionTimeMs.toFixed(3)}ms`
              : `${t.executionTimeMs.toFixed(1)}ms`}
          </td>
        </tr>
      ))}
    </>
  );
}

export function ExpandedRow({
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

  const courseEntries = Object.entries(entry.courses).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  return (
    <div className="px-4 py-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-muted-foreground">
            <th className="pb-2 pr-4 text-left font-medium">Course</th>
            <th className="pb-2 pr-4 text-left font-medium">Tests</th>
            <th className="pb-2 pr-4 text-left font-medium w-32">Score</th>
            <th className="pb-2 pr-4 text-right font-medium">Cost</th>
            <th className="pb-2 text-right font-medium">Time</th>
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
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <ChevronRight
                        className={cn(
                          "size-3.5 text-muted-foreground transition-transform",
                          isOpen && "rotate-90"
                        )}
                      />
                      <span className="font-medium">
                        {info?.displayName ?? courseId}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {info?.title}
                      </span>
                      {courseData.letter && (
                        <Badge
                          variant="outline"
                          className="px-1 py-0 text-[10px] font-mono"
                        >
                          {courseData.letter}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-4 font-mono tabular-nums">
                    {courseData.testsPassed}/{courseData.testsTotal}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <PassRateBar
                        rate={courseData.passRate}
                        className="w-16"
                      />
                      <span className="font-mono tabular-nums text-xs">
                        {formatPercent(courseData.passRate)}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-right font-mono tabular-nums">
                    {formatCost(courseData.totalCost)}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">
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
                          <td className="py-1.5 pr-4 pl-9">
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
                            </div>
                          </td>
                          <td className="py-1.5 pr-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono tabular-nums">
                                {a.testsPassed}/{a.testsTotal}
                              </span>
                              {hasWritten && (
                                <span className="flex items-center gap-1 text-muted-foreground font-mono tabular-nums">
                                  <PenLine className="size-2.5" />
                                  {a.llmGrade!.pointsEarned}/{a.llmGrade!.pointsPossible} written
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-1.5 pr-4">
                            <div className="flex items-center gap-2">
                              <PassRateBar
                                rate={a.score}
                                className="w-16"
                              />
                              <span className="font-mono tabular-nums">
                                {formatPercent(a.score)}
                              </span>
                            </div>
                          </td>
                          <td className="py-1.5 pr-4 text-right font-mono tabular-nums">
                            {formatCost(a.cost)}
                          </td>
                          <td className="py-1.5 text-right font-mono tabular-nums">
                            {formatTime(a.timeSeconds)}
                          </td>
                        </tr>
                        {isAssignmentOpen && a.testResults && (
                          <TestResultRows tests={a.testResults} />
                        )}
                        {isAssignmentOpen && hasFeedback && (
                          <tr className="border-t border-border/20 bg-muted/10">
                            <td colSpan={5} className="py-2 px-9">
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
  );
}
