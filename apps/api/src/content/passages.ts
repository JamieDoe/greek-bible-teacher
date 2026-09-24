/**
 * The curated reading corpus. John 1:1–5 is the vertical slice; the rest were chosen from
 * scored candidates (passageDifficulty) plus judgement, roughly easiest first, keeping the
 * prologue together (see DECISIONS 018). Difficulty scores are computed at seed time.
 */
export interface PassageContent {
  title: string;
  startRef: string;
  endRef: string;
  curriculumOrder: number;
}

const corpus: [title: string, start: string, end: string][] = [
  ["John 1:1–5", "JHN 1:1", "JHN 1:5"],
  ["John 1:6–9", "JHN 1:6", "JHN 1:9"],
  ["John 1:10–13", "JHN 1:10", "JHN 1:13"],
  ["John 11:25–26", "JHN 11:25", "JHN 11:26"],
  ["Mark 1:14–15", "MRK 1:14", "MRK 1:15"],
  ["1 John 4:7–10", "1JN 4:7", "1JN 4:10"],
  ["John 14:1–6", "JHN 14:1", "JHN 14:6"],
  ["John 3:16–18", "JHN 3:16", "JHN 3:18"],
  ["1 John 1:8–10", "1JN 1:8", "1JN 1:10"],
  ["John 1:29–34", "JHN 1:29", "JHN 1:34"],
];

export const passageContent: PassageContent[] = corpus.map(([title, startRef, endRef], i) => ({
  title,
  startRef,
  endRef,
  curriculumOrder: i + 1,
}));
