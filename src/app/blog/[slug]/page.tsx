import { notFound } from "next/navigation";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (slug !== "introducing-bscs-bench") return notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <article>
        <header>
          <p className="text-sm text-muted-foreground">February 26, 2026</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Introducing BSCS Bench
          </h1>
        </header>

        <div className="mt-8 space-y-6 text-muted-foreground leading-7">
          <p>
            We are excited to introduce BSCS Bench, a comprehensive benchmark
            for evaluating AI coding agents on real university programming
            assignments. Unlike synthetic benchmarks, BSCS Bench uses actual
            coursework from 9 computer science courses at Rice University,
            spanning Python, Java, C, and theoretical proof-writing. Each
            assignment comes with the same autograder used to evaluate students,
            providing a grounded and reproducible measure of agent capability.
          </p>
          <p>
            Our evaluation framework gives each agent the assignment
            instructions, a starter template, and access to sandboxed tools for
            reading, writing, and editing files, as well as running the
            autograder. Agents work independently with no internet access,
            simulating the conditions of a timed programming exam. We score
            models by averaging per-course pass rates so that no single
            language or course dominates the overall ranking.
          </p>
          <p>
            With 54 assignments and over 860 tests, BSCS Bench covers a wide
            difficulty spectrum -- from introductory Python exercises to kernel
            programming in C and formal proof-writing. We believe this breadth
            makes it a meaningful signal for how well an AI agent can reason
            about code, follow complex instructions, and debug its own mistakes.
            We plan to keep the benchmark up to date as new models are released
            and welcome community submissions.
          </p>
        </div>
      </article>
    </div>
  );
}
