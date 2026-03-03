import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const LANGUAGE_LOGOS: Record<string, { src: string; label: string; className?: string }> = {
  python: { src: "/logos/python.svg", label: "Python" },
  java: { src: "/logos/java.svg", label: "Java" },
  c: { src: "/logos/c.svg", label: "C" },
  typescript: { src: "/logos/typescript.svg", label: "TypeScript" },
  go: { src: "/logos/go.svg", label: "Go" },
  proof: { src: "/logos/writing.png", label: "Written" },
};

export function LanguageBadge({
  language,
  hasWritten,
}: {
  language: string;
  hasWritten?: boolean;
}) {
  const langs = language.split(",");

  // Multiple languages (e.g. "typescript,go")
  if (langs.length > 1) {
    const logos = langs.map((l) => LANGUAGE_LOGOS[l]).filter(Boolean);
    if (logos.length === 0) {
      return <span className="text-sm text-muted-foreground">{language}</span>;
    }
    return (
      <span className="inline-flex items-center gap-1.5">
        {logos.map((logo) => (
          <Tooltip key={logo.label}>
            <TooltipTrigger asChild>
              <img src={logo.src} alt={logo.label} className={logo.className ?? "size-9"} />
            </TooltipTrigger>
            <TooltipContent>{logo.label}</TooltipContent>
          </Tooltip>
        ))}
        {hasWritten && (
          <Tooltip>
            <TooltipTrigger asChild>
              <img src={LANGUAGE_LOGOS.proof.src} alt={LANGUAGE_LOGOS.proof.label} className="size-9" />
            </TooltipTrigger>
            <TooltipContent>Written</TooltipContent>
          </Tooltip>
        )}
      </span>
    );
  }

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
          <img src={info.src} alt={info.label} className={info.className ?? "size-9"} />
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
          <img src={codeLogo!.src} alt={codeLogo!.label} className={codeLogo!.className ?? "size-9"} />
        </TooltipTrigger>
        <TooltipContent>{codeLogo!.label}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <img src={proofLogo.src} alt={proofLogo.label} className="size-9" />
        </TooltipTrigger>
        <TooltipContent>Written</TooltipContent>
      </Tooltip>
    </span>
  );
}
