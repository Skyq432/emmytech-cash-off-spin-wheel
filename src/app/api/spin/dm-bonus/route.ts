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
    const spinLogId = String(body.spinLogId || "").trim();

    if (!isUuid(spinPlayerId) || !isUuid(spinLogId)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Valid spinPlayerId and spinLogId values are required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc("claim_spin_dm_bonus", {
      p_spin_player_id: spinPlayerId,
      p_spin_log_id: spinLogId,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json(
      {
        ok: true,
        granted: Boolean(data?.granted),
        reason: data?.reason || null,
        spinsRemaining: Number(data?.spins_remaining || 0),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "DM bonus failed.";
    const notFound = message.toLowerCase().includes("not found");

    return NextResponse.json(
      { ok: false, error: message },
      { status: notFound ? 404 : 500 }
    );
  }
}
