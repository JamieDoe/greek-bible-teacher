/**
 * Daily lessons, one per curated passage, in order. Each teaches one grammar concept and a
 * handful of words. Lesson 1 is the vertical slice with its specified vocabulary; later
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
];

/**
 * Hand-written glosses for the slice vocabulary (source "curated"). They put the sense a
 * beginner meets in John 1 first; Dodson's fuller entries stay as the extended gloss.
 */
export const curatedGlosses: Record<string, string> = {
  λόγος: "word, message",
  θεός: "God, a god",
  ἀρχή: "beginning; ruler",
  καί: "and, also, even",
  εἰμί: "I am, to be",
};
