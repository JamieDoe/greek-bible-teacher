import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Welcome" };

export default function WelcomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-6 pt-12 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <Wordmark />
      <div className="mt-auto">
        <p lang="grc" className="font-greek text-[5.5rem] leading-none sm:text-8xl">
          λόγος
        </p>
        <p className="mt-3 flex items-center gap-4 font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
          <span className="h-px w-12 bg-foreground" aria-hidden="true" />
          word · message — 330× in the NT
        </p>
        <h1 className="mt-14 font-heading text-5xl leading-[1.08]">
          Read the New Testament in the language it was written.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          A few focused minutes a day. Real Greek from your very first session.
        </p>
      </div>
      <Button asChild size="lg" className="mt-auto w-full">
        <Link href="/onboarding">
          Get started <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        No account needed.{" "}
        <Link href="/restore" className="text-primary underline underline-offset-2">
          Restore progress from another device
        </Link>
      </p>
    </main>
  );
}
