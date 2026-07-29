import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EVENTS = {
  started: {
    eventType: "spin_reward_guide_started",
    title: "Reward guide started",
  },
  completed: {
    eventType: "spin_reward_guide_completed",
    title: "Reward guide completed",
  },
  skipped: {
    eventType: "spin_reward_guide_skipped",
    title: "Reward guide skipped",
  },
} as const;

type GuideEvent = keyof typeof EVENTS;

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
    const playerId = String(body.spinPlayerId || "").trim();
    const spinLogId = String(body.spinLogId || "").trim();
    const event = String(body.event || "").trim() as GuideEvent;

    if (
      !UUID_PATTERN.test(playerId) ||
      !UUID_PATTERN.test(spinLogId) ||
      !Object.prototype.hasOwnProperty.call(EVENTS, event)
    ) {
      return response({ ok: false, error: "Invalid guide event." }, 400);
    }

    const [{ data: player, error: playerError }, { data: spin, error: spinError }] =
      await Promise.all([
        supabaseAdmin
          .from("spin_players")
          .select("id, identity_id")
          .eq("id", playerId)
          .maybeSingle(),
        supabaseAdmin
          .from("spin_logs")
          .select("id, spin_player_id")
          .eq("id", spinLogId)
          .eq("spin_player_id", playerId)
          .maybeSingle(),
      ]);

    if (playerError || spinError || !player || !spin) {
      return response({ ok: false, error: "Spin record not found." }, 404);
    }

    const definition = EVENTS[event];
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("identity_events")
      .select("id")
      .eq("identity_id", player.identity_id)
      .eq("event_type", definition.eventType)
      .contains("metadata", { spin_log_id: spinLogId })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return response({ ok: false, error: existingError.message }, 500);
    }

    if (existing) return response({ ok: true, recorded: false });

    const { error } = await supabaseAdmin.from("identity_events").insert({
      identity_id: player.identity_id,
      event_type: definition.eventType,
      title: definition.title,
      description: "First-spin reward education funnel.",
      metadata: {
        spin_player_id: playerId,
        spin_log_id: spinLogId,
        source: "spin_reward_guide",
      },
    });

    if (error) return response({ ok: false, error: error.message }, 500);
    return response({ ok: true, recorded: true });
  } catch {
    return response({ ok: false, error: "Unable to record guide event." }, 500);
  }
}
