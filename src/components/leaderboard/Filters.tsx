"use client";

import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Filters({
  tags,
  selectedTags,
  onTagsChange,
  courseIds,
  courseNames,
  selectedCourses,
  onCoursesChange,
  search,
  onSearchChange,
}: {
  tags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  courseIds: string[];
  courseNames: Record<string, string>;
  selectedCourses: string[];
  onCoursesChange: (courses: string[]) => void;
  search: string;
  onSearchChange: (search: string) => void;
}) {
  function toggleTag(tag: string) {
    onTagsChange(
      selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag]
    );
  }

  function toggleCourse(id: string) {
    onCoursesChange(
      selectedCourses.includes(id)
        ? selectedCourses.filter((c) => c !== id)
        : [...selectedCourses, id]
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer select-none text-xs"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {tags.length > 0 && courseIds.length > 0 && (
        <div className="h-5 w-px bg-border" />
      )}

      {courseIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {courseIds.map((id) => (
            <Badge
              key={id}
              variant={selectedCourses.includes(id) ? "default" : "outline"}
              className={cn("cursor-pointer select-none text-xs")}
              onClick={() => toggleCourse(id)}
            >
              {courseNames[id] ?? id}
            </Badge>
          ))}
        </div>
      )}

      <div className="relative ml-auto">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search models..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 w-48 rounded-md border bg-transparent pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    </div>
  );
}
