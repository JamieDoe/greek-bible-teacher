"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, ViewTransition } from "react";
import { IconHome, IconLearn, IconProgress, IconRead, IconSettings } from "@/components/icons";
import { cn } from "@/lib/utils";

const TABS = [
  // The design calls Home "Today" in the desktop sidebar.
  { href: "/", label: "Home", wide: "Today", icon: IconHome, match: (p: string) => p === "/" },
  {
    href: "/learn",
    label: "Learn",
    icon: IconLearn,
    match: (p: string) => /^\/(learn|review|grammar|lesson)/.test(p),
  },
  { href: "/read", label: "Read", icon: IconRead, match: (p: string) => p.startsWith("/read") },
  {
    href: "/progress",
    label: "Progress",
    icon: IconProgress,
    match: (p: string) => p.startsWith("/progress"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: IconSettings,
    match: (p: string) => p.startsWith("/settings"),
  },
] as const;

const TAB_TRANSITION = ["tab"];

/** Immersive screens (reading, a lesson in progress, onboarding) hide the navigation. */
const IMMERSIVE = [
  /^\/read\/\d+/,
  /^\/lesson\//,
  /^\/review/,
  /^\/onboarding/,
  /^\/welcome/,
  /^\/restore/,
];

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading text-[26px] tracking-[-0.01em] italic", className)}>
      koinē
    </span>
  );
}

/** Bottom tab bar on phones; a sidebar from 1024px (the design's desktop). */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (IMMERSIVE.some((re) => re.test(pathname))) return <>{children}</>;

  return (
    <div className="flex min-h-full flex-1">
      <aside className="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col gap-1 border-r border-border px-4 py-7 lg:flex">
        <Link href="/" className="px-3 pb-7" aria-label="koinē home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {TABS.map((tab) => (
            <SidebarLink
              key={tab.href}
              href={tab.href}
              label={"wide" in tab ? tab.wide : tab.label}
              icon={tab.icon}
              active={tab.match(pathname)}
            />
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-[calc(64px+max(20px,env(safe-area-inset-bottom)))] lg:pb-0">
        {/*
          Switching tabs crossfades the page (the tab links tag their navigation "tab"); every
          other change, such as a link inside a page or the browser's back gesture, cuts.
        */}
        <ViewTransition default="none" update={{ tab: "tab-fade", default: "none" }}>
          {children}
        </ViewTransition>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card pb-[max(20px,env(safe-area-inset-bottom))] [view-transition-name:tab-bar] lg:hidden"
      >
        <ul className="mx-auto flex h-16 max-w-xl">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            const Icon = tab.icon;
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  transitionTypes={TAB_TRANSITION}
                  aria-current={active ? "page" : undefined}
                  className="pressable flex flex-col items-center gap-1 pt-2 text-[11px]"
                >
                  <span
                    className={cn(
                      "flex h-[30px] w-14 items-center justify-center rounded-full transition-colors",
                      active ? "bg-accent text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Icon size={22} strokeWidth={active ? 1.9 : 1.75} />
                  </span>
                  <span
                    className={
                      active ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                    }
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
  icon: typeof IconHome;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      transitionTypes={TAB_TRANSITION}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] transition-colors",
        active ? "bg-accent font-semibold text-primary" : "font-medium text-ink-2 hover:bg-muted",
      )}
    >
      <Icon size={20} />
      {label}
    </Link>
  );
}
