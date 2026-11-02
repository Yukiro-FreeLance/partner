import Link from "next/link";
import { PlaceForm } from "@/components/journal-forms";
export const metadata = { title: "Add place" };
export default function NewPlacePage() { return <main className="mx-auto max-w-2xl px-4 py-6"><Link href="/journal" className="text-sm underline">Back to journal</Link><h1 className="mt-4 font-serif text-4xl">Add a place</h1><p className="mt-2 text-sm text-muted-foreground">Add coordinates to see this memory on your map.</p><section className="panel mt-5 p-5"><PlaceForm /></section></main>; }
