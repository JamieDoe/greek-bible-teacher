import type { GrammarConceptContent } from "./types";

export const dative: GrammarConceptContent = {
  slug: "dative",
  title: "The dative: to, for, in, by",
  summarySimple:
    "A third form of the noun. It often means “to” or “for” someone, or “in” or “by” something.",
  body: `
Besides the subject and object forms, nouns have a form that usually answers “to whom?”, “for whom?”, “in what?” or “by what?”. It often ends in -ῳ, -ῃ or -ᾳ (singular) or -οις, -αις (plural).

- ἐν ἀρχῇ (John 1:1): “in the beginning”.
- ἐν αὐτῷ (John 1:4): “in him”.
- ἐν τῇ σκοτίᾳ (John 1:5): “in the darkness”.
- ὄνομα αὐτῷ Ἰωάννης (John 1:6): “a name to him, John”, that is, “his name was John”.

## Why it matters for reading

When you see a dative, ask “to, for, in or by?”. After ἐν, it is simply “in”.

## Going deeper

This is the **dative** case. Its main uses are the indirect object (“gave *to* them”), advantage (“*for* them”), location or sphere (“*in*”) and means (“*by*, with”). The dative article is τῷ (masculine and neuter), τῇ (feminine), τοῖς and ταῖς (plural).
`,
  examples: [
    { ref: "JHN 1:1", word: "ἀρχῇ" },
    { ref: "JHN 1:4", word: "αὐτῷ" },
    { ref: "JHN 1:5", word: "σκοτίᾳ" },
    { ref: "JHN 1:6", word: "αὐτῷ" },
  ],
  rules: [
    {
      match: { case: "dative" },
      note: "Dative: often “to” or “for” someone, or “in” or “by” something. After ἐν it simply means “in”.",
    },
    {
      match: { partOfSpeech: "article", case: "dative" },
      note: "Dative article (τῷ, τῇ, τοῖς, ταῖς): “to/for/in the …”.",
    },
  ],
};

export const genitive: GrammarConceptContent = {
  slug: "genitive",
  title: "The genitive: “of”",
  summarySimple: "The “of” form of the noun: whose, what kind, or from where.",
  body: `
The genitive form usually adds “of”. It often ends in -ου or -ης (singular) and -ων (plural).

- τὸ φῶς τῶν ἀνθρώπων (John 1:4): “the light **of** men”.
- Ἀρχὴ τοῦ εὐαγγελίου (Mark 1:1): “the beginning **of** the gospel”.
- ὁ ἀμνὸς τοῦ θεοῦ (John 1:29): “the Lamb **of** God”.

After some prepositions the genitive just goes with the preposition: δι’ αὐτοῦ (John 1:3) is “through him”, not “through of him”.

## Why it matters for reading

Genitives often follow the noun they describe. Read them as a pair: “light / of men”.

## Going deeper

This is the **genitive** case. Besides possession it can show source, content, or the object of an action (“love of God” = love for God). The genitive article is τοῦ (masculine and neuter), τῆς (feminine), τῶν (plural). Prepositions that take the genitive include διά “through”, ἐκ “out of”, ἀπό “from” and περί “about”.
`,
  examples: [
    { ref: "JHN 1:4", word: "ἀνθρώπων" },
    { ref: "MRK 1:1", word: "εὐαγγελίου" },
    { ref: "JHN 1:29", word: "θεοῦ" },
    { ref: "JHN 1:3", word: "αὐτοῦ" },
  ],
  rules: [
    {
      match: { case: "genitive" },
      note: "Genitive: usually “of” (whose, what kind). After διά, ἀπό, ἐκ or περί it simply goes with the preposition.",
    },
    {
      match: { partOfSpeech: "article", case: "genitive" },
      note: "Genitive article (τοῦ, τῆς, τῶν): “of the …”.",
    },
  ],
};

export const genderNumber: GrammarConceptContent = {
  slug: "gender-number",
  title: "Gender and number",
  summarySimple:
    "Every noun is masculine, feminine or neuter, and singular or plural. The article matches it, which helps you pair words up.",
  body: `
Greek nouns have a grammatical **gender**, which is usually not about male or female: ὁ λόγος “word” is masculine, ἡ ζωή “life” is feminine, τὸ φῶς “light” is neuter.

They are also **singular** or **plural**: ὁ ἄνθρωπος “the man”, τῶν ἀνθρώπων “of the men”.

The article and any adjectives agree with their noun in gender, number and case. That is how you know which words belong together: ἡ ζωή, τὸ φῶς.

## Why it matters for reading

When a sentence has several nouns, matching endings tell you which article and adjective go with which noun, even if they are apart.

## Going deeper

Common endings: masculine -ος / -οι; feminine -η or -α / -αι; neuter -ον / -α. Neuter plural subjects often take a singular verb: πάντα … ἐγένετο “all things came into being” (John 1:3).
`,
  examples: [
    { ref: "JHN 1:4", word: "ζωὴ", occurrence: 2 },
    { ref: "JHN 1:4", word: "φῶς" },
    { ref: "JHN 1:4", word: "ἀνθρώπων" },
    { ref: "JHN 1:12", word: "τέκνα" },
  ],
  rules: [
    {
      match: { partOfSpeech: "noun", number: "plural" },
      note: "Plural noun: more than one. The article shows it too: οἱ, αἱ, τά, τῶν, τοῖς, ταῖς, τούς, τάς.",
    },
  ],
};

export const adjectives: GrammarConceptContent = {
  slug: "adjectives",
  title: "Adjectives and where the article goes",
  summarySimple:
    "Adjectives describe nouns and match their endings. Where the article sits tells you whether it is “the true light” or “the light is true”.",
  body: `
An adjective matches its noun in gender, number and case: ζωὴν αἰώνιον “eternal life” (John 3:16).

Watch the article:

- τὸ φῶς τὸ ἀληθινόν (John 1:9): the article is repeated, so it still just describes: “the true light”.
- An adjective *outside* the article (for example πιστός ἐστιν, 1 John 1:9) makes a statement: “he is faithful”.

Adjectives can stand alone as nouns: πάντα “all things” (John 1:3).

## Why it matters for reading

The article’s position turns a description into a claim, which changes the meaning of the sentence.

## Going deeper

Inside or repeated with the article is the **attributive** position (“the true light”). Outside the article is the **predicate** position (“the light is true”), often with the verb “is” left unstated. An adjective used as a noun is **substantival**.
`,
  examples: [
    { ref: "JHN 1:9", word: "ἀληθινὸν" },
    { ref: "JHN 3:16", word: "αἰώνιον" },
    { ref: "JHN 1:3", word: "πάντα" },
    { ref: "1JN 1:9", word: "πιστός" },
  ],
  rules: [
    {
      match: { partOfSpeech: "adjective" },
      note: "Adjective: it describes a noun and matches it in gender, number and case. On its own it can mean “the … one(s)” or “… things”.",
    },
  ],
};
