import type { Metadata } from "next";
import Link from "next/link";
import { confirmPairAction } from "@/app/actions";
import { SiteHeader } from "@/components/site";
import { Avatar } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { siteUrl } from "@/lib/config";
import { getRepository } from "@/lib/data";
import { activeMembership } from "@/lib/services/access";
import { previewInvitation } from "@/lib/services/couples";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const repo = await getRepository();
  const preview = await previewInvitation(repo, decodeURIComponent(code));
  const title = preview.ok ? `Join ${preview.data.inviter.displayName} on CoupleSync` : "CoupleSync invitation";
  const description = preview.ok
    ? `${preview.data.inviter.displayName} invited you to the private couple space ${preview.data.couple.name}.`
    : "A private invitation to pair on CoupleSync.";
  const url = `${siteUrl()}/invite/${encodeURIComponent(code)}`;
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, url, siteName: "CoupleSync", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function InvitePage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ error?: string }> }) {
  const { code } = await params;
  const { error } = await searchParams;
  const repo = await getRepository();
  const preview = await previewInvitation(repo, decodeURIComponent(code));
  const user = await getCurrentUser();
  const membership = user ? await activeMembership(repo, user.profile.id) : null;
  const returnPath = `/invite/${encodeURIComponent(code)}`;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg px-4 py-10">
        {!preview.ok ? <h1 className="font-serif text-4xl">{preview.error}</h1> : (
          <section className="overflow-hidden rounded-[2rem] bg-white shadow-[var(--shadow)]">
            <div className="bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_48%,#e879f9_100%)] px-6 py-8 text-white">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase">CoupleSync invitation</p>
              <h1 className="mt-3 font-serif text-4xl">Pair with {preview.data.inviter.displayName}</h1>
              <p className="mt-2 text-sm text-white/85">{preview.data.couple.name}</p>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 rounded-3xl bg-secondary p-4 text-left">
                <Avatar name={preview.data.inviter.displayName} src={preview.data.inviter.avatarUrl} className="size-16 text-lg" />
                <div>
                  <p className="font-serif text-2xl">{preview.data.inviter.displayName}</p>
                  <p className="text-sm text-muted-foreground">{preview.data.inviter.relationshipStatus || "Relationship status not added"}</p>
                  <p className="text-sm">Couple space: {preview.data.couple.name}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">Pairing connects only these two accounts. If this is not your partner, leave this page and ask for a new invitation.</p>
              {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
              {!user && (
                <div className="mt-6 flex flex-col gap-3">
                  <Button asChild><Link href={`/login?next=${encodeURIComponent(returnPath)}`}>Sign in to continue</Link></Button>
                  <Button asChild variant="outline"><Link href={`/register?next=${encodeURIComponent(returnPath)}`}>Create an account</Link></Button>
                </div>
              )}
              {user && user.profile.id === preview.data.inviter.id && <p className="mt-6 text-sm">This is your invitation. Share the code or QR from the pairing page.</p>}
              {user && user.profile.id !== preview.data.inviter.id && membership && <p className="mt-6 text-sm">You already belong to a couple space. Leave it before joining this one.</p>}
              {user && user.profile.id !== preview.data.inviter.id && !membership && (
                <form action={confirmPairAction} className="mt-6 grid gap-3" data-testid="join-couple">
                  <input type="hidden" name="code" value={code} />
                  <Button type="submit">Accept invitation</Button>
                  <Button asChild variant="outline"><Link href="/join">This is not my partner</Link></Button>
                </form>
              )}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
