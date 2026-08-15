import type { Metadata, Viewport } from "next";
import { Syne, Manrope, Poppins } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { BRAND } from "@/lib/brand/site";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND.name} — Hybrid Clinic Care in Pakistan`,
  description: BRAND.description,
  keywords: [
    "hybrid clinic",
    "pakistan",
    "online consultation",
    "in clinic appointment",
    "walk-in clinic",
    "video doctor",
    "PMDC doctors",
    BRAND.name,
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo-32.png", type: "image/png", sizes: "32x32" },
      { url: "/logo-48.png", type: "image/png", sizes: "48x48" },
      { url: "/logo-96.png", type: "image/png", sizes: "96x96" },
      { url: "/logo-144.png", type: "image/png", sizes: "144x144" },
      { url: "/logo-192.png", type: "image/png", sizes: "192x192" },
      { url: "/logo-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/logo-192.png", sizes: "192x192", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BRAND.shortName,
  },
};

export const viewport: Viewport = {
  themeColor: "#47AFA0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${syne.variable} ${poppins.variable}`}>
      <body className="font-sans antialiased">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
