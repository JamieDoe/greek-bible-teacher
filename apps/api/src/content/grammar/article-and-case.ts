import type { GrammarConceptContent } from "./types";

export const articleAndCase: GrammarConceptContent = {
  slug: "article-and-case",
  title: "The article and case: who is what",
  summarySimple:
    "Greek shows who does what by the form of a word, not its place. The word for “the” changes form too, so it works as a signpost.",
  body: `
Greek shows **who is what** by the *form* of a word, not by where it stands in the sentence. The little word for “the” changes form as well, so it works like a signpost.

**The subject form: ὁ … -ος**

In John 3:16, ὁ θεὸς (“God”) is the one who loves. The article ὁ and the ending -ος mark the subject.

**The object form: τὸν … -ον**

In the same verse, τὸν κόσμον (“the world”) is what God loves. τόν and the ending -ον mark the object.

So ἠγάπησεν ὁ θεὸς τὸν κόσμον means “God loved the world”, and it would still mean that if the words were shuffled.

**Back to John 1:1**

- ὁ λόγος: “the Word”, the subject.
- πρὸς τὸν θεόν: “with God”. Some small words, like πρός, are followed by the object form.
- θεὸς ἦν ὁ λόγος: θεός comes first, but ὁ λόγος has the article, so it is the subject: “the Word was God”.

## Why it matters for reading

English relies on word order; Greek does not. Spotting ὁ or τόν tells you at a glance which word is the subject and which is the object, even when the order surprises you.

## Going deeper

The subject form is the **nominative** case and the object form is the **accusative** case. The article agrees with its noun in case, number and gender:

- nominative: ὁ (masculine), ἡ (feminine), τό (neuter)
- accusative: τόν (masculine), τήν (feminine), τό (neuter)

With the verb “to be” (εἰμί), both nouns are nominative. The one with the article is usually the subject, as in θεὸς ἦν ὁ λόγος.
`,
  examples: [
    { ref: "JHN 3:16", word: "θεὸς" },
    { ref: "JHN 3:16", word: "κόσμον" },
    { ref: "JHN 1:1", word: "ὁ" },
    { ref: "JHN 1:1", word: "λόγος" },
    { ref: "JHN 1:1", word: "τὸν" },
    { ref: "JHN 1:1", word: "θεόν" },
    { ref: "JHN 1:1", word: "θεὸς" },
  ],
  rules: [
    {
      match: { partOfSpeech: "article", case: "nominative" },
      note: "Nominative article (ὁ, ἡ, τό): it points to the subject, the one the sentence is about.",
    },
    {
      match: { partOfSpeech: "article", case: "accusative" },
      note: "Accusative article (τόν, τήν, τό): it points to an object, or to a word after a preposition like πρός or εἰς.",
    },
    {
      match: { partOfSpeech: "noun", case: "nominative" },
      note: "Nominative: this noun is the subject, or (with “to be”) what the subject is.",
    },
    {
      match: { partOfSpeech: "noun", case: "accusative" },
      note: "Accusative: this noun is the object of the verb, or follows a preposition such as πρός or εἰς.",
    },
  ],
};
