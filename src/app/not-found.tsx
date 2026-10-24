import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-20">
      <h1 className="font-serif text-5xl">That page is not here</h1>
      <Link href="/" className="mt-6 inline-block underline">Back home</Link>
    </main>
  );
}
