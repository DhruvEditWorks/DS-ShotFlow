import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DS ShotFlow",
    short_name: "ShotFlow",
    description: "Cinematic shot list and screenplay breakdown workspace",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [
      {
        src: "/logo.svg",
        sizes: "320x96",
        type: "image/svg+xml"
      }
    ]
  };
}
