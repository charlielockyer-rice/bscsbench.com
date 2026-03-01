import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEntryByModelId, getBenchmarkData } from "@/lib/data";
import { ModelDetail } from "@/components/models/ModelDetail";

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = getEntryByModelId(id);

  if (!entry) return notFound();

  const { courses } = getBenchmarkData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="size-4" />
        Back to leaderboard
      </Link>
      <ModelDetail entry={entry} courses={courses} />
    </div>
  );
}
