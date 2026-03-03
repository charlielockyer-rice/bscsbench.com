import { readFile } from "fs/promises";
import { join } from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEntryByWorkspaceId, getAssignmentBase, getBenchmarkData } from "@/lib/data";
import { highlightCode, highlightMarkdownBlocks, getLangForFile } from "@/lib/shiki";
import type { SolutionData } from "@/lib/solution-types";
import type { ProcessedTrace, TraceSummary, TraceMetadata } from "@/lib/trace-types";
import type { AgentMeta } from "@/lib/agent-meta-types";
import type { AssignmentData } from "@/lib/assignment-types";
import { SolutionViewer } from "@/components/work/SolutionViewer";
import { WriteupSection } from "@/components/work/WriteupSection";
import { GraderReview } from "@/components/work/GraderReview";
import { TraceViewer } from "@/components/traces/TraceViewer";
import { StatsCards } from "@/components/work/StatsCards";
import { ModelUsageTable } from "@/components/work/ModelUsageTable";
import { WorkTabs } from "@/components/work/WorkTabs";
import { MarkdownWithToc } from "@/components/work/MarkdownWithToc";

import { WRITEUP_LANGUAGES } from "@/lib/solution-types";

export default async function WorkPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const context = getEntryByWorkspaceId(workspaceId);

  if (!context) return notFound();

  const assignmentBase = getAssignmentBase(workspaceId);
  const base = join(process.cwd(), "public");

  const [solutionRaw, traceRaw, agentMetaRaw, assignmentRaw] = await Promise.all([
    readFile(join(base, "solutions", workspaceId + ".json"), "utf-8").catch(() => null),
    readFile(join(base, "traces", workspaceId + ".json"), "utf-8").catch(() => null),
    readFile(join(base, "agent-meta", workspaceId + ".json"), "utf-8").catch(() => null),
    readFile(join(base, "assignments", assignmentBase + ".json"), "utf-8").catch(() => null),
  ]);

  const solution = solutionRaw ? (JSON.parse(solutionRaw) as SolutionData) : null;
  const trace = traceRaw ? (JSON.parse(traceRaw) as ProcessedTrace) : null;
  const traceSummary: TraceSummary | null = trace?.summary ?? null;
  const traceMetadata: TraceMetadata | null = trace?.metadata ?? null;
  const agentMeta = agentMetaRaw ? (JSON.parse(agentMetaRaw) as AgentMeta) : null;
  const assignmentData = assignmentRaw ? (JSON.parse(assignmentRaw) as AssignmentData) : null;

  const assignment = context.assignment;

  // Separate code files from writeup-only files
  const codeFiles = solution?.files.filter(
    (f) => !WRITEUP_LANGUAGES.has(f.language.toLowerCase())
  ) ?? [];

  const highlightedFiles = codeFiles.length > 0
    ? await Promise.all(
        codeFiles.map(async (file) => ({
          path: file.path,
          filename: file.filename,
          language: file.language,
          highlightedHtml: await highlightCode(file.content, file.language),
          sizeBytes: file.sizeBytes,
          truncated: file.truncated,
        }))
      )
    : [];

  // Split diff into per-file chunks and highlight each
  const diffChunks: { filePath: string; highlightedHtml: string }[] = [];
  if (solution?.diff) {
    const parts = solution.diff.split(/^(?=diff --git )/m).filter(Boolean);
    for (const part of parts) {
      const headerMatch = part.match(/^diff --git a\/(.+?) b\/(.+)/);
      const filePath = headerMatch?.[2] ?? "unknown";
      const html = await highlightCode(part, "diff");
      diffChunks.push({ filePath, highlightedHtml: html });
    }
  }

  // Highlight provided files
  const highlightedProvided = assignmentData?.providedFiles.length
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

  // Pre-highlight code blocks in instructions markdown
  const instructionBlocks = assignmentData?.instructions
    ? await highlightMarkdownBlocks(assignmentData.instructions)
    : undefined;

  // Pre-highlight code blocks in writeup markdown
  const writeupBlocks = solution?.writeup?.format === "md"
    ? await highlightMarkdownBlocks(solution.writeup.content)
    : undefined;

  // Look up course display name for the subtitle
  const benchData = getBenchmarkData();
  let courseDisplayName: string | undefined;
  const entry = benchData.entries.find((e) => e.model.id === context.modelId);
  if (entry) {
    for (const course of Object.values(entry.courses)) {
      if (course.assignments.some((a) => a.id === workspaceId)) {
        const courseInfo = benchData.courses[course.courseId];
        if (courseInfo) {
          courseDisplayName = `${courseInfo.displayName}: ${courseInfo.title}`;
        }
        break;
      }
    }
  }

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-12 sm:px-6 lg:px-[5%]">
      <Link
        href={`/models/${context.modelId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="size-4" />
        Back to {context.modelName}
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Agent Work: {context.assignmentName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {context.modelName}
          {courseDisplayName && <> &middot; {courseDisplayName}</>}
        </p>
      </div>

      <WorkTabs
        tabs={[
          {
            id: "instructions",
            label: "Instructions",
            disabled: !assignmentData?.instructions,
            content: assignmentData?.instructions ? (
              <MarkdownWithToc
                text={assignmentData.instructions}
                highlightedBlocks={instructionBlocks}
              />
            ) : null,
          },
          {
            id: "provided",
            label: "Provided Files",
            disabled: !highlightedProvided.length,
            content: highlightedProvided.length > 0 ? (
              <SolutionViewer files={highlightedProvided} />
            ) : null,
          },
          {
            id: "solution",
            label: "Solution",
            disabled: !highlightedFiles.length && !solution?.writeup,
            content: highlightedFiles.length > 0 ? (
              <SolutionViewer files={highlightedFiles} />
            ) : solution?.writeup ? (
              <WriteupSection writeup={solution.writeup} highlightedBlocks={writeupBlocks} />
            ) : null,
          },
          {
            id: "writeup",
            label: "Writeup",
            disabled: !solution?.writeup || !highlightedFiles.length,
            content: <WriteupSection writeup={solution?.writeup ?? null} highlightedBlocks={writeupBlocks} />,
          },
          {
            id: "review",
            label: "Review",
            disabled: !solution?.graderReview,
            content: <GraderReview graderReview={solution?.graderReview ?? null} />,
          },
          {
            id: "diff",
            label: "Diff",
            disabled: diffChunks.length === 0,
            content: diffChunks.length > 0 ? (
              <div className="space-y-4">
                {diffChunks.map((chunk, i) => (
                  <div key={i} className="diff-viewer rounded-lg border bg-card overflow-hidden">
                    <div className="px-4 py-2 border-b bg-muted/30 text-xs font-mono text-muted-foreground">
                      {chunk.filePath}
                    </div>
                    <div
                      className="text-sm [&_pre]:!bg-transparent [&_pre]:!py-3 [&_code]:text-xs overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: chunk.highlightedHtml }}
                    />
                  </div>
                ))}
              </div>
            ) : null,
          },
          {
            id: "trace",
            label: "Agent Trace",
            content: <TraceViewer workspaceId={workspaceId} />,
          },
          {
            id: "stats",
            label: "Stats",
            content: (
              <div className="space-y-4">
                <StatsCards
                  summary={traceSummary}
                  assignment={assignment}
                  agentMeta={agentMeta}
                  traceMetadata={traceMetadata}
                />
                {agentMeta && agentMeta.modelUsage.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold tracking-tight mb-2">
                      Sub-Model Usage
                    </h3>
                    <ModelUsageTable usage={agentMeta.modelUsage} />
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
