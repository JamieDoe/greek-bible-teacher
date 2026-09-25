/**
 * The curated reading corpus. John 1:1–5 is the vertical slice; the rest were chosen from
 * scored candidates (passageDifficulty) plus judgement, roughly easiest first, keeping the
 * prologue together (see DECISIONS 018). The rest pair one passage with each later grammar
 * concept, chosen the same way (DECISIONS 031). Difficulty scores are computed at seed time.
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
  // One per remaining grammar concept, from the aorist to word order (DECISIONS 031)
  ["John 1:14–17", "JHN 1:14", "JHN 1:17"],
  ["John 10:27–30", "JHN 10:27", "JHN 10:30"],
  ["Mark 1:21–22", "MRK 1:21", "MRK 1:22"],
  ["1 John 4:13–14", "1JN 4:13", "1JN 4:14"],
  ["Mark 1:9–11", "MRK 1:9", "MRK 1:11"],
  ["1 John 1:1–3", "1JN 1:1", "1JN 1:3"],
  ["John 10:14–15", "JHN 10:14", "JHN 10:15"],
  ["John 14:18–20", "JHN 14:18", "JHN 14:20"],
  ["Mark 3:13–15", "MRK 3:13", "MRK 3:15"],
  ["John 12:44–46", "JHN 12:44", "JHN 12:46"],
  ["John 1:35–37", "JHN 1:35", "JHN 1:37"],
  ["1 John 2:1–2", "1JN 2:1", "1JN 2:2"],
  ["Mark 11:22–24", "MRK 11:22", "MRK 11:24"],
  ["John 4:23–24", "JHN 4:23", "JHN 4:24"],
];

export const passageContent: PassageContent[] = corpus.map(([title, startRef, endRef], i) => ({
  title,
  startRef,
  endRef,
  curriculumOrder: i + 1,
}));
