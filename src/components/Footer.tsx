const FOOTER_LINKS = [
  { href: "#", label: "GitHub" },
  { href: "#", label: "Paper" },
  { href: "#", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
        <p className="text-sm text-muted-foreground">
          BSCS Bench &middot; Rice University
        </p>
        <nav className="flex items-center gap-6">
          {FOOTER_LINKS.map(({ href, label }) => (
            <a
              key={label}
              href={href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
