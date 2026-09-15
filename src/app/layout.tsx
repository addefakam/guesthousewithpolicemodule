import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/i18n/config";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Bishoftu Guest Management System",
  description: "Bishoftu Guest Management System",
  applicationName: "Bishoftu GMS",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Bishoftu GMS",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/app-icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/app-icons/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
