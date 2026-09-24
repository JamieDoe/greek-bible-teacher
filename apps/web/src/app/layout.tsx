import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { BottomNav } from "@/components/bottom-nav";
import { OfflineBanner, ServiceWorkerRegistration } from "@/components/pwa";
import "./globals.css";

// Gentium 7 (SIL OFL 1.1), self-hosted and unmodified; see ./fonts/README.md.
const gentium = localFont({
  src: [
    { path: "./fonts/Gentium-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Gentium-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-gentium",
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
    { media: "(prefers-color-scheme: light)", color: "#f6f2ea" },
    { media: "(prefers-color-scheme: dark)", color: "#161412" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${gentium.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col pb-[calc(3rem+env(safe-area-inset-bottom))]">
        <OfflineBanner />
        {children}
        <BottomNav />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
