"use client";

import { Search, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              Courses
              {selectedCourses.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] leading-4">
                  {selectedCourses.length}
                </Badge>
              )}
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {courseIds.map((id) => (
              <DropdownMenuCheckboxItem
                key={id}
                checked={selectedCourses.includes(id)}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => toggleCourse(id)}
              >
                {courseNames[id] ?? id}
              </DropdownMenuCheckboxItem>
            ))}
            {selectedCourses.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => onCoursesChange([])}
                  className="justify-center text-xs text-muted-foreground"
                >
                  <X className="size-3" />
                  Clear all
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
