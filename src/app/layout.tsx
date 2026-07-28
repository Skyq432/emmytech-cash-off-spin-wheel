import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://emmytechnology.com";
const OG_IMAGE =
  "https://ouvdainkxpaegczdinlp.supabase.co/storage/v1/object/public/assest/emmytech%20logo%202.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Spin & Win Cash | EmmyTech Cash Off Challenge",
  description:
    "Spin the EmmyTech wheel for a chance to win cash, Cash Off shopping credit, gadgets, and bonus spins. Register free and share your referral link for more chances to play.",
  openGraph: {
    title: "Spin & Win with EmmyTech 🎡",
    description:
      "Get a free spin for a chance to win cash, Cash Off shopping credit, gadgets, and bonus spins. Share with friends for more chances to play.",
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
    title: "Spin & Win with EmmyTech 🎡",
    description:
      "Get a free spin for a chance to win cash, Cash Off shopping credit, gadgets, and bonus spins.",
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
