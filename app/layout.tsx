import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TestModeLogger } from "@/components/TestModeLogger";

function getMetadataBase() {
  try {
    const u = (process.env.NEXT_PUBLIC_SITE_URL || "https://ligs.io").trim() || "https://ligs.io";
    return new URL(u);
  } catch {
    return new URL("https://ligs.io");
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const IOC_DESCRIPTION =
  "Enter your birthdate. Generate. Copy. Paste this into your AI chat. Then continue normally.";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "LIGS / IOC",
  description: IOC_DESCRIPTION,
  alternates: {
    canonical: "/ioc",
  },
  openGraph: {
    url: "/ioc",
    siteName: "IOC",
    title: "LIGS / IOC",
    description: IOC_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "LIGS / IOC",
    description: IOC_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="IOC — llms.txt" />
      </head>
      <body className="antialiased font-sans">
        <TestModeLogger />
        {children}
      </body>
    </html>
  );
}
