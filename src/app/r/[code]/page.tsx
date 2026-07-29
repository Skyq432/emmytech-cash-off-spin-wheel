import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase-admin";
import ReferralRedirect from "./ReferralRedirect";

type PageProps = {
  params: Promise<{ code: string }>;
};

type Referrer = {
  full_name: string | null;
  last_prize_won: string | null;
  last_prize_type: string | null;
};

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://emmytechnology.com";
const LOGO_IMAGE =
  "https://ouvdainkxpaegczdinlp.supabase.co/storage/v1/object/public/assest/emmytech%20logo%202.png";
const GENERIC_TITLE = "🎡 Spin the EmmyTech wheel — win cash and prizes!";
const GENERIC_DESCRIPTION =
  "Free spin. Real prizes. Win cash, gadgets, Cash Off shopping credit, and bonus spins.";

function validReferralCode(value: string) {
  const code = value.trim();
  return /^[a-z0-9]{5,20}$/i.test(code) ? code : null;
}

function firstName(referrer: Referrer) {
  return referrer.full_name?.trim().split(/\s+/)[0]?.slice(0, 32) || "Your friend";
}

async function getReferrer(code: string | null): Promise<Referrer | null> {
  if (!code) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from("spin_players")
      .select("full_name, last_prize_won, last_prize_type")
      .eq("referral_code", code)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

function buildTitle(referrer: Referrer | null) {
  if (!referrer) return GENERIC_TITLE;

  const name = firstName(referrer);
  const prize = referrer.last_prize_won?.trim();

  switch (referrer.last_prize_type) {
    case "cash":
      return prize
        ? `${name} just won ${prize} in the EmmyTech Cash Challenge — spin yours!`
        : `${name} invited you to the EmmyTech Cash Challenge!`;
    case "letter":
      return prize
        ? `${name} unlocked ${prize} on EmmyTech — collect yours!`
        : `${name} is playing the EmmyTech letter challenge — join in!`;
    case "bonus":
    case "bonus_spin":
      return `${name} earned a bonus spin on EmmyTech — spin yours!`;
    case "retry":
      return `${name} invited you to spin the EmmyTech wheel!`;
    case "prize":
      return prize
        ? `${name} just won ${prize} on EmmyTech — spin yours!`
        : `${name} invited you to spin the EmmyTech wheel!`;
    default:
      return prize
        ? `${name} just landed on ${prize} on EmmyTech — spin yours!`
        : `${name} invited you to spin the EmmyTech wheel!`;
  }
}

function buildDescription(referrer: Referrer | null) {
  if (!referrer) return GENERIC_DESCRIPTION;

  const name = firstName(referrer);

  if (referrer.last_prize_type === "cash") {
    return `${name} is taking on the EmmyTech Cash Challenge. Spin free for a chance to win cash, Cash Off shopping credit, gadgets, and bonus spins.`;
  }

  if (referrer.last_prize_type === "letter") {
    return `${name} is collecting letters in the EmmyTech challenge. Join with a free spin and start building your own rewards.`;
  }

  return `${name} invited you to spin the EmmyTech wheel. It is free, with chances to win cash, Cash Off shopping credit, gadgets, and bonus spins.`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = validReferralCode(rawCode);
  const referrer = await getReferrer(code);
  const title = buildTitle(referrer);
  const description = buildDescription(referrer);
  const referralPath = code ? `/r/${encodeURIComponent(code)}` : "/";
  const url = new URL(referralPath, SITE_URL).toString();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "EmmyTech Spin & Win",
      images: [
        {
          url: LOGO_IMAGE,
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
      title,
      description,
      images: [LOGO_IMAGE],
    },
  };
}

export default async function ReferralPage({ params }: PageProps) {
  const { code: rawCode } = await params;
  const code = validReferralCode(rawCode);
  const destination = code ? `/?ref=${encodeURIComponent(code)}` : "/";

  return (
    <ReferralRedirect
      destination={destination}
      referralCode={code}
    />
  );
}
