import type { Metadata } from "next";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Competition Platform",
  description: "Exercise competition platform MVP foundation.",
  manifest: "/manifest.webmanifest",
  themeColor: "#0f172a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Competition Platform",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
