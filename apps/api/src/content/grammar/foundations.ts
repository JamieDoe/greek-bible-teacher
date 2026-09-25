import type { GrammarConceptContent } from "./types";

export const alphabet: GrammarConceptContent = {
  slug: "alphabet",
  title: "The alphabet and how to say it",
  summarySimple:
    "Twenty-four letters, many of them familiar. Learn their shapes and sounds and you can sound out any word.",
  body: `
Greek has 24 letters. Many look like ours (α, ε, ι, ο, κ, μ, ν, τ) and some are new (γ, δ, θ, λ, ξ, π, σ, φ, χ, ψ, ω).

- α a · β b · γ g · δ d · ε e (short) · ζ z · η e (long) · θ th
- ι i · κ k · λ l · μ m · ν n · ξ x · ο o (short) · π p
- ρ r · σ/ς s · τ t · υ u · φ ph · χ ch (as in Scottish “loch”) · ψ ps · ω o (long)

Sigma is written ς at the end of a word and σ elsewhere: λόγος.

Try John 1:1: Ἐν ἀρχῇ ἦν ὁ λόγος, “en archē ēn ho logos”.

## Why it matters for reading

You don’t need perfect pronunciation to read, but saying words aloud makes them stick. A consistent system helps you tell similar words apart.

## Going deeper

This app follows the **Erasmian** pronunciation used in most teaching, which gives each letter a distinct sound. Modern Greek pronunciation (for example η, ι and υ all as “ee”) and reconstructed Koine systems are also used. Choose one and keep to it.

Pairs of vowels (diphthongs) make one sound: αι “ai”, ει “ei”, οι “oi”, ου “oo”, αυ “ow”, ευ “eu”.

**About the audio.** The speaker buttons use your device’s Greek voice, which speaks **Modern Greek**. You’ll hear differences from what this lesson teaches: η, ι, υ, ει and οι all sound like “ee”, β sounds like “v”, and αι like “e”. The consonant sounds and the stressed syllable are the same, so the audio is still a good guide to rhythm and stress.
`,
  examples: [
    { ref: "JHN 1:1", word: "λόγος" },
    { ref: "JHN 1:1", word: "ἀρχῇ" },
    { ref: "JHN 1:4", word: "φῶς" },
  ],
  rules: [],
};

export const breathingsAccents: GrammarConceptContent = {
  slug: "breathings-accents",
  title: "Breathings and accents: just enough",
  summarySimple:
    "The small marks over letters: one tells you whether to say “h”, the others show stress. You can mostly read past them.",
  body: `
Every word that starts with a vowel has a **breathing mark** over it:

- ἐν: the smooth breathing (like a closing quote) means no sound.
- ὁ: the rough breathing (like an opening quote) means an “h” sound: “ho”.

Most words also carry an **accent**, which shows the stressed syllable: λόγος is “LO-gos”. The acute (ά), grave (ὰ) and circumflex (ᾶ) look different, but for reading you can treat them all as “stress here”.

A tiny ι written under a vowel (the **iota subscript**, as in ἀρχῇ) isn’t pronounced, but it often signals the dative case.

## Why it matters for reading

A few words differ only by these marks, so a glance can save confusion: ἤ “or” and ἡ “the”; οὐ “not” and οὗ “where”.

## Going deeper

An acute accent on the last syllable becomes grave when another word follows without punctuation: καί on its own, καὶ in a sentence. This app’s glossary always shows the dictionary form (the **lemma**), so λόγος and λόγου point to the same entry.
`,
  examples: [
    { ref: "JHN 1:1", word: "Ἐν" },
    { ref: "JHN 1:1", word: "ὁ" },
    { ref: "JHN 1:1", word: "ἀρχῇ" },
  ],
  rules: [],
};
