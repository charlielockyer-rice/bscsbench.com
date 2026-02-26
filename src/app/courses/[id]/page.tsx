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
        passRate: c.passRate,
        solved: c.assignments.filter((a) => a.solved).length,
        total: c.assignments.length,
        cost: c.totalCost,
      };
    })
    .sort((a, b) => b.passRate - a.passRate);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
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
        <h2 className="text-2xl font-bold tracking-tight">Assignments</h2>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Tests</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {course.assignments.map((a) => (
                <TableRow key={a.number}>
                  <TableCell>{a.number}</TableCell>
                  <TableCell>{a.displayName}</TableCell>
                  <TableCell className="text-right">{a.totalTests}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

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
                  <TableCell className="text-right">
                    {(entry.passRate * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.solved}/{entry.total}
                  </TableCell>
                  <TableCell className="text-right">
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
