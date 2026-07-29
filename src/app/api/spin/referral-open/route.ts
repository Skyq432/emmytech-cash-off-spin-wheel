import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const REFERRAL_CODE_PATTERN = /^[a-z0-9]{5,20}$/i;
const VISITOR_ID_PATTERN = /^[a-z0-9-]{16,80}$/i;

function response(
  body: { ok: boolean; recorded?: boolean; error?: string },
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body.code || "").trim();
    const visitorId = String(body.visitorId || "").trim();

    if (
      !REFERRAL_CODE_PATTERN.test(code) ||
      !VISITOR_ID_PATTERN.test(visitorId)
    ) {
      return response({ ok: false, error: "Invalid referral visit." }, 400);
    }

    const { data: player, error: playerError } = await supabaseAdmin
      .from("spin_players")
      .select("id, referral_code")
      .eq("referral_code", code)
      .limit(1)
      .maybeSingle();

    if (playerError || !player) {
      return response({ ok: false, error: "Referral code not found." }, 404);
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("referral_route_logs")
      .select("id")
      .eq("code", code)
      .eq("step", "spin_referral_opened")
      .contains("data", { visitor_id: visitorId })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return response({ ok: false, error: existingError.message }, 500);
    }

    if (existing) return response({ ok: true, recorded: false });

    const { error } = await supabaseAdmin.from("referral_route_logs").insert({
      code,
      step: "spin_referral_opened",
      message: "A browser opened a Spin & Save referral link.",
      data: {
        visitor_id: visitorId,
        spin_player_id: player.id,
        source: "spin_referral_page",
      },
    });

    if (error) return response({ ok: false, error: error.message }, 500);
    return response({ ok: true, recorded: true });
  } catch {
    return response({ ok: false, error: "Unable to record referral visit." }, 500);
  }
}
