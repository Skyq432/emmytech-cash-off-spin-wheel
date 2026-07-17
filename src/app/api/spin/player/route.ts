import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const spinPlayerId = searchParams.get("spinPlayerId");

    if (!spinPlayerId) {
      return NextResponse.json(
        {
          ok: false,
          error: "spinPlayerId is required.",
        },
        { status: 400 }
      );
    }

    const { data: spinPlayer, error: playerError } = await supabaseAdmin
      .from("spin_players")
      .select("*")
      .eq("id", spinPlayerId)
      .maybeSingle();

    if (playerError) {
      throw new Error(playerError.message);
    }

    if (!spinPlayer) {
      return NextResponse.json(
        {
          ok: false,
          error: "Spin player not found.",
        },
        { status: 404 }
      );
    }

    const [prizesResult, cashOffResult] = await Promise.all([
      supabaseAdmin
        .from("spin_user_prizes")
        .select("*")
        .eq("spin_player_id", spinPlayer.id)
        .order("created_at", { ascending: false }),

      supabaseAdmin
        .from("cash_off_accounts")
        .select(
          `
            identity_id,
            balance,
            total_credited,
            total_debited,
            total_redeemed,
            total_refunded,
            status,
            created_at,
            updated_at
          `
        )
        .eq("identity_id", spinPlayer.identity_id)
        .maybeSingle(),
    ]);

    if (prizesResult.error) {
      throw new Error(prizesResult.error.message);
    }

    if (cashOffResult.error) {
      throw new Error(cashOffResult.error.message);
    }

    const cashOffAccount = cashOffResult.data;

    return NextResponse.json({
      ok: true,

      spinPlayer,

      prizes: prizesResult.data || [],

      cashOffAccount: {
        exists: Boolean(cashOffAccount),

        identity_id: spinPlayer.identity_id,

        balance: Number(cashOffAccount?.balance || 0),

        total_credited: Number(
          cashOffAccount?.total_credited || 0
        ),

        total_debited: Number(
          cashOffAccount?.total_debited || 0
        ),

        total_redeemed: Number(
          cashOffAccount?.total_redeemed || 0
        ),

        total_refunded: Number(
          cashOffAccount?.total_refunded || 0
        ),

        status: cashOffAccount?.status || "active",

        created_at: cashOffAccount?.created_at || null,

        updated_at: cashOffAccount?.updated_at || null,
      },
    });
  } catch (error) {
    console.error("Player API error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load the spin player.",
      },
      { status: 500 }
    );
  }
}