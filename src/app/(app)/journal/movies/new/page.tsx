import Link from "next/link";
import { MovieForm } from "@/components/journal-forms";
export const metadata = { title: "Add movie" };
export default function NewMoviePage() { return <main className="mx-auto max-w-2xl px-4 py-6"><Link href="/journal" className="text-sm underline">Back to journal</Link><h1 className="mt-4 font-serif text-4xl">Add a movie</h1><p className="mt-2 text-sm text-muted-foreground">Search integrations can fill these details later; manual entries work without an API key.</p><section className="panel mt-5 p-5"><MovieForm /></section></main>; }
