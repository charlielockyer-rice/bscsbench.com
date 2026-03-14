import { readFileSync, existsSync } from "fs";
import { join } from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getBenchmarkData, getAssignmentBasesForCourse } from "@/lib/data";
import { formatTime } from "@/lib/formatting";
import { highlightCode, highlightMarkdownBlocks, getLangForFile } from "@/lib/shiki";
import type { AssignmentData } from "@/lib/assignment-types";
import { LanguageBadge } from "@/components/courses/LanguageBadge";
import { cn } from "@/lib/utils";
import { SolutionViewer } from "@/components/work/SolutionViewer";
import { MarkdownWithToc } from "@/components/work/MarkdownWithToc";
import { WorkTabs } from "@/components/work/WorkTabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; assignmentBase: string }>;
  searchParams: Promise<{ model?: string }>;
}) {
  const { id, assignmentBase } = await params;
  const { model: highlightModel } = await searchParams;
  const data = getBenchmarkData();
  const course = data.courses[id];

  if (!course) return notFound();

  // Validate that this assignment belongs to this course
  const assignmentBases = getAssignmentBasesForCourse(id);
  const assignmentInfo = assignmentBases.find((a) => a.base === assignmentBase);
  if (!assignmentInfo) return notFound();

  // Load assignment data
  const assignmentPath = join(process.cwd(), "public", "assignments", assignmentBase + ".json");
  if (!existsSync(assignmentPath)) return notFound();

  const assignmentData = JSON.parse(
    readFileSync(assignmentPath, "utf-8")
  ) as AssignmentData;

  // Build per-model leaderboard for this assignment
  const assignmentEntries = data.entries
    .flatMap((e) => {
      const courseResult = e.courses[id];
      if (!courseResult) return [];
      const a = courseResult.assignments.find((a) => a.number === assignmentInfo.number);
      if (!a) return [];
      return [{
        modelId: e.model.id,
        model: e.model.name,
        logo: e.model.logo,
        provider: e.model.provider,
        workspaceId: a.id,
        score: a.score,
        codePct: a.codePct,
        writtenPct: a.writtenPct,
        reviewPct: a.reviewPct,
        testsPassed: a.testsPassed,
        testsTotal: a.testsTotal,
        cost: a.cost,
        timeSeconds: a.timeSeconds,
      }];
    })
    .sort((a, b) => b.score - a.score);

  // Determine which dimension columns have at least one non-null value
  const hasCodeCol = assignmentEntries.some((e) => e.codePct !== null);
  const hasWrittenCol = assignmentEntries.some((e) => e.writtenPct !== null);
  const hasReviewCol = assignmentEntries.some((e) => e.reviewPct !== null);

  // Pre-highlight code blocks in instructions markdown
  const highlightedBlocks = assignmentData.instructions
    ? await highlightMarkdownBlocks(assignmentData.instructions)
    : undefined;

  // Highlight provided files
  const highlightedProvided = assignmentData.providedFiles.length > 0
    ? await Promise.all(
        assignmentData.providedFiles.map(async (file) => {
          const lang = getLangForFile(file.filename);
          return {
            path: file.path,
            filename: file.filename,
            language: lang,
            highlightedHtml: await highlightCode(file.content, lang),
            sizeBytes: Buffer.byteLength(file.content, "utf-8"),
            truncated: false,
          };
        })
      )
    : [];

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-12 sm:px-6 lg:px-[5%]">
      <Link
        href={`/courses/${id}${highlightModel ? `?model=${highlightModel}` : ""}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="size-4" />
        Back to {course.displayName}
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {assignmentInfo.displayName}
          </h1>
          <LanguageBadge language={course.language} hasWritten={course.hasWritten} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {course.displayName}: {course.title} &middot; Assignment {assignmentInfo.number}
        </p>
      </div>

      <WorkTabs
        initialTab={highlightModel ? "leaderboard" : undefined}
        tabs={[
          {
            id: "instructions",
            label: "Instructions",
            disabled: !assignmentData.instructions,
            content: assignmentData.instructions ? (
              <MarkdownWithToc
                text={assignmentData.instructions}
                highlightedBlocks={highlightedBlocks}
              />
            ) : null,
          },
          {
            id: "provided",
            label: "Provided Files",
            disabled: highlightedProvided.length === 0,
            content: highlightedProvided.length > 0 ? (
              <SolutionViewer files={highlightedProvided} />
            ) : null,
          },
          {
            id: "leaderboard",
            label: "Leaderboard",
            disabled: assignmentEntries.length === 0,
            content: (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        {hasCodeCol && <TableHead className="text-right">Code</TableHead>}
                        {hasWrittenCol && <TableHead className="text-right">Written</TableHead>}
                        {hasReviewCol && <TableHead className="text-right">Review</TableHead>}
                        <TableHead className="text-right">Tests</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignmentEntries.map((entry, i) => (
                        <TableRow key={entry.model} className={cn(highlightModel === entry.modelId && "bg-primary/[0.06]")}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/models/${entry.modelId}`}
                                className="flex items-center gap-2 hover:underline"
                              >
                                {entry.logo ? (
                                  <img
                                    src={entry.logo}
                                    alt={entry.provider}
                                    width={20}
                                    height={20}
                                    className="rounded size-5"
                                  />
                                ) : (
                                  <span className="size-5 rounded bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                                    {entry.provider.charAt(0)}
                                  </span>
                                )}
                                <span className="font-medium">{entry.model}</span>
                              </Link>
                              <Link
                                href={`/work/${entry.workspaceId}`}
                                className="text-muted-foreground hover:text-foreground"
                                title="View work"
                              >
                                <ExternalLink className="size-3.5" />
                              </Link>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {entry.score.toFixed(1)}%
                          </TableCell>
                          {hasCodeCol && (
                            <TableCell className="text-right tabular-nums">
                              {entry.codePct !== null ? (
                                `${entry.codePct.toFixed(1)}%`
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                          )}
                          {hasWrittenCol && (
                            <TableCell className="text-right tabular-nums">
                              {entry.writtenPct !== null ? (
                                `${entry.writtenPct.toFixed(1)}%`
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                          )}
                          {hasReviewCol && (
                            <TableCell className="text-right tabular-nums">
                              {entry.reviewPct !== null ? (
                                `${entry.reviewPct.toFixed(1)}%`
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-right tabular-nums">
                            {entry.testsPassed}/{entry.testsTotal}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatTime(entry.timeSeconds)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            ${entry.cost.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="divide-y md:hidden">
                  {assignmentEntries.map((entry, i) => (
                    <div key={entry.model} className={cn("py-3 first:pt-0", highlightModel === entry.modelId && "bg-primary/[0.06]")}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="tabular-nums text-sm font-bold w-5 shrink-0 text-muted-foreground">
                            {i + 1}
                          </span>
                          <Link
                            href={`/models/${entry.modelId}`}
                            className="flex items-center gap-2 min-w-0 hover:underline"
                          >
                            {entry.logo ? (
                              <img
                                src={entry.logo}
                                alt={entry.provider}
                                width={20}
                                height={20}
                                className="rounded size-5 shrink-0"
                              />
                            ) : (
                              <span className="size-5 shrink-0 rounded bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                                {entry.provider.charAt(0)}
                              </span>
                            )}
                            <span className="font-medium text-sm truncate">
                              {entry.model}
                            </span>
                          </Link>
                          <Link
                            href={`/work/${entry.workspaceId}`}
                            className="text-muted-foreground hover:text-foreground shrink-0"
                            title="View work"
                          >
                            <ExternalLink className="size-3.5" />
                          </Link>
                        </div>
                        <span className="tabular-nums text-sm font-semibold shrink-0">
                          {entry.score.toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-1 ml-7 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="tabular-nums">
                          {entry.testsPassed}/{entry.testsTotal} tests
                        </span>
                        {entry.codePct !== null && (
                          <span className="tabular-nums">
                            Code {entry.codePct.toFixed(1)}%
                          </span>
                        )}
                        {entry.writtenPct !== null && (
                          <span className="tabular-nums">
                            Written {entry.writtenPct.toFixed(1)}%
                          </span>
                        )}
                        {entry.reviewPct !== null && (
                          <span className="tabular-nums">
                            Review {entry.reviewPct.toFixed(1)}%
                          </span>
                        )}
                        <span className="tabular-nums">
                          {entry.timeSeconds < 60
                            ? `${entry.timeSeconds.toFixed(0)}s`
                            : `${(entry.timeSeconds / 60).toFixed(1)}m`}
                        </span>
                        <span className="tabular-nums">
                          ${entry.cost.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
