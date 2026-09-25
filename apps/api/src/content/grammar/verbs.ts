import type { GrammarConceptContent } from "./types";

export const aorist: GrammarConceptContent = {
  slug: "aorist",
  title: "The aorist: it happened",
  summarySimple:
    "The usual tense for telling what happened: a past event seen as a whole. It often starts with ἐ-.",
  body: `
When the New Testament tells a story, most verbs are **aorist**: simple past events.

- πάντα δι’ αὐτοῦ ἐγένετο (John 1:3): “all things **came into being** through him”.
- ἡ σκοτία αὐτὸ οὐ κατέλαβεν (John 1:5): “the darkness did not **overcome** it”.
- ἠγάπησεν ὁ θεὸς τὸν κόσμον (John 3:16): “God **loved** the world”.

Many aorists add ἐ- at the front (ἐ-γένετο), and many have a σ before the ending (ἠγάπη-σ-εν).

## Why it matters for reading

The aorist moves a story forward. A chain of aorists is a chain of events: this happened, then this.

## Going deeper

The aorist **indicative** is past time with **perfective** aspect: the action viewed as a whole, without regard to its duration. The ἐ- prefix is the **augment**. Some verbs have irregular aorist stems: ἦλθεν “he came” (from ἔρχομαι), εἶπεν “he said” (from λέγω).
`,
  examples: [
    { ref: "JHN 1:3", word: "ἐγένετο" },
    { ref: "JHN 1:5", word: "κατέλαβεν" },
    { ref: "JHN 3:16", word: "ἠγάπησεν" },
    { ref: "JHN 1:11", word: "ἦλθεν" },
  ],
  rules: [
    {
      match: { tense: "aorist", mood: "indicative" },
      note: "Aorist: a past event seen as a whole, “it happened”. Often begins with ἐ-.",
    },
  ],
};

export const present: GrammarConceptContent = {
  slug: "present",
  title: "The present: it is happening",
  summarySimple:
    "Something happening now, or generally true: φαίνει “it shines”. The ending tells you who does it.",
  body: `
- τὸ φῶς ἐν τῇ σκοτίᾳ φαίνει (John 1:5): “the light **shines** in the darkness”.
- βλέπει τὸν Ἰησοῦν (John 1:29): “he **sees** Jesus”.
- λέγει αὐτῷ (John 1:43): “he **says** to him”.

The ending shows the subject, so a separate “he” or “she” isn’t needed:

- λέγ-ω “I say”, λέγ-εις “you say”, λέγ-ει “he/she says”
- λέγ-ομεν “we say”, λέγ-ετε “you (all) say”, λέγ-ουσιν “they say”

## Why it matters for reading

Stories often switch into the present for vivid moments (“and he says…”). Translate it naturally, often as past.

## Going deeper

The present has **imperfective** aspect: the action is viewed as ongoing. A present used in a past narrative is a **historical present**. Endings mark **person** (1st, 2nd, 3rd) and **number**.
`,
  examples: [
    { ref: "JHN 1:5", word: "φαίνει" },
    { ref: "JHN 1:29", word: "βλέπει" },
    { ref: "JHN 1:43", word: "λέγει" },
  ],
  rules: [
    {
      match: { tense: "present", mood: "indicative" },
      note: "Present: happening now, or generally true. The ending shows who does it (-ει “he/she/it”).",
    },
  ],
};

export const imperfect: GrammarConceptContent = {
  slug: "imperfect",
  title: "The imperfect: it was going on",
  summarySimple:
    "A past action seen as ongoing or repeated: “he was preaching”, “he used to teach”.",
  body: `
The imperfect paints the background of a scene, describing what was going on:

- ἐκήρυσσεν λέγων (Mark 1:7): “he **was preaching**, saying…”.
- ἐδίδασκεν (Mark 1:21): “he **was teaching**”.
- ἦν (John 1:1): “was”, the past of “to be”.

Like the aorist, it usually begins with ἐ-, but it is built on the present stem: ἐ-δίδασκ-εν from διδάσκω.

## Why it matters for reading

Aorists move the story on; imperfects describe the scene around them. Reading them differently gives a narrative its depth.

## Going deeper

The imperfect combines past time with **imperfective** aspect. It can be **progressive** (“was teaching”), **customary** (“used to teach”) or **inceptive** (“began to teach”).
`,
  examples: [
    { ref: "MRK 1:7", word: "ἐκήρυσσεν" },
    { ref: "MRK 1:21", word: "ἐδίδασκεν" },
    { ref: "JHN 1:1", word: "ἦν" },
  ],
  rules: [
    {
      match: { tense: "imperfect" },
      note: "Imperfect: a past action seen as ongoing or repeated, “was …ing” or “used to …”.",
    },
  ],
};

export const perfect: GrammarConceptContent = {
  slug: "perfect",
  title: "The perfect: done, and still true",
  summarySimple:
    "A past action whose result still stands: γέγονεν, “has come into being (and remains)”.",
  body: `
- ὃ γέγονεν (John 1:3): “what **has come into being**”.
- ταῦτα δὲ γέγραπται (John 20:31): “these things **have been written**”, and stand written.
- κἀγὼ ἑώρακα (John 1:34): “and I **have seen**”.
- Πεπλήρωται ὁ καιρός (Mark 1:15): “the time **has been fulfilled**”.

Many perfects repeat the first consonant with ε: γέ-γραπται, πε-πλήρωται.

## Why it matters for reading

The perfect puts weight on the lasting result. When John writes “has been written”, the point is that it stands written now.

## Going deeper

The perfect expresses a completed action with a continuing **state**. The doubled beginning is **reduplication**. The **pluperfect** is the same idea set in the past (“had …”). Some perfects are used simply as presents: οἶδα “I know”.
`,
  examples: [
    { ref: "JHN 1:3", word: "γέγονεν" },
    { ref: "JHN 20:31", word: "γέγραπται" },
    { ref: "JHN 1:34", word: "ἑώρακα" },
    { ref: "MRK 1:15", word: "Πεπλήρωται" },
  ],
  rules: [
    {
      match: { tense: "perfect" },
      note: "Perfect: a past action whose result still stands, “has …”. Often begins with a doubled consonant (γέ-γονεν).",
    },
    {
      match: { tense: "pluperfect" },
      note: "Pluperfect: a completed action whose result held at a point in the past, “had …”.",
    },
  ],
};

export const middlePassive: GrammarConceptContent = {
  slug: "middle-passive",
  title: "Middle and passive voice",
  summarySimple:
    "Passive: the subject has something done to it (“was given”). Middle: the subject is involved in its own action. Many middles just translate as active.",
  body: `
- **Passive**: ὁ νόμος διὰ Μωϋσέως ἐδόθη (John 1:17): “the law **was given** through Moses”. Something is done to the subject.
- **Middle**: some verbs, like γίνομαι “come to be, happen”, are almost always middle in form. Translate them as ordinary active verbs: ἐγένετο “it came to be”.
- ἀπεκρίθη (John 1:26) looks passive but simply means “he answered”.

Middle and passive endings often contain -μαι, -ται, -σθαι or (aorist passive) -θη-.

## Why it matters for reading

Spot a passive and ask “done by whom?”. Often the answer is God, left unstated.

## Going deeper

**Voice** shows how the subject relates to the action: **active**, **middle** or **passive**. Verbs whose dictionary form ends in -μαι (γίνομαι, ἔρχομαι) have middle forms with active meaning; older grammars call them **deponent**. In the present, imperfect and perfect, middle and passive forms are identical.
`,
  examples: [
    { ref: "JHN 1:17", word: "ἐδόθη" },
    { ref: "JHN 1:3", word: "ἐγένετο" },
    { ref: "JHN 1:26", word: "ἀπεκρίθη" },
  ],
  rules: [
    {
      match: { voice: "passive" },
      note: "Passive: the subject has something done to it (“was given”). Ask “by whom?”.",
    },
    {
      match: { voice: "middle" },
      note: "Middle: the subject is involved in its own action. Many middles (like γίνομαι) are best translated as active.",
    },
  ],
};

export const future: GrammarConceptContent = {
  slug: "future",
  title: "The future: will …",
  summarySimple:
    "Something that will happen: ἐλευθερώσει, “it will set free”. Often has a σ before the ending.",
  body: `
- γνώσεσθε τὴν ἀλήθειαν (John 8:32): “you **will know** the truth”.
- ἡ ἀλήθεια ἐλευθερώσει ὑμᾶς (John 8:32): “the truth **will set** you free”.
- ζήσεται (John 11:25): “he **will live**”.
- ποιήσω ὑμᾶς (Mark 1:17): “I **will make** you”.

Most futures add σ to the stem: ἐλευθερό-ω → ἐλευθερώ-σ-ει.

## Why it matters for reading

The future is often a promise. Noticing it changes the tone of a sentence from description to assurance.

## Going deeper

The future **indicative** expresses future time. Some verbs have middle futures with active meaning: γνώσεσθε (from γινώσκω), ζήσεται (from ζάω).
`,
  examples: [
    { ref: "JHN 8:32", word: "γνώσεσθε" },
    { ref: "JHN 8:32", word: "ἐλευθερώσει" },
    { ref: "JHN 11:25", word: "ζήσεται" },
    { ref: "MRK 1:17", word: "ποιήσω" },
  ],
  rules: [{ match: { tense: "future" }, note: "Future: “will …”. Often a σ before the ending." }],
};
