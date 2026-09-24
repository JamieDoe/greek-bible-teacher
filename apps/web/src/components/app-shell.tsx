"use client";

import { BookOpen, ChartNoAxesColumn, House, NotebookText, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: House, match: (p: string) => p === "/" },
  {
    href: "/learn",
    label: "Learn",
    icon: NotebookText,
    match: (p: string) => /^\/(learn|review|grammar|lesson)/.test(p),
  },
  { href: "/read", label: "Read", icon: BookOpen, match: (p: string) => p.startsWith("/read") },
  {
    href: "/progress",
    label: "Progress",
    icon: ChartNoAxesColumn,
    match: (p: string) => p.startsWith("/progress"),
  },
] as const;

/** Immersive screens (reading, a lesson in progress, onboarding) hide the navigation. */
const IMMERSIVE = [/^\/read\/\d+/, /^\/lesson\//, /^\/review/, /^\/onboarding/, /^\/welcome/];

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading text-3xl tracking-tight italic", className)}>koinē</span>
  );
}

/** Bottom tab bar on phones; a sidebar with Settings from 1024px (the design's desktop). */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (IMMERSIVE.some((re) => re.test(pathname))) return <>{children}</>;

  return (
    <div className="flex min-h-full flex-1">
      <aside className="sticky top-0 hidden h-dvh w-68 shrink-0 flex-col border-r border-border px-4 py-8 lg:flex">
        <Link href="/" className="px-3" aria-label="koinē home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="mt-10 flex flex-col gap-1">
          {TABS.map((tab) => (
            <SidebarLink key={tab.href} {...tab} active={tab.match(pathname)} />
          ))}
        </nav>
        <div className="mt-auto">
          <SidebarLink
            href="/settings"
            label="Settings"
            icon={SlidersHorizontal}
            active={pathname.startsWith("/settings")}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-xl">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            const Icon = tab.icon;
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className="flex flex-col items-center gap-1 pt-2 pb-2.5 text-xs"
                >
                  <span
                    className={cn(
                      "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                      active ? "bg-accent text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span
                    className={active ? "font-semibold text-foreground" : "text-muted-foreground"}
                  >
                    {tab.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof House;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors",
        active ? "bg-accent font-semibold text-primary" : "text-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
      {label}
    </Link>
  );
}
