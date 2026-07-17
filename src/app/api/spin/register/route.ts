import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { cleanEmail, makeReferralCode, normalizePhone } from "@/lib/spin-utils";

async function findOrCreateIdentity({
  fullName,
  phone,
  email,
}: {
  fullName: string;
  phone: string;
  email: string;
}) {
  const normalizedPhone = normalizePhone(phone);
  const cleanedEmail = cleanEmail(email);

  if (cleanedEmail) {
    const { data, error } = await supabaseAdmin
      .from("identities")
      .select("*")
      .eq("primary_email", cleanedEmail)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data) return data;
  }

  if (normalizedPhone) {
    const { data, error } = await supabaseAdmin
      .from("identities")
      .select("*")
      .eq("primary_phone", normalizedPhone)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data) return data;
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from("identities")
    .insert({
      primary_name: fullName,
      primary_phone: normalizedPhone,
      primary_email: cleanedEmail,
      status: "active",
      confidence_score: 80,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (createError) throw new Error(createError.message);

  return created;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();
    const referralCodeUsed = body.referralCode
      ? String(body.referralCode).trim()
      : null;

    if (!fullName || !phone || !email) {
      return NextResponse.json(
        { ok: false, error: "Full name, phone number and email are required." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    const cleanedEmail = cleanEmail(email);

    const identity = await findOrCreateIdentity({
      fullName,
      phone,
      email,
    });

    const existingByPhone = normalizedPhone
      ? await supabaseAdmin
          .from("spin_players")
          .select("*")
          .eq("phone_number", normalizedPhone)
          .maybeSingle()
      : { data: null, error: null };

    if (existingByPhone.error) throw new Error(existingByPhone.error.message);

    if (existingByPhone.data) {
      return NextResponse.json({
        ok: true,
        spinPlayer: existingByPhone.data,
        message: "Existing spin player loaded.",
      });
    }

    const existingByEmail = cleanedEmail
      ? await supabaseAdmin
          .from("spin_players")
          .select("*")
          .eq("email", cleanedEmail)
          .maybeSingle()
      : { data: null, error: null };

    if (existingByEmail.error) throw new Error(existingByEmail.error.message);

    if (existingByEmail.data) {
      return NextResponse.json({
        ok: true,
        spinPlayer: existingByEmail.data,
        message: "Existing spin player loaded.",
      });
    }

    let referredBySpinPlayerId: string | null = null;
    let referredByIdentityId: string | null = null;

    if (referralCodeUsed) {
      const { data: referrer } = await supabaseAdmin
        .from("spin_players")
        .select("id, identity_id, old_spin_profile_id")
        .eq("referral_code", referralCodeUsed)
        .maybeSingle();

      if (referrer) {
        referredBySpinPlayerId = referrer.old_spin_profile_id || referrer.id;
        referredByIdentityId = referrer.identity_id;
      }
    }

    let referralCode = makeReferralCode(fullName);

    for (let i = 0; i < 5; i++) {
      const { data: codeExists } = await supabaseAdmin
        .from("spin_players")
        .select("id")
        .eq("referral_code", referralCode)
        .maybeSingle();

      if (!codeExists) break;
      referralCode = makeReferralCode(fullName);
    }

    const { data: spinPlayer, error: playerError } = await supabaseAdmin
      .from("spin_players")
      .insert({
        identity_id: identity.id,
        phone_number: normalizedPhone,
        full_name: fullName,
        email: cleanedEmail,
        referral_code: referralCode,
        referred_by_old_spin_profile_id: referredBySpinPlayerId,
        referred_by_identity_id: referredByIdentityId,
        referred_by_referral_code: referredBySpinPlayerId ? referralCodeUsed : null,
        spins_remaining: 1,
        wallet_balance: 0,
        total_referrals_count: 0,
        total_cash_won: 0,
        cashout_target: 1000,
        spin_sequence_step: 0,
        dm_bonus_claimed: false,
        letters_unlocked: [],
        letter_challenge_completed: false,
        cashout_eligible: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (playerError) throw new Error(playerError.message);

    if (referralCodeUsed && referredByIdentityId) {
      await supabaseAdmin.from("identity_events").insert({
        identity_id: identity.id,
        event_type: "spin_registered_with_referral",
        title: "Registered through spin referral",
        description: "This person registered on the spin wheel through a referral link.",
        metadata: {
          referral_code_used: referralCodeUsed,
          referrer_identity_id: referredByIdentityId,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      spinPlayer,
      message: "Spin player registered.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Registration failed.",
      },
      { status: 500 }
    );
  }
}