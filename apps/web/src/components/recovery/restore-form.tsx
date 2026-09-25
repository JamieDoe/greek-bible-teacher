"use client";

import { sessionResponseSchema } from "@gbt/shared";
import { IconArrowRight, IconBack } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api-client";
import { ApiRequestError } from "@/lib/api-errors";
import { resetSession } from "@/lib/session";

function errorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    if (err.code === "recovery_code_not_found") return err.message;
    if (err.code === "validation_error") {
      return "That doesn’t look like a recovery code. It has 16 letters and numbers, like K7QM-3XJ9-PT2W-HV8C.";
    }
    if (err.status === 429)
      return "Too many attempts from this network. Please try again in an hour.";
  }
  return "Couldn’t check the code. Check your connection and try again.";
}

/** Switches this browser to the learner who owns a recovery code (DECISIONS 027). */
export function RestoreForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<
    { state: "idle" | "saving" } | { state: "error"; message: string }
  >({ state: "idle" });

  async function restore(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ state: "saving" });
    try {
      await apiPost("/session/restore", sessionResponseSchema, { code });
      // Only the session promise is cached across screens; every screen fetches its own data.
      resetSession();
      router.replace("/");
    } catch (err) {
      if (!(err instanceof ApiRequestError)) console.error("[restore] could not restore", err);
      setStatus({ state: "error", message: errorMessage(err) });
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Back"
        className="-ml-2"
        onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      >
        <IconBack size={22} />
      </Button>
      <h1 className="mt-8 font-heading text-4xl leading-tight">Restore your progress</h1>
      <p className="mt-3 text-muted-foreground">
        Enter the recovery code you saved in Settings on your other browser or device.
      </p>

      <form onSubmit={(e) => void restore(e)} className="mt-8 flex flex-1 flex-col">
        <div className="flex flex-col gap-2">
          <Label htmlFor="recovery-code">Recovery code</Label>
          <Input
            id="recovery-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={64}
            aria-invalid={status.state === "error" || undefined}
            aria-describedby="restore-note restore-error"
            className="font-mono text-lg tracking-[0.08em] uppercase placeholder:normal-case"
          />
        </div>
        <p id="restore-error" role="alert" className="mt-2 min-h-5 text-sm text-rubric">
          {status.state === "error" ? status.message : ""}
        </p>
        <p id="restore-note" className="mt-4 text-sm leading-relaxed text-muted-foreground">
          This browser will switch to that progress. Anything done here so far stays behind. Your
          name, text size and theme are kept on each device and won’t move across.
        </p>
        <Button
          type="submit"
          size="lg"
          className="mt-auto w-full"
          disabled={status.state === "saving" || code.trim() === ""}
        >
          {status.state === "saving" ? "Checking…" : "Restore progress"}{" "}
          <IconArrowRight size={20} />
        </Button>
      </form>
    </main>
  );
}
