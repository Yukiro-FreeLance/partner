"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";

const sectionLinks = [
  ["Home", "/#top"],
  ["Features", "/#features"],
  ["How it Works", "/#how-it-works"],
  ["Pricing", "/#pricing"],
  ["FAQ", "/#faq"],
];

const footerLinks = [
  ["About", "/about"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
  ["Contact", "/contact"],
  ["Support", "/support"],
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/#top" className="flex min-h-11 items-center gap-2 text-xl font-bold tracking-tight text-primary">
          <img src="/brand/logo.jpg" alt="" width={40} height={40} className="size-10 rounded-2xl object-cover" />
          CoupleSync
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-medium lg:flex" aria-label="Primary">
          {sectionLinks.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-full px-3 py-2 hover:bg-secondary focus-visible:bg-secondary">{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden min-h-11 items-center rounded-full border bg-white px-4 text-sm font-medium sm:inline-flex">Log in</Link>
          <Button asChild><Link href="/register">Get Started</Link></Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu"><Menu /></Button>
            </DialogTrigger>
            <DialogContent className="top-auto bottom-0 left-0 w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-3xl">
              <DialogTitle>Menu</DialogTitle>
              <DialogDescription>Jump to a section, or sign in.</DialogDescription>
              <nav className="mt-4 grid" aria-label="Mobile">
                {sectionLinks.map(([label, href]) => (
                  <DialogClose asChild key={href}>
                    <Link href={href} className="flex min-h-11 items-center rounded-2xl px-2 text-base hover:bg-secondary">{label}</Link>
                  </DialogClose>
                ))}
                <DialogClose asChild>
                  <Link href="/login" className="flex min-h-11 items-center rounded-2xl px-2 hover:bg-secondary">Log in</Link>
                </DialogClose>
                <DialogClose asChild>
                  <Link href="/register" className="mt-2 flex min-h-11 items-center justify-center rounded-full bg-primary text-primary-foreground">Get Started</Link>
                </DialogClose>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-gradient-to-r from-[#6d28d9] via-[#a855f7] to-[#f9a8d4] text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <p className="flex items-center gap-2 text-2xl font-bold"><img src="/brand/logo.jpg" alt="" width={40} height={40} className="size-10 rounded-2xl object-cover" />CoupleSync</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/85">More questions. Deeper conversations. A stronger us. Sample stories on this site are fictional.</p>
        </div>
        <div className="flex flex-col gap-4 md:items-end">
          <Button asChild variant="secondary" className="bg-white text-primary hover:bg-white/90"><Link href="/register">Start Your Couple Journey</Link></Button>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Footer">
            {footerLinks.map(([label, href]) => (
              <Link key={href} href={href} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{label}</Link>
            ))}
          </nav>
        </div>
      </div>
      <p className="border-t border-white/20 px-4 py-4 text-center text-xs text-white/80">© {new Date().getFullYear()} CoupleSync. A private space for two.</p>
    </footer>
  );
}

export function Article({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="font-serif text-4xl">{title}</h1>
        <div className="mt-6 space-y-4 text-base leading-7">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
