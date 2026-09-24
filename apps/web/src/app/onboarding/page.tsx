import type { Metadata } from "next";
import { OnboardingForm } from "@/components/onboarding-form";
import { PageShell } from "@/components/ui/states";

export const metadata: Metadata = { title: "Welcome" };

export default function OnboardingPage() {
  return (
    <PageShell>
      <h1 className="font-serif text-3xl">Welcome</h1>
      <p className="mt-2 mb-10 text-muted">
        You’ll learn to read the Greek New Testament a few minutes a day, starting with John 1.
      </p>
      <OnboardingForm />
    </PageShell>
  );
}
