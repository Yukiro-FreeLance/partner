import type { ReactNode } from "react";
import { QrCode, Shield, Users } from "lucide-react";
import { SiteHeader } from "@/components/site";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-5xl items-stretch gap-6 px-4 py-8 lg:grid-cols-2 lg:py-14">
        <section className="relative hidden overflow-hidden rounded-[2rem] lg:block">
          <img src="/brand/banner.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[center_40%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2e1064]/90 via-[#4c1d95]/55 to-[#4c1d95]/10" />
          <div className="relative flex h-full flex-col justify-end p-8 text-white">
            <p className="text-xs font-semibold tracking-[0.16em] uppercase">Private pairing</p>
            <h2 className="mt-3 max-w-sm font-serif text-4xl">A space that holds two people.</h2>
            <ul className="mt-6 grid gap-3 text-sm">
              <li className="flex items-center gap-3"><QrCode className="size-4" aria-hidden /> Share a code, a link, or a QR code.</li>
              <li className="flex items-center gap-3"><Users className="size-4" aria-hidden /> Confirm your partner before you connect.</li>
              <li className="flex items-center gap-3"><Shield className="size-4" aria-hidden /> Codes expire, and a used invite cannot be reused.</li>
            </ul>
          </div>
        </section>
        <section className="rounded-[2rem] bg-white p-6 shadow-[var(--shadow)] sm:p-8">
          <h1 className="font-serif text-4xl">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </section>
      </main>
    </>
  );
}
