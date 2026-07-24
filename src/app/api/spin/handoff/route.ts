import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { handoffToken } = await request.json();

    if (!handoffToken || typeof handoffToken !== "string") {
      return NextResponse.json({ ok: false, error: "Missing handoff token" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc("consume_website_wheel_handoff", {
      p_handoff_token: handoffToken,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, ...data });
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to connect this wheel session" }, { status: 500 });
  }
}
