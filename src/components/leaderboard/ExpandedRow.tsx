"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { BenchmarkEntry, CourseInfo } from "@/lib/types";
import { formatCost, formatTime, formatPercent } from "@/lib/formatting";
import { PassRateBar } from "./PassRateBar";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function ExpandedRow({
  entry,
  courses,
}: {
  entry: BenchmarkEntry;
  courses: Record<string, CourseInfo>;
}) {
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

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
            <th className="pb-2 pr-4 text-left font-medium w-32">Pass Rate</th>
            <th className="pb-2 pr-4 text-right font-medium">Cost</th>
            <th className="pb-2 text-right font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {courseEntries.map(([courseId, courseData]) => {
            const info = courses[courseId];
            const isOpen = expandedCourse === courseId;

            return (
              <Collapsible
                key={courseId}
                asChild
                open={isOpen}
                onOpenChange={(open) =>
                  setExpandedCourse(open ? courseId : null)
                }
              >
                <>
                  <CollapsibleTrigger asChild>
                    <tr className="cursor-pointer border-t border-border/50 hover:bg-muted/30">
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
                  </CollapsibleTrigger>
                  <CollapsibleContent asChild>
                    <>
                      {courseData.assignments.map((a) => (
                        <tr
                          key={a.name}
                          className="border-t border-border/30 bg-muted/20 text-xs"
                        >
                          <td className="py-1.5 pr-4 pl-9">
                            <div className="flex items-center gap-1.5">
                              <span>{a.name}</span>
                              {a.llmGraded && (
                                <Badge
                                  variant="secondary"
                                  className="px-1 py-0 text-[10px]"
                                >
                                  LLM
                                </Badge>
                              )}
                              {a.performanceIndex != null && (
                                <Badge
                                  variant="outline"
                                  className="px-1 py-0 text-[10px] font-mono tabular-nums"
                                >
                                  perf: {a.performanceIndex}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-1.5 pr-4 font-mono tabular-nums">
                            {a.testsPassed}/{a.testsTotal}
                          </td>
                          <td className="py-1.5 pr-4">
                            <div className="flex items-center gap-2">
                              <PassRateBar
                                rate={a.passRate}
                                className="w-16"
                              />
                              <span className="font-mono tabular-nums">
                                {formatPercent(a.passRate)}
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
                      ))}
                    </>
                  </CollapsibleContent>
                </>
              </Collapsible>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
