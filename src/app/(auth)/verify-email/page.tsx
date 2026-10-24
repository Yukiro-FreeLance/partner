import { ResendForm } from "@/components/auth-forms";
import { SiteHeader } from "@/components/site";
import { verifyAction } from "@/app/actions";

export const metadata = { title: "Verify email", robots: { index: false } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string; status?: string }> }) {
  const { token, status } = await searchParams;
  const result = token ? await verifyAction(token) : null;
  const verified = status === "ready" || Boolean(result && !result.error);
  const invalid = status === "invalid" || Boolean(result?.error);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <h1 className="font-serif text-4xl">Verify your email</h1>
        {verified && <p className="mt-4 text-sm" role="status">Email verified. You can sign in.</p>}
        {invalid && <p className="mt-4 text-sm" role="alert">{result?.error ?? "This verification link is invalid or expired."}</p>}
        {verified && <p className="mt-4 text-sm"><a className="font-medium text-primary underline" href="/home">Continue</a></p>}
        <ResendForm />
      </main>
    </>
  );
}
