import { idParamSchema } from "@gbt/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonRunner } from "@/components/lesson/lesson-runner";

export const metadata: Metadata = { title: "Lesson" };

export default async function LessonPage({ params }: PageProps<"/lesson/[id]">) {
  const id = idParamSchema.safeParse((await params).id);
  if (!id.success) notFound();
  return <LessonRunner lessonId={id.data} />;
}
