export function CycleSetup() {
  return (
    <section className="panel p-6">
      <h1 className="font-serif text-3xl">Cycle tracker needs a database update</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Run <code>supabase/migrations/20261025193000_cycle_tracker.sql</code> in the Supabase SQL editor, or apply the migration folder with the Supabase CLI. Then reload this page. Local mode without Supabase does not need that step.</p>
    </section>
  );
}
