import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { data: wheelItems, error } = await supabaseAdmin
    .from("spin_prizes")
    .select(
      "id, old_prize_id, label, prize_type, gravity, stock, monetary_value, is_active, on_wheel, near_miss, created_at"
    )
    .eq("on_wheel", true)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  const { data: rewardHelpSetting, error: rewardHelpError } =
    await supabaseAdmin
      .from("spin_game_settings")
      .select("setting_value")
      .eq("setting_key", "reward_help_enabled")
      .maybeSingle();

  if (rewardHelpError) {
    console.warn(
      "Unable to read reward_help_enabled. Reward help will stay disabled:",
      rewardHelpError.message
    );
  }

  const rewardHelpEnabled =
    rewardHelpSetting?.setting_value === true ||
    String(rewardHelpSetting?.setting_value ?? "").toLowerCase() === "true";

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    wheelItems: wheelItems || [],
    rewardHelpEnabled,
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "2348146503700",
  });
}