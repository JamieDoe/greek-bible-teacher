"use client";

import { DAILY_MINUTE_OPTIONS, sessionResponseSchema } from "@gbt/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ScreenHeader, SectionLabel } from "@/components/koine";
import { RecoveryCodeCard } from "@/components/recovery/recovery-code-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGreekSize, useLocalName, useTheme } from "@/components/use-preferences";
import { apiPatch } from "@/lib/api-client";
import { GREEK_SIZES } from "@/lib/preferences";
import { ensureSession } from "@/lib/session";

export function SettingsView() {
  const [minutes, setMinutes] = useState<number | null>(null);
  const [recoveryCreatedAt, setRecoveryCreatedAt] = useState<string | null | undefined>();
  const [saveError, setSaveError] = useState(false);
  const [theme, setTheme] = useTheme();
  const [greekSize, setGreekSize] = useGreekSize();
  const [name, setName] = useLocalName();

  useEffect(() => {
    ensureSession()
      .then(({ user }) => {
        setMinutes(user.dailyMinutes ?? 10);
        setRecoveryCreatedAt(user.recoveryCodeCreatedAt);
      })
      .catch((err: unknown) => console.error("[settings] could not load session", err));
  }, []);

  async function changeMinutes(value: string) {
    if (!value) return;
    const previous = minutes;
    setMinutes(Number(value));
    setSaveError(false);
    try {
      await apiPatch("/me/preferences", sessionResponseSchema, { dailyMinutes: Number(value) });
    } catch (err) {
      console.error("[settings] could not save daily goal", err);
      setMinutes(previous);
      setSaveError(true);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-8 pb-12 sm:px-6">
      <ScreenHeader title="Settings" />

      <SectionLabel className="mb-3">Daily practice</SectionLabel>
      <Card className="gap-0 py-0">
        <div className="p-5">
          <p id="goal-label" className="mb-3 font-medium">
            Daily goal
          </p>
          <ToggleGroup
            type="single"
            variant="segmented"
            aria-labelledby="goal-label"
            value={minutes === null ? "" : String(minutes)}
            onValueChange={changeMinutes}
            disabled={minutes === null}
          >
            {DAILY_MINUTE_OPTIONS.map((m) => (
              <ToggleGroupItem key={m} value={String(m)} aria-label={`${m} minutes`}>
                {m}
                {m === DAILY_MINUTE_OPTIONS.at(-1) ? " min" : ""}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {saveError && (
            <p role="alert" className="mt-2 text-sm text-rubric">
              Couldn’t save your daily goal. Please try again.
            </p>
          )}
        </div>
        <Separator />
        <div className="flex flex-col gap-2 p-5">
          <Label htmlFor="name">Your first name (optional)</Label>
          <Input
            id="name"
            autoComplete="given-name"
            defaultValue={name}
            onBlur={(e) => setName(e.target.value)}
            placeholder="Used for the greeting on Home"
          />
          <p className="text-xs text-muted-foreground">
            Kept on this device only. It’s never sent to our server.
          </p>
        </div>
      </Card>

      <SectionLabel className="mt-8 mb-3">Keep your progress</SectionLabel>
      <RecoveryCodeCard createdAt={recoveryCreatedAt} onCreated={setRecoveryCreatedAt} />

      <SectionLabel className="mt-8 mb-3">Reading</SectionLabel>
      <Card className="gap-0 py-0">
        <div className="p-5">
          <div className="flex items-baseline justify-between">
            <p id="size-label" className="font-medium">
              Greek text size
            </p>
            <span className="font-mono text-xs text-muted-foreground">{greekSize} PX</span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <span lang="grc" className="font-greek text-base" aria-hidden="true">
              α
            </span>
            <Slider
              aria-labelledby="size-label"
              min={GREEK_SIZES[0]}
              max={GREEK_SIZES.at(-1)}
              step={3}
              value={[greekSize]}
              onValueChange={([v]) => v && setGreekSize(v)}
            />
            <span lang="grc" className="font-greek text-3xl" aria-hidden="true">
              α
            </span>
          </div>
          <p lang="grc" className="mt-4 font-greek text-greek leading-relaxed">
            Ἐν ἀρχῇ ἦν ὁ λόγος
          </p>
        </div>
      </Card>

      <SectionLabel className="mt-8 mb-3">Pronunciation</SectionLabel>
      <Card size="sm" className="px-5 text-sm leading-relaxed">
        <p>
          Lessons teach <strong>Erasmian</strong> pronunciation. Audio uses your device’s{" "}
          <strong>Modern Greek</strong> voice, so some vowels sound different.{" "}
          <Link href="/grammar/alphabet" className="text-primary underline underline-offset-2">
            How they differ
          </Link>
        </p>
      </Card>

      <SectionLabel className="mt-8 mb-3">Appearance</SectionLabel>
      <Card size="sm" className="px-4">
        <ToggleGroup
          type="single"
          variant="segmented"
          aria-label="Appearance"
          value={theme}
          onValueChange={(v) => v && setTheme(v as typeof theme)}
        >
          <ToggleGroupItem value="system">System</ToggleGroupItem>
          <ToggleGroupItem value="light">Light</ToggleGroupItem>
          <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
        </ToggleGroup>
      </Card>

      <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
        Greek text: SBL Greek New Testament (SBLGNT). Morphology: MorphGNT. Glosses: Dodson.{" "}
        <Link href="/about" className="underline underline-offset-2 hover:text-foreground">
          Sources and licences
        </Link>
      </p>
    </main>
  );
}
