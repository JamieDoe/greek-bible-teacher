"use client";

import { useEffect, useState } from "react";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A count that steps up from `from` to `value` once, for completion screens only (after the
 * success mark). Screen readers get the final number straight away; with reduced motion so does
 * everyone.
 */
export function CountUp({
  value,
  from = 0,
  delay = 300,
  duration = 600,
}: {
  value: number;
  from?: number;
  delay?: number;
  duration?: number;
}) {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : from));

  useEffect(() => {
    if (reducedMotion()) return;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now + delay;
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      // Ease out: quick at first, settling on the final number.
      setShown(Math.round(from + (value - from) * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, from, delay, duration]);

  return (
    <>
      <span className="sr-only">{value.toLocaleString("en")}</span>
      <span aria-hidden="true">{shown.toLocaleString("en")}</span>
    </>
  );
}
