import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LegacySpinAdminPage() {
  const destination =
    process.env.AMBASSADOR_ADMIN_URL?.trim() ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3001/admin/spin-wheel"
      : "https://ambassador.emmytechnology.com/admin/spin-wheel");

  redirect(destination);
}
