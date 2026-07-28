import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.rpc("get_spin_social_stats");

    if (error) throw new Error(error.message);

    return NextResponse.json(
      {
        ok: true,
        totalPlayers: Number(data?.total_players || 0),
        totalCashWon: Number(data?.total_cash_won || 0),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Spin stats error:", error);

    return NextResponse.json(
      { ok: false, totalPlayers: 0, totalCashWon: 0 },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
