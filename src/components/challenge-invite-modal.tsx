"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock3, Gamepad2, X } from "lucide-react";
import { Avatar } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { arcadeGame } from "@/lib/games/catalog";

export type ChallengeInvite = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  metadata: Record<string, string> | null;
};

export function ChallengeInviteModal({ invite, onClose, onRespond }: { invite: ChallengeInvite; onClose: () => void; onRespond: (response: "accept" | "reject" | "wait") => void }) {
  const game = arcadeGame(invite.metadata?.gameSlug ?? "");
  const [seconds, setSeconds] = useState(30);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const expired = seconds === 0;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="challenge-title" className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/60 bg-card text-card-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="relative bg-gradient-to-br from-primary/20 via-secondary to-card px-6 pb-6 pt-7 text-center">
          <button type="button" onClick={onClose} aria-label="Close challenge invitation" className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-card/70"><X className="size-4" /></button>
          <Avatar name={invite.metadata?.challengerName ?? "Your partner"} src={invite.metadata?.challengerAvatarUrl || null} className="mx-auto size-16 border-4 border-card text-lg" />
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-primary">New challenge</p>
          <h2 id="challenge-title" className="mt-1 font-serif text-3xl">{invite.metadata?.challengerName ?? "Your partner"} challenged you</h2>
        </div>
        <div className="grid gap-4 px-6 py-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-muted/30">
            {game ? <img src={`/games/${game.slug}.svg`} alt={`${game.title} preview`} className="h-32 w-full object-cover" /> : <div className="flex h-24 items-center justify-center bg-primary/10"><Gamepad2 className="size-8 text-primary" aria-hidden /></div>}
            <div className="flex items-center gap-3 p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl" aria-hidden>{game?.emoji ?? <Gamepad2 className="size-5 text-primary" />}</span><div><p className="font-medium">{game?.title ?? "Arcade challenge"}</p><p className="text-sm text-muted-foreground">{invite.body}</p></div></div>
          </div>
          <p className={`flex items-center justify-center gap-2 text-xs ${expired ? "text-destructive" : "text-muted-foreground"}`}><Clock3 className="size-3.5" /> {expired ? "Invitation expired" : `Respond within ${seconds}s`}</p>
          <div className="grid gap-2 sm:grid-cols-2"><Button type="button" disabled={expired} onClick={() => onRespond("accept")}>Accept challenge</Button><Button type="button" variant="outline" disabled={expired} onClick={() => onRespond("reject")}>Reject</Button></div>
          {!expired && <Button type="button" variant="ghost" onClick={() => onRespond("wait")}>Wait a few seconds</Button>}
          {invite.href && <Link href={invite.href} onClick={() => onRespond("accept")} className="text-center text-xs text-primary underline">Open match details</Link>}
        </div>
      </section>
    </div>
  );
}
