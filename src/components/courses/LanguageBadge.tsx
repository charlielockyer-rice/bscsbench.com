import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const LANGUAGE_LOGOS: Record<string, { src: string; label: string }> = {
  python: { src: "/logos/python.svg", label: "Python" },
  java: { src: "/logos/java.svg", label: "Java" },
  c: { src: "/logos/c.svg", label: "C" },
  proof: { src: "/logos/proof.svg", label: "Proof" },
};

export function LanguageBadge({ language }: { language: string }) {
  const info = LANGUAGE_LOGOS[language];

  if (!info) {
    return <span className="text-sm text-muted-foreground">{language}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <img src={info.src} alt={info.label} className="size-9" />
      </TooltipTrigger>
      <TooltipContent>{info.label}</TooltipContent>
    </Tooltip>
  );
}
