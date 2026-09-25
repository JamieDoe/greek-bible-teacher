import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/app-shell";
import { IconArrowRight } from "@/components/icons";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Welcome" };

/** Design "01 · Onboarding — welcome". */
export default function WelcomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-[max(40px,env(safe-area-inset-bottom))]">
      <Wordmark className="text-2xl" />
      <div className="flex flex-1 flex-col justify-center py-8">
        <p lang="grc" className="font-greek text-8xl leading-none tracking-[-0.02em]">
          λόγος
        </p>
        <p className="mt-[18px] flex items-center gap-2.5 font-mono text-[11px] font-medium tracking-[0.08em] text-ink-2 uppercase">
          <span className="h-px w-7 bg-foreground" aria-hidden="true" />
          word · message — 330× in the NT
        </p>
        <h1 className="mt-12 font-heading text-[34px] leading-[1.15] tracking-[-0.01em]">
          Read the New Testament in the language it was written.
        </h1>
        <p className="mt-4 text-[17px] leading-normal text-muted-foreground">
          A few focused minutes a day. Real Greek from your very first session.
        </p>
      </div>
      <div className="mb-6 flex justify-center gap-1.5" aria-hidden="true">
        <span className="h-1.5 w-5 rounded-[3px] bg-foreground" />
        <span className="size-1.5 rounded-[3px] bg-border" />
        <span className="size-1.5 rounded-[3px] bg-border" />
      </div>
      <Button asChild size="lg">
        <Link href="/onboarding">
          Get started <IconArrowRight size={20} />
        </Link>
      </Button>
      <Link
        href="/restore"
        className="mt-3 flex h-11 items-center justify-center text-[15px] font-medium text-ink-2 hover:text-foreground"
      >
        Restore progress from another device
      </Link>
    </main>
  );
}
