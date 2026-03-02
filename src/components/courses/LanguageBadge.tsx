import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const LANGUAGE_LOGOS: Record<string, { src: string; label: string }> = {
  python: { src: "/logos/python.svg", label: "Python" },
  java: { src: "/logos/java.svg", label: "Java" },
  c: { src: "/logos/c.svg", label: "C" },
  proof: { src: "/logos/proof.svg", label: "Written" },
};

export function LanguageBadge({
  language,
  hasWritten,
}: {
  language: string;
  hasWritten?: boolean;
}) {
  const info = LANGUAGE_LOGOS[language];

  if (!info) {
    return <span className="text-sm text-muted-foreground">{language}</span>;
  }

  const codeLogo = language !== "proof" ? info : null;
  const proofLogo = LANGUAGE_LOGOS.proof;

  // Pure proof course or code-only course
  if (!hasWritten || language === "proof") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <img src={info.src} alt={info.label} className="size-9" />
        </TooltipTrigger>
        <TooltipContent>{info.label}</TooltipContent>
      </Tooltip>
    );
  }

  // Hybrid: code + written
  return (
    <span className="inline-flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <img src={codeLogo!.src} alt={codeLogo!.label} className="size-9" />
        </TooltipTrigger>
        <TooltipContent>{codeLogo!.label}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <img src={proofLogo.src} alt={proofLogo.label} className="size-7" />
        </TooltipTrigger>
        <TooltipContent>Written</TooltipContent>
      </Tooltip>
    </span>
  );
}
