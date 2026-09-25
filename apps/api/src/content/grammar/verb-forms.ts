import type { GrammarConceptContent } from "./types";

export const infinitives: GrammarConceptContent = {
  slug: "infinitives",
  title: "Infinitives: “to …”",
  summarySimple: "The “to” form of a verb: γενέσθαι “to become”. It often completes another verb.",
  body: `
- ἔδωκεν αὐτοῖς ἐξουσίαν τέκνα θεοῦ γενέσθαι (John 1:12): “he gave them the right **to become** children of God”.
- ἠθέλησεν ἐξελθεῖν (John 1:43): “he wanted **to go out**”.
- μετὰ τὸ παραδοθῆναι τὸν Ἰωάννην (Mark 1:14): “after John **was handed over**”.

Infinitives often end in -ειν, -σαι, -σθαι or -ναι.

## Why it matters for reading

An infinitive rarely stands alone. Look for the word it completes: a verb like “want” or “be able”, or a noun like “right”.

## Going deeper

The **infinitive** is a verbal noun. With the article (τό) it can act as a noun, and after a preposition it forms time or purpose phrases: μετὰ τό + infinitive “after …”, εἰς τό + infinitive “in order to …”. Its “subject” goes in the accusative (τὸν Ἰωάννην in Mark 1:14).
`,
  examples: [
    { ref: "JHN 1:12", word: "γενέσθαι" },
    { ref: "JHN 1:43", word: "ἐξελθεῖν" },
    { ref: "MRK 1:14", word: "παραδοθῆναι" },
  ],
  rules: [
    {
      match: { mood: "infinitive" },
      note: "Infinitive: “to …”. Look for the verb or noun it completes.",
    },
  ],
};

export const participlesAdjectival: GrammarConceptContent = {
  slug: "participles-adjectival",
  title: "Participles as descriptions: “the one who …”",
  summarySimple:
    "A participle is a verb used like an adjective. With the article it means “the one who …”: ὁ πιστεύων, “the one who believes”.",
  body: `
Participles are verbs that behave like adjectives, with case, number and gender endings. With the article, they describe a person by what they do:

- πᾶς ὁ πιστεύων εἰς αὐτόν (John 3:16): “everyone **who believes** in him”.
- ὁ ἀμνὸς τοῦ θεοῦ ὁ αἴρων τὴν ἁμαρτίαν (John 1:29): “the Lamb of God **who takes away** the sin…”.
- ὁ μὴ ἀγαπῶν (1 John 4:8): “**the one who does not love**”.

Look for -ων, -οντ-, -μενος, or -ας / -σας after an article.

## Why it matters for reading

John loves these: ὁ πιστεύων, ὁ ἀγαπῶν. Read “the article + participle” as one unit, “the one who …”.

## Going deeper

A participle with the article is **attributive** (describing a noun) or **substantival** (acting as a noun itself). Its tense shows **aspect**, not time: present participles are ongoing (“the one who keeps believing”). Participles are negated with μή.
`,
  examples: [
    { ref: "JHN 3:16", word: "πιστεύων" },
    { ref: "JHN 1:29", word: "αἴρων" },
    { ref: "1JN 4:8", word: "ἀγαπῶν" },
  ],
  rules: [
    {
      match: { mood: "participle" },
      note: "Participle: a verb used like an adjective. With the article, “the one who …”; without it, often “while …” or “after …”.",
    },
  ],
};

export const participlesAdverbial: GrammarConceptContent = {
  slug: "participles-adverbial",
  title: "Participles as circumstances: “while …, after …”",
  summarySimple:
    "Without the article, a participle usually adds background to the main verb: “saying”, “having turned”.",
  body: `
Without the article, a participle often tells you what else was happening around the main verb:

- ἐκήρυσσεν λέγων (Mark 1:7): “he was preaching, **saying** …”.
- ἦλθεν ὁ Ἰησοῦς … κηρύσσων (Mark 1:14): “Jesus came … **preaching**”.
- στραφεὶς δὲ ὁ Ἰησοῦς (John 1:38): “Jesus, **having turned**, …” or “when Jesus turned, …”.
- ἵνα πιστεύοντες ζωὴν ἔχητε (John 20:31): “that **by believing** you may have life”.

## Why it matters for reading

Find the main verb first, then attach the participles to it as “while …”, “after …”, “by …” or “because …”, whichever fits.

## Going deeper

This is the **adverbial** (circumstantial) participle. Context shows whether it expresses time, means, manner, cause, condition or purpose. An aorist participle usually describes something before the main verb (“having turned”); a present one, something at the same time (“saying”).
`,
  examples: [
    { ref: "MRK 1:7", word: "λέγων" },
    { ref: "MRK 1:14", word: "κηρύσσων" },
    { ref: "JHN 1:38", word: "στραφεὶς" },
    { ref: "JHN 20:31", word: "πιστεύοντες" },
  ],
  rules: [],
};

export const subjunctive: GrammarConceptContent = {
  slug: "subjunctive",
  title: "The subjunctive: ἵνα and ἐάν",
  summarySimple:
    "The mood of what might or should happen, not what does. Look for ἵνα (“so that”) or ἐάν (“if”) just before it.",
  body: `
- ἵνα πᾶς ὁ πιστεύων … μὴ ἀπόληται (John 3:16): “so that everyone who believes … **may not perish**”.
- ἵνα μαρτυρήσῃ (John 1:7): “so that he **might testify**”.
- ἐὰν ὁμολογῶμεν (1 John 1:9): “if we **confess**”.

Subjunctive endings have a long vowel (η or ω): μαρτυρήσ-ῃ, ὁμολογ-ῶμεν, ἔχ-ῃ.

## Why it matters for reading

ἵνα and ἐάν are your cue: the verb that follows states a purpose or a condition, not a fact.

## Going deeper

The **subjunctive** mood expresses possibility, purpose or intention. Main uses: purpose (ἵνα + subjunctive), future-more-probable conditions (ἐάν + subjunctive), exhortation (“let us …”), and strong denial (οὐ μή + aorist subjunctive). It is negated with μή.
`,
  examples: [
    { ref: "JHN 3:16", word: "ἀπόληται" },
    { ref: "JHN 1:7", word: "μαρτυρήσῃ" },
    { ref: "1JN 1:9", word: "ἐὰν" },
    { ref: "1JN 1:9", word: "ὁμολογῶμεν" },
  ],
  rules: [
    {
      match: { mood: "subjunctive" },
      note: "Subjunctive: what might or should happen, not a fact. Look for ἵνα (“so that”) or ἐάν (“if”) before it.",
    },
    {
      match: { lemma: "ἵνα" },
      note: "ἵνα: “so that, in order that”. The verb after it is usually subjunctive.",
    },
    { match: { lemma: "ἐάν" }, note: "ἐάν: “if (ever)”, followed by a subjunctive." },
  ],
};

export const imperative: GrammarConceptContent = {
  slug: "imperative",
  title: "The imperative: commands",
  summarySimple:
    "The form for commands and requests: μετανοεῖτε, “repent!”; Ἀκολούθει μοι, “follow me!”.",
  body: `
- μετανοεῖτε καὶ πιστεύετε ἐν τῷ εὐαγγελίῳ (Mark 1:15): “**repent** and **believe** in the gospel”.
- Ἀκολούθει μοι (John 1:43): “**follow** me”.

Some imperatives look like other forms (πιστεύετε can also mean “you believe”), so context decides.

## Why it matters for reading

Commands usually come in speech. When a character speaks and the verb is second person, check whether it is an imperative.

## Going deeper

The **imperative** mood has second- and third-person forms (“let him …”). Present imperatives often urge an ongoing action (“keep following”); aorist imperatives a specific one. Prohibitions use μή.
`,
  examples: [
    { ref: "MRK 1:15", word: "μετανοεῖτε" },
    { ref: "MRK 1:15", word: "πιστεύετε" },
    { ref: "JHN 1:43", word: "Ἀκολούθει" },
  ],
  rules: [{ match: { mood: "imperative" }, note: "Imperative: a command or request, “do …!”." }],
};

export const wordOrder: GrammarConceptContent = {
  slug: "word-order",
  title: "Common word-order patterns",
  summarySimple:
    "Greek order is flexible, and the first position often carries emphasis. Endings, not order, tell you who does what.",
  body: `
Because endings show each word’s role, Greek can move words for emphasis:

- θεὸς ἦν ὁ λόγος (John 1:1): “God” comes first for emphasis; ὁ λόγος is still the subject.
- θεὸν οὐδεὶς ἑώρακεν πώποτε (John 1:18): the object, θεόν, comes first: “God no one has ever seen”.
- Οὕτως γὰρ ἠγάπησεν ὁ θεὸς τὸν κόσμον (John 3:16): the verb comes before its subject, which is common.
- Little words like δέ and γάρ always sit in second place.

## Why it matters for reading

Don’t read strictly left to right as in English. Find the verb, find the subject (nominative), then place everything else.

## Going deeper

Verb–subject–object is common in narrative. Moving a word to the front (**fronting**) usually marks emphasis or a new topic. Words that belong together can be separated (**hyperbaton**), especially in Paul and Hebrews; matching endings show the pairs.
`,
  examples: [
    { ref: "JHN 1:1", word: "θεὸς" },
    { ref: "JHN 1:18", word: "θεὸν" },
    { ref: "JHN 3:16", word: "Οὕτως" },
  ],
  rules: [],
};
