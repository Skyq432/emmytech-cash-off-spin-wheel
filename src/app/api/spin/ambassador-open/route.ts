import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const AMBASSADOR_CODE_PATTERN = /^[a-z0-9_-]{3,40}$/i;
const VISITOR_ID_PATTERN = /^[a-z0-9:_-]{8,200}$/i;

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body.code || "").trim();
    const visitorId = String(body.visitorId || "").trim();

    if (!AMBASSADOR_CODE_PATTERN.test(code)) {
      return response({ ok: false, error: "Ambassador code is invalid." }, 400);
    }

    if (!VISITOR_ID_PATTERN.test(visitorId)) {
      return response({ ok: false, error: "Visitor session is invalid." }, 400);
    }

    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress =
      forwardedFor?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    const { data, error } = await supabaseAdmin.rpc(
      "track_ambassador_spin_open",
      {
        p_referral_code: code,
        p_visitor_id: visitorId,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
      }
    );

    if (error) {
      return response({ ok: false, error: error.message }, 500);
    }

    if (!data?.ok) {
      return response(
        {
          ok: false,
          error:
            data?.reason === "ambassador_not_found"
              ? "Ambassador link was not found."
              : "Unable to record Ambassador attribution.",
        },
        data?.reason === "ambassador_not_found" ? 404 : 400
      );
    }

    return response({ ok: true, attribution: data });
  } catch (error) {
    return response(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to record Ambassador attribution.",
      },
      500
    );
  }
}
