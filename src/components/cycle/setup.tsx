export function CycleSetup() {
  return (
    <section className="panel p-6">
      <h1 className="font-serif text-3xl">Cycle tracker needs a database update</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Opening the app on localhost still uses your Supabase project when those keys are set. Run <code>supabase/migrations/20261025193000_cycle_tracker.sql</code> in the Supabase SQL editor, or apply the migration folder with the Supabase CLI, then reload this page.</p>
    </section>
  );
}
