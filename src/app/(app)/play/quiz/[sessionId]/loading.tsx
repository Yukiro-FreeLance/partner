export default function QuizLoading() {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-xl gap-4 px-4 py-5" aria-busy="true" aria-live="polite">
      <p className="text-sm text-muted-foreground">Loading this question…</p>
      <div className="h-2 rounded-full bg-secondary" />
      <div className="panel h-64 animate-pulse bg-card" />
    </main>
  );
}
