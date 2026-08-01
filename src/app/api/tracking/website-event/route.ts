import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VISITOR_ID_PATTERN = /^[a-z0-9:_-]{8,200}$/i;
const REFERRAL_CODE_PATTERN = /^[a-z0-9_-]{3,40}$/i;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_TYPES = new Set([
  "website_visited",
  "page_viewed",
  "product_searched",
  "product_viewed",
  "product_quick_viewed",
  "product_shared",
  "add_to_cart",
  "remove_from_cart",
  "whatsapp_purchase_clicked",
  "spin_opened_from_product",
  "reward_viewed",
  "reward_applied",
  "cash_off_product_selected",
  "cash_off_product_changed",
  "cash_off_product_removed",
  "full_wheel_opened_from_overlay",
  "full_wheel_opened_from_cart",
  "returned_from_full_wheel",
]);

function allowedOrigins() {
  const configured = String(
    process.env.EMMYTECH_TRACKING_ALLOWED_ORIGINS || ""
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set([
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://localhost:3000",
    "http://localhost:3001",
    "https://emmytechnology.com",
    "https://www.emmytechnology.com",
    ...configured,
  ]);
}

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };

  if (origin && allowedOrigins().has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function json(
  body: Record<string, unknown>,
  status: number,
  origin: string | null
) {
  return NextResponse.json(body, {
    status,
    headers: corsHeaders(origin),
  });
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin && !allowedOrigins().has(origin)) {
    return json({ ok: false, error: "Origin is not allowed." }, 403, origin);
  }

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin && !allowedOrigins().has(origin)) {
    return json({ ok: false, error: "Origin is not allowed." }, 403, origin);
  }

  try {
    const body = await request.json();
    const visitorId = String(body.visitorId || "").trim();
    const eventType = String(body.eventType || "").trim();
    const referralCode = body.referralCode
      ? String(body.referralCode).trim()
      : null;
    const productId = body.productId ? String(body.productId).trim() : null;
    const resultsCount = Number.isFinite(Number(body.resultsCount))
      ? Math.max(0, Math.trunc(Number(body.resultsCount)))
      : null;

    if (!VISITOR_ID_PATTERN.test(visitorId)) {
      return json({ ok: false, error: "Visitor session is invalid." }, 400, origin);
    }

    if (!EVENT_TYPES.has(eventType)) {
      return json({ ok: false, error: "Event type is invalid." }, 400, origin);
    }

    if (referralCode && !REFERRAL_CODE_PATTERN.test(referralCode)) {
      return json({ ok: false, error: "Referral code is invalid." }, 400, origin);
    }

    if (productId && !UUID_PATTERN.test(productId)) {
      return json({ ok: false, error: "Product ID is invalid." }, 400, origin);
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress =
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    const metadata =
      body.metadata &&
      typeof body.metadata === "object" &&
      !Array.isArray(body.metadata)
        ? body.metadata
        : {};

    if (JSON.stringify(metadata).length > 8_000) {
      return json({ ok: false, error: "Event metadata is too large." }, 413, origin);
    }

    const { data, error } = await supabaseAdmin.rpc("track_website_event_v3", {
      p_visitor_id: visitorId,
      p_event_type: eventType,
      p_page_url: body.pageUrl ? String(body.pageUrl).slice(0, 1000) : null,
      p_search_query: body.searchQuery
        ? String(body.searchQuery).trim().slice(0, 300)
        : null,
      p_results_count: resultsCount,
      p_product_id: productId,
      p_referral_code: referralCode,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_metadata: metadata,
    });

    if (error) {
      console.error("Website tracking RPC failed:", error.message);
      return json(
        { ok: false, error: "Unable to record website activity." },
        500,
        origin
      );
    }

    if (!data?.ok) {
      return json(
        {
          ok: false,
          error:
            data?.reason === "invalid_event_type"
              ? "Event type is invalid."
              : "Unable to record website activity.",
        },
        400,
        origin
      );
    }

    return json({ ok: true, event: data }, 200, origin);
  } catch (error) {
    console.error("Website tracking request failed:", error);
    return json(
      { ok: false, error: "Unable to record website activity." },
      500,
      origin
    );
  }
}
