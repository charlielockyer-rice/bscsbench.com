import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEntryByWorkspaceId } from "@/lib/data";
import { TraceViewer } from "@/components/traces/TraceViewer";

export default async function TracePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const context = getEntryByWorkspaceId(workspaceId);

  if (!context) return notFound();

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
          Agent Trace: {context.assignmentName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {context.modelName} &middot; {workspaceId}
        </p>
      </div>
      <TraceViewer
        workspaceId={workspaceId}
        modelName={context.modelName}
      />
    </div>
  );
}
