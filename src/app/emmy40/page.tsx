import type { Metadata } from "next";
import Emmy40Client from "./Emmy40Client";
import "./emmy40.css";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "EmmyTech Admin | Control Panel",
  description: "EmmyTech Spin & Save administration panel.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function Emmy40Page() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=/emmy40");
  return <Emmy40Client />;
}
