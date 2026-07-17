import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { count: identitiesCount, error: identitiesError } = await supabaseAdmin
      .from("identities")
      .select("*", { count: "exact", head: true });

    if (identitiesError) {
      return NextResponse.json(
        {
          ok: false,
          step: "identities",
          error: identitiesError.message,
        },
        { status: 500 }
      );
    }

    const { count: spinPlayersCount, error: spinPlayersError } = await supabaseAdmin
      .from("spin_players")
      .select("*", { count: "exact", head: true });

    if (spinPlayersError) {
      return NextResponse.json(
        {
          ok: false,
          step: "spin_players",
          error: spinPlayersError.message,
        },
        { status: 500 }
      );
    }

    const { count: spinPrizesCount, error: spinPrizesError } = await supabaseAdmin
      .from("spin_prizes")
      .select("*", { count: "exact", head: true });

    if (spinPrizesError) {
      return NextResponse.json(
        {
          ok: false,
          step: "spin_prizes",
          error: spinPrizesError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Supabase connection is working.",
      project: "Ambassador / Project 1",
      counts: {
        identities: identitiesCount,
        spin_players: spinPlayersCount,
        spin_prizes: spinPrizesCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 }
    );
  }
}