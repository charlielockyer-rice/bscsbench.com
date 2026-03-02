import Link from "next/link";

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-[1800px] px-4 py-12 sm:px-6 lg:px-[5%]">
      <h1 className="text-4xl font-bold tracking-tight">Blog</h1>

      <div className="mt-10">
        <Link
          href="/blog/introducing-bscs-bench"
          className="group block rounded-lg border bg-card p-6 transition-colors hover:bg-accent"
        >
          <p className="text-sm text-muted-foreground">February 2026</p>
          <h2 className="mt-1 text-xl font-semibold group-hover:text-accent-foreground">
            Introducing BSCS Bench
          </h2>
          <p className="mt-2 text-muted-foreground">
            How we built a comprehensive benchmark for evaluating AI coding
            agents on real university assignments.
          </p>
        </Link>
      </div>
    </div>
  );
}
