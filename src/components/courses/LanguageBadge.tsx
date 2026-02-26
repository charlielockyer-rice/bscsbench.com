import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LANGUAGE_STYLES: Record<string, string> = {
  python: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  java: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  c: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  proof: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export function LanguageBadge({ language }: { language: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", LANGUAGE_STYLES[language])}
    >
      {language}
    </Badge>
  );
}
