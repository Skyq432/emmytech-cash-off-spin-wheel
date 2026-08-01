"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const VISITOR_STORAGE_KEY = "emmy_spin_visitor_id";
const AMBASSADOR_STORAGE_KEY = "emmy_ambassador_ref";

type AmbassadorSpinRedirectProps = {
  destination: string;
  ambassadorCode: string | null;
  suppliedVisitorId?: string | null;
};

function getOrCreateVisitorId(suppliedVisitorId?: string | null) {
  const saved = window.localStorage.getItem(VISITOR_STORAGE_KEY);
  if (saved) return saved;

  if (suppliedVisitorId) {
    window.localStorage.setItem(VISITOR_STORAGE_KEY, suppliedVisitorId);
    return suppliedVisitorId;
  }

  const visitorId = `wheel:${window.crypto.randomUUID()}`;
  window.localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
  return visitorId;
}

export default function AmbassadorSpinRedirect({
  destination,
  ambassadorCode,
  suppliedVisitorId,
}: AmbassadorSpinRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    if (ambassadorCode) {
      getOrCreateVisitorId(suppliedVisitorId);

      // First touch wins. A later Ambassador link cannot overwrite an existing
      // browser attribution; the database applies the same rule.
      if (!window.localStorage.getItem(AMBASSADOR_STORAGE_KEY)) {
        window.localStorage.setItem(AMBASSADOR_STORAGE_KEY, ambassadorCode);
      }
    }

    router.replace(destination);
  }, [ambassadorCode, destination, router, suppliedVisitorId]);

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
          Opening your Ambassador spin
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600" aria-live="polite">
          Taking you to your free EmmyTech spin…
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
