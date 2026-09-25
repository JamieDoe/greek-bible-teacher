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

/**
 * A before/after table of forms for a grammar step, e.g. nominative → dative. In `to`, the part
 * in [brackets] is what changed and is highlighted: "ἀρχ[ῇ]".
 */
export const grammarParadigmSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  rows: z.array(z.object({ from: z.string().min(1), to: z.string().min(1) })).min(1),
  note: z.string().optional(),
});
export type GrammarParadigm = z.infer<typeof grammarParadigmSchema>;

/** One recognition question closing a grammar step. */
export const grammarQuickCheckSchema = z
  .object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(4),
    answer: z.number().int().nonnegative(),
    /** One sentence, shown after answering. */
    explanation: z.string().min(1),
  })
  .refine((q) => q.answer < q.options.length, "answer must index an option");
export type GrammarQuickCheck = z.infer<typeof grammarQuickCheckSchema>;

export const grammarConceptResponseSchema = z.object({
  concept: conceptSummarySchema.extend({
    /** Markdown; the "## Going deeper" section holds terminology for expanded views. */
    body: z.string(),
    terminologyLevel: z.enum(disclosureLevels),
    paradigm: grammarParadigmSchema.nullable(),
    quickCheck: grammarQuickCheckSchema.nullable(),
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
