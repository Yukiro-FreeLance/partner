"use client";

export default function PlansError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="panel m-4 p-6">
      <h1 className="font-serif text-3xl">Date plans could not load</h1>
      <p className="mt-2 text-sm text-muted-foreground">Check your connection and try again. Saved plans stay on the server.</p>
      <button type="button" className="mt-4 min-h-11 rounded-full bg-primary px-4 text-sm text-primary-foreground" onClick={reset}>Try again</button>
    </section>
  );
}
