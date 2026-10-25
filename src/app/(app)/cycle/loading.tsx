export default function CycleLoading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-live="polite">
      <div className="panel h-40 animate-pulse bg-[#f6eef8]" />
      <div className="panel h-64 animate-pulse bg-[#f6eef8]" />
      <p className="text-sm text-muted-foreground">Loading your cycle tracker.</p>
    </div>
  );
}
