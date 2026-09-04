import type { Metadata, Viewport } from "next";
import "@/i18n/config";

export const metadata: Metadata = {
  title: "GHMS Police",
  description: "Standalone police module app — guesthouse room availability & guest monitoring",
  manifest: "/police-app/manifest.json",
  icons: {
    icon: "/police-app/icon.svg",
    apple: "/police-app/icon.svg",
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
  themeColor: "#0B1D3A",
};

export default function PoliceAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#081426] text-slate-100 antialiased">
      {children}
    </div>
  );
}
