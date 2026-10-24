import { redirect } from "next/navigation";
import { JoinForm } from "@/components/join-form";
import { SiteHeader } from "@/components/site";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "Join your partner" };

export default async function JoinPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/join");
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <h1 className="font-serif text-4xl">Join your partner</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter the invitation code they sent you.</p>
        <div className="mt-6"><JoinForm /></div>
      </main>
    </>
  );
}
