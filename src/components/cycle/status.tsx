export function CycleStatus({ saved, error }: { saved?: string; error?: string }) {
  if (error) return <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>;
  if (saved) return <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Saved.</p>;
  return null;
}

export function CycleBlocked() {
  return <section className="panel p-6"><h1 className="font-serif text-3xl">Cycle tracker</h1><p className="mt-2 text-sm text-muted-foreground">Cycle records stay hidden while an administrator is viewing this account.</p></section>;
}
