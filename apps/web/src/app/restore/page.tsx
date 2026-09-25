import type { Metadata } from "next";
import { RestoreForm } from "@/components/recovery/restore-form";

export const metadata: Metadata = { title: "Restore your progress" };

export default function RestorePage() {
  return <RestoreForm />;
}
