import { ResetForm } from "@/components/auth-forms";
import { SiteHeader } from "@/components/site";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <h1 className="font-serif text-4xl">Choose a new password</h1>
        <div className="mt-6">{token ? <ResetForm token={token} /> : <p>Open the reset link from your email, or request a new one.</p>}</div>
      </main>
    </>
  );
}
