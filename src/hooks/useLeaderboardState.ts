"use client";

import { useState, useMemo } from "react";
import type { RankingMetric } from "@/lib/types";
import { getBenchmarkData } from "@/lib/data";
import {
  sortEntries,
  filterByTags,
  filterBySearch,
  filterByCourses,
  getAllTags,
} from "@/lib/sorting";

export function useLeaderboardState() {
  const data = useMemo(() => getBenchmarkData(), []);

  const [rankingMetric, setRankingMetric] = useState<RankingMetric>("overall");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const allTags = useMemo(() => getAllTags(data.entries), [data.entries]);

  const entries = useMemo(() => {
    let result = data.entries;
    result = filterByTags(result, selectedTags);
    result = filterBySearch(result, search);
    result = filterByCourses(result, selectedCourses);
    result = sortEntries(result, rankingMetric);
    return result;
  }, [data.entries, selectedTags, search, selectedCourses, rankingMetric]);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return {
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
    courses: data.courses,
    allTags,
  };
}
