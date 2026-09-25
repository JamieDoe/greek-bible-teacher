"use client";

import { type RecoveryCodeResponse, recoveryCodeResponseSchema } from "@gbt/shared";
import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api-client";

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/**
 * "Keep your progress": progress lives with this browser's anonymous session, so a recovery
 * code is how a learner takes it to another browser or device (DECISIONS 027). The code is
 * shown once, right after it is made; afterwards only its date is known.
 */
export function RecoveryCodeCard({
  createdAt,
  onCreated,
}: {
  /** When the current code was made, or null if there is none; undefined while loading. */
  createdAt: string | null | undefined;
  onCreated: (createdAt: string) => void;
}) {
  const [fresh, setFresh] = useState<RecoveryCodeResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (fresh) codeRef.current?.focus();
  }, [fresh]);

  async function create() {
    setStatus("saving");
    try {
      const result = await apiPost("/me/recovery-code", recoveryCodeResponseSchema);
      setFresh(result);
      setCopied(false);
      onCreated(result.createdAt);
      setStatus("idle");
    } catch (err) {
      console.error("[settings] could not create recovery code", err);
      setStatus("error");
    }
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch (err) {
      console.error("[settings] could not copy recovery code", err);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-3.5">
      {fresh ? (
        <>
          <p className="font-medium">Your recovery code</p>
          <p
            ref={codeRef}
            tabIndex={-1}
            data-testid="recovery-code"
            className="rounded-lg bg-muted px-4 py-4 text-center font-mono text-xl tracking-[0.12em] outline-none sm:text-2xl"
          >
            {fresh.code}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Write it down or keep it somewhere safe. It is the only way back to your progress, and
            it won’t be shown again. Anyone with the code can open your progress.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => void copy(fresh.code)}>
              {copied ? (
                <>
                  <Check aria-hidden="true" /> Copied
                </>
              ) : (
                <>
                  <Copy aria-hidden="true" /> Copy
                </>
              )}
            </Button>
            <Button onClick={() => setFresh(null)}>I’ve saved it</Button>
          </div>
          <p className="sr-only" aria-live="polite">
            {copied ? "Recovery code copied" : ""}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed">
            Your progress is saved in this browser. A recovery code lets you carry on in another
            browser or on another device, or after clearing your browsing data.
          </p>
          {createdAt ? (
            <>
              <p className="text-sm text-muted-foreground">
                You made a recovery code on {dateLabel(createdAt)}.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={status === "saving"}>
                    Make a new code
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Replace your recovery code?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The code you made on {dateLabel(createdAt)} will stop working. Only do this if
                      you’ve lost it or think someone else has it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep the old code</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void create()}>Replace it</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <Button
              disabled={createdAt === undefined || status === "saving"}
              onClick={() => void create()}
            >
              {status === "saving" ? "Making your code…" : "Make a recovery code"}
            </Button>
          )}
          {status === "error" && (
            <p role="alert" className="text-sm text-rubric">
              Couldn’t make a code. Check your connection and try again.
            </p>
          )}
        </>
      )}
      <p className="border-t border-border pt-4 text-sm">
        <Link href="/restore" className="text-primary underline underline-offset-2">
          Use a recovery code from another browser
        </Link>
      </p>
    </div>
  );
}
