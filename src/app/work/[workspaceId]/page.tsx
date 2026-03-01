import { readFileSync, existsSync } from "fs";
import { join } from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEntryByWorkspaceId } from "@/lib/data";
import { highlightCode } from "@/lib/shiki";
import type { SolutionData } from "@/lib/solution-types";
import type { ProcessedTrace, TraceSummary } from "@/lib/trace-types";
import { SectionNav } from "@/components/work/SectionNav";
import { SolutionViewer } from "@/components/work/SolutionViewer";
import { WriteupSection } from "@/components/work/WriteupSection";
import { GraderReview } from "@/components/work/GraderReview";
import { TraceViewer } from "@/components/traces/TraceViewer";
import { StatsCards } from "@/components/work/StatsCards";

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
  if (existsSync(tracePath)) {
    const trace = JSON.parse(readFileSync(tracePath, "utf-8")) as ProcessedTrace;
    traceSummary = trace.summary;
  }

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

      <SectionNav
        sections={[
          { id: "solution", label: "Solution" },
          { id: "writeup", label: "Writeup" },
          { id: "trace", label: "Agent Trace" },
          { id: "review", label: "Review" },
          { id: "stats", label: "Stats" },
        ]}
      />

      {solution ? (
        <>
          <section id="solution" className="space-y-4 pt-8 scroll-mt-16">
            <h2 className="text-lg font-semibold tracking-tight mb-4">
              Solution Code
            </h2>
            {highlightedFiles.length > 0 ? (
              <SolutionViewer files={highlightedFiles} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No solution files
              </p>
            )}
          </section>

          <section id="writeup" className="space-y-4 pt-8 scroll-mt-16">
            <h2 className="text-lg font-semibold tracking-tight mb-4">
              Writeup
            </h2>
            <WriteupSection writeup={solution.writeup} />
          </section>
        </>
      ) : (
        <>
          <section id="solution" className="space-y-4 pt-8 scroll-mt-16">
            <h2 className="text-lg font-semibold tracking-tight mb-4">
              Solution Code
            </h2>
            <p className="text-sm text-muted-foreground">
              No solution data available
            </p>
          </section>

          <section id="writeup" className="space-y-4 pt-8 scroll-mt-16">
            <h2 className="text-lg font-semibold tracking-tight mb-4">
              Writeup
            </h2>
            <p className="text-sm text-muted-foreground">
              No solution data available
            </p>
          </section>
        </>
      )}

      <section id="trace" className="space-y-4 pt-8 scroll-mt-16">
        <h2 className="text-lg font-semibold tracking-tight mb-4">
          Agent Trace
        </h2>
        <TraceViewer workspaceId={workspaceId} />
      </section>

      <section id="review" className="space-y-4 pt-8 scroll-mt-16">
        <h2 className="text-lg font-semibold tracking-tight mb-4">
          Grader Review
        </h2>
        <GraderReview graderReview={solution?.graderReview ?? null} />
      </section>

      <section id="stats" className="space-y-4 pt-8 scroll-mt-16">
        <h2 className="text-lg font-semibold tracking-tight mb-4">
          Stats
        </h2>
        <StatsCards summary={traceSummary} />
      </section>
    </div>
  );
}
