"use client";

import { useState } from "react";

export function GameCover({ slug, title, emoji }: { slug: string; title: string; emoji: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-[1.25rem] bg-secondary" aria-label={`${title} cover`}>
      {!failed && (
        <img
          src={`/games/${slug}.svg`}
          alt={`${title} game cover`}
          className="size-full object-cover transition duration-500 group-hover:scale-105"
          onError={() => setFailed(true)}
        />
      )}
      {failed && <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/20 via-secondary to-accent/30 text-5xl" aria-hidden>{emoji}</div>}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 to-transparent px-4 pb-3 pt-10">
        <p className="font-serif text-xl text-white drop-shadow-sm">{title}</p>
      </div>
    </div>
  );
}
