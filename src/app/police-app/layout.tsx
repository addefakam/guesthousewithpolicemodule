import type { Metadata, Viewport } from "next";
import "@/i18n/config";

export const metadata: Metadata = {
  title: "GHMS Police",
  description: "Standalone police module app — guesthouse room availability & guest monitoring",
  manifest: "/police-app/manifest.json",
  icons: {
    icon: [
      { url: "/police-app/icon.svg", type: "image/svg+xml" },
      { url: "/police-app/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/police-app/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GHMS Police",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F6F7FB",
};

export default function PoliceAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#F6F7FB] text-slate-900 antialiased">
      {children}
    </div>
  );
}
