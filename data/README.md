# Data sources

Raw upstream files, pinned by commit and SHA-256 in `sources.lock.json`. `pnpm data:fetch`
re-downloads any missing or altered file and verifies it. `pnpm ingest` refuses files whose checksum
does not match. Licences below were checked against the upstream sources on 2026-09-24.

| Directory          | Source                                                                                  | Pinned at                                   | Licence (as stated upstream)                                   |
| ------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| `morphgnt-sblgnt/` | [MorphGNT SBLGNT](https://github.com/morphgnt/sblgnt): SBLGNT text + morphology + lemmas | `aaed91e` (2024-01-21; tag 6.12 + fixes)     | Text: SBLGNT, **CC BY 4.0**. Parsing and lemmas: **CC BY-SA 3.0** |
| `dodson/`          | [Dodson Greek-English Lexicon](https://github.com/biblicalhumanities/Dodson-Greek-Lexicon) | `74f7035` (2018-01-11)                      | **Public domain**, and the repo is CC0 1.0                    |
| `licences/`        | Full licence texts (CC BY 4.0, CC BY-SA 3.0) and a note on the SBLGNT licence page        | fetched 2026-09-24                          | n/a                                                            |

## Licence notes

- **SBLGNT text.** The MorphGNT README says the text is "subject to the SBLGNT EULA" and links to
  https://sblgnt.com/license/. That page now contains the full CC BY 4.0 licence, and sblgnt.com
  states the SBLGNT is licensed under CC BY 4.0. See `licences/SBLGNT-LICENCE.md`.
- **MorphGNT analysis.** The README says the morphological parsing and lemmatization are "made
  available under a CC-BY-SA License" and links to CC BY-SA 3.0. The repo has no separate LICENSE
  file. The README asks to be cited as: Tauber, J. K., ed. (2017) _MorphGNT: SBLGNT Edition_.
  Version 6.12 [Data set]. https://github.com/morphgnt/sblgnt DOI: 10.5281/zenodo.376200
- **Dodson.** "The lexicon is hereby released by the copyright holder into the public domain"
  (John Jeffrey Dodson, 2010, in `dodson/README-ulrikp.txt`). The derived edition is also public
  domain, and the GitHub repo carries CC0 1.0 (`dodson/LICENSE`).

Attribution for each source is stored in the `data_sources` table and must be shown in the app.

## MorphGNT format (verified against the pinned files)

One token per line, seven fields separated by single spaces:
`BBCCVV POS PARSE text word normalized lemma`. `BB` is the NT book number (01–27). `PARSE` has
8 characters: person, tense, voice, mood, case, number, gender, degree, with `-` for absent
features. The data uses vocative (`V`) in the case slot although the README doesn't list it.

Counts at the pin: 27 books, 7,927 verses, 137,554 tokens, 5,461 lemmas, 602 distinct analyses.
