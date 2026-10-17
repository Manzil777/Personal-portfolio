import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import { site } from "@/data/site";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://manzil.vercel.app";

const themeScript = `try{var t=localStorage.getItem("manzil-ui-theme");if(t==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.classList.add(t||"dark")}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Manzil Shrestha",
  description: site.description,
  applicationName: "Manzil Shrestha",
  authors: [{ name: "Manzil Shrestha", url: "https://github.com/Manzil777" }],
  creator: "Manzil Shrestha",
  alternates: { canonical: "/" },
  keywords: [
    "Manzil Shrestha",
    "AI",
    "Data Science",
    "Machine Learning",
    "MLOps",
    "portfolio",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Manzil Shrestha",
    title: "Manzil Shrestha",
    description: site.description,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Manzil Shrestha, AI and Data Science student, beside a dot drawing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Manzil Shrestha",
    description: site.description,
    images: ["/opengraph-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c0f10" },
    { media: "(prefers-color-scheme: light)", color: "#f7f7f6" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body className="min-h-dvh">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-line focus:bg-bg focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
