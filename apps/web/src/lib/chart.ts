/** Axis ticks for whole-number counts: 0, then 1/2/5 × 10^n steps (at least 1) up to `max`. */
export function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / 3;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const nice = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  const step = Math.max(1, nice);
  const ticks = [0];
  while (ticks.at(-1)! < max) ticks.push(ticks.at(-1)! + step);
  return ticks;
}
