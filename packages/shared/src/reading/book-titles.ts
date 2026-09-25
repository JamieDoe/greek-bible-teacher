/**
 * The traditional Greek titles of the NT books (as printed at the head of each book in the
 * SBLGNT), keyed by the USFM code used in verse refs. The reader heads a passage with them:
 * "ΚΑΤΑ ΙΩΑΝΝΗΝ · 1".
 */
export const GREEK_BOOK_TITLES: Readonly<Record<string, string>> = {
  MAT: "ΚΑΤΑ ΜΑΘΘΑΙΟΝ",
  MRK: "ΚΑΤΑ ΜΑΡΚΟΝ",
  LUK: "ΚΑΤΑ ΛΟΥΚΑΝ",
  JHN: "ΚΑΤΑ ΙΩΑΝΝΗΝ",
  ACT: "ΠΡΑΞΕΙΣ ΑΠΟΣΤΟΛΩΝ",
  ROM: "ΠΡΟΣ ΡΩΜΑΙΟΥΣ",
  "1CO": "ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Α",
  "2CO": "ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Β",
  GAL: "ΠΡΟΣ ΓΑΛΑΤΑΣ",
  EPH: "ΠΡΟΣ ΕΦΕΣΙΟΥΣ",
  PHP: "ΠΡΟΣ ΦΙΛΙΠΠΗΣΙΟΥΣ",
  COL: "ΠΡΟΣ ΚΟΛΟΣΣΑΕΙΣ",
  "1TH": "ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Α",
  "2TH": "ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Β",
  "1TI": "ΠΡΟΣ ΤΙΜΟΘΕΟΝ Α",
  "2TI": "ΠΡΟΣ ΤΙΜΟΘΕΟΝ Β",
  TIT: "ΠΡΟΣ ΤΙΤΟΝ",
  PHM: "ΠΡΟΣ ΦΙΛΗΜΟΝΑ",
  HEB: "ΠΡΟΣ ΕΒΡΑΙΟΥΣ",
  JAS: "ΙΑΚΩΒΟΥ",
  "1PE": "ΠΕΤΡΟΥ Α",
  "2PE": "ΠΕΤΡΟΥ Β",
  "1JN": "ΙΩΑΝΝΟΥ Α",
  "2JN": "ΙΩΑΝΝΟΥ Β",
  "3JN": "ΙΩΑΝΝΟΥ Γ",
  JUD: "ΙΟΥΔΑ",
  REV: "ΑΠΟΚΑΛΥΨΙΣ ΙΩΑΝΝΟΥ",
};

/** The Greek title for a verse ref's book ("JHN 1:1" → "ΚΑΤΑ ΙΩΑΝΝΗΝ"), or null. */
export function greekBookTitle(ref: string): string | null {
  return GREEK_BOOK_TITLES[ref.split(" ")[0] ?? ""] ?? null;
}
