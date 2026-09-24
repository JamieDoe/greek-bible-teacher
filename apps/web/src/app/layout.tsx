import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Literata } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { InlineScript } from "@/components/inline-script";
import { OfflineBanner, ServiceWorkerRegistration } from "@/components/pwa";
import { applyPreferences } from "@/lib/preferences";
import "./globals.css";

// Koinē type: Literata for Greek and headings (polytonic via greek-ext), Geist for the
// interface, Geist Mono for labels. All SIL OFL 1.1; next/font self-hosts them at build.
const literata = Literata({
  subsets: ["latin", "greek", "greek-ext"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-literata",
  display: "swap",
});
const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Greek Bible Teacher", template: "%s · Greek Bible Teacher" },
  description: "Learn to read the Greek New Testament.",
  applicationName: "Greek Bible Teacher",
  appleWebApp: { capable: true, title: "Greek", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  // Draw under the notch/home indicator in standalone mode; the nav and sheet pad with
  // env(safe-area-inset-*).
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2ec" },
    { media: "(prefers-color-scheme: dark)", color: "#11100e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${literata.variable} ${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <InlineScript html={`(${applyPreferences.toString()})()`} />
      </head>
      <body className="flex min-h-full flex-col">
        <OfflineBanner />
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
