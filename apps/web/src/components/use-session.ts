"use client";

import { type DisclosureLevel, sessionResponseSchema } from "@gbt/shared";
import { useCallback, useEffect, useState } from "react";
import { apiPatch } from "@/lib/api-client";
import { ensureSession } from "@/lib/session";

/**
 * Starts (or resumes) the anonymous session and exposes the learner's remembered disclosure
 * level. Until the session loads, the reader uses "beginner".
 */
export function useSession() {
  const [level, setLevel] = useState<DisclosureLevel>("beginner");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureSession()
      .then(({ user }) => {
        if (!cancelled) setLevel(user.disclosureLevel);
      })
      .catch((err: unknown) => console.error("[session] could not start session", err))
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const changeLevel = useCallback(
    (next: DisclosureLevel) => {
      const previous = level;
      setLevel(next);
      apiPatch("/me/preferences", sessionResponseSchema, { disclosureLevel: next }).catch(
        (err: unknown) => {
          console.error("[session] could not save disclosure level", err);
          setLevel(previous);
        },
      );
    },
    [level],
  );

  return { level, changeLevel, ready };
}
