"use client";

import { useLeaderboardState } from "@/hooks/useLeaderboardState";
import { MetricSelector } from "./MetricSelector";
import { Filters } from "./Filters";
import { LeaderboardRow } from "./LeaderboardRow";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function LeaderboardTable() {
  const {
    entries,
    rankingMetric,
    setRankingMetric,
    selectedTags,
    setSelectedTags,
    selectedCourses,
    setSelectedCourses,
    search,
    setSearch,
    expandedIds,
    toggleExpanded,
    courses,
    allTags,
  } = useLeaderboardState();

  const courseIds = Object.keys(courses).sort();
  const courseNames = Object.fromEntries(
    Object.entries(courses).map(([id, c]) => [id, c.displayName])
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MetricSelector value={rankingMetric} onChange={setRankingMetric} />
        <Filters
          tags={allTags}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          courseIds={courseIds}
          courseNames={courseNames}
          selectedCourses={selectedCourses}
          onCoursesChange={setSelectedCourses}
          search={search}
          onSearchChange={setSearch}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-16">
              Rank
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
              Model
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
              Score
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">
              Solved
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">
              Cost
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">
              Date
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">
              Courses
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, i) => (
            <LeaderboardRow
              key={entry.id}
              entry={entry}
              rank={i + 1}
              courses={courses}
              expanded={expandedIds.has(entry.id)}
              onToggle={() => toggleExpanded(entry.id)}
            />
          ))}
          {entries.length === 0 && (
            <TableRow>
              <td
                colSpan={7}
                className="p-8 text-center text-sm text-muted-foreground"
              >
                No results match your filters.
              </td>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
