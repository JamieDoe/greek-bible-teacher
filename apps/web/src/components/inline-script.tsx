/**
 * Runs `html` synchronously during HTML parsing, before first paint, on hard navigations.
 * On the client it renders as inert text/plain (the pattern from Next's "preventing flash
 * before hydration" guide).
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
