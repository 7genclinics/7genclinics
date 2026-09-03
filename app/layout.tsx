import type { Metadata, Viewport } from "next";
import { Syne, Manrope, Poppins, Playfair_Display } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { BRAND } from "@/lib/brand/site";
import { SITE_ORIGIN, SITE_URL } from "@/lib/seo/site";
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

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.name}, Pakistan's best online and physical clinic platform`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  keywords: [
    "hybrid clinic",
    "pakistan",
    "online consultation",
    "in clinic appointment",
    "walk in clinic",
    "video doctor",
    "PMDC doctors",
    BRAND.name,
  ],
  authors: [{ name: BRAND.name, url: SITE_ORIGIN }],
  openGraph: {
    type: "website",
    locale: "en_PK",
    siteName: BRAND.name,
    title: `${BRAND.name}, Pakistan's best online and physical clinic platform`,
    description: BRAND.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name}, Pakistan's best online and physical clinic platform`,
    description: BRAND.description,
  },
  icons: {
    icon: [
      { url: "/apna-clinic-favicon.png", type: "image/png", sizes: "any" },
      { url: "/apna-clinic-favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/apna-clinic-favicon.png", type: "image/png", sizes: "192x192" },
      { url: "/apna-clinic-favicon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apna-clinic-favicon.png", sizes: "180x180", type: "image/png" }],
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
    <html lang="en" className={`${manrope.variable} ${syne.variable} ${poppins.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
