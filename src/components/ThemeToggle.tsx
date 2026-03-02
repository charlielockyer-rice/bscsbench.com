"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Theme = "system" | "light" | "dark";

function applyTheme(theme: Theme) {
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      matchMedia("(prefers-color-scheme:dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("theme") as Theme | null;
    const resolved = saved === "light" || saved === "dark" ? saved : "system";
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const mq = matchMedia("(prefers-color-scheme:dark)");
    const onChange = () => {
      if (theme === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mounted, theme]);

  function pick(next: Theme) {
    setTheme(next);
    applyTheme(next);
    if (next === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", next);
    }
  }

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Theme" />;
  }

  const icon =
    theme === "light" ? (
      <Sun className="size-4" />
    ) : theme === "dark" ? (
      <Moon className="size-4" />
    ) : (
      <Monitor className="size-4" />
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Theme">
          {icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => pick("system")}>
          <Monitor className="size-4 mr-2" />
          System
          {theme === "system" && <span className="ml-auto text-muted-foreground text-xs">Active</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => pick("light")}>
          <Sun className="size-4 mr-2" />
          Light
          {theme === "light" && <span className="ml-auto text-muted-foreground text-xs">Active</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => pick("dark")}>
          <Moon className="size-4 mr-2" />
          Dark
          {theme === "dark" && <span className="ml-auto text-muted-foreground text-xs">Active</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
