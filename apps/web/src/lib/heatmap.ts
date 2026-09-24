/** One day of activity for the heatmap. */
export interface DayActivity {
  date: string; // YYYY-MM-DD
  count: number;
}

/**
 * Lays days out as week columns (Monday first) and assigns each a level 0–4: 0 for no
 * activity, then quartiles of the busiest day, so the ramp always uses its full range.
 */
export function heatmapWeeks(
  days: DayActivity[],
): { date: string; count: number; level: number }[][] {
  if (days.length === 0) return [];
  const max = Math.max(...days.map((d) => d.count));
  const level = (n: number) => (n <= 0 || max === 0 ? 0 : Math.min(4, Math.ceil((4 * n) / max)));
  const weeks: { date: string; count: number; level: number }[][] = [];
  for (const d of days) {
    const weekday = (new Date(`${d.date}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
    if (weekday === 0 || weeks.length === 0) weeks.push([]);
    weeks.at(-1)!.push({ ...d, level: level(d.count) });
  }
  return weeks;
}
