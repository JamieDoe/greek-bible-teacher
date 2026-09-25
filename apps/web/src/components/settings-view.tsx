"use client";

import { DAILY_MINUTE_OPTIONS, sessionResponseSchema } from "@gbt/shared";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { SectionLabel } from "@/components/koine";
import { RecoveryCodeCard } from "@/components/recovery/recovery-code-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useGreekSize,
  useLocalName,
  useMarkNewWords,
  useSenseLines,
  useTheme,
} from "@/components/use-preferences";
import { apiPatch } from "@/lib/api-client";
import { GREEK_SIZES } from "@/lib/preferences";
import { ensureSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export function SettingsView() {
  const [minutes, setMinutes] = useState<number | null>(null);
  const [recoveryCreatedAt, setRecoveryCreatedAt] = useState<string | null | undefined>();
  const [saveError, setSaveError] = useState(false);
  const [theme, setTheme] = useTheme();
  const [greekSize, setGreekSize] = useGreekSize();
  const [name, setName] = useLocalName();
  const [senseLines, setSenseLines] = useSenseLines();
  const [markNew, setMarkNew] = useMarkNewWords();

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
    <main className="mx-auto w-full max-w-xl px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-8 lg:px-14 lg:pt-12">
      <h1 className="font-heading text-[34px] lg:text-[40px]">Settings</h1>

      <Group label="Daily practice">
        <Row>
          <p id="goal-label" className="mb-2.5 text-[15px] font-medium">
            Daily goal
          </p>
          <ToggleGroup
            type="single"
            variant="segmented"
            size="sm"
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
        </Row>
        <Row divided>
          <Label htmlFor="name" className="text-[15px] font-medium">
            Your first name (optional)
          </Label>
          <Input
            id="name"
            className="mt-2.5"
            autoComplete="given-name"
            defaultValue={name}
            onBlur={(e) => setName(e.target.value)}
            placeholder="Used for the greeting on Today"
          />
          <p className="mt-2 text-[13px] text-muted-foreground">
            Kept on this device only. It’s never sent to our server.
          </p>
        </Row>
      </Group>

      <Group label="Keep your progress">
        <RecoveryCodeCard createdAt={recoveryCreatedAt} onCreated={setRecoveryCreatedAt} />
      </Group>

      <Group label="Reading">
        <Row>
          <div className="flex justify-between">
            <p id="size-label" className="text-[15px] font-medium">
              Greek text size
            </p>
            <span className="font-mono text-xs text-muted-foreground">{greekSize} PT</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span lang="grc" className="font-greek text-sm" aria-hidden="true">
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
            <span lang="grc" className="font-greek text-2xl" aria-hidden="true">
              α
            </span>
          </div>
          <p lang="grc" className="mt-3 font-greek text-greek leading-normal">
            Ἐν ἀρχῇ ἦν ὁ λόγος
          </p>
        </Row>
        <SwitchRow
          id="sense-lines"
          title="Sense lines"
          hint="Break verses into phrases"
          checked={senseLines}
          onChange={setSenseLines}
        />
        <SwitchRow
          id="mark-new"
          title="Mark new words"
          hint="Dotted underline on unfamiliar words"
          checked={markNew}
          onChange={setMarkNew}
        />
      </Group>

      <Group label="Pronunciation">
        <Row className="text-sm leading-relaxed">
          Lessons teach <strong>Erasmian</strong> pronunciation. The audio is a{" "}
          <strong>Modern Greek</strong> voice, so some vowels sound different.{" "}
          <Link href="/grammar/alphabet" className="text-primary underline underline-offset-2">
            How they differ
          </Link>
        </Row>
      </Group>

      <Group label="Appearance">
        <Row className="py-3">
          <ToggleGroup
            type="single"
            variant="segmented"
            size="sm"
            aria-label="Appearance"
            value={theme}
            onValueChange={(v) => v && setTheme(v as typeof theme)}
          >
            <ToggleGroupItem value="system">System</ToggleGroupItem>
            <ToggleGroupItem value="light">Light</ToggleGroupItem>
            <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
          </ToggleGroup>
        </Row>
      </Group>

      <p className="mx-1 mt-[18px] text-xs leading-normal text-muted-foreground">
        Greek text: SBL Greek New Testament (SBLGNT). Morphology: MorphGNT. Glosses: Dodson. Audio:
        ElevenLabs.{" "}
        <Link href="/about" className="underline underline-offset-2 hover:text-foreground">
          Sources and licences
        </Link>
      </p>
    </main>
  );
}

/** A labelled settings group (design "10 · Settings"): mono label, then a 16 px-radius card. */
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-[18px]">
      <SectionLabel className="pl-1">{label}</SectionLabel>
      <div className="mt-2 rounded-xl bg-card shadow-card">{children}</div>
    </section>
  );
}

function Row({
  divided = false,
  className,
  children,
}: {
  divided?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("px-4 py-3.5", divided && "border-t border-border", className)}>
      {children}
    </div>
  );
}

function SwitchRow({
  id,
  title,
  hint,
  checked,
  onChange,
}: {
  id: string;
  title: string;
  hint: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="flex min-h-[54px] items-center justify-between gap-3 border-t border-border px-4 py-2">
      <label htmlFor={id}>
        <span className="block text-[15px] font-medium">{title}</span>
        <span className="mt-0.5 block text-[13px] text-muted-foreground">{hint}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
