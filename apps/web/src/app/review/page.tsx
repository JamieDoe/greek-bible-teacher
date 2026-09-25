import type { Metadata } from "next";
import { ReviewSession } from "@/components/review/review-session";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  return <ReviewSession />;
}
