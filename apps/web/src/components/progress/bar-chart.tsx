"use client";

import { useEffect, useId, useRef, useState } from "react";
import { niceTicks } from "@/lib/chart";

export interface BarDatum {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  value: number;
}

const H = 180;
const MIN_W = 280;
const PAD = { top: 12, right: 8, bottom: 26, left: 36 };
const MAX_BAR = 24;
const GAP = 2;
const RADIUS = 4;

/** Column with a 4px rounded data end and a square base. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/**
 * A single-series daily column chart: one hue, hairline grid, hover/focus tooltip, and a
 * table view. The title names the series, so there is no legend.
 */
export function BarChart({ title, unit, data }: { title: string; unit: string; data: BarDatum[] }) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  // Draw at the container's real width so text stays at true pixel sizes on phones.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setW(Math.max(MIN_W, Math.round(entry.contentRect.width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const ticks = niceTicks(Math.max(...data.map((d) => d.value), 0));
  const top = ticks.at(-1)!;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / data.length;
  const barW = Math.min(MAX_BAR, slot - GAP);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const total = data.reduce((s, d) => s + d.value, 0);
  const current = active !== null ? data[active] : null;

  return (
    <figure aria-labelledby={`${id}-title`} className="relative">
      <figcaption id={`${id}-title`} className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{title}</span>
        <span className="text-muted">
          {total.toLocaleString("en")} in {data.length} days
        </span>
      </figcaption>

      <div ref={box} className="mt-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="block max-w-full"
          role="img"
          aria-label={`${title}: ${total} ${unit} over the last ${data.length} days. Table below.`}
          onMouseLeave={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--rule)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                fontSize={11}
                fill="var(--muted)"
                className="tabular-nums"
              >
                {t.toLocaleString("en")}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = PAD.left + i * slot + (slot - barW) / 2;
            const h = (d.value / top) * plotH;
            return (
              <g key={d.date}>
                {d.value > 0 && (
                  <path
                    d={barPath(x, y(d.value), barW, h)}
                    fill="var(--chart)"
                    opacity={active === null || active === i ? 1 : 0.55}
                  />
                )}
                {/* Hit target: the full column, bigger than the mark. */}
                <rect
                  x={PAD.left + i * slot}
                  y={PAD.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  tabIndex={0}
                  aria-label={`${dayLabel(d.date)}: ${d.value} ${unit}`}
                />
              </g>
            );
          })}
          {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((i) =>
            data[i] ? (
              <text
                key={i}
                x={PAD.left + i * slot + slot / 2}
                y={H - 8}
                textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
                fontSize={11}
                fill="var(--muted)"
              >
                {dayLabel(data[i].date)}
              </text>
            ) : null,
          )}
        </svg>
      </div>

      {current && active !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-6 rounded-lg border border-rule bg-sheet px-3 py-1.5 text-xs whitespace-nowrap shadow-sm"
          // Anchor toward the bar from whichever side has room, so it never runs off the edge.
          style={
            (active + 0.5) / data.length > 0.5
              ? { right: `${Math.max(0, 100 - ((active + 0.5) / data.length) * 100 - 4)}%` }
              : { left: `${Math.max(0, ((active + 0.5) / data.length) * 100 - 4)}%` }
          }
        >
          <span className="text-muted">{dayLabel(current.date)}</span>{" "}
          <span className="font-semibold tabular-nums">{current.value.toLocaleString("en")}</span>{" "}
          {unit}
        </div>
      )}

      <details className="mt-1 text-xs text-muted">
        <summary className="cursor-pointer">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr>
              <th className="py-1 font-normal">Day</th>
              <th className="py-1 text-right font-normal">{unit}</th>
            </tr>
          </thead>
          <tbody className="text-ink">
            {data.map((d) => (
              <tr key={d.date} className="border-t border-rule">
                <td className="py-1">{dayLabel(d.date)}</td>
                <td className="py-1 text-right tabular-nums">{d.value.toLocaleString("en")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
