import Link from "next/link";
import { getBenchmarkData } from "@/lib/data";
import { LanguageBadge } from "@/components/courses/LanguageBadge";

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
        10 courses spanning Python, Java, C, TypeScript, Go, and theoretical proof-writing.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courseList.map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {course.displayName}
                </p>
                <h2 className="mt-1 text-lg font-semibold group-hover:text-accent-foreground">
                  {course.title}
                </h2>
              </div>
              <LanguageBadge language={course.language} hasWritten={course.hasWritten} />
            </div>
            <div className="mt-4 flex gap-6 text-sm text-muted-foreground">
              <span>
                {course.totalAssignments} assignment
                {course.totalAssignments !== 1 ? "s" : ""}
              </span>
              <span>{course.totalTests} tests</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
