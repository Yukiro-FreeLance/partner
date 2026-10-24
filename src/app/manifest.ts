import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CoupleSync",
    short_name: "CoupleSync",
    description: "A private way for two people to learn each other.",
    start_url: "/home",
    display: "standalone",
    background_color: "#f6f3fb",
    theme_color: "#6d28d9",
    icons: [{ src: "/brand/logo.jpg", sizes: "512x512", type: "image/jpeg" }],
  };
}
