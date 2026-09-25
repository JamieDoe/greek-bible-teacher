"use client";

import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/koine";
import { IconRead } from "@/components/icons";
import { EmptyState } from "@/components/ui/states";

/** Reader pages the service worker has kept, so they can be opened without a connection. */
export function SavedPassages() {
  const [saved, setSaved] = useState<{ path: string; title: string }[] | null>(null);

  useEffect(() => {
    (async () => {
      const found: { path: string; title: string }[] = [];
      if (!("caches" in window)) return found;
      for (const name of await caches.keys()) {
        if (!name.startsWith("pages-")) continue;
        const cache = await caches.open(name);
        for (const req of await cache.keys()) {
          const path = new URL(req.url).pathname;
          if (!/^\/read\/\d+$/.test(path) || found.some((f) => f.path === path)) continue;
          // The page's own <title> ("John 1:1–5 · Greek Bible Teacher") names the passage.
          const html = (await (await cache.match(req))?.text()) ?? "";
          const title = /<title>([^<·]+)/.exec(html)?.[1]?.trim() ?? path;
          found.push({ path, title });
        }
      }
      return found.reverse(); // most recent first
    })()
      .then(setSaved)
      .catch(() => setSaved([]));
  }, []);

  if (saved === null) return null;
  if (saved.length === 0) {
    return (
      <EmptyState icon={IconRead} title="Nothing saved yet" headingLevel={2}>
        Passages you open while online are kept on this device, so next time you can read them here
        without a connection.
      </EmptyState>
    );
  }
  return (
    <section aria-labelledby="saved-heading">
      <SectionLabel>
        <span id="saved-heading">Saved on this device</span>
      </SectionLabel>
      <ul className="mt-2 divide-y divide-border border-y border-border">
        {saved.map((s) => (
          <li key={s.path}>
            <a href={s.path} className="block py-3 font-heading text-lg hover:text-primary">
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
