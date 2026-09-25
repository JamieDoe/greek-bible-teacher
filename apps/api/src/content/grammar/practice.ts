import type { GrammarParadigm, GrammarQuickCheck } from "@gbt/shared";

/**
 * The grammar step's practice (design: "γ′ · Grammar"): a before/after table where a change of
 * form is the point, and one quick recognition question for every concept. First-draft teaching
 * content, like the lessons themselves (see STATUS: worth a review by a Greek teacher).
 */
export const practice: Record<
  string,
  { paradigm?: GrammarParadigm; quickCheck: GrammarQuickCheck }
> = {
  alphabet: {
    quickCheck: {
      question: "Which letter says “th”?",
      options: ["θ", "τ", "φ"],
      answer: 0,
      explanation: "θ (theta) is “th”; τ is “t” and φ is “ph”.",
    },
  },
  "breathings-accents": {
    quickCheck: {
      question: "Which word starts with an “h” sound?",
      options: ["ὁ", "ἐν", "ἀρχή"],
      answer: 0,
      explanation: "The backward mark on ὁ is a rough breathing: say “ho”.",
    },
  },
  "article-and-case": {
    paradigm: {
      from: "Subject",
      to: "Object",
      rows: [
        { from: "ὁ θεός", to: "τὸν θε[όν]" },
        { from: "ὁ λόγος", to: "τὸν λόγ[ον]" },
      ],
      note: "The article changes with its noun: ὁ becomes τόν.",
    },
    quickCheck: {
      question: "Which one is the object?",
      options: ["ὁ λόγος", "τὸν θεόν", "ὁ θεός"],
      answer: 1,
      explanation: "τὸν … -ον marks the object: “God” is who the Word was with.",
    },
  },
  dative: {
    paradigm: {
      from: "Nominative",
      to: "Dative",
      rows: [
        { from: "ἀρχή", to: "ἀρχ[ῇ]" },
        { from: "λόγος", to: "λόγ[ῳ]" },
      ],
      note: "See the small stroke under the vowel? That’s an iota subscript: ᾳ ῃ ῳ.",
    },
    quickCheck: {
      question: "Which one is dative?",
      options: ["λόγος", "λόγῳ", "λόγον"],
      answer: 1,
      explanation: "The ending -ῳ, with its iota subscript, marks the dative.",
    },
  },
  genitive: {
    paradigm: {
      from: "Nominative",
      to: "Genitive",
      rows: [
        { from: "λόγος", to: "λόγ[ου]" },
        { from: "ἀρχή", to: "ἀρχ[ῆς]" },
      ],
      note: "The article changes too: τοῦ, τῆς.",
    },
    quickCheck: {
      question: "Which one means “of the world”?",
      options: ["ὁ κόσμος", "τοῦ κόσμου", "τὸν κόσμον"],
      answer: 1,
      explanation: "τοῦ … -ου is the genitive: “of the world”.",
    },
  },
  "gender-number": {
    paradigm: {
      from: "Singular",
      to: "Plural",
      rows: [
        { from: "ὁ λόγος", to: "οἱ λόγ[οι]" },
        { from: "ἡ ἀρχή", to: "αἱ ἀρχ[αί]" },
        { from: "τὸ ἔργον", to: "τὰ ἔργ[α]" },
      ],
    },
    quickCheck: {
      question: "Which one is plural?",
      options: ["ὁ λόγος", "οἱ λόγοι", "τὸν λόγον"],
      answer: 1,
      explanation: "οἱ and the ending -οι mark the plural: “the words”.",
    },
  },
  prepositions: {
    quickCheck: {
      question: "ἐν (“in”) takes which case?",
      options: ["Genitive", "Dative", "Accusative"],
      answer: 1,
      explanation: "ἐν always takes the dative: ἐν ἀρχῇ, “in the beginning”.",
    },
  },
  connectors: {
    quickCheck: {
      question: "Which word means “for, because”?",
      options: ["καί", "δέ", "γάρ"],
      answer: 2,
      explanation: "γάρ gives a reason; καί is “and”, δέ is “and, but”.",
    },
  },
  eimi: {
    paradigm: {
      from: "Is",
      to: "Was",
      rows: [
        { from: "ἐστίν", to: "[ἦν]" },
        { from: "εἰσίν", to: "[ἦσαν]" },
      ],
      note: "John 1:1 uses ἦν three times.",
    },
    quickCheck: {
      question: "Which one means “was”?",
      options: ["ἐστίν", "ἦν", "εἰσίν"],
      answer: 1,
      explanation: "ἦν is “was”; ἐστίν is “is” and εἰσίν “are”.",
    },
  },
  "personal-pronouns": {
    quickCheck: {
      question: "What does αὐτοῦ mean?",
      options: ["of him, his", "to him", "him (the object)"],
      answer: 0,
      explanation: "The genitive ending -οῦ gives “of him”, usually “his”.",
    },
  },
  demonstratives: {
    quickCheck: {
      question: "Which one means “that”?",
      options: ["οὗτος", "ἐκεῖνος", "αὐτός"],
      answer: 1,
      explanation: "ἐκεῖνος points further off (“that”); οὗτος is “this”.",
    },
  },
  adjectives: {
    quickCheck: {
      question: "Which one says “the word is good”?",
      options: ["ὁ ἀγαθὸς λόγος", "ὁ λόγος ὁ ἀγαθός", "ὁ λόγος ἀγαθός"],
      answer: 2,
      explanation:
        "With no article of its own, the adjective states something: “the word is good”.",
    },
  },
  negation: {
    quickCheck: {
      question: "Which “not” goes with a subjunctive or a command?",
      options: ["οὐ", "οὐκ", "μή"],
      answer: 2,
      explanation:
        "μή negates subjunctives, commands and infinitives; οὐ (οὐκ) negates statements.",
    },
  },
  "relative-pronouns": {
    quickCheck: {
      question: "In ὃ γέγονεν (John 1:3), what does ὃ mean?",
      options: ["which", "this", "and"],
      answer: 0,
      explanation: "ὅ is the relative pronoun: “(that) which has come to be”.",
    },
  },
  infinitives: {
    paradigm: {
      from: "He …",
      to: "To …",
      rows: [
        { from: "λέγει", to: "λέγ[ειν]" },
        { from: "πιστεύει", to: "πιστεύ[ειν]" },
        { from: "ἐστίν", to: "[εἶναι]" },
      ],
    },
    quickCheck: {
      question: "Which one is an infinitive (“to say”)?",
      options: ["λέγει", "λέγειν", "λέγων"],
      answer: 1,
      explanation: "The ending -ειν marks the infinitive: “to say”.",
    },
  },
  "participles-adjectival": {
    quickCheck: {
      question: "What does ὁ πιστεύων mean?",
      options: ["the one who believes", "he believes", "believe!"],
      answer: 0,
      explanation: "With the article, a participle names someone: “the one who believes”.",
    },
  },
  "participles-adverbial": {
    quickCheck: {
      question: "How is ἀκούσας (with no article) best read?",
      options: ["after hearing", "the one who hears", "to hear"],
      answer: 0,
      explanation:
        "An aorist participle without an article usually sets the scene: “after hearing”.",
    },
  },
  subjunctive: {
    quickCheck: {
      question: "Which word introduces a purpose, “so that …”?",
      options: ["ἵνα", "ὅτι", "καί"],
      answer: 0,
      explanation: "ἵνα (“so that”) is followed by a subjunctive.",
    },
  },
  imperative: {
    quickCheck: {
      question: "Which one is a command?",
      options: ["ἄκουε", "ἀκούει", "ἀκούειν"],
      answer: 0,
      explanation: "ἄκουε is “listen!”; ἀκούει is “he hears”, ἀκούειν “to hear”.",
    },
  },
  "word-order": {
    quickCheck: {
      question: "In θεὸς ἦν ὁ λόγος, which is the subject?",
      options: ["θεός", "ἦν", "ὁ λόγος"],
      answer: 2,
      explanation: "The article marks the subject: “the Word was God”, whatever comes first.",
    },
  },
  aorist: {
    paradigm: {
      from: "Present",
      to: "Aorist",
      rows: [
        { from: "πιστεύει", to: "[ἐ]πίστευ[σ]εν" },
        { from: "γίνεται", to: "[ἐ]γένετο" },
      ],
      note: "The ἐ- at the front (the augment) marks the past.",
    },
    quickCheck: {
      question: "Which one is aorist, “he believed”?",
      options: ["πιστεύει", "ἐπίστευσεν", "πιστεύσει"],
      answer: 1,
      explanation: "The augment ἐ- and the σ mark the aorist: “he believed”.",
    },
  },
  present: {
    quickCheck: {
      question: "Which one means “he believes”?",
      options: ["πιστεύει", "ἐπίστευσεν", "πιστεύσει"],
      answer: 0,
      explanation: "πιστεύει is present: no augment, no σ.",
    },
  },
  imperfect: {
    paradigm: {
      from: "Present",
      to: "Imperfect",
      rows: [
        { from: "λέγει", to: "[ἔ]λεγεν" },
        { from: "ἐστίν", to: "[ἦν]" },
      ],
      note: "Same stem as the present, with the augment: it was going on.",
    },
    quickCheck: {
      question: "Which one means “he was saying”?",
      options: ["λέγει", "ἔλεγεν", "εἶπεν"],
      answer: 1,
      explanation: "ἔλεγεν keeps the present stem λεγ- with the augment ἐ-.",
    },
  },
  perfect: {
    paradigm: {
      from: "Present",
      to: "Perfect",
      rows: [
        { from: "γίνεται", to: "[γέ]γονεν" },
        { from: "γράφει", to: "[γέ]γραπται" },
      ],
      note: "Doubling the first sound (reduplication) marks the perfect.",
    },
    quickCheck: {
      question: "Which one means “has come to be”?",
      options: ["γίνεται", "ἐγένετο", "γέγονεν"],
      answer: 2,
      explanation: "γέγονεν is perfect: done, and still true (John 1:3).",
    },
  },
  "middle-passive": {
    paradigm: {
      from: "Active",
      to: "Passive",
      rows: [
        { from: "λέγει", to: "λέγ[εται]" },
        { from: "ἔγραψεν", to: "ἐγράφ[η]" },
      ],
    },
    quickCheck: {
      question: "Which one means “it was written”?",
      options: ["ἔγραψεν", "ἐγράφη", "γράφει"],
      answer: 1,
      explanation: "ἐγράφη is aorist passive: “it was written”.",
    },
  },
  future: {
    paradigm: {
      from: "Present",
      to: "Future",
      rows: [
        { from: "πιστεύει", to: "πιστεύ[σ]ει" },
        { from: "ἔχει", to: "ἕ[ξ]ει" },
      ],
      note: "A σ before the ending usually marks the future (χ + σ is written ξ).",
    },
    quickCheck: {
      question: "Which one means “he will believe”?",
      options: ["πιστεύει", "πιστεύσει", "ἐπίστευσεν"],
      answer: 1,
      explanation: "The σ before the ending, with no augment, marks the future.",
    },
  },
};
