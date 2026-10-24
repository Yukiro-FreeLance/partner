import { ImageResponse } from "next/og";
import { getRepository } from "@/lib/data";
import { previewInvitation } from "@/lib/services/couples";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "CoupleSync invitation";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const repo = await getRepository();
  const preview = await previewInvitation(repo, decodeURIComponent(code));
  const name = preview.ok ? preview.data.inviter.displayName : "your partner";
  const space = preview.ok ? preview.data.couple.name : "A private couple space";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 48%, #e879f9 100%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 6 }}>COUPLESYNC</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 32, opacity: 0.9 }}>You're invited</div>
          <div style={{ display: "flex", marginTop: 16, fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>Pair with {name}</div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 36 }}>{space}</div>
        </div>
        <div style={{ display: "flex", fontSize: 28 }}>sync.wendev.site</div>
      </div>
    ),
    size,
  );
}
