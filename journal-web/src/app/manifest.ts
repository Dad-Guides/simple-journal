import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Simple Journal",
    short_name: "Journal",
    description: "Tailnet-only anger, gratitude, and creative journaling.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f4ee",
    theme_color: "#4b5a7a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "64x64 32x32 24x24 16x16",
        type: "image/x-icon",
      },
    ],
  };
}
