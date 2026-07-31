import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase-admin";
import AmbassadorSpinRedirect from "./AmbassadorSpinRedirect";

type PageProps = {
  params: Promise<{ code: string }>;
};

type AmbassadorPreview = {
  display_name: string | null;
  ambassador_tag: string | null;
  referral_code: string;
  custom_referral_code: string | null;
};

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://spinwheel.emmytechnology.com";
const LOGO_IMAGE =
  "https://ouvdainkxpaegczdinlp.supabase.co/storage/v1/object/public/assest/emmytech%20logo%202.png";

function validAmbassadorCode(value: string) {
  const code = decodeURIComponent(value).trim();
  return /^[a-z0-9_-]{3,40}$/i.test(code) ? code : null;
}

async function getAmbassador(
  code: string | null
): Promise<AmbassadorPreview | null> {
  if (!code) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from("ambassadors")
      .select(
        "display_name, ambassador_tag, referral_code, custom_referral_code"
      )
      .eq("status", "active");

    if (error) return null;

    const normalized = code.toLowerCase();
    return (
      data?.find((item) => {
        const referralCode = String(item.referral_code || "")
          .trim()
          .toLowerCase();
        const customCode = String(item.custom_referral_code || "")
          .trim()
          .toLowerCase();
        return referralCode === normalized || customCode === normalized;
      }) || null
    );
  } catch {
    return null;
  }
}

function ambassadorName(ambassador: AmbassadorPreview | null) {
  if (!ambassador) return "An EmmyTech Ambassador";
  return (
    ambassador.display_name?.trim() ||
    ambassador.ambassador_tag?.replace(/^#/, "").trim() ||
    "An EmmyTech Ambassador"
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = validAmbassadorCode(rawCode);
  const ambassador = await getAmbassador(code);
  const name = ambassadorName(ambassador);
  const title = `${name} invited you to spin the EmmyTech wheel`;
  const description =
    "Register and spin free for a chance to win cash, Cash Off shopping credit, gadgets and bonus spins.";
  const path = code ? `/a/${encodeURIComponent(code)}` : "/";
  const url = new URL(path, SITE_URL).toString();

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

export default async function AmbassadorSpinPage({ params }: PageProps) {
  const { code: rawCode } = await params;
  const code = validAmbassadorCode(rawCode);
  const destination = code ? `/?amb=${encodeURIComponent(code)}` : "/";

  return (
    <AmbassadorSpinRedirect
      destination={destination}
      ambassadorCode={code}
    />
  );
}
