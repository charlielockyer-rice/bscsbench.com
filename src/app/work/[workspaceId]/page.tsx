import { readFileSync, existsSync } from "fs";
import { join } from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEntryByWorkspaceId } from "@/lib/data";
import { highlightCode } from "@/lib/shiki";
import type { SolutionData } from "@/lib/solution-types";
import type { ProcessedTrace, TraceSummary, TraceMetadata } from "@/lib/trace-types";
import type { AgentMeta } from "@/lib/agent-meta-types";
import { SolutionViewer } from "@/components/work/SolutionViewer";
import { WriteupSection } from "@/components/work/WriteupSection";
import { GraderReview } from "@/components/work/GraderReview";
import { TraceViewer } from "@/components/traces/TraceViewer";
import { StatsCards } from "@/components/work/StatsCards";
import { ModelUsageTable } from "@/components/work/ModelUsageTable";
import { WorkTabs } from "@/components/work/WorkTabs";

export default async function WorkPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const context = getEntryByWorkspaceId(workspaceId);

  if (!context) return notFound();

  const solutionPath = join(
    process.cwd(),
    "public",
    "solutions",
    workspaceId + ".json"
  );

  let solution: SolutionData | null = null;
  if (existsSync(solutionPath)) {
    solution = JSON.parse(readFileSync(solutionPath, "utf-8")) as SolutionData;
  }

  const tracePath = join(process.cwd(), "public", "traces", workspaceId + ".json");
  let traceSummary: TraceSummary | null = null;
  let traceMetadata: TraceMetadata | null = null;
  if (existsSync(tracePath)) {
    const trace = JSON.parse(readFileSync(tracePath, "utf-8")) as ProcessedTrace;
    traceSummary = trace.summary;
    traceMetadata = trace.metadata;
  }

  const agentMetaPath = join(process.cwd(), "public", "agent-meta", workspaceId + ".json");
  let agentMeta: AgentMeta | null = null;
  if (existsSync(agentMetaPath)) {
    agentMeta = JSON.parse(readFileSync(agentMetaPath, "utf-8")) as AgentMeta;
  }

  const assignment = context.assignment;

  const highlightedFiles = solution
    ? await Promise.all(
        solution.files.map(async (file) => ({
          path: file.path,
          filename: file.filename,
          language: file.language,
          highlightedHtml: await highlightCode(file.content, file.language),
          sizeBytes: file.sizeBytes,
          truncated: file.truncated,
        }))
      )
    : [];

  const highlightedDiff = solution?.diff
    ? await highlightCode(solution.diff, "diff")
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
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
          {context.modelName} &middot; {workspaceId}
        </p>
      </div>

      <WorkTabs
        tabs={[
          {
            id: "solution",
            label: "Solution",
            disabled: !highlightedFiles.length,
            content: highlightedFiles.length > 0 ? (
              <SolutionViewer files={highlightedFiles} />
            ) : null,
          },
          {
            id: "diff",
            label: "Diff",
            disabled: !highlightedDiff,
            content: highlightedDiff ? (
              <div className="diff-viewer rounded-lg border bg-card overflow-x-auto">
                <div
                  className="text-sm [&_pre]:!bg-transparent [&_pre]:!py-3 [&_code]:text-xs"
                  dangerouslySetInnerHTML={{ __html: highlightedDiff }}
                />
              </div>
            ) : null,
          },
          {
            id: "writeup",
            label: "Writeup",
            disabled: !solution?.writeup,
            content: <WriteupSection writeup={solution?.writeup ?? null} />,
          },
          {
            id: "trace",
            label: "Agent Trace",
            content: <TraceViewer workspaceId={workspaceId} />,
          },
          {
            id: "review",
            label: "Review",
            disabled: !solution?.graderReview,
            content: <GraderReview graderReview={solution?.graderReview ?? null} />,
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
