"use client";

import { DAILY_MINUTE_OPTIONS, type ExperienceLevel, sessionResponseSchema } from "@gbt/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost } from "@/lib/api-client";
import { ensureSession } from "@/lib/session";

const EXPERIENCE: { value: ExperienceLevel; label: string; hint: string }[] = [
  { value: "none", label: "None yet", hint: "I’m starting from scratch." },
  { value: "beginner", label: "A little", hint: "I know some letters or words." },
  {
    value: "intermediate",
    label: "Some",
    hint: "I’ve studied Greek before and want to read more.",
  },
];

/** Two questions, no account and no personal data. */
export function OnboardingForm() {
  const router = useRouter();
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [minutes, setMinutes] = useState<number>(10);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!experience) return;
    setStatus("saving");
    try {
      await ensureSession();
      await apiPost("/me/onboarding", sessionResponseSchema, {
        experienceLevel: experience,
        dailyMinutes: minutes,
      });
      router.replace("/");
    } catch (err) {
      console.error("[onboarding] could not save", err);
      setStatus("error");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-10">
      <fieldset>
        <legend className="font-serif text-xl">How much Greek do you know?</legend>
        <div className="mt-4 grid gap-2">
          {EXPERIENCE.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-rule px-4 py-3 has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:outline-2 has-focus-visible:outline-accent"
            >
              <input
                type="radio"
                name="experience"
                value={o.value}
                checked={experience === o.value}
                onChange={() => setExperience(o.value)}
                className="mt-1 accent-[var(--accent)]"
              />
              <span>
                <span className="block">{o.label}</span>
                <span className="block text-sm text-muted">{o.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-serif text-xl">How long each day?</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {DAILY_MINUTE_OPTIONS.map((m) => (
            <label
              key={m}
              className="cursor-pointer rounded-full border border-rule px-4 py-2 text-sm has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:outline-2 has-focus-visible:outline-accent"
            >
              <input
                type="radio"
                name="minutes"
                value={m}
                checked={minutes === m}
                onChange={() => setMinutes(m)}
                className="sr-only"
              />
              {m} minutes
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <button
          type="submit"
          disabled={!experience || status === "saving"}
          className="rounded-full bg-ink px-6 py-2.5 text-sm text-paper hover:opacity-90 disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Start learning"}
        </button>
        {status === "error" && (
          <p role="alert" className="mt-2 text-sm text-muted">
            Couldn’t save your answers. Please try again.
          </p>
        )}
        <p className="mt-4 text-xs text-muted">
          No account needed. We don’t collect any personal details.
        </p>
      </div>
    </form>
  );
}
