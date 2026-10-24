import { redirect } from "next/navigation";
import { newInviteAction, regenerateInviteAction, revokeInviteAction } from "@/app/actions";
import { InviteQr } from "@/components/invite-qr";
import { CreateCoupleForm, JoinForm } from "@/components/join-form";
import { CopyInviteLink, PairingWatch, ShareInviteLink } from "@/components/pairing-tools";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { siteUrl } from "@/lib/config";
import { getRepository } from "@/lib/data";
import { activeMembership, couplePartners } from "@/lib/services/access";

export const metadata = { title: "Pairing" };

export default async function PairingPage() {
  const user = await requireUser();
  const repo = await getRepository();
  const membership = await activeMembership(repo, user.profile.id);
  if (!membership) {
    return (
      <main className="mx-auto grid w-full max-w-5xl items-start gap-6 px-4 py-6 lg:grid-cols-2 lg:px-8">
        <section className="h-fit rounded-[1.75rem] bg-white p-6 shadow-[var(--shadow)]">
          <h1 className="font-serif text-4xl">Create a couple space</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">One private space. It can hold two people.</p>
          <div className="mt-6"><CreateCoupleForm /></div>
        </section>
        <section className="h-fit rounded-[1.75rem] bg-white p-6 shadow-[var(--shadow)]">
          <h2 className="font-serif text-3xl">Join with a code</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">You will see your partner’s name before the space connects.</p>
          <div className="mt-6"><JoinForm /></div>
        </section>
      </main>
    );
  }
  const partners = await couplePartners(repo, membership.coupleId);
  if (partners.length >= 2) redirect("/home");
  const couple = await repo.find("couples", { eq: { id: membership.coupleId } });
  const now = new Date().toISOString();
  const invites = (await repo.list("coupleInvitations", { eq: { coupleId: membership.coupleId, status: "pending" } }))
    .filter((invite) => invite.expiresAt > now)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const invite = invites[0];
  const link = invite ? `${siteUrl()}/invite/${invite.token}` : "";
  return (
    <main className="mx-auto grid w-full max-w-6xl items-start gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1.2fr)_20rem] lg:px-8">
      <section className="overflow-hidden rounded-[1.75rem] bg-white shadow-[var(--shadow)]">
        <div className="bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_48%,#e879f9_100%)] px-6 py-8 text-white">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase">CoupleSync invitation</p>
          <h1 className="mt-3 font-serif text-4xl">{couple?.name ?? "Your couple space"}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/85">Share one invitation by code, link, or QR. Regenerating replaces the previous code. A used or revoked invitation cannot connect anyone else.</p>
          {invite ? <p data-testid="invite-code" className="mt-8 font-serif text-5xl tracking-[0.22em]">{invite.code}</p> : null}
        </div>
        <div className="grid gap-4 p-6">
          {invite ? (
            <>
              <div className="rounded-3xl border bg-[#fbf7fc] p-4">
                <p className="text-xs font-semibold tracking-[0.16em] text-rose uppercase">Invitation link</p>
                <p className="mt-2 break-all text-sm leading-6">{link}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ShareInviteLink url={link} coupleName={couple?.name ?? "CoupleSync"} />
                <CopyInviteLink url={link} />
                <form action={regenerateInviteAction}><Button type="submit" variant="secondary">Regenerate code and QR</Button></form>
                <form action={revokeInviteAction}><input type="hidden" name="invitationId" value={invite.id} /><Button type="submit" variant="outline">Revoke invitation</Button></form>
              </div>
              <PairingWatch />
            </>
          ) : (
            <form action={newInviteAction}><Button type="submit">Create invitation</Button></form>
          )}
        </div>
      </section>
      {invite && (
        <section className="rounded-[1.75rem] bg-white p-6 text-center shadow-[var(--shadow)]">
          <h2 className="font-serif text-2xl">Scan to join</h2>
          <div className="mt-4"><InviteQr url={link} /></div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">The code opens {siteUrl().replace(/^https?:\/\//, "")}. Your partner confirms your profile before pairing is complete.</p>
        </section>
      )}
    </main>
  );
}
