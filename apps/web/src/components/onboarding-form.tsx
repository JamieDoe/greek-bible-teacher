"use client";

import { DAILY_MINUTE_OPTIONS, type ExperienceLevel, sessionResponseSchema } from "@gbt/shared";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SectionLabel } from "@/components/koine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLocalName } from "@/components/use-preferences";
import { apiPost } from "@/lib/api-client";
import { ensureSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const EXPERIENCE: { value: ExperienceLevel; sample: string; label: string; hint: string }[] = [
  {
    value: "none",
    sample: "α β γ",
    label: "Completely new",
    hint: "Start with the alphabet and your first words.",
  },
  {
    value: "beginner",
    sample: "καί",
    label: "I know the alphabet",
    hint: "Jump into the most common words.",
  },
  {
    value: "intermediate",
    sample: "ἐγένετο",
    label: "I’ve studied some Greek",
    hint: "Refresh the essentials, then read.",
  },
];

/** Two short steps, no account and no personal data on the server (the name stays on device). */
export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [experience, setExperience] = useState<ExperienceLevel | "">("");
  const [minutes, setMinutes] = useState("10");
  const [, setName] = useLocalName();
  const [nameDraft, setNameDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function finish() {
    if (!experience) return;
    setStatus("saving");
    try {
      await ensureSession();
      await apiPost("/me/onboarding", sessionResponseSchema, {
        experienceLevel: experience,
        dailyMinutes: Number(minutes),
      });
      setName(nameDraft);
      router.replace("/");
    } catch (err) {
      console.error("[onboarding] could not save", err);
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back"
          className="-ml-2"
          onClick={() => (step === 2 ? setStep(1) : router.push("/welcome"))}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <div className="flex flex-1 gap-2" aria-label={`Step ${step} of 2`}>
          <Progress value={100} className="h-1" />
          <Progress value={step === 2 ? 100 : 0} className="h-1" />
        </div>
      </div>

      {step === 1 ? (
        <section className="mt-10 flex flex-1 flex-col" aria-labelledby="start-heading">
          <h1 id="start-heading" className="font-heading text-4xl leading-tight">
            Where are you starting from?
          </h1>
          <p className="mt-2 text-muted-foreground">You can change this any time.</p>

          <RadioGroup
            value={experience}
            onValueChange={(v) => setExperience(v as ExperienceLevel)}
            aria-labelledby="start-heading"
            className="mt-8 gap-3"
          >
            {EXPERIENCE.map((o) => (
              <Label
                key={o.value}
                htmlFor={`exp-${o.value}`}
                className={cn(
                  "flex cursor-pointer items-center gap-4 rounded-2xl border border-border bg-card p-5 leading-normal font-normal",
                  experience === o.value && "border-2 border-primary bg-accent p-[19px]",
                )}
              >
                <span
                  lang="grc"
                  className={cn(
                    "w-24 shrink-0 font-greek text-2xl",
                    experience === o.value && "text-primary",
                  )}
                >
                  {o.sample}
                </span>
                <span className="flex-1">
                  <span className="block text-lg font-semibold">{o.label}</span>
                  <span className="block text-muted-foreground">{o.hint}</span>
                </span>
                <RadioGroupItem id={`exp-${o.value}`} value={o.value} />
              </Label>
            ))}
          </RadioGroup>

          <SectionLabel className="mt-10 mb-3">Daily time</SectionLabel>
          <ToggleGroup
            type="single"
            variant="segmented"
            aria-label="Daily time"
            value={minutes}
            onValueChange={(v) => v && setMinutes(v)}
          >
            {DAILY_MINUTE_OPTIONS.map((m) => (
              <ToggleGroupItem key={m} value={String(m)}>
                {m} min
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Button
            size="lg"
            className="mt-auto w-full"
            disabled={!experience}
            onClick={() => setStep(2)}
          >
            Continue <ArrowRight aria-hidden="true" />
          </Button>
        </section>
      ) : (
        <section className="mt-10 flex flex-1 flex-col" aria-labelledby="name-heading">
          <h1 id="name-heading" className="font-heading text-4xl leading-tight">
            What should we call you?
          </h1>
          <p className="mt-2 text-muted-foreground">
            Optional. Your name stays on this device and is never sent to our server.
          </p>
          <div className="mt-8 flex flex-col gap-2">
            <Label htmlFor="first-name">First name</Label>
            <Input
              id="first-name"
              autoComplete="given-name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
            />
          </div>
          <div className="mt-auto flex flex-col gap-3">
            {status === "error" && (
              <p role="alert" className="text-sm text-rubric">
                Couldn’t save your answers. Please try again.
              </p>
            )}
            <Button
              size="lg"
              className="w-full"
              disabled={status === "saving"}
              onClick={() => void finish()}
            >
              {status === "saving" ? "Saving…" : "Start learning"} <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
