/**
 * Daily lessons, one per curated passage, in order. Each teaches the next grammar concept in
 * the curriculum (from the article on) and a handful of words. Lesson 1 is the vertical slice with its specified vocabulary; later
 * lessons derive theirs at seed time (see seed-lessons.ts), never at random.
 */
export interface LessonContent {
  title: string;
  /** Start ref of a passage in passageContent. */
  passage: string;
  /** Slug of the grammar concept taught. */
  concept: string;
  /** Explicit vocabulary (lemmas); otherwise derived from the passage. */
  vocab?: string[];
}

export const VOCAB_PER_LESSON = 5;

export const lessonContent: LessonContent[] = [
  {
    title: "In the beginning was the Word",
    passage: "JHN 1:1",
    concept: "article-and-case",
    vocab: ["λόγος", "θεός", "ἀρχή", "καί", "εἰμί"],
  },
  { title: "A witness to the light", passage: "JHN 1:6", concept: "eimi" },
  { title: "His own did not receive him", passage: "JHN 1:10", concept: "connectors" },
  { title: "I am the resurrection and the life", passage: "JHN 11:25", concept: "prepositions" },
  { title: "The kingdom of God has come near", passage: "MRK 1:14", concept: "dative" },
  { title: "God is love", passage: "1JN 4:7", concept: "genitive" },
  { title: "The way, the truth and the life", passage: "JHN 14:1", concept: "gender-number" },
  { title: "God so loved the world", passage: "JHN 3:16", concept: "personal-pronouns" },
  { title: "If we confess our sins", passage: "1JN 1:8", concept: "demonstratives" },
  { title: "The Lamb of God", passage: "JHN 1:29", concept: "negation" },
  { title: "The Word became flesh", passage: "JHN 1:14", concept: "aorist" },
  { title: "My sheep hear my voice", passage: "JHN 10:27", concept: "present" },
  { title: "Teaching with authority", passage: "MRK 1:21", concept: "imperfect" },
  { title: "The Father has sent the Son", passage: "1JN 4:13", concept: "perfect" },
  { title: "You are my beloved Son", passage: "MRK 1:9", concept: "middle-passive" },
  { title: "What we have heard and seen", passage: "1JN 1:1", concept: "relative-pronouns" },
  { title: "I am the good shepherd", passage: "JHN 10:14", concept: "adjectives" },
  { title: "I will not leave you orphans", passage: "JHN 14:18", concept: "future" },
  { title: "He appointed twelve", passage: "MRK 3:13", concept: "infinitives" },
  { title: "Whoever believes in me", passage: "JHN 12:44", concept: "participles-adjectival" },
  { title: "The first disciples", passage: "JHN 1:35", concept: "participles-adverbial" },
  { title: "So that you may not sin", passage: "1JN 2:1", concept: "subjunctive" },
  { title: "Have faith in God", passage: "MRK 11:22", concept: "imperative" },
  { title: "God is spirit", passage: "JHN 4:23", concept: "word-order" },
];
