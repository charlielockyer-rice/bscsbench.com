"use client";

import type { RankingMetric } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const METRICS: { value: RankingMetric; label: string }[] = [
  { value: "overall", label: "Overall Score" },
  { value: "gpa", label: "GPA" },
  { value: "passRate", label: "Raw Pass Rate" },
  { value: "solved", label: "Assignments Solved" },
  { value: "costEfficiency", label: "Cost Efficiency" },
  { value: "speed", label: "Speed" },
];

export function MetricSelector({
  value,
  onChange,
}: {
  value: RankingMetric;
  onChange: (metric: RankingMetric) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as RankingMetric)}>
      <SelectTrigger size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {METRICS.map((m) => (
          <SelectItem key={m.value} value={m.value}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
