import type { ReactNode } from "react";
import { QrCode, Shield, Users } from "lucide-react";
import { SiteHeader } from "@/components/site";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-6xl items-stretch gap-6 px-4 py-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:py-12">
        <section className="relative min-h-56 overflow-hidden rounded-[2rem] shadow-[0_28px_60px_-36px_rgba(109,40,217,0.45)] sm:min-h-72 lg:min-h-[40rem]">
          <img src="/brand/banner.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[72%_40%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          <img src="/brand/better-together.png" alt="Better together" className="absolute top-4 right-4 h-10 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:h-12" />
          <img src="/brand/heart-doodle.png" alt="" className="absolute top-14 right-5 h-6 w-auto sm:h-7" />
          <div className="relative flex h-full flex-col justify-end p-6 text-white sm:p-8">
            <p className="text-xs font-semibold tracking-[0.16em] uppercase">Private pairing</p>
            <h2 className="mt-3 max-w-sm font-serif text-3xl sm:text-4xl">A space that holds two people.</h2>
            <ul className="mt-5 hidden gap-3 text-sm lg:grid">
              <li className="flex items-center gap-3"><QrCode className="size-4 shrink-0" aria-hidden /> Share a code, a link, or a QR code.</li>
              <li className="flex items-center gap-3"><Users className="size-4 shrink-0" aria-hidden /> Confirm your partner before you connect.</li>
              <li className="flex items-center gap-3"><Shield className="size-4 shrink-0" aria-hidden /> Codes expire, and a used invite cannot be reused.</li>
            </ul>
          </div>
        </section>
        <section className="rounded-[2rem] border border-white bg-white p-6 shadow-[0_24px_50px_-36px_rgba(109,40,217,0.45)] sm:p-8">
          <h1 className="font-serif text-4xl text-[#3b0764]">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </section>
      </main>
    </>
  );
}
