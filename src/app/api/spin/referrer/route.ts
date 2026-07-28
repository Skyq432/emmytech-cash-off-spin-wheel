import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const REFERRAL_CODE_PATTERN = /^[a-z0-9]{5,20}$/i;

function jsonResponse(body: { ok: boolean; referrer: ReferrerResponse | null }) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

type ReferrerResponse = {
  name: string;
  prize: string | null;
  prize_type: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const rawCode = req.nextUrl.searchParams.get("code") || "";
    const code = rawCode.trim();

    if (!REFERRAL_CODE_PATTERN.test(code)) {
      return jsonResponse({ ok: false, referrer: null });
    }

    const { data, error } = await supabaseAdmin
      .from("spin_players")
      .select("full_name, last_prize_won, last_prize_type")
      .eq("referral_code", code)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return jsonResponse({ ok: false, referrer: null });
    }

    const name =
      data.full_name?.trim().split(/\s+/)[0]?.slice(0, 32) || "Someone";
    const prize = data.last_prize_won?.trim().slice(0, 64) || null;
    const prizeType = data.last_prize_type?.trim().slice(0, 32) || null;

    return jsonResponse({
      ok: true,
      referrer: {
        name,
        prize,
        prize_type: prizeType,
      },
    });
  } catch {
    return jsonResponse({ ok: false, referrer: null });
  }
}
