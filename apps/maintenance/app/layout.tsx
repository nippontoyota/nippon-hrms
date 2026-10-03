import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geist = Geist({
  variable: "--font-inter", // keeping variable name to avoid refactoring CSS
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    template: "%s | Nippon Toyota",
      default: "Maintenance operations | Nippon Toyota",
  },
  description: "Internal maintenance ticket queue for Nippon Toyota teams.",
  robots: {
    index: false,
    follow: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/maintenance-mark-v2.png",
    apple: "/maintenance-mark-v2.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
