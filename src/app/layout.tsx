import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://emmytechnology.com";
const OG_IMAGE =
  "https://ouvdainkxpaegczdinlp.supabase.co/storage/v1/object/public/assest/emmytech%20logo%202.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "EmmyTech Spin & Win — Free Spin, Cash & Gadgets",
  description:
    "Spin the EmmyTech wheel for a chance to win cash, gadgets, and more. Register free, spin now, and refer friends for bonus spins.",
  openGraph: {
    title: "EmmyTech Spin & Win 🎡",
    description:
      "Spin free. Win cash, gadgets, and more. Refer a friend and get an extra spin.",
    url: SITE_URL,
    siteName: "EmmyTech Spin & Win",
    images: [
      {
        url: OG_IMAGE,
        width: 800,
        height: 800,
        alt: "EmmyTech Spin & Win",
      },
    ],
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EmmyTech Spin & Win 🎡",
    description:
      "Spin free. Win cash, gadgets, and more. Refer a friend and get an extra spin.",
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}