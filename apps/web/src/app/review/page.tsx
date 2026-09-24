import type { Metadata } from "next";
import { ReviewSession } from "@/components/review/review-session";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage({ searchParams }: PageProps<"/review">) {
  const { lemmas } = await searchParams;
  // `?lemmas=1,2,3` reviews exactly those words (offered after finishing a passage).
  const lemmaIds = typeof lemmas === "string" && /^\d+(,\d+)*$/.test(lemmas) ? lemmas : undefined;
  return <ReviewSession key={lemmaIds ?? "due"} lemmaIds={lemmaIds} />;
}
