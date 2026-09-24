/**
 * Curated reading passages, in curriculum order. Only the vertical slice so far; the rest of
 * the corpus is chosen in Phase 5/6 using the difficulty score (see DECISIONS).
 */
export interface PassageContent {
  title: string;
  startRef: string;
  endRef: string;
  curriculumOrder: number;
}

export const passageContent: PassageContent[] = [
  { title: "John 1:1–5", startRef: "JHN 1:1", endRef: "JHN 1:5", curriculumOrder: 1 },
];
