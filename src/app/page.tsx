import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">
          BSCS Bench Leaderboard
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          AI agents evaluated on 54 assignments across 9 CS courses at Rice
          University.
        </p>
      </div>
      <LeaderboardTable />
    </div>
  );
}
