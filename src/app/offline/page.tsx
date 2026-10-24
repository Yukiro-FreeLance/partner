import Link from "next/link";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="font-serif text-3xl text-primary">CoupleSync</p>
      <h1 className="mt-4 font-serif text-4xl">You are offline</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Your couple space will be here when the connection returns. Answers stay on the server, so nothing is lost from this pause.</p>
      <Link href="/home" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-primary-foreground">Try again</Link>
    </main>
  );
}
