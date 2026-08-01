import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { cleanEmail, makeReferralCode, normalizePhone } from "@/lib/spin-utils";

const AMBASSADOR_CODE_PATTERN = /^[a-z0-9_-]{3,40}$/i;
const VISITOR_ID_PATTERN = /^[a-z0-9:_-]{8,200}$/i;

type AttributionPlayer = {
  id?: string | null;
  identity_id?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
  email?: string | null;
};

async function qualifyAmbassadorLead({
  ambassadorCode,
  visitorId,
  player,
  fallbackName,
  fallbackPhone,
  fallbackEmail,
}: {
  ambassadorCode: string | null;
  visitorId: string | null;
  player: AttributionPlayer | null | undefined;
  fallbackName: string;
  fallbackPhone: string | null;
  fallbackEmail: string | null;
}) {
  if (
    !ambassadorCode ||
    !visitorId ||
    !AMBASSADOR_CODE_PATTERN.test(ambassadorCode) ||
    !VISITOR_ID_PATTERN.test(visitorId) ||
    !player?.id
  ) {
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin.rpc(
      "qualify_ambassador_spin_lead_v3",
      {
        p_visitor_id: visitorId,
        p_referral_code: ambassadorCode,
        p_identity_id: player.identity_id || null,
        p_spin_player_id: player.id,
        p_full_name: player.full_name || fallbackName,
        p_phone: player.phone_number || fallbackPhone,
        p_email: player.email || fallbackEmail,
      }
    );

    if (error) {
      console.error("Ambassador Spin attribution RPC failed:", error.message);
      return { ok: false, error: error.message };
    }

    return data || null;
  } catch (error) {
    console.error("Ambassador Spin attribution failed:", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to qualify Ambassador Spin lead.",
    };
  }
}

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
    const visitorId = body.visitorId
      ? String(body.visitorId).trim()
      : null;
    const wheelSessionToken = body.wheelSessionToken
      ? String(body.wheelSessionToken).trim()
      : null;
    const referralCodeUsed = body.referralCode
      ? String(body.referralCode).trim()
      : null;
    const rawAmbassadorCode = body.ambassadorCode
      ? String(body.ambassadorCode).trim()
      : null;
    const rawAttributionVisitorId = body.attributionVisitorId
      ? String(body.attributionVisitorId).trim()
      : null;
    const ambassadorCode =
      rawAmbassadorCode && AMBASSADOR_CODE_PATTERN.test(rawAmbassadorCode)
        ? rawAmbassadorCode
        : null;
    const attributionVisitorId =
      rawAttributionVisitorId && VISITOR_ID_PATTERN.test(rawAttributionVisitorId)
        ? rawAttributionVisitorId
        : null;

    if (!fullName || !phone || !email) {
      return NextResponse.json(
        { ok: false, error: "Full name, phone number and email are required." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    const cleanedEmail = cleanEmail(email);

    if (
      visitorId &&
      (visitorId.length < 8 ||
        visitorId.length > 200 ||
        !/^[a-z0-9:_-]+$/i.test(visitorId))
    ) {
      return NextResponse.json(
        { ok: false, error: "Visitor session is invalid." },
        { status: 400 }
      );
    }

    if (visitorId) {
      if (wheelSessionToken && !/^[0-9a-f]{64}$/i.test(wheelSessionToken)) {
        return NextResponse.json(
          { ok: false, error: "Guest wheel session is invalid." },
          { status: 400 }
        );
      }

      if (wheelSessionToken) {
        const { data: claim, error: claimError } = await supabaseAdmin.rpc(
          "claim_canonical_wheel_guest",
          {
            p_session_token: wheelSessionToken,
            p_full_name: fullName,
            p_phone: normalizedPhone,
            p_email: cleanedEmail,
          }
        );

        if (claimError) throw new Error(claimError.message);

        const ambassadorAttribution = await qualifyAmbassadorLead({
          ambassadorCode,
          visitorId: attributionVisitorId,
          player: claim.spin_player,
          fallbackName: fullName,
          fallbackPhone: normalizedPhone,
          fallbackEmail: cleanedEmail,
        });

        return NextResponse.json({
          ok: true,
          spinPlayer: claim.spin_player,
          wheelSessionToken: claim.wheel_session_token,
          ambassadorAttribution,
          message: "Guest reward linked to the registered player.",
        });
      }

      const { data: canonical, error: canonicalError } =
        await supabaseAdmin.rpc("bootstrap_canonical_wheel_visitor", {
          p_visitor_id: visitorId,
          p_full_name: fullName,
          p_phone: normalizedPhone,
          p_email: cleanedEmail,
          p_referral_code: referralCodeUsed,
        });

      if (canonicalError) throw new Error(canonicalError.message);

      const canonicalPlayerId = canonical?.state?.spin_player?.id;
      if (!canonicalPlayerId) {
        throw new Error("Registration completed without a spin player.");
      }

      const { data: spinPlayer, error: playerError } = await supabaseAdmin
        .from("spin_players")
        .select("*")
        .eq("id", canonicalPlayerId)
        .single();

      if (playerError) throw new Error(playerError.message);

      const ambassadorAttribution = await qualifyAmbassadorLead({
        ambassadorCode,
        visitorId: attributionVisitorId,
        player: spinPlayer,
        fallbackName: fullName,
        fallbackPhone: normalizedPhone,
        fallbackEmail: cleanedEmail,
      });

      return NextResponse.json({
        ok: true,
        spinPlayer,
        wheelSessionToken: canonical.wheel_session_token,
        ambassadorAttribution,
        message: "Guest reward linked to the registered player.",
      });
    }

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
      const ambassadorAttribution = await qualifyAmbassadorLead({
        ambassadorCode,
        visitorId: attributionVisitorId,
        player: existingByPhone.data,
        fallbackName: fullName,
        fallbackPhone: normalizedPhone,
        fallbackEmail: cleanedEmail,
      });

      return NextResponse.json({
        ok: true,
        spinPlayer: existingByPhone.data,
        ambassadorAttribution,
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
      const ambassadorAttribution = await qualifyAmbassadorLead({
        ambassadorCode,
        visitorId: attributionVisitorId,
        player: existingByEmail.data,
        fallbackName: fullName,
        fallbackPhone: normalizedPhone,
        fallbackEmail: cleanedEmail,
      });

      return NextResponse.json({
        ok: true,
        spinPlayer: existingByEmail.data,
        ambassadorAttribution,
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

    const ambassadorAttribution = await qualifyAmbassadorLead({
      ambassadorCode,
      visitorId: attributionVisitorId,
      player: spinPlayer,
      fallbackName: fullName,
      fallbackPhone: normalizedPhone,
      fallbackEmail: cleanedEmail,
    });

    return NextResponse.json({
      ok: true,
      spinPlayer,
      ambassadorAttribution,
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
