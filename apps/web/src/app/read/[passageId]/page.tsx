import { idParamSchema, passageResponseSchema } from "@gbt/shared";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Reader } from "@/components/reader/reader";
import { ApiRequestError } from "@/lib/api-errors";
import { serverGet } from "@/lib/api-server";

/** The passage, or null if the id is invalid or unknown. Cached per request (page + metadata). */
const loadPassage = cache(async (rawId: string) => {
  const id = idParamSchema.safeParse(rawId);
  if (!id.success) return null;
  try {
    return (await serverGet(`/passages/${id.data}`, passageResponseSchema)).passage;
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
});

export default async function PassagePage({ params }: PageProps<"/read/[passageId]">) {
  const passage = await loadPassage((await params).passageId);
  if (!passage) notFound();
  return <Reader passage={passage} />;
}

export async function generateMetadata({ params }: PageProps<"/read/[passageId]">) {
  const passage = await loadPassage((await params).passageId).catch(() => null);
  return passage ? { title: passage.title } : {};
}
