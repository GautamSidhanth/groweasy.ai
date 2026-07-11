import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrowEasy AI CSV Importer — Import Leads from Any CSV Format",
  description: "Upload any CSV — Facebook Leads, Google Ads, Real Estate CRMs — and our AI intelligently maps it to GrowEasy CRM format.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
