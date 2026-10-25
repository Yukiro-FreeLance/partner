"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pairingStatusAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function CopyInviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        void navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? "Link copied" : "Copy invitation link"}
    </Button>
  );
}

export function ShareInviteLink({ url, coupleName }: { url: string; coupleName: string }) {
  const [note, setNote] = useState("");
  return (
    <Button
      type="button"
      onClick={() => {
        const payload = { title: "Join me on CoupleSync", text: `You're invited to ${coupleName}. Open this private invitation on CoupleSync.`, url };
        if (typeof navigator.share === "function") {
          void navigator.share(payload).then(() => setNote("Shared")).catch(() => undefined);
          return;
        }
        void navigator.clipboard.writeText(url).then(() => setNote("Link copied"));
      }}
    >
      {note || "Share invitation"}
    </Button>
  );
}

export function PairingWatch() {
  const router = useRouter();
  useEffect(() => {
    let stopped = false;
    async function check() {
      const status = await pairingStatusAction();
      if (!stopped && status.paired) router.push("/home");
    }
    void check();
    const timer = window.setInterval(() => void check(), 4000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [router]);
  return <p className="text-sm text-muted-foreground">When your partner opens this invitation, this page opens your shared home.</p>;
}
