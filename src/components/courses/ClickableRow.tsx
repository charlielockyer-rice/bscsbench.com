"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";

export function ClickableRow({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <TableRow
      className={className}
      onClick={(e) => {
        // Let middle-click and modifier-clicks use default browser behavior
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        router.push(href);
      }}
      onAuxClick={(e) => {
        // Middle-click: open in new tab
        if (e.button === 1) {
          window.open(href, "_blank", "noopener");
        }
      }}
    >
      {children}
    </TableRow>
  );
}
