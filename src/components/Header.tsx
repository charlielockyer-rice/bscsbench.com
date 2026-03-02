"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

const NAV_LINKS = [
  { href: "/", label: "Leaderboard" },
  { href: "/courses", label: "Courses" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1800px] items-center justify-between px-6 lg:px-[5%]">
        <Link href="/" className="text-lg font-bold tracking-tight">
          BSCS Bench
        </Link>

        <nav className="flex items-center gap-6">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                pathname === href
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
