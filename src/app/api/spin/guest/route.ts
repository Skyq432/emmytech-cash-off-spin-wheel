import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function isVisitorId(value: string) {
  return value.length >= 8 && value.length <= 200 && /^[a-z0-9:_-]+$/i.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const visitorId = String(body.visitorId || "").trim();
    const referralCode = body.referralCode
      ? String(body.referralCode).trim()
      : null;

    if (!isVisitorId(visitorId)) {
      return NextResponse.json(
        { ok: false, error: "A valid visitorId is required." },
        { status: 400 }
      );
    }

    if (referralCode && !/^[a-z0-9]{5,20}$/i.test(referralCode)) {
      return NextResponse.json(
        { ok: false, error: "Referral code is invalid." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "bootstrap_canonical_wheel_visitor",
      {
        p_visitor_id: visitorId,
        p_full_name: null,
        p_phone: null,
        p_email: null,
        p_referral_code: referralCode,
      }
    );

    if (error) throw new Error(error.message);

    return NextResponse.json(
      {
        ok: true,
        wheelSessionToken: data?.wheel_session_token,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to start the guest spin.",
      },
      { status: 500 }
    );
  }
}
