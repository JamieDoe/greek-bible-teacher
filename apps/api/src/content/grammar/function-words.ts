import type { GrammarConceptContent } from "./types";

export const eimi: GrammarConceptContent = {
  slug: "eimi",
  title: "εἰμί: “is” and “was”",
  summarySimple:
    "The verb “to be”. It links a subject to what it is: ὁ θεὸς φῶς ἐστιν, “God is light”.",
  body: `
εἰμί means “to be”. Its most common forms are:

- ἐστίν “is”: ὁ θεὸς φῶς ἐστιν (1 John 1:5), “God is light”.
- ἦν “was”: ἐν ἀρχῇ ἦν ὁ λόγος (John 1:1), “in the beginning was the Word”.
- εἰμί “I am”: ἐγώ εἰμι ἡ ὁδός (John 14:6), “I am the way”.

With “to be”, both sides of the sentence stay in the subject form, because the verb joins two descriptions of the same thing rather than one acting on the other.

## Why it matters for reading

John’s prologue uses ἦν again and again. Recognising it instantly frees your attention for the nouns around it.

## Going deeper

εἰμί is a **linking** (copulative) verb, so its complement is a **predicate nominative**. It has no aorist: ἦν is an **imperfect**, used as its ordinary past tense. With ἐγώ, “I am” can be emphatic (ἐγώ εἰμι).
`,
  examples: [
    { ref: "JHN 1:1", word: "ἦν" },
    { ref: "1JN 1:5", word: "ἐστιν" },
    { ref: "JHN 14:6", word: "εἰμι" },
  ],
  rules: [
    {
      match: { lemma: "εἰμί" },
      note: "A form of εἰμί, “to be”: it links the subject to what it is (ἐστίν “is”, ἦν “was”).",
    },
    {
      match: { lemma: "εἰμί", tense: "imperfect" },
      note: "ἦν: “was”. εἰμί has no aorist, so this imperfect is its ordinary past tense.",
    },
  ],
};

export const connectors: GrammarConceptContent = {
  slug: "connectors",
  title: "Joining words: καί, δέ, γάρ, ὅτι, ἀλλά",
  summarySimple:
    "Small, frequent words that join ideas and show how they relate: and, but, for, that, because.",
  body: `
These little words are among the most frequent in the New Testament:

- καί “and”; also “also” or “even”. John 1:1 uses it three times.
- δέ “and, but”: marks the next step (John 1:12).
- γάρ “for”: gives a reason (John 3:16).
- ὅτι “that” after verbs of saying or knowing, or “because” (John 1:34).
- ἀλλά “but (rather)”: a strong contrast, often after “not” (John 1:8).

δέ and γάρ never come first in their clause. They sit in second place: ὅσοι **δὲ** ἔλαβον αὐτόν “but as many as received him”.

## Why it matters for reading

These words map the logic of a passage. Seeing γάρ tells you a reason follows; ἀλλά tells you a contrast is coming.

## Going deeper

Words that must stand second are **postpositive** (δέ, γάρ, οὖν). They are **conjunctions**. ὅτι can also introduce a direct quotation, where it works like our quotation marks.
`,
  examples: [
    { ref: "JHN 1:1", word: "καὶ" },
    { ref: "JHN 1:12", word: "δὲ" },
    { ref: "JHN 3:16", word: "γὰρ" },
    { ref: "JHN 1:34", word: "ὅτι" },
    { ref: "JHN 1:8", word: "ἀλλ’" },
  ],
  rules: [
    { match: { lemma: "καί" }, note: "καί: “and”; sometimes “also” or “even”." },
    {
      match: { lemma: "δέ" },
      note: "δέ: “and” or “but”, marking the next step. It never comes first in its clause.",
    },
    {
      match: { lemma: "γάρ" },
      note: "γάρ: “for”, giving a reason. Like δέ, it stands second in its clause.",
    },
    { match: { lemma: "ὅτι" }, note: "ὅτι: “that” (after saying or knowing) or “because”." },
    {
      match: { lemma: "ἀλλά" },
      note: "ἀλλά: “but (rather)”, a strong contrast, often after a negative.",
    },
    { match: { lemma: "οὖν" }, note: "οὖν: “so, therefore”. It stands second in its clause." },
  ],
};

export const prepositions: GrammarConceptContent = {
  slug: "prepositions",
  title: "Prepositions and the case they take",
  summarySimple:
    "Words like “in”, “with” and “through”. Each is followed by a particular case, which helps fix its meaning.",
  body: `
A preposition starts a short phrase with a noun or pronoun after it:

- ἐν ἀρχῇ “in the beginning”: ἐν takes the dative.
- πρὸς τὸν θεόν “with God”: πρός takes the accusative.
- δι’ αὐτοῦ “through him”: διά takes the genitive.
- εἰς τὸν κόσμον “into the world”: εἰς takes the accusative.
- ἀπ’ αὐτοῦ “from him”: ἀπό takes the genitive.

Some prepositions change meaning with the case: διά + genitive is “through”, διά + accusative is “because of”.

## Why it matters for reading

Once you spot the preposition, read the whole phrase as one unit and look for the main verb elsewhere.

## Going deeper

A final vowel is often dropped before another vowel (**elision**), marked with an apostrophe: δι’, ἀπ’, ἀλλ’. Prepositions also appear as prefixes in compound verbs: κατα-λαμβάνω, παρα-λαμβάνω.
`,
  examples: [
    { ref: "JHN 1:1", word: "Ἐν" },
    { ref: "JHN 1:1", word: "πρὸς" },
    { ref: "JHN 1:3", word: "δι’" },
    { ref: "JHN 1:9", word: "εἰς" },
    { ref: "1JN 1:5", word: "ἀπ’" },
  ],
  rules: [
    {
      match: { partOfSpeech: "preposition" },
      note: "A preposition: it starts a phrase (“in”, “with”, “through”…). The case of the next word helps fix its meaning.",
    },
    { match: { lemma: "ἐν" }, note: "ἐν + dative: “in”, “among”, sometimes “by”." },
    { match: { lemma: "πρός" }, note: "πρός + accusative: “to, toward”. In John 1:1, “with”." },
    { match: { lemma: "διά" }, note: "διά + genitive: “through”; + accusative: “because of”." },
    { match: { lemma: "εἰς" }, note: "εἰς + accusative: “into, to”; sometimes “for”." },
    { match: { lemma: "ἐκ" }, note: "ἐκ (ἐξ before a vowel) + genitive: “out of, from”." },
    { match: { lemma: "ἀπό" }, note: "ἀπό + genitive: “from, away from”." },
    { match: { lemma: "χωρίς" }, note: "χωρίς + genitive: “without, apart from”." },
  ],
};

export const personalPronouns: GrammarConceptContent = {
  slug: "personal-pronouns",
  title: "Personal pronouns: he, it, I, you",
  summarySimple:
    "αὐτός (“he, she, it”), ἐγώ (“I”) and σύ (“you”) change form for case just like nouns.",
  body: `
Pronouns stand in for nouns and change their endings like nouns do:

- αὐτός “he”: αὐτοῦ “of him, his”, αὐτῷ “to/in him”, αὐτόν “him”, αὐτό “it”.
- ἐγώ “I”: μου “my”, μοι “to me”, με “me”; plural ἡμεῖς “we”, ἡμῖν “to us”.
- σύ “you”: σου “your”; plural ὑμεῖς “you (all)”, ὑμῖν “to you”.

John 1:3: πάντα δι’ αὐτοῦ ἐγένετο, “all things came into being through **him**”.

## Why it matters for reading

αὐτός is the third most frequent word in the New Testament, after ὁ and καί. Its gender tells you what it refers to: in John 1:5, αὐτό is neuter, pointing back to τὸ φῶς, “the light”.

## Going deeper

Greek verbs already show their subject (“he says” is just λέγει), so a nominative pronoun adds **emphasis**: ἐγώ εἰμι “*I* am”. With the article, αὐτός means “same”: ὁ αὐτός “the same one”.
`,
  examples: [
    { ref: "JHN 1:3", word: "αὐτοῦ" },
    { ref: "JHN 1:5", word: "αὐτὸ" },
    { ref: "JHN 14:6", word: "Ἐγώ" },
    { ref: "1JN 1:5", word: "ὑμῖν" },
  ],
  rules: [
    {
      match: { lemma: "αὐτός" },
      note: "αὐτός: “he, she, it” (αὐτοῦ “his, of it”, αὐτῷ “to him”, αὐτόν “him”). Its gender shows what it refers to.",
    },
    { match: { lemma: "ἐγώ" }, note: "ἐγώ: “I” (μου “my”, μοι “to me”, με “me”; ἡμεῖς “we”)." },
    { match: { lemma: "σύ" }, note: "σύ: “you” (σου “your”; ὑμεῖς “you all”, ὑμῖν “to you”)." },
  ],
};

export const demonstratives: GrammarConceptContent = {
  slug: "demonstratives",
  title: "This and that: οὗτος and ἐκεῖνος",
  summarySimple:
    "οὗτος means “this (one)” and ἐκεῖνος “that (one)”. They point at something already mentioned.",
  body: `
- οὗτος “this one”: οὗτος ἦν ἐν ἀρχῇ (John 1:2), “**this one** (the Word) was in the beginning”.
- αὕτη “this” (feminine): αὕτη ἡ ἀγγελία (1 John 1:5), “this message”.
- ταῦτα “these things” (John 20:31).
- ἐκεῖνος “that one”, often just “he”: οὐκ ἦν ἐκεῖνος τὸ φῶς (John 1:8), “he was not the light”.

## Why it matters for reading

Demonstratives are signposts back to someone or something. Ask “which one?”, and the answer is usually in the previous sentence.

## Going deeper

These are **demonstrative pronouns**. Used with a noun and article they sit outside the article: οὗτος ὁ ἄνθρωπος “this man”. οὗτος begins with a rough breathing or τ depending on the form (αὕτη, τοῦτο, ταῦτα).
`,
  examples: [
    { ref: "JHN 1:2", word: "οὗτος" },
    { ref: "1JN 1:5", word: "αὕτη" },
    { ref: "JHN 20:31", word: "ταῦτα" },
    { ref: "JHN 1:8", word: "ἐκεῖνος" },
  ],
  rules: [
    {
      match: { lemma: "οὗτος" },
      note: "οὗτος: “this (one)”; ταῦτα “these things”. It points back to someone just mentioned.",
    },
    { match: { lemma: "ἐκεῖνος" }, note: "ἐκεῖνος: “that (one)”, often simply “he”." },
  ],
};

export const negation: GrammarConceptContent = {
  slug: "negation",
  title: "Saying no: οὐ and μή",
  summarySimple: "Two words for “not”: οὐ for plain statements, μή for most other things.",
  body: `
- οὐ (οὐκ before a vowel, οὐχ before a rough breathing) denies a statement of fact: ἡ σκοτία αὐτὸ οὐ κατέλαβεν (John 1:5), “the darkness did **not** overcome it”.
- μή is used with wishes, commands, purposes and participles: ἵνα πᾶς … μὴ ἀπόληται (John 3:16), “so that everyone … may **not** perish”.
- οὐδέ “and not, not even”: οὐδὲ ἕν (John 1:3), “not even one thing”.

## Why it matters for reading

The negative usually comes right before the word it negates, so read them together.

## Going deeper

οὐ goes with the **indicative** mood; μή with the **subjunctive**, **imperative**, **infinitive** and **participle**. In questions, οὐ expects the answer “yes” and μή expects “no”. οὐ μή together is a strong “never”.
`,
  examples: [
    { ref: "JHN 1:5", word: "οὐ" },
    { ref: "JHN 1:8", word: "οὐκ" },
    { ref: "JHN 3:16", word: "μὴ" },
    { ref: "JHN 1:3", word: "οὐδὲ" },
  ],
  rules: [
    {
      match: { lemma: "οὐ" },
      note: "οὐ (οὐκ, οὐχ): “not”, denying a plain statement. It usually comes just before what it negates.",
    },
    {
      match: { lemma: "μή" },
      note: "μή: “not”, used with wishes, commands, purposes and participles.",
    },
    { match: { lemma: "οὐδέ" }, note: "οὐδέ: “and not, not even”." },
  ],
};

export const relativePronouns: GrammarConceptContent = {
  slug: "relative-pronouns",
  title: "Relative pronouns: who, which, that",
  summarySimple:
    "ὅς, ἥ, ὅ introduce a clause describing a noun: “the light **which** enlightens everyone”.",
  body: `
A relative pronoun links a description to a noun:

- τὸ φῶς … ὃ φωτίζει πάντα ἄνθρωπον (John 1:9): “the light **which** enlightens every person”.
- ἡ ἀγγελία ἣν ἀκηκόαμεν (1 John 1:5): “the message **which** we have heard”.
- ὃν ὑμεῖς οὐκ οἴδατε (John 1:26): “**whom** you do not know”.

It looks like the article with a rough breathing and an accent: ὅς, ἥ, ὅ.

## Why it matters for reading

When you meet ὅς, ἥ or ὅ, look back for the noun it describes, then read the clause as a description of it.

## Going deeper

The relative pronoun takes its **gender and number** from the word it refers to (its **antecedent**) and its **case** from its role in its own clause. In 1 John 1:5, ἥν is feminine singular to match ἀγγελία, but accusative because it is the object of “we have heard”.
`,
  examples: [
    { ref: "JHN 1:9", word: "ὃ" },
    { ref: "1JN 1:5", word: "ἣν" },
    { ref: "JHN 1:26", word: "ὃν" },
    { ref: "JHN 1:3", word: "ὃ" },
  ],
  rules: [
    {
      match: { partOfSpeech: "relative_pronoun" },
      note: "Relative pronoun: “who, which, that”. It matches its noun’s gender and number, but its case comes from its own clause.",
    },
  ],
};
