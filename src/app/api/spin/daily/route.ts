import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const spinPlayerId = String(body.spinPlayerId || "").trim();

    if (!isUuid(spinPlayerId)) {
      return NextResponse.json(
        { ok: false, error: "A valid spinPlayerId is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "claim_spin_daily_entitlement",
      { p_spin_player_id: spinPlayerId }
    );

    if (error) throw new Error(error.message);

    return NextResponse.json(
      {
        ok: true,
        granted: Boolean(data?.granted),
        dailyAvailable: Boolean(data?.daily_available),
        spinsRemaining: Number(data?.spins_remaining || 0),
        lastDailySpinGrantedOn: data?.last_daily_spin_granted_on || null,
        nextDailyAt: data?.next_daily_at || null,
        nigeriaDay: data?.nigeria_day || null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Daily spin check failed.";
    const notFound = message.toLowerCase().includes("not found");

    return NextResponse.json(
      { ok: false, error: message },
      { status: notFound ? 404 : 500 }
    );
  }
}
