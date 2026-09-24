import { grammarConceptResponseSchema, grammarSlugSchema } from "@gbt/shared";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { DeeperSection, StudyButton } from "@/components/grammar/concept-actions";
import { Markdown } from "@/components/grammar/markdown";
import { VerseExample } from "@/components/grammar/verse-example";
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
      <p className="text-sm text-muted">
        <Link href="/grammar" className="hover:text-ink">
          Grammar
        </Link>{" "}
        · Lesson {concept.curriculumOrder}
      </p>
      <h1 className="mt-1 font-serif text-3xl">{concept.title}</h1>

      <Markdown source={main} />
      {deeper && <DeeperSection source={deeper} />}

      {concept.examples.length > 0 && (
        <section className="mt-10" aria-labelledby="examples-heading">
          <h2 id="examples-heading" className="font-serif text-xl">
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

      <nav className="mt-10 flex justify-between gap-4 border-t border-rule pt-4 text-sm">
        {concept.previous ? (
          <Link href={`/grammar/${concept.previous.slug}`} className="text-muted hover:text-ink">
            ← {concept.previous.title}
          </Link>
        ) : (
          <span />
        )}
        {concept.next && (
          <Link
            href={`/grammar/${concept.next.slug}`}
            className="text-right text-muted hover:text-ink"
          >
            {concept.next.title} →
          </Link>
        )}
      </nav>
    </PageShell>
  );
}

export async function generateMetadata({ params }: PageProps<"/grammar/[slug]">) {
  const concept = await loadConcept((await params).slug).catch(() => null);
  return concept ? { title: concept.title } : {};
}
