/** The 27 NT books in canonical order, with MorphGNT file names and USFM codes. */
export interface NtBook {
  /** 1-based canonical order; also the book number in MorphGNT references. */
  order: number;
  name: string;
  /** USFM book code, used in verse refs (`JHN 1:1`). */
  abbrev: string;
  /** File name under data/morphgnt-sblgnt/. */
  file: string;
}

const books: [name: string, abbrev: string, file: string][] = [
  ["Matthew", "MAT", "61-Mt"],
  ["Mark", "MRK", "62-Mk"],
  ["Luke", "LUK", "63-Lk"],
  ["John", "JHN", "64-Jn"],
  ["Acts", "ACT", "65-Ac"],
  ["Romans", "ROM", "66-Ro"],
  ["1 Corinthians", "1CO", "67-1Co"],
  ["2 Corinthians", "2CO", "68-2Co"],
  ["Galatians", "GAL", "69-Ga"],
  ["Ephesians", "EPH", "70-Eph"],
  ["Philippians", "PHP", "71-Php"],
  ["Colossians", "COL", "72-Col"],
  ["1 Thessalonians", "1TH", "73-1Th"],
  ["2 Thessalonians", "2TH", "74-2Th"],
  ["1 Timothy", "1TI", "75-1Ti"],
  ["2 Timothy", "2TI", "76-2Ti"],
  ["Titus", "TIT", "77-Tit"],
  ["Philemon", "PHM", "78-Phm"],
  ["Hebrews", "HEB", "79-Heb"],
  ["James", "JAS", "80-Jas"],
  ["1 Peter", "1PE", "81-1Pe"],
  ["2 Peter", "2PE", "82-2Pe"],
  ["1 John", "1JN", "83-1Jn"],
  ["2 John", "2JN", "84-2Jn"],
  ["3 John", "3JN", "85-3Jn"],
  ["Jude", "JUD", "86-Jud"],
  ["Revelation", "REV", "87-Re"],
];

export const ntBooks: NtBook[] = books.map(([name, abbrev, file], i) => ({
  order: i + 1,
  name,
  abbrev,
  file: `${file}-morphgnt.txt`,
}));
