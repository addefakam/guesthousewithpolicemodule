import type { Metadata, Viewport } from "next";
import "@/i18n/config";

export const metadata: Metadata = {
  title: "GHMS Mobile",
  description: "Guest House Management — Mobile Operator App",
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
  themeColor: "#0f172a",
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900 antialiased">
      {children}
    </div>
  );
}
