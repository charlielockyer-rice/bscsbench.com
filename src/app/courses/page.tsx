import Link from "next/link";
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

      <div className="mt-10">
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
              <TableRow key={course.id} className="group hover:bg-muted/50">
                <TableCell className="font-medium">
                  <Link
                    href={`/courses/${course.id}`}
                    className="hover:underline"
                  >
                    {course.displayName}
                  </Link>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
