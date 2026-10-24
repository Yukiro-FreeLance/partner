import QRCode from "qrcode";

export async function InviteQr({ url }: { url: string }) {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    width: 220,
    color: { dark: "#4c1d95", light: "#ffffff" },
  });
  return <div className="mx-auto w-52 rounded-3xl bg-white p-3 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
