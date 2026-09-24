"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Progress joins in Phase 7, when its screen exists.
const TABS = [
  { href: "/", label: "Today", match: (p: string) => p === "/" },
  { href: "/read", label: "Read", match: (p: string) => p.startsWith("/read") },
  { href: "/review", label: "Review", match: (p: string) => p.startsWith("/review") },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-rule bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`block py-3 text-center text-sm ${active ? "font-semibold text-accent" : "text-muted hover:text-ink"}`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
