"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReportWhen } from "@/components/games/arcade-score";

type Stage = "dna" | "rna" | "protein" | "done";

const DNA = ["A", "T", "G", "C", "A", "G", "T", "C"] as const;
const COMPLEMENT: Record<string, string> = { A: "U", T: "A", G: "C", C: "G" };
const CODON_MAP: Record<string, string> = {
  AUG: "Met",
  GCU: "Ala",
  GAG: "Glu",
  UCG: "Ser",
  AUC: "Ile",
};

export default function BioverseDemo() {
  const [stage, setStage] = useState<Stage>("dna");
  const [picked, setPicked] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("Match complementary RNA bases for each DNA base");
  useReportWhen(stage === "done", score);

  const rnaTarget = useMemo(() => DNA.map((b) => COMPLEMENT[b]), []);
  const codons = useMemo(() => {
    const rna = rnaTarget.join("");
    const out: string[] = [];
    for (let i = 0; i < rna.length; i += 3) out.push(rna.slice(i, i + 3));
    return out.filter((c) => c.length === 3);
  }, [rnaTarget]);

  function reset() {
    setStage("dna");
    setPicked([]);
    setScore(0);
    setMessage("Match complementary RNA bases for each DNA base");
  }

  function pickBase(base: string) {
    if (stage !== "dna") return;
    const nextIndex = picked.length;
    const expected = rnaTarget[nextIndex];
    if (base !== expected) {
      setMessage(`Incorrect — DNA ${DNA[nextIndex]} pairs with ${expected}`);
      return;
    }
    const next = [...picked, base];
    setPicked(next);
    setScore((s) => s + 50);
    if (next.length === DNA.length) {
      setStage("rna");
      setMessage("Great! RNA transcribed. Continue to translation.");
    } else {
      setMessage(`Nice — ${next.length}/${DNA.length} bases matched`);
    }
  }

  function translateCodon(codon: string) {
    if (stage !== "protein") return;
    const idx = picked.length;
    const expected = codons[idx];
    if (codon !== expected) {
      setMessage(`That codon is ${CODON_MAP[codon] ?? "?"} — try ${expected}`);
      return;
    }
    const next = [...picked, codon];
    setPicked(next);
    setScore((s) => s + 100);
    if (next.length === codons.length) {
      setStage("done");
      setMessage("Protein synthesized! Mission complete.");
    } else {
      setMessage(`Amino acid ${CODON_MAP[codon]} added (${next.length}/${codons.length})`);
    }
  }

  function continueToProtein() {
    setStage("protein");
    setPicked([]);
    setMessage("Select the correct codon for each amino acid in order");
  }

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        <span>
          Score: <strong className="text-primary">{score}</strong>
        </span>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
          {stage === "dna" && "Transcription"}
          {stage === "rna" && "RNA Ready"}
          {stage === "protein" && "Translation"}
          {stage === "done" && "Complete"}
        </span>
        <Button size="sm" variant="outline" onClick={reset}>
          Restart
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">{message}</p>

      <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          DNA template
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {DNA.map((base, i) => (
            <span
              key={`${base}-${i}`}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-bold",
                "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
              )}
            >
              {base}
            </span>
          ))}
        </div>
      </div>

      {stage === "dna" && (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            {picked.map((base, i) => (
              <span
                key={`rna-${i}`}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-sm font-bold text-emerald-300"
              >
                {base}
              </span>
            ))}
            {Array.from({ length: DNA.length - picked.length }).map((_, i) => (
              <span
                key={`empty-${i}`}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-border/60 text-muted-foreground"
              >
                ?
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            {["A", "U", "G", "C"].map((base) => (
              <Button key={base} onClick={() => pickBase(base)} className="h-11 w-11 rounded-xl p-0 text-base">
                {base}
              </Button>
            ))}
          </div>
        </>
      )}

      {stage === "rna" && (
        <Button className="rounded-full" onClick={continueToProtein}>
          Begin Translation →
        </Button>
      )}

      {stage === "protein" && (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            {codons.map((codon, i) => (
              <span
                key={codon}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs",
                  i < picked.length
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : i === picked.length
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                      : "border-border/50 text-muted-foreground"
                )}
              >
                {i < picked.length ? CODON_MAP[codon] : codon}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {codons.map((codon) => (
              <Button
                key={`opt-${codon}`}
                variant="secondary"
                className="rounded-full"
                onClick={() => translateCodon(codon)}
              >
                {codon} → {CODON_MAP[codon]}
              </Button>
            ))}
          </div>
        </>
      )}

      {stage === "done" && (
        <div className="text-center">
          <p className="text-4xl" role="img" aria-hidden="true">
            🧬
          </p>
          <p className="mt-2 font-semibold text-primary">DNA → RNA → Protein complete</p>
          <Button className="mt-4 rounded-full" onClick={reset}>
            Play Again
          </Button>
        </div>
      )}
    </div>
  );
}
