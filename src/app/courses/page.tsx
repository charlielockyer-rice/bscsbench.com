import Link from "next/link";
import { getBenchmarkData } from "@/lib/data";
import { LanguageBadge } from "@/components/courses/LanguageBadge";
import { ClickableRow } from "@/components/courses/ClickableRow";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CoursesPage() {
  const { courses } = getBenchmarkData();
  const courseList = Object.values(courses).sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ""));
    const numB = parseInt(b.id.replace(/\D/g, ""));
    return numA - numB;
  });

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-12 sm:px-6 lg:px-[5%]">
      <h1 className="text-4xl font-bold tracking-tight">Courses</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        {courseList.length} courses spanning Python, Java, C, TypeScript, Go,
        and theoretical proof-writing.
      </p>

      {/* Desktop table */}
      <div className="mt-10 hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Language</TableHead>
              <TableHead className="text-right">Assignments</TableHead>
              <TableHead className="text-right">Tests</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courseList.map((course) => (
              <ClickableRow
                key={course.id}
                href={`/courses/${course.id}`}
                className="group cursor-pointer hover:bg-muted/50"
              >
                <TableCell className="font-medium">
                  {course.displayName}
                </TableCell>
                <TableCell className="text-muted-foreground group-hover:text-foreground">
                  {course.title}
                </TableCell>
                <TableCell>
                  <LanguageBadge
                    language={course.language}
                    hasWritten={course.hasWritten}
                  />
                </TableCell>
                <TableCell className="text-right text-muted-foreground group-hover:text-foreground">
                  {course.totalAssignments}
                </TableCell>
                <TableCell className="text-right text-muted-foreground group-hover:text-foreground">
                  {course.totalTests}
                </TableCell>
              </ClickableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="mt-10 space-y-3 md:hidden">
        {courseList.map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            className="block rounded-lg border p-4 hover:bg-muted/50"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{course.displayName}</span>
              <LanguageBadge
                language={course.language}
                hasWritten={course.hasWritten}
              />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {course.title}
            </p>
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span>{course.totalAssignments} assignments</span>
              <span>{course.totalTests} tests</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
