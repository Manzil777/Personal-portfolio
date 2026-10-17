import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeToggle } from "@/components/theme-toggle";
import { site } from "@/data/site";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Manzil Shrestha", template: "%s | Manzil Shrestha" },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: { title: "Manzil Shrestha", description: site.description, type: "website" },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

const themeScript = `try{const t=localStorage.getItem('manzil-portfolio-theme');document.documentElement.classList.toggle('dark',t?t==='dark':!matchMedia('(prefers-color-scheme: light)').matches)}catch(e){document.documentElement.classList.add('dark')}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <ThemeToggle />
        </header>
        {children}
      </body>
    </html>
  );
}
