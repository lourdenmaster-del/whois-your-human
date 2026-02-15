import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ligs.io";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "(L)igs | Light Identity Grid System",
  description: "A scientific identity framework. Your Light Signature, Grid, and Archetype—mapped from the physical forces present at birth.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "/",
    siteName: "LIGS",
    title: "(L)igs | Light Identity Grid System",
    description: "A scientific identity framework. Your Light Signature, Grid, and Archetype—mapped from the physical forces present at birth.",
  },
  twitter: {
    card: "summary_large_image",
    title: "(L)igs | Light Identity Grid System",
    description: "A scientific identity framework. Your Light Signature, Grid, and Archetype—mapped from the physical forces present at birth.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} antialiased font-sans`}>
        {children}
      </body>
    </html>
  );
}
