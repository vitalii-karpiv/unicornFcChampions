import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Unicorn FC Champions", template: "%s · Unicorn FC" },
  description: "Elo ratings, monthly awards and bragging rights for our FC matches.",
  appleWebApp: { capable: true, title: "Unicorn FC", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* black-translucent makes iOS draw the status text white; tint the strip behind it in light theme so it stays readable */}
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[env(safe-area-inset-top)] bg-neutral-950 dark:hidden" />
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
