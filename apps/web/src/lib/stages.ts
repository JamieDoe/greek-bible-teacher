import type { LessonStep } from "@gbt/shared";

/** The design shows four session stages; the lesson has seven steps (DECISIONS 018/022). */
export type StageKey = "review" | "new" | "grammar" | "read";
export const STAGES: { key: StageKey; label: string }[] = [
  { key: "review", label: "Review" },
  { key: "new", label: "New words" },
  { key: "grammar", label: "Grammar" },
  { key: "read", label: "Read" },
];

const STAGE_OF: Record<LessonStep["kind"], StageKey> = {
  review_due: "review",
  vocab: "new",
  grammar: "grammar",
  reading: "read",
  investigate: "read",
  review_recall: "read",
  reread: "read",
};

export const stageOf = (kind: LessonStep["kind"]): StageKey => STAGE_OF[kind];

export interface StageStatus {
  key: StageKey;
  label: string;
  state: "done" | "current" | "upcoming";
  /** Share of this stage's steps completed, 0–1 (for the segmented progress bar). */
  progress: number;
}

/**
 * Groups a lesson's steps into the four stages and marks each done / current / upcoming for a
 * learner on `currentStep` (0-based; `completed` marks everything done).
 */
export function stageStatuses(
  kinds: LessonStep["kind"][],
  currentStep: number,
  completed = false,
): StageStatus[] {
  return STAGES.map(({ key, label }) => {
    const indexes = kinds.flatMap((k, i) => (stageOf(k) === key ? [i] : []));
    if (indexes.length === 0) return { key, label, state: "done" as const, progress: 1 };
    const doneCount = completed ? indexes.length : indexes.filter((i) => i < currentStep).length;
    const state =
      doneCount === indexes.length
        ? "done"
        : indexes.includes(currentStep)
          ? "current"
          : "upcoming";
    return { key, label, state, progress: doneCount / indexes.length };
  });
}
