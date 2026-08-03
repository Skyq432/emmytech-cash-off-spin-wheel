import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function retired() {
  const destination =
    process.env.AMBASSADOR_ADMIN_URL?.trim() ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3001/admin/spin-wheel"
      : "https://ambassador.emmytechnology.com/admin/spin-wheel");

  return NextResponse.json(
    {
      ok: false,
      error:
        "The standalone Spin Wheel admin has moved to the Ambassador admin.",
      destination,
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET() {
  return retired();
}

export async function POST() {
  return retired();
}
