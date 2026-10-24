import { ForgotForm } from "@/components/auth-forms";
import { SiteHeader } from "@/components/site";

export const metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <h1 className="font-serif text-4xl">Reset your password</h1>
        <div className="mt-6"><ForgotForm /></div>
      </main>
    </>
  );
}
