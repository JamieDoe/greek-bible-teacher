import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Greek Bible Teacher",
  description: "Learn to read the Greek New Testament.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
