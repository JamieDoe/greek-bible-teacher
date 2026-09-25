import { grammarConceptResponseSchema, grammarSlugSchema } from "@gbt/shared";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { DeeperSection, StudyButton } from "@/components/grammar/concept-actions";
import { Markdown } from "@/components/grammar/markdown";
import { ParadigmTable } from "@/components/grammar/paradigm-table";
import { VerseExample } from "@/components/grammar/verse-example";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/states";
import { ApiRequestError } from "@/lib/api-errors";
import { serverGet } from "@/lib/api-server";
import { splitGoingDeeper } from "@/lib/markdown";

const loadConcept = cache(async (rawSlug: string) => {
  const slug = grammarSlugSchema.safeParse(rawSlug);
  if (!slug.success) return null;
  try {
    return (await serverGet(`/grammar/${slug.data}`, grammarConceptResponseSchema)).concept;
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
});

export default async function ConceptPage({ params }: PageProps<"/grammar/[slug]">) {
  const concept = await loadConcept((await params).slug);
  if (!concept) notFound();
  const { main, deeper } = splitGoingDeeper(concept.body);

  return (
    <PageShell>
      <div className="animate-[fade-in_150ms_ease-out]">
        <p className="text-sm text-muted-foreground">
          <Link href="/grammar" className="hover:text-foreground">
            Grammar
          </Link>{" "}
          · Lesson {concept.curriculumOrder}
        </p>
        <h1 className="mt-2 font-heading text-[34px] leading-[1.15] tracking-[-0.01em]">
          {concept.title}
        </h1>
        <p className="mt-2.5 text-base leading-normal text-ink-2">{concept.summarySimple}</p>

        {concept.paradigm && <ParadigmTable paradigm={concept.paradigm} />}
        <Card className="mt-5 px-5">
          <Markdown source={main} />
        </Card>
        {deeper && <DeeperSection source={deeper} />}

        {concept.examples.length > 0 && (
          <section className="mt-10" aria-labelledby="examples-heading">
            <h2 id="examples-heading" className="font-heading text-2xl">
              In the New Testament
            </h2>
            <div className="mt-4 space-y-5">
              {concept.examples.map((ex) => (
                <VerseExample key={ex.tokenId} example={ex} />
              ))}
            </div>
          </section>
        )}

        <div className="mt-10">
          <StudyButton slug={concept.slug} />
        </div>

        <nav className="mt-10 flex justify-between gap-4 border-t border-border pt-4 text-sm">
          {concept.previous ? (
            <Link
              href={`/grammar/${concept.previous.slug}`}
              className="text-muted-foreground hover:text-foreground"
            >
              ← {concept.previous.title}
            </Link>
          ) : (
            <span />
          )}
          {concept.next && (
            <Link
              href={`/grammar/${concept.next.slug}`}
              className="text-right text-muted-foreground hover:text-foreground"
            >
              {concept.next.title} →
            </Link>
          )}
        </nav>
      </div>
    </PageShell>
  );
}

export async function generateMetadata({ params }: PageProps<"/grammar/[slug]">) {
  const concept = await loadConcept((await params).slug).catch(() => null);
  return concept ? { title: concept.title } : {};
}
