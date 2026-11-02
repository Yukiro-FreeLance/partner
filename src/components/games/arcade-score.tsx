"use client";

import { createContext, useContext, useEffect, useRef } from "react";

export type ArcadeMode = "solo" | "partner";
export type ArcadeKind = "solo" | "challenge" | "hotseat";
export type ArcadeSeat = "host" | "guest";

type ArcadeScoreContextValue = {
  mode: ArcadeMode;
  kind: ArcadeKind;
  seat: ArcadeSeat;
  pvp: boolean;
  reportScore: (score: number) => void;
};

const ArcadeScoreContext = createContext<ArcadeScoreContextValue>({
  mode: "solo",
  kind: "solo",
  seat: "host",
  pvp: false,
  reportScore: () => {},
});

export function ArcadeScoreProvider({
  value,
  children,
}: {
  value: ArcadeScoreContextValue;
  children: React.ReactNode;
}) {
  return <ArcadeScoreContext.Provider value={value}>{children}</ArcadeScoreContext.Provider>;
}

export function useArcadeScore() {
  return useContext(ArcadeScoreContext);
}

export function useReportWhen(ready: boolean, score: number) {
  const { reportScore } = useArcadeScore();
  const sent = useRef(false);
  useEffect(() => {
    if (!ready) {
      sent.current = false;
      return;
    }
    if (sent.current) return;
    sent.current = true;
    reportScore(score);
  }, [ready, score, reportScore]);
}
