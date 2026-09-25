"use client";

import { DAILY_MINUTE_OPTIONS, type ExperienceLevel, sessionResponseSchema } from "@gbt/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SectionLabel } from "@/components/koine";
import { IconArrowRight, IconBack } from "@/components/icons";
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
    hint: "Start with the alphabet: 24 letters, then your first words",
  },
  {
    value: "beginner",
    sample: "καί",
    label: "I know the alphabet",
    hint: "Jump into the most common words",
  },
  {
    value: "intermediate",
    sample: "ἐγένετο",
    label: "I’ve studied some Greek",
    hint: "Refresh the essentials, then read",
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
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-[calc(env(safe-area-inset-top)+10px)] pb-[max(40px,env(safe-area-inset-bottom))]">
      <div className="-ml-2 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back"
          onClick={() => (step === 2 ? setStep(1) : router.push("/welcome"))}
        >
          <IconBack size={22} />
        </Button>
        <div className="mr-2 flex flex-1 gap-1.5" aria-label={`Step ${step} of 2`}>
          <Progress value={100} />
          <Progress value={step === 2 ? 100 : 0} />
        </div>
      </div>

      {step === 1 ? (
        <section className="mt-7 flex flex-1 flex-col" aria-labelledby="start-heading">
          <h1 id="start-heading" className="font-heading text-[32px] leading-[1.15]">
            Where are you starting from?
          </h1>
          <p className="mt-2.5 mb-6 text-base text-muted-foreground">
            You can change this any time.
          </p>

          <RadioGroup
            value={experience}
            onValueChange={(v) => setExperience(v as ExperienceLevel)}
            aria-labelledby="start-heading"
            className="gap-2.5"
          >
            {EXPERIENCE.map((o) => (
              <Label
                key={o.value}
                htmlFor={`exp-${o.value}`}
                className={cn(
                  "pressable flex min-h-[84px] cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-4 leading-normal font-normal",
                  experience === o.value && "border-2 border-primary bg-accent p-[15px]",
                )}
              >
                <span
                  lang="grc"
                  className={cn(
                    "w-16 shrink-0 font-greek text-xl text-ink-2",
                    experience === o.value && "text-primary",
                  )}
                >
                  {o.sample}
                </span>
                <span className="flex-1">
                  <span className="block text-base font-semibold">{o.label}</span>
                  <span className="mt-0.5 block text-sm leading-[1.35] text-muted-foreground">
                    {o.hint}
                  </span>
                </span>
                <RadioGroupItem id={`exp-${o.value}`} value={o.value} />
              </Label>
            ))}
          </RadioGroup>

          <SectionLabel className="mt-8 mb-2.5">Daily time</SectionLabel>
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
          <p className="mt-2.5 text-sm leading-[1.4] text-muted-foreground">
            About {minutes} minutes a day: a review, new words, one idea of grammar and a passage to
            read.
          </p>

          <Button
            size="lg"
            className="mt-auto w-full"
            disabled={!experience}
            onClick={() => setStep(2)}
          >
            Continue <IconArrowRight size={20} />
          </Button>
        </section>
      ) : (
        <section className="mt-7 flex flex-1 flex-col" aria-labelledby="name-heading">
          <h1 id="name-heading" className="font-heading text-[32px] leading-[1.15]">
            What should we call you?
          </h1>
          <p className="mt-2.5 text-base text-muted-foreground">
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
              {status === "saving" ? "Saving…" : "Start learning"} <IconArrowRight size={20} />
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
