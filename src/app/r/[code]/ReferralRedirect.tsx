"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ReferralRedirectProps = {
  destination: string;
  referralCode: string | null;
};

export default function ReferralRedirect({
  destination,
  referralCode,
}: ReferralRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    if (!referralCode) {
      router.replace(destination);
      return;
    }

    const storageKey = "emmy_spin_visitor_id";
    let visitorId = window.localStorage.getItem(storageKey);

    if (!visitorId) {
      visitorId = window.crypto.randomUUID();
      window.localStorage.setItem(storageKey, visitorId);
    }

    let redirected = false;
    const continueToWheel = () => {
      if (redirected) return;
      redirected = true;
      router.replace(destination);
    };
    const fallbackTimer = window.setTimeout(continueToWheel, 350);

    void fetch("/api/spin/referral-open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: referralCode, visitorId }),
      keepalive: true,
    }).finally(() => {
      window.clearTimeout(fallbackTimer);
      continueToWheel();
    });

    return () => window.clearTimeout(fallbackTimer);
  }, [destination, referralCode, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <section className="w-full max-w-md rounded-3xl border border-blue-100 bg-white p-8 shadow-xl shadow-blue-950/10">
        <div
          aria-hidden="true"
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl"
        >
          🎡
        </div>
        <h1 className="text-2xl font-extrabold text-slate-950">
          Opening your EmmyTech spin
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600" aria-live="polite">
          Taking you to your free spin and Cash Off challenge…
        </p>
        <a
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-blue-800 px-5 py-3 font-bold text-white transition hover:bg-blue-900 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-400"
          href={destination}
        >
          Continue to the wheel
        </a>
      </section>
    </main>
  );
}
