import { notFound } from "next/navigation";
import { getBenchmarkData } from "@/lib/data";
import { LanguageBadge } from "@/components/courses/LanguageBadge";
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = getBenchmarkData();
  const course = data.courses[id];

  if (!course) return notFound();

  // Build per-model leaderboard for this course
  const courseEntries = data.entries
    .filter((e) => e.courses[id])
    .map((e) => {
      const c = e.courses[id];
      return {
        model: e.model.name,
        grade: c.grade,
        letter: c.letter,
        passRate: c.passRate,
        solved: c.assignments.filter((a) => a.score >= 100).length,
        total: c.assignments.length,
        cost: c.totalCost,
      };
    })
    .sort((a, b) => b.grade - a.grade);

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-12 sm:px-6 lg:px-[5%]">
      <div className="flex items-center gap-4">
        <h1 className="text-4xl font-bold tracking-tight">
          {course.displayName}: {course.title}
        </h1>
        <LanguageBadge language={course.language} />
      </div>
      <p className="mt-2 text-lg text-muted-foreground">
        {course.totalAssignments} assignments &middot; {course.totalTests} total
        tests
      </p>

      <section className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight">
          Course Leaderboard
        </h2>
        <div className="mt-4">
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
                <TableRow key={entry.model}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{entry.model}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {entry.grade.toFixed(1)}% ({entry.letter})
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {entry.passRate.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {entry.solved}/{entry.total}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    ${entry.cost.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
