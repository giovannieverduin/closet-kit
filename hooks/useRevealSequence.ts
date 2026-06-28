import { useEffect, useState } from "react";

export type RevealPhase = "idle" | "scanning" | "revealed";

// Drives idle -> scanning -> revealed. Call start() when results arrive;
// reset() to return to idle (e.g. on a new upload).
export function useRevealSequence(scanMs = 2200) {
  const [phase, setPhase] = useState<RevealPhase>("idle");

  useEffect(() => {
    if (phase !== "scanning") return;
    const t = setTimeout(() => setPhase("revealed"), scanMs);
    return () => clearTimeout(t);
  }, [phase, scanMs]);

  return {
    phase,
    start: () => setPhase("scanning"),
    reset: () => setPhase("idle")
  };
}
