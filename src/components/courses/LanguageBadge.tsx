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
    <span className="relative group/logo">
      <img src={info.src} alt={info.label} className="size-9" />
      <span className="absolute left-1/2 -translate-x-1/2 -top-9 px-2 py-0.5 rounded bg-foreground text-background text-xs whitespace-nowrap opacity-0 group-hover/logo:opacity-100 transition-opacity pointer-events-none">
        {info.label}
      </span>
    </span>
  );
}
