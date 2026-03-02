import { getBenchmarkData } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LanguageBadge } from "@/components/courses/LanguageBadge";

export default function AboutPage() {
  const { courses } = getBenchmarkData();
  const courseList = Object.values(courses);

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-12 sm:px-6 lg:px-[5%]">
      <h1 className="text-4xl font-bold tracking-tight">About</h1>

      <section className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight">
          What is BSCS Bench?
        </h2>
        <p className="mt-4 text-muted-foreground leading-7">
          BSCS Bench is a comprehensive evaluation framework for testing AI
          coding agents on real university programming assignments. We evaluate
          agents across 54 assignments from 9 courses at Rice University,
          spanning Python, Java, C, and theoretical proof-writing.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight">Methodology</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground leading-7">
          <li>
            Agents receive the assignment instructions and a starter template.
          </li>
          <li>
            They have access to sandboxed tools: file read/write/edit, grep,
            glob, and an autograder.
          </li>
          <li>
            Each agent runs independently with no internet access during
            evaluation.
          </li>
          <li>
            Grading uses the same autograder used by students, plus LLM-based
            grading for theoretical work.
          </li>
          <li>
            Overall score = average of per-course pass rates (prevents
            Python-heavy courses from dominating).
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight">Courses</h2>
        <div className="mt-4">
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
                <TableRow key={course.id}>
                  <TableCell className="font-medium">
                    {course.displayName}
                  </TableCell>
                  <TableCell>{course.title}</TableCell>
                  <TableCell>
                    <LanguageBadge language={course.language} />
                  </TableCell>
                  <TableCell className="text-right">
                    {course.totalAssignments}
                  </TableCell>
                  <TableCell className="text-right">
                    {course.totalTests}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight">
          Submission Policy
        </h2>
        <p className="mt-4 text-muted-foreground leading-7">
          We welcome benchmark submissions from the community. Results must
          include full logs and be reproducible.
        </p>
        <p className="mt-2 text-muted-foreground leading-7">
          Contact us to submit results for a new model.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight">Citation</h2>
        <pre className="mt-4 overflow-x-auto rounded-lg border bg-muted p-4 text-sm">
          <code>{`@misc{bscsbench2026,
  title={BSCS Bench: Evaluating AI Agents on University CS Assignments},
  author={Lockyer, Charlie},
  year={2026},
  url={https://bscsbench.com}
}`}</code>
        </pre>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight">Team</h2>
        <p className="mt-4 text-muted-foreground leading-7">
          BSCS Bench is developed at Rice University.
        </p>
      </section>
    </div>
  );
}
