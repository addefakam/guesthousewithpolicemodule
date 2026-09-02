import type { Metadata, Viewport } from "next";
import "@/i18n/config";

export const metadata: Metadata = {
  title: "GHMS Mobile",
  description: "Guest House Management — Mobile Operator App",
  manifest: "/m-icons/manifest.json",
  icons: {
    icon: "/m-icons/favicon-32.png",
    apple: "/m-icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GHMS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#059669",
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="icon" type="image/png" sizes="32x32" href="/m-icons/favicon-32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/m-icons/favicon-16.png" />
      <link rel="apple-touch-icon" sizes="192x192" href="/m-icons/icon-192x192.png" />
      <div className="min-h-dvh bg-gray-50 text-gray-900 antialiased">
        {children}
      </div>
    </>
  );
}