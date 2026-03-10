import Link from "next/link";
import { notFound } from "next/navigation";
import { getBenchmarkData, getAssignmentBasesForCourse } from "@/lib/data";
import { LanguageBadge } from "@/components/courses/LanguageBadge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ model?: string }>;
}) {
  const { id } = await params;
  const { model: highlightModel } = await searchParams;
  const data = getBenchmarkData();
  const course = data.courses[id];

  if (!course) return notFound();

  // Build per-model leaderboard for this course
  const courseEntries = data.entries
    .filter((e) => e.courses[id])
    .map((e) => {
      const c = e.courses[id];
      return {
        modelId: e.model.id,
        model: e.model.name,
        logo: e.model.logo,
        provider: e.model.provider,
        grade: c.grade,
        letter: c.letter,
        passRate: c.passRate,
        solved: c.assignments.filter((a) => a.score >= 100).length,
        total: c.assignments.length,
        cost: c.totalCost,
      };
    })
    .sort((a, b) => b.grade - a.grade);

  // Build assignment cards with stats across models
  const assignmentBases = getAssignmentBasesForCourse(id);
  const assignmentCards = assignmentBases.map((ab) => {
    const scores: number[] = [];
    let testCount = 0;
    let best = 0;
    let bestModel = "";
    for (const entry of data.entries) {
      const courseResult = entry.courses[id];
      if (!courseResult) continue;
      const assignment = courseResult.assignments.find(
        (a) => a.number === ab.number
      );
      if (!assignment) continue;
      scores.push(assignment.score);
      if (testCount === 0) testCount = assignment.testsTotal;
      if (assignment.score > best) {
        best = assignment.score;
        bestModel = entry.model.name;
      }
    }
    const avg = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
    return { ...ab, testCount, avg, best, bestModel };
  });

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-12 sm:px-6 lg:px-[5%]">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {course.displayName}: {course.title}
        </h1>
        <LanguageBadge language={course.language} hasWritten={course.hasWritten} />
      </div>
      <p className="mt-2 text-lg text-muted-foreground">
        {course.totalAssignments} assignments &middot; {course.totalTests} total
        tests
      </p>

      <section className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight">
          Course Leaderboard
        </h2>

        {/* Desktop table */}
        <div className="mt-4 hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Grade</TableHead>
                <TableHead className="text-right">Pass Rate</TableHead>
                <TableHead className="text-right">Solved</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courseEntries.map((entry, i) => (
                <TableRow key={entry.model} className={cn(highlightModel === entry.modelId && "bg-primary/[0.06]")}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {entry.grade.toFixed(1)}% ({entry.letter})
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {entry.passRate.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {entry.solved}/{entry.total}
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
        <div className="mt-4 divide-y md:hidden">
          {courseEntries.map((entry, i) => (
            <Link
              key={entry.model}
              href={`/models/${entry.modelId}`}
              className={cn("block py-3 first:pt-0 hover:bg-muted/50", highlightModel === entry.modelId && "bg-primary/[0.06]")}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="tabular-nums text-sm font-bold w-5 shrink-0 text-muted-foreground">
                    {i + 1}
                  </span>
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
                </div>
                <span className="tabular-nums text-sm font-semibold shrink-0">
                  {entry.grade.toFixed(1)}%
                  <span className="text-muted-foreground ml-1">
                    ({entry.letter})
                  </span>
                </span>
              </div>
              <div className="mt-1 ml-7 flex gap-4 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  Pass {entry.passRate.toFixed(1)}%
                </span>
                <span className="tabular-nums">
                  {entry.solved}/{entry.total} solved
                </span>
                <span className="tabular-nums">
                  ${entry.cost.toFixed(2)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {assignmentCards.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">Assignments</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {assignmentCards.map((card) => (
              <Link
                key={card.base}
                href={`/courses/${id}/${card.base}${highlightModel ? `?model=${highlightModel}` : ""}`}
                className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent"
              >
                <p className="text-sm font-medium text-muted-foreground">
                  Assignment {card.number}
                </p>
                <h3 className="mt-1 text-lg font-semibold group-hover:text-accent-foreground">
                  {card.displayName}
                </h3>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span>{card.testCount} tests</span>
                  <span>Avg {card.avg.toFixed(0)}%</span>
                  <span>
                    Best {card.best.toFixed(0)}%
                    {card.bestModel && (
                      <span className="text-xs"> ({card.bestModel})</span>
                    )}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
