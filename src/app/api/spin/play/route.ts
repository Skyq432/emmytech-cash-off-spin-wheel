import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { weightedPick } from "@/lib/spin-utils";

type RuleItem = {
  id: string;
  result_label: string;
  result_type: string;
  cash_amount: number | string | null;
  letter_code: string | null;
  bonus_spins: number | null;
  gravity: number | null;
  item_order: number | null;
  max_uses_per_user: number | null;
};

async function getRuleGroup(spinNumber: number) {
  const { data, error } = await supabaseAdmin
    .from("spin_rule_groups")
    .select("*")
    .eq("is_active", true)
    .lte("start_spin", spinNumber)
    .or(`end_spin.is.null,end_spin.gte.${spinNumber}`)
    .order("priority", { ascending: true })
    .order("start_spin", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function getRuleItems(groupId: string, spinPlayerId: string) {
  const { data: items, error } = await supabaseAdmin
    .from("spin_rule_items")
    .select("*")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .order("item_order", { ascending: true });

  if (error) throw new Error(error.message);

  const available: RuleItem[] = [];

  for (const item of items || []) {
    const maxUses = Number(item.max_uses_per_user || 999);

    if (maxUses >= 999) {
      available.push(item);
      continue;
    }

    const { count, error: countError } = await supabaseAdmin
      .from("spin_user_rule_usage")
      .select("*", { count: "exact", head: true })
      .eq("spin_player_id", spinPlayerId)
      .eq("spin_rule_item_id", item.id);

    if (countError) throw new Error(countError.message);

    if (Number(count || 0) < maxUses) {
      available.push(item);
    }
  }

  return available;
}

function chooseWinner(groupType: string, items: RuleItem[]) {
  if (items.length === 0) return null;
  return groupType === "fixed" ? items[0] : weightedPick(items);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const spinPlayerId = String(body.spinPlayerId || "").trim();
    const requestId = String(body.requestId || "").trim();

    if (!spinPlayerId) {
      return NextResponse.json(
        { ok: false, error: "spinPlayerId is required." },
        { status: 400 }
      );
    }

    if (!isUuid(requestId)) {
      return NextResponse.json(
        { ok: false, error: "A valid requestId is required." },
        { status: 400 }
      );
    }

    const { data: player, error: playerError } = await supabaseAdmin
      .from("spin_players")
      .select("id, spins_remaining, spin_sequence_step")
      .eq("id", spinPlayerId)
      .maybeSingle();

    if (playerError) throw new Error(playerError.message);

    if (!player) {
      return NextResponse.json(
        { ok: false, error: "Spin player not found." },
        { status: 404 }
      );
    }

    if (Number(player.spins_remaining || 0) <= 0) {
      return NextResponse.json(
        { ok: false, code: "NO_SPINS", error: "No spins left." },
        { status: 400 }
      );
    }

    const spinNumber = Number(player.spin_sequence_step || 0) + 1;
    const group = await getRuleGroup(spinNumber);

    if (!group) {
      return NextResponse.json(
        { ok: false, error: "No active spin rule found." },
        { status: 500 }
      );
    }

    const items = await getRuleItems(group.id, player.id);
    const winner = chooseWinner(group.group_type, items);

    if (!winner) {
      return NextResponse.json(
        { ok: false, error: "No available result found for this spin." },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "complete_cash_off_spin",
      {
        p_spin_player_id: player.id,
        p_rule_item_id: winner.id,
        p_expected_spin_number: spinNumber,
        p_request_id: requestId,
      }
    );

    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Spin failed.";

    const noSpins = message.toLowerCase().includes("no spins left");

    return NextResponse.json(
      {
        ok: false,
        code: noSpins ? "NO_SPINS" : "SPIN_FAILED",
        error: message,
      },
      { status: noSpins ? 400 : 500 }
    );
  }
}
