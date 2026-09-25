import type { dataSources } from "../db/schema";

type SourceRow = typeof dataSources.$inferInsert;

/**
 * Licence and attribution for each imported dataset, as stated by the upstream source
 * (verified 2026-09-24; see data/README.md and DECISIONS 010).
 */
export function sourceRows(commits: { morphgnt: string; dodson: string }): SourceRow[] {
  return [
    {
      key: "sblgnt",
      name: "SBL Greek New Testament (SBLGNT)",
      version: `Text as merged in MorphGNT sblgnt @ ${commits.morphgnt.slice(0, 7)}`,
      licence: "CC BY 4.0",
      attribution:
        "SBL Greek New Testament, Society of Biblical Literature and Logos Bible Software. " +
        "Licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).",
      url: "https://sblgnt.com/license/",
    },
    {
      key: "morphgnt-sblgnt",
      name: "MorphGNT: SBLGNT Edition (morphology and lemmas)",
      version: `6.12+ (commit ${commits.morphgnt})`,
      licence: "CC BY-SA 3.0",
      attribution:
        "Tauber, J. K., ed. (2017) MorphGNT: SBLGNT Edition. Version 6.12 [Data set]. " +
        "https://github.com/morphgnt/sblgnt DOI: 10.5281/zenodo.376200. Morphological parsing " +
        "and lemmatization licensed under CC BY-SA 3.0 " +
        "(https://creativecommons.org/licenses/by-sa/3.0/).",
      url: "https://github.com/morphgnt/sblgnt",
    },
    {
      key: "dodson",
      name: "Dodson Greek-English Lexicon",
      version: `biblicalhumanities edition (commit ${commits.dodson})`,
      licence: "Public domain (CC0 1.0)",
      attribution:
        "Greek-English lexicon by John Jeffrey Dodson (2010), released into the public domain; " +
        "compiled from Abbott-Smith, Berry, Souter and Strong. Digital edition by Ulrik " +
        "Sandborg-Petersen and biblicalhumanities.org.",
      url: "https://github.com/biblicalhumanities/Dodson-Greek-Lexicon",
    },
  ];
}
