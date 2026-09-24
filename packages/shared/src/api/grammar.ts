import { z } from "zod";
import { disclosureLevels, grammarProgressStatuses } from "../learning/enums";

export const grammarSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(80);

const conceptSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  curriculumOrder: z.number().int(),
  summarySimple: z.string(),
});
export type GrammarConceptSummary = z.infer<typeof conceptSummarySchema>;

export const grammarListResponseSchema = z.object({ concepts: z.array(conceptSummarySchema) });
export type GrammarListResponse = z.infer<typeof grammarListResponseSchema>;

const verseSnippetSchema = z.object({
  displayRef: z.string(),
  tokens: z.array(
    z.object({ before: z.string(), word: z.string(), after: z.string(), isTarget: z.boolean() }),
  ),
});

export const grammarConceptResponseSchema = z.object({
  concept: conceptSummarySchema.extend({
    /** Markdown; the "## Going deeper" section holds terminology for expanded views. */
    body: z.string(),
    terminologyLevel: z.enum(disclosureLevels),
    examples: z.array(verseSnippetSchema.extend({ tokenId: z.number().int() })),
    previous: z.object({ slug: z.string(), title: z.string() }).nullable(),
    next: z.object({ slug: z.string(), title: z.string() }).nullable(),
  }),
});
export type GrammarConceptResponse = z.infer<typeof grammarConceptResponseSchema>;

export const grammarProgressResponseSchema = z.object({
  progress: z.array(
    z.object({
      slug: z.string(),
      status: z.enum(grammarProgressStatuses),
      studiedAt: z.iso.datetime().nullable(),
    }),
  ),
});
export type GrammarProgressResponse = z.infer<typeof grammarProgressResponseSchema>;

export const updateGrammarProgressRequestSchema = z
  .object({ status: z.enum(grammarProgressStatuses) })
  .strict();
export type UpdateGrammarProgressRequest = z.infer<typeof updateGrammarProgressRequestSchema>;
