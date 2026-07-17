const DEMO_PLAYER_KEY = "emmy_demo_spin_player";
const DEMO_PRIZES_KEY = "emmy_demo_prizes";

const NAIRA = "\u20A6";

const demoWheelItems = [
  { id: "demo-1", label: `${NAIRA}500 Wallet Credit`, prize_type: "cash", monetary_value: 500 },
  { id: "demo-2", label: `${NAIRA}200`, prize_type: "cash", monetary_value: 200 },
  { id: "demo-3", label: `${NAIRA}500`, prize_type: "cash", monetary_value: 500 },
  { id: "demo-4", label: "Try Again", prize_type: "retry", monetary_value: 0 },
  { id: "demo-5", label: `${NAIRA}100`, prize_type: "cash", monetary_value: 100 },
  { id: "demo-6", label: "Bonus Spin", prize_type: "bonus_spin", monetary_value: 0 },
  { id: "demo-7", label: "MY", prize_type: "letter", monetary_value: 0 },
  { id: "demo-8", label: "TE", prize_type: "letter", monetary_value: 0 },
  { id: "demo-9", label: "CH", prize_type: "letter", monetary_value: 0 },
  { id: "demo-10", label: "NO", prize_type: "letter", monetary_value: 0 },
  { id: "demo-11", label: "LO", prize_type: "letter", monetary_value: 0 },
];

function isDemoMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "1";
}

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function getDemoPlayer() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(DEMO_PLAYER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setDemoPlayer(player: any) {
  localStorage.setItem(DEMO_PLAYER_KEY, JSON.stringify(player));
}

function getDemoPrizes() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(DEMO_PRIZES_KEY);
  return raw ? JSON.parse(raw) : [];
}

function setDemoPrizes(prizes: any[]) {
  localStorage.setItem(DEMO_PRIZES_KEY, JSON.stringify(prizes));
}

function makeDemoReferralCode(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 12) + "DEMO"
  );
}

async function demoRequest(input: RequestInfo | URL, init?: RequestInit) {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

  if (url.includes("/api/spin/bootstrap")) {
    return jsonResponse({
      ok: true,
      wheelItems: demoWheelItems,
      whatsappNumber: "2348146503700",
      demo: true,
    });
  }

  if (url.includes("/api/spin/player")) {
    const player = getDemoPlayer();

    if (!player) {
      return jsonResponse({
        ok: false,
        error: "No demo player found.",
      });
    }

    return jsonResponse({
      ok: true,
      spinPlayer: player,
      prizes: getDemoPrizes(),
      demo: true,
    });
  }

  if (url.includes("/api/spin/register")) {
    const body = init?.body ? JSON.parse(String(init.body)) : {};

    const player = {
      id: "demo-player-1",
      full_name: body.fullName || "Demo User",
      phone_number: body.phone || "08000000000",
      email: body.email || "demo@email.com",
      referral_code: makeDemoReferralCode(body.fullName || "Demo User"),
      spins_remaining: 3,
      wallet_balance: 0,
      cashout_target: 1000,
      spin_sequence_step: 0,
      letters_unlocked: [],
      letter_challenge_completed: false,
      last_prize_won: null,
      last_prize_type: null,
      cashout_eligible: false,
      dm_bonus_claimed: false,
    };

    setDemoPlayer(player);
    setDemoPrizes([]);

    return jsonResponse({
      ok: true,
      spinPlayer: player,
      message: "Demo spin player registered.",
      demo: true,
    });
  }

  if (url.includes("/api/spin/play")) {
    const player = getDemoPlayer();

    if (!player) {
      return jsonResponse({
        ok: false,
        error: "Demo player not found.",
      });
    }

    if (Number(player.spins_remaining || 0) <= 0) {
      return jsonResponse({
        ok: false,
        code: "NO_SPINS",
        error: "No demo spins left.",
      });
    }

    const spinNumber = Number(player.spin_sequence_step || 0) + 1;

    const demoResults = [
      {
        label: "₦500 Wallet Credit",
        result_type: "cash",
        cash_amount: 500,
        letter_code: null,
        bonus_spins: 0,
      },
      {
        label: "₦200",
        result_type: "cash",
        cash_amount: 200,
        letter_code: null,
        bonus_spins: 0,
      },
      {
        label: "₦500",
        result_type: "cash",
        cash_amount: 500,
        letter_code: null,
        bonus_spins: 0,
      },
    ];

    const picked = demoResults[Math.min(spinNumber - 1, demoResults.length - 1)];

    const walletBefore = Number(player.wallet_balance || 0);
    const walletAfter = walletBefore + picked.cash_amount;
    const cashoutEligible = walletAfter >= Number(player.cashout_target || 1000);

    const updatedPlayer = {
      ...player,
      spins_remaining: Number(player.spins_remaining || 0) - 1 + picked.bonus_spins,
      wallet_balance: walletAfter,
      spin_sequence_step: spinNumber,
      total_cash_won: Number(player.total_cash_won || 0) + picked.cash_amount,
      last_prize_won: picked.label,
      last_prize_type: picked.result_type,
      cashout_eligible: cashoutEligible,
    };

    const prize = {
      id: `demo-prize-${Date.now()}`,
      prize_label: picked.label,
      status: "available",
      result_type: picked.result_type,
      cash_amount: picked.cash_amount,
      wallet_after: walletAfter,
      created_at: new Date().toISOString(),
    };

    const prizes = [prize, ...getDemoPrizes()];

    setDemoPlayer(updatedPlayer);
    setDemoPrizes(prizes);

    return jsonResponse({
      ok: true,
      result: {
        ...picked,
        wallet_before: walletBefore,
        wallet_after: walletAfter,
        cashout_eligible: cashoutEligible,
        letter_challenge_completed: false,
        spin_log_id: `demo-spin-log-${Date.now()}`,
      },
      spinPlayer: updatedPlayer,
      demo: true,
    });
  }

  return fetch(input, init);
}

export function spinRequest(input: RequestInfo | URL, init?: RequestInit) {
  if (isDemoMode()) {
    return demoRequest(input, init);
  }

  return fetch(input, init);
}