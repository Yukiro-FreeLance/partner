import { MemoryForm } from "@/components/memory-form";

export const metadata = { title: "New memory" };

export default function NewMemoryPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <h1 className="font-serif text-4xl">Save a moment</h1>
      <MemoryForm />
    </main>
  );
}
