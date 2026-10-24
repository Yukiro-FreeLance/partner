import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "CoupleSync — How well do you really know your person?";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 72, background: "#fbf6f1", color: "#2a2226" }}>
      <div style={{ fontSize: 28, letterSpacing: 2, color: "#6e3450" }}>COUPLESYNC</div>
      <div style={{ marginTop: 24, fontSize: 68, lineHeight: 1.05, maxWidth: 900 }}>How well do you really know your person?</div>
    </div>,
    size,
  );
}
