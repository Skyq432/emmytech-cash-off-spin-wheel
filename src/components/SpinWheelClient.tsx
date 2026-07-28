"use client";

import { useEffect, useRef, useState } from "react";

const LOGO_URL =
  "https://ouvdainkxpaegczdinlp.supabase.co/storage/v1/object/public/assest/emmytech%20logo%202.png";

const SEGMENT_COLORS = [
  { fill: "#003399", text: "#ffffff", accent: "#1a5cff" },
  { fill: "#fbb03b", text: "#1a0e00", accent: "#ffd06b" },
  { fill: "#ffffff", text: "#003399", accent: "#e8efff" },
  { fill: "#0a5bd8", text: "#ffffff", accent: "#3d7eff" },
  { fill: "#ff9500", text: "#1a0e00", accent: "#ffb84d" },
  { fill: "#f0f4ff", text: "#003399", accent: "#ffffff" },
  { fill: "#001f66", text: "#ffffff", accent: "#1a3d99" },
  { fill: "#ffc940", text: "#1a0e00", accent: "#ffe07a" },
  { fill: "#e8efff", text: "#003399", accent: "#f0f4ff" },
];

const LETTER_SEGMENTS = ["EM", "MY", "TE", "CH", "NO", "LO", "GY"];
const SIZE = 800;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = SIZE / 2 - 15;

const FALLBACK_WHEEL_ITEMS = [
  { id: "aedb9f84-fc2c-4b52-b3d3-93f40e956916", label: "₦100", prize_type: "cash", monetary_value: 100 },
  { id: "491c8dd5-8f98-4346-91a0-4d96e949c5ed", label: "₦200", prize_type: "cash", monetary_value: 200 },
  { id: "58d84604-6dc3-47ea-bfd9-ad648f696c6f", label: "₦500", prize_type: "cash", monetary_value: 500 },
  { id: "43215977-3b85-48f6-b489-ff29cbc9b308", label: "₦1,000", prize_type: "cash", monetary_value: 1000 },
  { id: "f5a07662-477f-422d-a9ab-11619687a3f8", label: "₦2,000", prize_type: "cash", monetary_value: 2000 },
  { id: "cbbe754e-7fdb-4de8-b882-b122930f831e", label: "Laptop", prize_type: "prize", monetary_value: 0 },
  { id: "3d17d40e-490d-475a-9699-d2a528c53b39", label: "Try Again", prize_type: "retry", monetary_value: 0 },
  { id: "e2d0bde9-5753-4989-96c6-84a0990ebbae", label: "Bonus Spin", prize_type: "bonus_spin", monetary_value: 0 },
  { id: "1ef0fe2d-8c2e-4474-9a27-04e1920d064d", label: "EM", prize_type: "letter", monetary_value: 0 },
] satisfies WheelItem[];

type WheelItem = {
  id: string;
  label: string;
  prize_type?: string | null;
  monetary_value?: number | string | null;
  near_miss?: boolean | null;
};

type SpinPlayer = {
  id: string;
  identity_id?: string;
  full_name: string;
  phone_number: string;
  email: string;
  referral_code: string;
  spins_remaining: number;
  wallet_balance: number | string;
  cashout_target: number | string;
  spin_sequence_step: number;
  letters_unlocked: string[] | null;
  letter_challenge_completed: boolean;
  last_prize_won?: string | null;
  last_prize_type?: string | null;
  cashout_eligible?: boolean | null;
  dm_bonus_claimed?: boolean | null;
  total_referrals_count?: number | null;
  daily_spin_available?: boolean | null;
  last_daily_spin_granted_on?: string | null;
};

type SpinResult = {
  label: string;
  result_type: string;
  cash_amount: number;
  cash_off_amount?: number;
  letter_code: string | null;
  bonus_spins: number;
  wallet_before?: number;
  wallet_after?: number;
  cash_off_before: number;
  cash_off_after: number;
  cashout_eligible?: boolean;
  letter_challenge_completed: boolean;
  spin_log_id?: string;
  request_id?: string;
};

type PrizeBagItem = {
  id: string;
  prize_label: string;
  status: string;
  result_type?: string | null;
  cash_amount?: number | string | null;
  created_at?: string;
};

type CashOffAccount = {
  exists: boolean;
  identity_id: string;
  balance: number;
  total_credited: number;
  total_debited: number;
  total_redeemed: number;
  total_refunded: number;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

type CashChallenge = {
  id?: string | null;
  active?: boolean;
  status?: string | null;
  cash_balance?: number | string | null;
  cash_target?: number | string | null;
  conversion_floor?: number | string | null;
  expires_at?: string | null;
  cash_eligible?: boolean;
  converted_to_cash_off?: boolean;
  converted_cash_off_amount?: number | string | null;
};

type ReferrerInfo = {
  name: string;
  prize: string | null;
  prize_type: string | null;
};

function moneyFmt(amount: number | string | null | undefined) {
  return "\u20A6" + Number(amount || 0).toLocaleString();
}

function countdownText(expiresAt: string | null | undefined, now: number) {
  const remaining = Math.max(0, Math.floor((new Date(expiresAt || 0).getTime() - now) / 1000));
  const values = [Math.floor(remaining / 3600), Math.floor((remaining % 3600) / 60), remaining % 60];
  return values.map((value) => String(value).padStart(2, "0")).join(":");
}

function cleanDisplayText(value: string | null | undefined) {
  return String(value || "")
    .replace(/\u00E2\u201A\u00A6/g, "\u20A6")
    .replace(/\u00E2\u20AC\u00A2/g, "\u2022")
    .replace(/\u00E2\u20AC\u2122/g, "'")
    .replace(/\u00E2\u20AC\u0153/g, '"')
    .replace(/\u00E2\u20AC\u009D/g, '"')
    .replace(/\u00E2\u20AC\u201C/g, "-")
    .replace(/\u00E2\u20AC\u201D/g, "-");
}

function normalizeLabel(value: string | null | undefined) {
  return cleanDisplayText(value)
    .toLowerCase()
    .replace(/[₦,\s]/g, "")
    .trim();
}

function referralHeadline(referrer: ReferrerInfo) {
  const prize = cleanDisplayText(referrer.prize).trim();

  switch (referrer.prize_type) {
    case "cash":
    case "prize":
      return prize
        ? `${referrer.name} just won ${prize}!`
        : `${referrer.name} invited you to spin!`;
    case "letter":
      return prize
        ? `${referrer.name} unlocked ${prize}!`
        : `${referrer.name} is collecting EmmyTech letters!`;
    case "bonus":
    case "bonus_spin":
      return `${referrer.name} earned a bonus spin!`;
    case "retry":
      return `${referrer.name} invited you to spin the EmmyTech wheel!`;
    default:
      return prize
        ? `${referrer.name} just landed on ${prize}!`
        : `${referrer.name} invited you to spin!`;
  }
}

function getUnlockedLetters(player: SpinPlayer | null) {
  return Array.isArray(player?.letters_unlocked) ? player.letters_unlocked : [];
}

function haptic(style: "light" | "medium" | "heavy" = "medium") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  navigator.vibrate(style === "light" ? 8 : style === "medium" ? 15 : 30);
}

export default function SpinWheelClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTickIdxRef = useRef(-1);
  const angleRef = useRef(0);

  const [wheelItems, setWheelItems] = useState<WheelItem[]>(FALLBACK_WHEEL_ITEMS);
  const [player, setPlayer] = useState<SpinPlayer | null>(null);
  const [prizeBag, setPrizeBag] = useState<PrizeBagItem[]>([]);
  const [cashOffAccount, setCashOffAccount] = useState<CashOffAccount | null>(null);
  const [cashChallenge, setCashChallenge] = useState<CashChallenge | null>(null);
  const [referrer, setReferrer] = useState<ReferrerInfo | null>(null);
  const [stats, setStats] = useState({ totalPlayers: 0, totalCashWon: 0 });
  const [dailyAvailable, setDailyAvailable] = useState(false);
  const [nextDailyAt, setNextDailyAt] = useState<string | null>(null);
  const [guestResult, setGuestResult] = useState<SpinResult | null>(null);
  const [shareBonusClaimedFor, setShareBonusClaimedFor] = useState<string | null>(null);
  const [claimingShareBonus, setClaimingShareBonus] = useState(false);
  const [playerRestoreComplete, setPlayerRestoreComplete] = useState(false);
  const [timerPreview, setTimerPreview] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [spinning, setSpinning] = useState(false);

  const [showRegister, setShowRegister] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showBag, setShowBag] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showOutOfSpins, setShowOutOfSpins] = useState(false);

  // CASH OFF NO-SPINS PREVIEW V2
  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get("preview");
    const previewTimer = window.setTimeout(() => {
      if (preview === "no-spins") {
        setShowOutOfSpins(true);
      }
      if (preview === "cash-timer") {
        setTimerPreview(true);
        setCashChallenge({
          active: true,
          cash_balance: 500,
          cash_target: 1000,
          conversion_floor: 700,
          expires_at: new Date(Date.now() + 23 * 60 * 60 * 1000 + 47 * 60 * 1000).toISOString(),
        });
      }
    }, 0);

    return () => window.clearTimeout(previewTimer);
  }, []);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [toast, setToast] = useState<{ name: string; prize: string } | null>(null);
  const [regError, setRegError] = useState("");
  const [registering, setRegistering] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
  });

  const unlockedLetters = getUnlockedLetters(player);
  const cashOffBalance = Number(cashOffAccount?.balance || 0);
  const totalCashOffEarned = Number(cashOffAccount?.total_credited || 0);
  const totalCashOffUsed = Number(cashOffAccount?.total_debited || 0);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    drawWheel(angleRef.current);
  }, [wheelItems]);

  async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref");
    const handoffToken = urlParams.get("handoff");

    if (refCode) {
      localStorage.setItem("emmy_ref", refCode);
    }

    const activeRefCode = refCode || localStorage.getItem("emmy_ref");
    if (activeRefCode) {
      void loadReferrer(activeRefCode);
    }

    void loadBootstrap();
    void loadStats();

    try {
      if (handoffToken) {
        await consumeWebsiteHandoff(handoffToken);
      }
      await loadSavedPlayer();
    } catch (error) {
      console.error("Player restore error:", error);
    } finally {
      setPlayerRestoreComplete(true);
    }
  }

  async function loadReferrer(referralCode: string) {
    const code = referralCode.trim();
    if (!/^[a-z0-9]{5,20}$/i.test(code)) return;

    try {
      const res = await fetch(
        `/api/spin/referrer?code=${encodeURIComponent(code)}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (data.ok && data.referrer) {
        setReferrer(data.referrer);
      }
    } catch {
      // Referral personalization is optional; the wheel still works without it.
    }
  }

  async function loadStats() {
    try {
      const res = await fetch("/api/spin/stats");
      const data = await res.json();

      if (data.ok) {
        setStats({
          totalPlayers: Number(data.totalPlayers || 0),
          totalCashWon: Number(data.totalCashWon || 0),
        });
      }
    } catch {
      // Social proof falls back to truthful static copy if stats are unavailable.
    }
  }

  async function consumeWebsiteHandoff(handoffToken: string) {
    try {
      const res = await fetch("/api/spin/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handoffToken }),
      });
      const data = await res.json();

      if (!data.ok || !data.spin_player?.id) return;

      localStorage.setItem("emmy_spin_player_id", data.spin_player.id);
      if (data.wheel_session_token) {
        localStorage.setItem("emmy_wheel_session_token", data.wheel_session_token);
      }

      window.history.replaceState({}, "", window.location.pathname);
    } catch (error) {
      console.error("Website handoff error:", error);
    }
  }

  async function loadBootstrap() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const res = await fetch("/api/spin/bootstrap", { cache: "no-store" });
        const data = await res.json();

        if (data.ok && data.wheelItems?.length) {
          setWheelItems(data.wheelItems);
          return;
        }
      } catch (error) {
        console.error("Bootstrap error:", error);
      }

      await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  async function loadSavedPlayer() {
    const savedId = localStorage.getItem("emmy_spin_player_id");
    if (!savedId) return;

    try {
      const res = await fetch(`/api/spin/player?spinPlayerId=${savedId}`);
      const data = await res.json();

      if (data.ok) {
        setPlayer(data.spinPlayer);
        setPrizeBag(data.prizes || []);
        setCashOffAccount(data.cashOffAccount || null);
        setCashChallenge(data.cashChallenge || null);
        await refreshDailySpin(data.spinPlayer.id);
      } else {
        localStorage.removeItem("emmy_spin_player_id");
      }
    } catch (error) {
      console.error("Load saved player error:", error);
    }
  }

  async function refreshPlayer(spinPlayerId?: string) {
    const id = spinPlayerId || player?.id;
    if (!id) return;

    const res = await fetch(`/api/spin/player?spinPlayerId=${id}`);
    const data = await res.json();

    if (data.ok) {
      setPlayer(data.spinPlayer);
      setPrizeBag(data.prizes || []);
      setCashOffAccount(data.cashOffAccount || null);
      setCashChallenge(data.cashChallenge || null);
    }
  }

  async function refreshDailySpin(spinPlayerId: string) {
    try {
      const res = await fetch("/api/spin/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spinPlayerId }),
      });
      const data = await res.json();

      if (!data.ok) return;

      setDailyAvailable(Boolean(data.dailyAvailable));
      setNextDailyAt(data.nextDailyAt || null);
      setPlayer((current) =>
        current && current.id === spinPlayerId
          ? {
              ...current,
              spins_remaining: Number(data.spinsRemaining || 0),
              daily_spin_available: Boolean(data.dailyAvailable),
              last_daily_spin_granted_on:
                data.lastDailySpinGrantedOn || null,
            }
          : current
      );
    } catch (error) {
      console.error("Daily spin refresh error:", error);
    }
  }

  function getOrCreateVisitorId() {
    const saved = localStorage.getItem("emmy_spin_visitor_id");
    if (saved) return saved;

    const visitorId = `wheel:${crypto.randomUUID()}`;
    localStorage.setItem("emmy_spin_visitor_id", visitorId);
    return visitorId;
  }

  async function createGuestSession() {
    const visitorId = getOrCreateVisitorId();
    const referralCode =
      new URLSearchParams(window.location.search).get("ref") ||
      localStorage.getItem("emmy_ref");
    const res = await fetch("/api/spin/guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, referralCode }),
    });
    const data = await res.json();

    if (!data.ok || !data.wheelSessionToken) {
      throw new Error(data.error || "Unable to start your free spin.");
    }

    localStorage.setItem("emmy_wheel_session_token", data.wheelSessionToken);
    return data.wheelSessionToken as string;
  }

  function drawWheel(currentAngle: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = SIZE;
    canvas.height = SIZE;

    ctx.clearRect(0, 0, SIZE, SIZE);

    if (!wheelItems.length) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 30px 'Plus Jakarta Sans', Arial";
      ctx.textAlign = "center";
      ctx.fillText("SYNCING WHEEL...", CX, CY);
      return;
    }

    const arc = (2 * Math.PI) / wheelItems.length;

    // A soft edge shadow gives the level wheel depth without tilting its face.
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R + 10, 0, Math.PI * 2);
    const wheelShadow = ctx.createRadialGradient(CX, CY, R - 5, CX, CY, R + 12);
    wheelShadow.addColorStop(0, "rgba(0, 20, 60, 0.15)");
    wheelShadow.addColorStop(1, "rgba(0, 20, 60, 0)");
    ctx.fillStyle = wheelShadow;
    ctx.fill();
    ctx.restore();

    wheelItems.forEach((item, i) => {
      const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      const start = currentAngle + i * arc;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R, start, start + arc);
      ctx.closePath();

      const gradient = ctx.createRadialGradient(CX, CY, 0, CX, CY, R);
      gradient.addColorStop(0, color.accent);
      gradient.addColorStop(0.4, color.fill);
      gradient.addColorStop(1, color.fill);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R, start, start + arc);
      ctx.closePath();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R, start, start + arc);
      ctx.closePath();
      ctx.clip();

      const highlight = ctx.createRadialGradient(
        CX - R * 0.35,
        CY - R * 0.35,
        0,
        CX,
        CY,
        R
      );
      highlight.addColorStop(0, "rgba(255,255,255,0.22)");
      highlight.addColorStop(0.5, "rgba(255,255,255,0.05)");
      highlight.addColorStop(1, "rgba(0,0,0,0.1)");
      ctx.fillStyle = highlight;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(start + arc / 2);
      ctx.fillStyle = color.text;
      ctx.font = '800 22px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.2)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;

      const label = cleanDisplayText(item.label).toUpperCase();
      ctx.fillText(label.length > 18 ? `${label.slice(0, 17)}…` : label, R - 40, 0);

      ctx.restore();
    });

    // A dark outer edge and multi-tone ring form the wheel's beveled rim.
    ctx.beginPath();
    ctx.arc(CX, CY, R + 3, 0, Math.PI * 2);
    ctx.strokeStyle = "#001a4d";
    ctx.lineWidth = 3;
    ctx.stroke();

    const rimGradient = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    rimGradient.addColorStop(0, "#003399");
    rimGradient.addColorStop(0.25, "#3366cc");
    rimGradient.addColorStop(0.5, "#1a5cff");
    rimGradient.addColorStop(0.75, "#003399");
    rimGradient.addColorStop(1, "#001f66");

    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.strokeStyle = rimGradient;
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(CX, CY, R - 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const rimDots = wheelItems.length * 3;
    for (let dot = 0; dot < rimDots; dot += 1) {
      const dotAngle = currentAngle + (dot / rimDots) * Math.PI * 2;
      const dotX = CX + (R + 1) * Math.cos(dotAngle);
      const dotY = CY + (R + 1) * Math.sin(dotAngle);

      ctx.beginPath();
      ctx.arc(dotX + 0.5, dotY + 0.5, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = dot % 2 === 0 ? "#fbb03b" : "#ffffff";
      ctx.fill();
    }

    // The layered hub is part of the same canvas, so it stays visually aligned.
    const hubRadius = 32;
    ctx.beginPath();
    ctx.arc(CX, CY, hubRadius + 2, 0, Math.PI * 2);
    ctx.fillStyle = "#001a4d";
    ctx.fill();

    const hubBase = ctx.createRadialGradient(CX - 8, CY - 8, 0, CX, CY, hubRadius);
    hubBase.addColorStop(0, "#ffffff");
    hubBase.addColorStop(0.6, "#e8efff");
    hubBase.addColorStop(1, "#c7d2fe");
    ctx.beginPath();
    ctx.arc(CX, CY, hubRadius, 0, Math.PI * 2);
    ctx.fillStyle = hubBase;
    ctx.fill();
    ctx.strokeStyle = "#003399";
    ctx.lineWidth = 3;
    ctx.stroke();

    const innerHubRadius = 18;
    const innerHub = ctx.createRadialGradient(CX - 4, CY - 4, 0, CX, CY, innerHubRadius);
    innerHub.addColorStop(0, "#1a5cff");
    innerHub.addColorStop(1, "#001f66");
    ctx.beginPath();
    ctx.arc(CX, CY, innerHubRadius, 0, Math.PI * 2);
    ctx.fillStyle = innerHub;
    ctx.fill();

    const centerDotRadius = 7;
    const centerDot = ctx.createRadialGradient(CX - 2, CY - 2, 0, CX, CY, centerDotRadius);
    centerDot.addColorStop(0, "#ffd06b");
    centerDot.addColorStop(1, "#e08f00");
    ctx.beginPath();
    ctx.arc(CX, CY, centerDotRadius, 0, Math.PI * 2);
    ctx.fillStyle = centerDot;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CX - 2, CY - 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fill();
  }

  function getWinnerIndex(result: SpinResult) {
    if (!wheelItems.length) return 0;

    const resultLabel = normalizeLabel(result.label);
    const letterCode = normalizeLabel(result.letter_code || "");
    const cashAmount = Number(result.cash_amount || 0);

    let index = wheelItems.findIndex((item) => normalizeLabel(item.label) === resultLabel);
    if (index >= 0) return index;

    index = wheelItems.findIndex((item) => normalizeLabel(item.label).includes(resultLabel));
    if (index >= 0) return index;

    if (result.result_type === "letter") {
      index = wheelItems.findIndex((item) => {
        const label = normalizeLabel(item.label);
        return label === letterCode || label.includes(letterCode);
      });
      if (index >= 0) return index;
    }

    if (result.result_type === "bonus_spin") {
      index = wheelItems.findIndex((item) => normalizeLabel(item.label).includes("bonus"));
      if (index >= 0) return index;
    }

    if (result.result_type === "retry") {
      index = wheelItems.findIndex((item) => normalizeLabel(item.label).includes("try"));
      if (index >= 0) return index;
    }

    if (cashAmount > 0) {
      index = wheelItems.findIndex((item) =>
        normalizeLabel(item.label).includes(String(cashAmount))
      );
      if (index >= 0) return index;
    }

    return Math.floor(Math.random() * wheelItems.length);
  }

  function animateToWinner(winnerIndex: number, done: () => void) {
    if (!wheelItems.length) {
      done();
      return;
    }

    const arc = (2 * Math.PI) / wheelItems.length;
    const startAngle = angleRef.current;

    const targetMod = (1.5 * Math.PI - winnerIndex * arc - arc / 2) % (Math.PI * 2);
    let rotationDiff = targetMod - (startAngle % (Math.PI * 2));

    if (rotationDiff < 0) rotationDiff += Math.PI * 2;

    const totalDelta = rotationDiff + 12 * 2 * Math.PI;
    const duration = 8000;
    const startTime = performance.now();

    lastTickIdxRef.current = -1;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);

      const nextAngle = startAngle + totalDelta * eased;
      angleRef.current = nextAngle;
      drawWheel(nextAngle);

      const currentIdxAtTop =
        Math.floor(((((1.5 * Math.PI - nextAngle) % (2 * Math.PI)) + 2 * Math.PI) / arc)) %
        wheelItems.length;

      if (currentIdxAtTop !== lastTickIdxRef.current) {
        lastTickIdxRef.current = currentIdxAtTop;
        haptic("light");
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        haptic("heavy");
        done();
      }
    }

    requestAnimationFrame(animate);
  }

  function showWinToast(name: string, prize: string) {
    setToast({ name, prize });

    setTimeout(() => {
      setToast(null);
    }, 3500);
  }

  function launchConfetti() {
    const colors = ["#003399", "#fbb03b", "#ef4444", "#22c55e", "#ffffff"];

    for (let i = 0; i < 40; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti";
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.top = "-10px";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;

      document.body.appendChild(piece);

      const fall = piece.animate(
        [
          { transform: `translateY(0) rotate(0deg)`, opacity: 1 },
          {
            transform: `translateY(${window.innerHeight + 80}px) rotate(${Math.random() * 720}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: 2500 + Math.random() * 1500,
          easing: "cubic-bezier(.2,.8,.2,1)",
        }
      );

      fall.onfinish = () => piece.remove();
    }
  }

  function requestAccess() {
    if (!player) {
      if (guestResult) {
        setShowRegister(true);
        return;
      }

      void performSpin();
      return;
    }

    if (Number(player.spins_remaining || 0) <= 0) {
      setShowOutOfSpins(true);
      return;
    }

    performSpin();
  }

  async function registerPlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setRegError("");
    setRegistering(true);

    try {
      const referralCode =
        new URLSearchParams(window.location.search).get("ref") ||
        localStorage.getItem("emmy_ref");
      const visitorId = guestResult ? getOrCreateVisitorId() : null;
      const wheelSessionToken = guestResult
        ? localStorage.getItem("emmy_wheel_session_token")
        : null;
      const claimedGuestResult = guestResult;

      const res = await fetch("/api/spin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          referralCode,
          visitorId,
          wheelSessionToken,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setRegError(data.error || "Registration failed. Please try again.");
        return;
      }

      localStorage.setItem("emmy_spin_player_id", data.spinPlayer.id);
      if (data.wheelSessionToken) {
        localStorage.setItem("emmy_wheel_session_token", data.wheelSessionToken);
      }
      setPlayer(data.spinPlayer);
      setGuestResult(null);
      setShowRegister(false);
      setDrawerOpen(false);
      await refreshPlayer(data.spinPlayer.id);
      await refreshDailySpin(data.spinPlayer.id);

      if (claimedGuestResult) {
        setLastResult(claimedGuestResult);
        setShowResult(true);
        showWinToast(data.spinPlayer.full_name || "You", claimedGuestResult.label);
      }
    } catch (error) {
      console.error(error);
      setRegError("Network error. Please try again.");
    } finally {
      setRegistering(false);
    }
  }

  async function performSpin() {
    if (spinning || !wheelItems.length) return;

    const activePlayer = player;
    const isGuestSpin = !activePlayer;

    setSpinning(true);
    setLastResult(null);
    haptic("medium");

    let warmSpinActive = true;
    let lastFrameTime = performance.now();

    function warmSpin(now: number) {
      if (!warmSpinActive) return;

      const delta = now - lastFrameTime;
      lastFrameTime = now;

      angleRef.current += delta * 0.018;
      drawWheel(angleRef.current);

      requestAnimationFrame(warmSpin);
    }

    requestAnimationFrame(warmSpin);

    try {
      const requestId = crypto.randomUUID();
      const wheelSessionToken = isGuestSpin
        ? await createGuestSession()
        : null;

      const res = await fetch("/api/spin/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spinPlayerId: activePlayer?.id || null,
          wheelSessionToken,
          requestId,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        warmSpinActive = false;

        if (data.code === "NO_SPINS") {
          setShowOutOfSpins(true);
        } else {
          alert(data.error || "We could not complete that spin right now.");
        }

        setSpinning(false);
        return;
      }

      const rawResult = data.result || {};

      const result: SpinResult = {
        label: String(rawResult.label || "Reward"),
        result_type: String(rawResult.result_type || "retry"),
        cash_amount: Number(
          rawResult.cash_off_amount ?? rawResult.cash_amount ?? 0
        ),
        cash_off_amount: Number(
          rawResult.cash_off_amount ?? rawResult.cash_amount ?? 0
        ),
        letter_code: rawResult.letter_code || null,
        bonus_spins: Number(rawResult.bonus_spins || 0),
        wallet_before: Number(rawResult.wallet_before || 0),
        wallet_after: Number(rawResult.wallet_after || 0),
        cash_off_before: Number(
          rawResult.cash_off_before ?? rawResult.wallet_before ?? 0
        ),
        cash_off_after: Number(
          rawResult.cash_off_after ?? rawResult.wallet_after ?? 0
        ),
        cashout_eligible: false,
        letter_challenge_completed: Boolean(
          rawResult.letter_challenge_completed
        ),
        spin_log_id: rawResult.spin_log_id,
        request_id: rawResult.request_id || requestId,
      };

      const winnerIndex = getWinnerIndex(result);

      warmSpinActive = false;

      animateToWinner(winnerIndex, async () => {
        if (isGuestSpin) {
          setGuestResult(result);
          setLastResult(result);
          setShowRegister(true);
          setDrawerOpen(false);
          setSpinning(false);
          showWinToast("You", result.label);

          if (result.result_type !== "retry") {
            launchConfetti();
          }

          return;
        }

        setPlayer(data.spinPlayer);
        setCashChallenge(data.cash_challenge || null);
        setDailyAvailable(Boolean(data.daily?.daily_available));
        setNextDailyAt(data.daily?.next_daily_at || null);

        setCashOffAccount((current) => ({
          exists: true,
          identity_id:
            current?.identity_id ||
            activePlayer?.identity_id ||
            "",
          balance: result.cash_off_after,
          total_credited:
            Number(current?.total_credited || 0) +
            Math.max(0, result.cash_amount),
          total_debited: Number(current?.total_debited || 0),
          total_redeemed: Number(current?.total_redeemed || 0),
          total_refunded: Number(current?.total_refunded || 0),
          status: current?.status || "active",
          created_at: current?.created_at || null,
          updated_at: new Date().toISOString(),
        }));

        setLastResult(result);
        setShowResult(true);
        setDrawerOpen(false);
        setSpinning(false);

        showWinToast(data.spinPlayer.full_name || "Someone", result.label);

        if (result.result_type !== "retry") {
          launchConfetti();
        }

        await refreshPlayer(data.spinPlayer.id);
        await refreshDailySpin(data.spinPlayer.id);
      });
    } catch (error) {
      warmSpinActive = false;

      console.error("Spin error:", error);
      alert("We could not complete that spin right now. Please try again.");
      setSpinning(false);
    }
  }

  function buildClaimMessage() {
    const firstName = player?.full_name ? player.full_name.split(" ")[0] : "there";
    const prize = lastResult?.label || player?.last_prize_won || "my reward";

    if (lastResult?.result_type === "cash") {
      return (
        "Hello Emmy Technology, my name is " +
        firstName +
        ". I just won " +
        moneyFmt(lastResult.cash_amount) +
        " Cash Off on the Spin Wheel. My available Cash Off is " +
        moneyFmt(cashOffBalance) +
        "."
      );
    }

    if (lastResult?.result_type === "letter") {
      return `Hello Emmy Technology, my name is ${firstName} and I just unlocked ${prize} on the Spin Wheel challenge.`;
    }

    if (lastResult?.result_type === "retry") {
      return `Hello Emmy Technology, my name is ${firstName}. I need more spins on the Spin Wheel.`;
    }

    return `Hello Emmy Technology, my name is ${firstName}. I just won ${prize} on the Spin Wheel. I want to verify my reward.`;
  }

  function claimViaWhatsApp() {
    if (!player) {
      setShowRegister(true);
      return;
    }

    const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "2348146503700";
    const message = buildClaimMessage();

    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank");
  }

  function openCashOffViaWhatsApp() {
    if (!player) {
      setShowRegister(true);
      return;
    }

    const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "2348146503700";
    const firstName = player.full_name ? player.full_name.split(" ")[0] : "there";
    const message =
      "Hello Emmy Technology, my name is " +
      firstName +
      ". I have " +
      moneyFmt(cashOffBalance) +
      " Cash Off and I want to use it to reduce the price of an order.";

    window.open(
      "https://wa.me/" + number + "?text=" + encodeURIComponent(message),
      "_blank"
    );
  }

  function getShareLink() {
    if (!player) return "";
    return `${window.location.origin}/r/${player.referral_code}`;
  }

  function getShareCaption() {
    if (!player) return "Loading your share link...";

    return (
      "🎡 I am building my EmmyTech Cash Off balance so I can pay less on gadgets, accessories and repairs.\n\n" +
      "Tap my link, register and spin. You also get your own free spin, and I get one extra spin when your referral is valid. 🎁"
    );
  }

  function getShareText() {
    if (!player) return "Loading your share link...";

    return getShareCaption() + "\n\n" + getShareLink();
  }

  async function copyShareLink() {
    if (!player) {
      setShowRegister(true);
      return;
    }

    await navigator.clipboard.writeText(getShareText());
    setShareCopied(true);

    window.setTimeout(() => {
      setShareCopied(false);
    }, 2200);
  }

  function shareToWhatsApp() {
    if (!player) {
      setShowRegister(true);
      return;
    }

    window.open(
      "https://wa.me/?text=" + encodeURIComponent(getShareText()),
      "_blank",
      "noopener,noreferrer"
    );
  }

  function shareToFacebook() {
    if (!player) {
      setShowRegister(true);
      return;
    }

    window.open(
      "https://www.facebook.com/sharer/sharer.php?u=" +
        encodeURIComponent(getShareLink()),
      "_blank",
      "noopener,noreferrer"
    );
  }

  function shareToTelegram() {
    if (!player) {
      setShowRegister(true);
      return;
    }

    window.open(
      "https://t.me/share/url?url=" +
        encodeURIComponent(getShareLink()) +
        "&text=" +
        encodeURIComponent(getShareCaption()),
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function shareAnywhere() {
    if (!player) {
      setShowRegister(true);
      return;
    }

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "EmmyTech Spin & Save",
          text: getShareCaption(),
          url: getShareLink(),
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    await copyShareLink();
  }

  async function shareToWhatsAppStatus(): Promise<boolean> {
    if (!player) {
      setShowRegister(true);
      return false;
    }

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "EmmyTech Spin & Save",
          text: getShareCaption(),
          url: getShareLink(),
        });
        return true;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return false;
        }
      }
    }

    await navigator.clipboard.writeText(getShareText());
    setShareCopied(true);

    window.open(
      "https://wa.me/?text=" + encodeURIComponent(getShareText()),
      "_blank",
      "noopener,noreferrer"
    );

    window.setTimeout(() => {
      setShareCopied(false);
    }, 2200);

    return true;
  }

  async function claimShareBonus() {
    const spinLogId = lastResult?.spin_log_id;
    if (!player || !spinLogId || claimingShareBonus) return;
    if (shareBonusClaimedFor === spinLogId) return;

    setClaimingShareBonus(true);

    try {
      const res = await fetch("/api/spin/share-bonus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spinPlayerId: player.id,
          spinLogId,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Unable to add the share bonus.");
      }

      setShareBonusClaimedFor(spinLogId);
      setPlayer((current) =>
        current
          ? { ...current, spins_remaining: Number(data.spinsRemaining || 0) }
          : current
      );

      if (data.granted) {
        showWinToast("Bonus", "+1 spin for sharing");
      }
    } catch (error) {
      console.error("Share bonus error:", error);
    } finally {
      setClaimingShareBonus(false);
    }
  }

  async function shareStatusAndClaimBonus() {
    const shared = await shareToWhatsAppStatus();
    if (shared) await claimShareBonus();
  }

  function dailyCountdown() {
    if (!nextDailyAt) return null;

    const remaining = Math.max(
      0,
      Math.floor((new Date(nextDailyAt).getTime() - clockNow) / 1000)
    );
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  function buttonLabel() {
    if (spinning) return "🎡 SPINNING...";
    if (!player) return "✨ SPIN NOW — IT'S FREE";
    if (Number(player.spins_remaining || 0) <= 0) return "🚀 GET ANOTHER SPIN";
    return "✨ SPIN NOW • " + player.spins_remaining + " LEFT";
  }

  function resultIconClass() {
    if (!lastResult) return "fas fa-award";
    if (lastResult.result_type === "cash") return "fas fa-tag";
    if (lastResult.result_type === "retry") return "fas fa-redo-alt";
    if (lastResult.result_type === "letter") return "fas fa-puzzle-piece";
    if (lastResult.result_type === "bonus_spin") return "fas fa-sync-alt";
    if (lastResult.result_type === "prize") return "fas fa-award";
    return "fas fa-award";
  }

  return (
    <div className="cashoff-app-root flex min-h-screen flex-col">
      <div className={`win-toast ${toast ? "show" : ""}`} aria-live="polite">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <i className="fas fa-gift" />
        </div>
        <div>
          <p className="mb-1 text-xs font-800 leading-none text-slate-900">
            {toast?.name || "..."}
          </p>
          <p className="text-[10px] font-bold uppercase text-slate-500">
            {toast ? `just won ${toast.prize}` : "just won a Prize"}
          </p>
        </div>
      </div>

      <nav
        className="sticky top-0 z-50 border-b border-slate-100 bg-white p-4 md:p-6"
        aria-label="EmmyTech Spin and Win"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="brand-logo-wrap">
            <img src={LOGO_URL} alt="Emmy Technology" className="brand-logo-img" />

            <div className="brand-lockup">
              <div className="brand-word" aria-label="EMMYTECHNOLOGY Challenge Progress">
                {LETTER_SEGMENTS.map((letter, index) => (
                  <span
                    key={letter}
                    data-logo-letter={letter}
                    className={`logo-letter ${index < 2 ? "emmy" : "tech"} ${
                      unlockedLetters.includes(letter) ? "unlocked" : ""
                    }`}
                  >
                    {letter}
                  </span>
                ))}
              </div>
              <div className="brand-subline">LAPTOP{String.fromCharCode(8226)}GADGET{String.fromCharCode(8226)}SOLAR</div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <div className="cashoff-nav-chip">
              <span>💸 Cash Off</span>
              <strong>{moneyFmt(cashOffBalance)}</strong>
            </div>

            <button
              onClick={() => setShowBag(true)}
              className="flex flex-col items-center rounded-2xl border border-blue-100 bg-blue-50 px-5 py-2 transition-all active:scale-95 hover:bg-blue-100"
            >
              <span className="block text-[9px] font-bold uppercase tracking-tighter text-blue-400">
                My Prizes
              </span>
              <i className="fas fa-gift text-lg text-blue-600" />
            </button>

            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="cashoff-help-button"
              aria-label="How Cash Off works"
              title="How Cash Off works"
            >
              ?
            </button>
          </div>
        </div>
      </nav>

      <div className="cashoff-trust-bar" aria-label="Campaign information">
        <div>
          <span className="cashoff-trust-dot" aria-hidden="true" />
          <span><strong>Free spin</strong> for new players</span>
          <span aria-hidden="true">•</span>
          {stats.totalPlayers > 0 ? (
            <span>
              <strong>{stats.totalPlayers.toLocaleString()}</strong> players registered
            </span>
          ) : (
            <span><strong>Real prizes</strong> to win</span>
          )}
          <span aria-hidden="true">•</span>
          <span>Share for <strong>bonus spins</strong></span>
        </div>
      </div>

      <main className="flex flex-grow flex-col items-center justify-center px-6 py-10">
        <section className="cashoff-hero-shell">
          <div className="cashoff-hero-copy">
            <div className="cashoff-hero-badge">
              <span className="cashoff-hero-emoji">🎁</span>
              <span>Free spin • Win real cash</span>
            </div>

            <h1>
              Spin the wheel. <span>Win cash.</span>
            </h1>
          </div>
        </section>

        {referrer && playerRestoreComplete && !player && (
          <aside
            className="cw-referral-banner"
            aria-label={`Referral invitation from ${referrer.name}`}
          >
            <div className="cw-referral-icon" aria-hidden="true">🎉</div>
            <div className="cw-referral-text">
              <strong>{referralHeadline(referrer)}</strong>
              <span>Spin now to win yours — it&apos;s free</span>
            </div>
          </aside>
        )}

        {player && dailyAvailable && (
          <aside className="cw-daily-banner" role="status" aria-live="polite">
            <div className="cw-daily-icon" aria-hidden="true">🎡</div>
            <div className="cw-daily-text">
              <strong>Your daily spin is ready!</strong>
              <span>
                You have {Number(player.spins_remaining || 0)} spin
                {Number(player.spins_remaining || 0) === 1 ? "" : "s"} available
              </span>
            </div>
          </aside>
        )}

        {player && !dailyAvailable && nextDailyAt && (
          <aside className="cw-daily-banner cw-daily-countdown" role="status">
            <div className="cw-daily-icon" aria-hidden="true">⏰</div>
            <div className="cw-daily-text">
              <strong>Next daily spin in {dailyCountdown()}</strong>
              <span>Earned referral and share spins remain available.</span>
            </div>
          </aside>
        )}

        {(player || timerPreview) && cashChallenge && (
          <section className="cash-challenge-strip" aria-label="24-hour withdrawable cash challenge">
            <div className="cash-challenge-clock" aria-hidden="true">
              <i className="far fa-clock" />
            </div>
            <div className="cash-challenge-time">
              <span>Withdrawable cash</span>
              <strong>{cashChallenge.active ? countdownText(cashChallenge.expires_at, clockNow) : "24:00:00"}</strong>
            </div>
            <div className="cash-challenge-progress">
              <span>
                {cashChallenge.cash_eligible
                  ? "Ready to withdraw"
                  : cashChallenge.converted_to_cash_off
                    ? "Converted to Cash-Off"
                    : `${moneyFmt(Math.max(0, Number(cashChallenge.cash_target || 1000) - Number(cashChallenge.cash_balance || 0)))} to eligibility`}
              </span>
              <div><i style={{ width: `${Math.min(100, Math.round((Number(cashChallenge.cash_balance || 0) / Math.max(1, Number(cashChallenge.cash_target || 1000))) * 100))}%` }} /></div>
            </div>
            <div className="cash-challenge-amount">
              <span>Cash</span>
              <strong>{moneyFmt(cashChallenge.cash_balance)}</strong>
              <small>₦700–₦999 converts</small>
            </div>
          </section>
        )}

        <div className="wheel-stage w-full max-w-lg text-center">
          <div className={`wheel-outer mb-12 ${spinning ? "spinning" : ""}`}>
            <div className="pointer-3d">
              <svg width="40" height="50" viewBox="0 0 40 50">
                <defs>
                  <linearGradient id="wheel-pointer-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff6b6b" />
                    <stop offset="50%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#b91c1c" />
                  </linearGradient>
                </defs>
                <path
                  d="M20 50L0 15C0 6.7 6.7 0 15 0H25C33.3 0 40 6.7 40 15L20 50Z"
                  fill="url(#wheel-pointer-gradient)"
                />
                <circle cx="20" cy="15" r="5" fill="white" />
                <circle cx="20" cy="15" r="2.25" fill="#ef4444" />
              </svg>
            </div>

            <canvas
              ref={canvasRef}
              className="wheel-canvas"
              onClick={requestAccess}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  requestAccess();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Spin the EmmyTech prize wheel"
            />
          </div>

          <button
            onClick={requestAccess}
            disabled={spinning}
            className="cashoff-main-spin-button"
          >
            {buttonLabel()}
          </button>

          {player && (
            <div className="cashoff-action-panel">
              <div className="cashoff-action-bar">
                <button
                  type="button"
                  onClick={() => setDrawerOpen((value) => !value)}
                  className={"cashoff-action-link " + (drawerOpen ? "active" : "")}
                >
                  <span className="cashoff-action-emoji" aria-hidden="true">💳</span>
                  <span>{drawerOpen ? "Close Account" : "My Cash Off"}</span>
                </button>

                <button
                  type="button"
                  onClick={openCashOffViaWhatsApp}
                  className="cashoff-action-link whatsapp"
                >
                  <span className="cashoff-action-emoji" aria-hidden="true">🛍️</span>
                  <span>Use Cash Off</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShareCopied(false);
                    setShowShare(true);
                  }}
                  className="cashoff-action-link"
                >
                  <span className="cashoff-action-emoji" aria-hidden="true">🚀</span>
                  <span>Share & Earn</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBag(true)}
                  className="cashoff-action-link"
                >
                  <span className="cashoff-action-emoji" aria-hidden="true">🎁</span>
                  <span>Prize Bag</span>
                </button>
              </div>

              <div className={"cashoff-account-expand " + (drawerOpen ? "open" : "")}>
                <div className="cashoff-account-expand-inner">
                  <div className="cashoff-drawer-balance-card">
                    <div className="cashoff-drawer-balance-head">
                      <div>
                        <p className="cashoff-drawer-balance-label">Your Available Cash Off</p>
                        <h3>{moneyFmt(cashOffBalance)}</h3>
                      </div>
                      <div className="cashoff-drawer-balance-icon">
                        <span aria-hidden="true">💸</span>
                      </div>
                    </div>

                    <p className="cashoff-drawer-balance-note">
                      Use it to pay less for eligible gadgets, accessories, repairs,
                      office orders and online-store purchases.
                    </p>
                  </div>

                  <div className="cashoff-account-metrics">
                    <div>
                      <span>Total earned</span>
                      <strong>{moneyFmt(totalCashOffEarned)}</strong>
                    </div>
                    <div>
                      <span>Total used</span>
                      <strong>{moneyFmt(totalCashOffUsed)}</strong>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong>{cashOffAccount?.status || "Active"}</strong>
                    </div>
                  </div>

                  <div className="cashoff-letter-progress">
                    <div className="cashoff-letter-icon">
                      <span aria-hidden="true">🧩</span>
                    </div>
                    <div>
                      <p>EMMYTECHNOLOGY Challenge</p>
                      <strong>{unlockedLetters.length}/7 groups unlocked</strong>
                      <span>
                        {LETTER_SEGMENTS.every((code) => unlockedLetters.includes(code))
                          ? "Completed — your grand reward choice is ready."
                          : "Complete all letter groups to unlock the grand reward choice."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowBag(true)}
            className="cashoff-prizes-button"
          >
            <i className="fas fa-box-open" /> View My Prizes
          </button>
        </div>
      </main>

      {showHelp && (
        <div className="cashoff-modal-overlay">
          <section
            className="cashoff-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cashoff-help-title"
          >
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="cashoff-modal-close"
              aria-label="Close Cash Off help"
            >
              <i className="fas fa-times" />
            </button>

            <header className="cashoff-modal-header">
              <div className="cashoff-modal-kicker">
                <span aria-hidden="true">💡</span>
                <span>Quick guide</span>
              </div>
              <h3 id="cashoff-help-title">How Cash Off works</h3>
              <p>
                Cash Off is EmmyTech shopping credit that helps you pay less
                whenever you buy or repair with us.
              </p>
            </header>

            <div className="cashoff-modal-body">
              <div className="cashoff-how-list">
                <article className="cashoff-how-item">
                  <div className="cashoff-how-emoji" aria-hidden="true">🎡</div>
                  <div>
                    <strong>1. Spin and win</strong>
                    <p>
                      Cash rewards won on the wheel are added to your personal
                      Cash Off balance.
                    </p>
                  </div>
                </article>

                <article className="cashoff-how-item">
                  <div className="cashoff-how-emoji" aria-hidden="true">🛒</div>
                  <div>
                    <strong>2. Buy from EmmyTech</strong>
                    <p>
                      Pick an eligible item from our ecommerce store, order at
                      the office, buy an accessory, or bring a device for repair.
                    </p>
                  </div>
                </article>

                <article className="cashoff-how-item">
                  <div className="cashoff-how-emoji" aria-hidden="true"><i className="fas fa-tag" /></div>
                  <div>
                    <strong>3. Apply your Cash Off</strong>
                    <p>
                      Use part or all of your available balance to reduce the
                      eligible order amount. Any unused balance remains yours.
                    </p>
                  </div>
                </article>

                <article className="cashoff-how-item">
                  <div className="cashoff-how-emoji" aria-hidden="true">📱</div>
                  <div>
                    <strong>4. Use the same details</strong>
                    <p>
                      Use the phone number or email registered on the wheel so
                      we can find and verify your balance.
                    </p>
                  </div>
                </article>
              </div>

              <div className="cashoff-help-note">
                <strong>Important:</strong> Cash Off reduces eligible EmmyTech
                purchases and services. It is not a withdrawable cash balance.
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowHelp(false);
                  openCashOffViaWhatsApp();
                }}
                className="cashoff-modal-primary"
              >
                <span aria-hidden="true">🛍️</span>
                Use My Cash Off
              </button>
            </div>
          </section>
        </div>
      )}

      {showRegister && (
        <div className="cashoff-register-overlay">
          <section
            className="cashoff-register-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cashoff-register-title"
          >
            <button
              type="button"
              onClick={() => setShowRegister(false)}
              className="cashoff-register-close"
              aria-label="Close registration"
            >
              <i className="fas fa-times" />
            </button>

            <div className="cashoff-register-accent" />

            <header className="cashoff-register-header">
              <div className="cashoff-register-icon">
                <i className="fas fa-ticket-alt" />
              </div>

              <div className="cashoff-register-kicker">
                <i className="fas fa-bolt" />
                <span>{guestResult ? "Your result is ready" : "Your free spin is ready"}</span>
              </div>

              <h3 id="cashoff-register-title">
                {guestResult ? (
                  <>You won <span>{cleanDisplayText(guestResult.label)}</span></>
                ) : (
                  <>One step to <span>Spin & Save</span></>
                )}
              </h3>

              <p>
                {guestResult
                  ? "Enter your correct details to link this result to you and continue to your claim options."
                  : "Enter your correct details so every Cash Off reward stays linked to you and can be used on eligible EmmyTech orders."}
              </p>
            </header>

            <div className="cashoff-register-steps" aria-label="How it works">
              <div>
                <span>1</span>
                <strong>{guestResult ? "You spun" : "Register"}</strong>
              </div>
              <i className="fas fa-chevron-right" />
              <div>
                <span>2</span>
                <strong>{guestResult ? "Register" : "Spin"}</strong>
              </div>
              <i className="fas fa-chevron-right" />
              <div>
                <span>3</span>
                <strong>{guestResult ? "Claim" : "Save"}</strong>
              </div>
            </div>

            <form onSubmit={registerPlayer} className="cashoff-register-form">
              <label className="cashoff-register-field">
                <span>Full name</span>
                <div>
                  <i className="fas fa-user" />
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={form.fullName}
                    onChange={(event) =>
                      setForm({ ...form, fullName: event.target.value })
                    }
                  />
                </div>
              </label>

              <label className="cashoff-register-field">
                <span>WhatsApp number</span>
                <div>
                  <i className="fab fa-whatsapp" />
                  <input
                    type="tel"
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="e.g. 08146503700"
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                  />
                </div>
              </label>

              <label className="cashoff-register-field">
                <span>Email address</span>
                <div>
                  <i className="fas fa-envelope" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Enter your email address"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                  />
                </div>
              </label>

              <div className="cashoff-register-note">
                <i className="fas fa-shield-alt" />
                <p>
                  Use the same phone number or email whenever you shop so we can
                  find and verify your Cash Off balance.
                </p>
              </div>

              {regError && (
                <div className="cashoff-register-error" role="alert">
                  <i className="fas fa-exclamation-circle" />
                  <span>{regError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={registering}
                className="cashoff-register-submit"
              >
                {registering ? (
                  <>
                    <div className="loader-ring" />
                    <span>Setting up your spin...</span>
                  </>
                ) : (
                  <>
                    <span>{guestResult ? "Link and claim my result" : "Unlock my free spin"}</span>
                    <i className="fas fa-arrow-right" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="cashoff-register-cancel"
              >
                Maybe later
              </button>

              <p className="cashoff-register-terms">
                By continuing, you agree that EmmyTech may use these details to
                verify your rewards and contact you about this campaign.
              </p>
            </form>
          </section>
        </div>
      )}

      {showResult && lastResult && (
        <div className="cashoff-result-overlay">
          <section
            className={"cashoff-result-card result-" + lastResult.result_type}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cashoff-result-title"
          >
            <div className="cashoff-result-accent" />

            <button
              type="button"
              onClick={() => setShowResult(false)}
              className="cashoff-result-close"
              aria-label="Close result"
            >
              <i className="fas fa-times" />
            </button>

            <div className="cashoff-result-spark spark-one" aria-hidden="true">
              ✦
            </div>
            <div className="cashoff-result-spark spark-two" aria-hidden="true">
              ✦
            </div>
            <div className="cashoff-result-spark spark-three" aria-hidden="true">
              ✦
            </div>

            <header className="cashoff-result-header">
              <div className="cashoff-result-kicker">
                <i className="fas fa-check-circle" />
                <span>Spin complete</span>
              </div>

              <div className="cashoff-result-icon">
                <i className={resultIconClass()} />
              </div>

              <p className="cashoff-result-eyebrow">
                {lastResult.result_type === "retry"
                  ? "So close"
                  : lastResult.result_type === "cash"
                    ? "Cash Off unlocked"
                    : lastResult.result_type === "bonus_spin"
                      ? "Extra chance unlocked"
                      : lastResult.result_type === "letter"
                        ? "Challenge progress"
                        : "Reward unlocked"}
              </p>

              <h2 id="cashoff-result-title">
                {cleanDisplayText(lastResult.label)}
              </h2>

              <p className="cashoff-result-description">
                {lastResult.result_type === "retry"
                  ? "This spin did not unlock a reward, but you can share your link and earn another chance."
                  : lastResult.result_type === "cash"
                    ? "Your reward is now Cash Off you can use to reduce the price of an eligible EmmyTech order."
                    : lastResult.result_type === "bonus_spin"
                      ? "A bonus spin has been added. Return to the wheel and try again."
                      : lastResult.result_type === "letter"
                        ? "Your new letter group has been added to the EMMYTECHNOLOGY challenge."
                        : "Your reward has been safely added to your EmmyTech prize bag."}
              </p>
            </header>

            {lastResult.result_type === "cash" && (
              <div className="cashoff-result-balance">
                <div>
                  <span>Reward added</span>
                  <strong>+{moneyFmt(lastResult.cash_amount)}</strong>
                </div>
                <div className="cashoff-result-balance-divider" />
                <div>
                  <span>Available Cash Off</span>
                  <strong>{moneyFmt(cashOffBalance)}</strong>
                </div>
              </div>
            )}

            {lastResult.result_type === "bonus_spin" && (
              <div className="cashoff-result-highlight">
                <i className="fas fa-sync-alt" />
                <div>
                  <span>Bonus spin</span>
                  <strong>
                    +{Math.max(1, Number(lastResult.bonus_spins || 1))} spin
                  </strong>
                </div>
              </div>
            )}

            {lastResult.result_type === "letter" && (
              <div className="cashoff-result-highlight">
                <i className="fas fa-puzzle-piece" />
                <div>
                  <span>Letter group unlocked</span>
                  <strong>{lastResult.letter_code || lastResult.label}</strong>
                </div>
              </div>
            )}

            {lastResult.result_type !== "cash" &&
              lastResult.result_type !== "bonus_spin" &&
              lastResult.result_type !== "letter" &&
              lastResult.result_type !== "retry" && (
                <div className="cashoff-result-highlight">
                  <i className="fas fa-gift" />
                  <div>
                    <span>Saved safely</span>
                    <strong>Added to your prize bag</strong>
                  </div>
                </div>
            )}

            <div className="cashoff-result-actions">
              <p className="cashoff-result-share-note">
                Share to your WhatsApp Status for one instant bonus spin. You
                can also earn another spin when a valid referral completes theirs.
              </p>

              <button
                type="button"
                onClick={() => void shareStatusAndClaimBonus()}
                disabled={
                  claimingShareBonus ||
                  shareBonusClaimedFor === lastResult.spin_log_id
                }
                className="cashoff-result-primary status-bonus"
              >
                <i className="fab fa-whatsapp" />
                <span>
                  {shareBonusClaimedFor === lastResult.spin_log_id
                    ? "Bonus claimed!"
                    : claimingShareBonus
                      ? "Adding your bonus..."
                      : "Share to Status & get +1 spin"}
                </span>
              </button>

              {lastResult.result_type !== "retry" && (
                <button
                  type="button"
                  onClick={claimViaWhatsApp}
                  className="cashoff-result-whatsapp-claim"
                >
                  <i className="fab fa-whatsapp" />
                  <span>
                    {lastResult.result_type === "cash"
                      ? `Message EmmyTech to claim ${moneyFmt(lastResult.cash_amount)}`
                      : "Message EmmyTech to claim my reward"}
                  </span>
                </button>
              )}

              <div className="cashoff-result-secondary-row">
                <button
                  type="button"
                  onClick={() => {
                    setShowResult(false);
                    setShareCopied(false);
                    setShowShare(true);
                  }}
                  className="cashoff-result-secondary"
                >
                  <i className="fas fa-share-alt" />
                  <span>More share options</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowResult(false);
                    requestAccess();
                  }}
                  className="cashoff-result-secondary"
                >
                  <i className="fas fa-redo-alt" />
                  <span>
                    {Number(player?.spins_remaining || 0) > 0
                      ? "Spin again"
                      : "Get more spins"}
                  </span>
                </button>
              </div>
            </div>

            <footer className="cashoff-result-footer">
              <i className="fas fa-shield-alt" />
              <p>
                {lastResult.result_type === "cash"
                  ? "Cash Off is shopping credit. It reduces eligible order prices and cannot be withdrawn as cash."
                  : "Your reward is linked to the phone number and email used for this spin."}
              </p>
            </footer>
          </section>
        </div>
      )}

      {showOutOfSpins && (
        <div className="cashoff-no-spins-overlay">
          <section
            className="cashoff-no-spins-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cashoff-no-spins-title"
          >
            <div className="cashoff-no-spins-accent" />

            <button
              type="button"
              onClick={() => setShowOutOfSpins(false)}
              className="cashoff-no-spins-close"
              aria-label="Close"
            >
              <i className="fas fa-times" />
            </button>

            <div className="cashoff-no-spins-icon" aria-hidden="true">
              <i className="fas fa-battery-empty" />
            </div>

            <div className="cashoff-no-spins-kicker">
              <i className="fas fa-bolt" />
              <span>Your next chance is close</span>
            </div>

            <h3 id="cashoff-no-spins-title">No Spins Left</h3>

            <p className="cashoff-no-spins-copy">
              Share your personal link with one friend. When the friend registers
              and completes a valid first spin, your extra spin is added
              automatically.
            </p>

            <div className="cashoff-no-spins-give-get">
              <div>
                <span aria-hidden="true">🎡</span>
                <small>You get</small>
                <strong>+1 spin</strong>
              </div>

              <div className="cashoff-no-spins-arrow" aria-hidden="true">
                <i className="fas fa-exchange-alt" />
              </div>

              <div>
                <span aria-hidden="true">🎁</span>
                <small>Your friend gets</small>
                <strong>1 free spin</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowOutOfSpins(false);
                setShareCopied(false);
                setShowShare(true);
              }}
              className="cashoff-no-spins-primary"
            >
              <i className="fas fa-share-alt" />
              <span>Share My Link</span>
            </button>

            <button
              type="button"
              onClick={copyShareLink}
              className="cashoff-no-spins-copy-button"
            >
              <i className={shareCopied ? "fas fa-check" : "fas fa-link"} />
              <span>{shareCopied ? "Link copied" : "Copy referral link"}</span>
            </button>

            <p className="cashoff-no-spins-rule">
              Only a new and valid participant qualifies for the referral spin.
            </p>
          </section>
        </div>
      )}

      {showShare && (
        <div className="cashoff-modal-overlay">
          <section
            className="cashoff-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cashoff-share-title"
          >
            <button
              type="button"
              onClick={() => setShowShare(false)}
              className="cashoff-modal-close"
              aria-label="Close sharing options"
            >
              <i className="fas fa-times" />
            </button>

            <header className="cashoff-modal-header">
              <div className="cashoff-modal-kicker">
                <span aria-hidden="true">🚀</span>
                <span>Share and earn</span>
              </div>
              <h3 id="cashoff-share-title">One valid friend gives you one spin</h3>
              <p>
                Share your personal link. Your friend gets a free spin, and you
                receive an extra spin after a valid registration and spin.
              </p>
            </header>

            <div className="cashoff-modal-body">
              <div className="cashoff-share-preview">
                <p>{getShareText()}</p>
              </div>

              <div className="cashoff-share-grid">
                <button
                  type="button"
                  onClick={() => void shareStatusAndClaimBonus()}
                  className="cashoff-share-button status"
                >
                  <span className="share-icon">
                    <i className="fab fa-whatsapp" />
                  </span>
                  <span>
                    <strong>WhatsApp Status</strong>
                    <small>Choose “My Status”</small>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={shareToWhatsApp}
                  className="cashoff-share-button whatsapp"
                >
                  <span className="share-icon">
                    <i className="fab fa-whatsapp" />
                  </span>
                  <span>
                    <strong>WhatsApp</strong>
                    <small>Send to a contact</small>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={shareToFacebook}
                  className="cashoff-share-button facebook"
                >
                  <span className="share-icon">
                    <i className="fab fa-facebook-f" />
                  </span>
                  <span>
                    <strong>Facebook</strong>
                    <small>Share your link</small>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={shareToTelegram}
                  className="cashoff-share-button telegram"
                >
                  <span className="share-icon">
                    <i className="fab fa-telegram-plane" />
                  </span>
                  <span>
                    <strong>Telegram</strong>
                    <small>Send or post</small>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={shareAnywhere}
                  className="cashoff-share-button native"
                >
                  <span className="share-icon">
                    <i className="fas fa-share-alt" />
                  </span>
                  <span>
                    <strong>More Apps</strong>
                    <small>Open phone share menu</small>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={copyShareLink}
                  className="cashoff-share-button copy"
                >
                  <span className="share-icon">
                    <i className={shareCopied ? "fas fa-check" : "fas fa-link"} />
                  </span>
                  <span>
                    <strong>{shareCopied ? "Copied!" : "Copy Link"}</strong>
                    <small>{shareCopied ? "Ready to paste" : "Copy full message"}</small>
                  </span>
                </button>
              </div>

              <div className="cashoff-share-tip">
                📱 For WhatsApp Status, use this page on your phone and choose
                <strong> WhatsApp → My Status</strong> from the share menu.
              </div>
            </div>
          </section>
        </div>
      )}

      {showBag && (
        <div className="cashoff-bag-overlay">
          <section
            className="cashoff-bag-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cashoff-bag-title"
          >
            <div className="cashoff-bag-accent" />

            <button
              type="button"
              onClick={() => setShowBag(false)}
              className="cashoff-bag-close"
              aria-label="Close prize bag"
            >
              <i className="fas fa-times" />
            </button>

            <header className="cashoff-bag-header">
              <div className="cashoff-bag-title-icon" aria-hidden="true">
                🎁
              </div>

              <div>
                <p className="cashoff-bag-kicker">Your rewards</p>
                <h2 id="cashoff-bag-title">My Prize Bag</h2>
                <span>
                  Cash Off stays in your balance. Other rewards remain here for
                  verification and collection.
                </span>
              </div>
            </header>

            <div className="cashoff-bag-summary">
              <div>
                <span>Rewards saved</span>
                <strong>{prizeBag.length}</strong>
              </div>

              <div className="cashoff-bag-summary-divider" />

              <div>
                <span>Cash Off balance</span>
                <strong>{moneyFmt(cashOffBalance)}</strong>
              </div>
            </div>

            <div className="cashoff-bag-list">
              {!player ? (
                <div className="cashoff-bag-empty">
                  <div aria-hidden="true">🔐</div>
                  <h3>Register to open your Prize Bag</h3>
                  <p>
                    Your rewards will be linked to the phone number and email
                    used for registration.
                  </p>
                </div>
              ) : prizeBag.length === 0 ? (
                <div className="cashoff-bag-empty">
                  <div aria-hidden="true">🎡</div>
                  <h3>Your Prize Bag is ready</h3>
                  <p>
                    Complete a spin and every eligible reward will appear here
                    automatically.
                  </p>
                </div>
              ) : (
                prizeBag.map((prize) => (
                  <article key={prize.id} className="cashoff-bag-item">
                    <div className="cashoff-bag-item-icon">
                      <i
                        className={
                          prize.result_type === "cash"
                            ? "fas fa-tag"
                            : prize.result_type === "letter"
                              ? "fas fa-puzzle-piece"
                              : prize.result_type === "bonus_spin"
                                ? "fas fa-sync-alt"
                                : "fas fa-gift"
                        }
                      />
                    </div>

                    <div className="cashoff-bag-item-copy">
                      <div className="cashoff-bag-item-top">
                        <h3>{cleanDisplayText(prize.prize_label)}</h3>
                        <span>{prize.status || "available"}</span>
                      </div>

                      <div className="cashoff-bag-item-meta">
                        <span>
                          <i className="far fa-calendar-alt" />
                          {prize.created_at
                            ? new Date(prize.created_at).toLocaleDateString(
                                "en-NG",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "Recently won"}
                        </span>

                        {Number(prize.cash_amount || 0) > 0 && (
                          <strong>{moneyFmt(prize.cash_amount)}</strong>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="cashoff-bag-actions">
              <button
                type="button"
                onClick={() => {
                  setShowBag(false);
                  if (!player) setShowRegister(true);
                }}
                className="cashoff-bag-primary"
              >
                <i className={player ? "fas fa-redo-alt" : "fas fa-user-plus"} />
                <span>{player ? "Back to wheel" : "Register now"}</span>
              </button>

              {player && (
                <button
                  type="button"
                  onClick={openCashOffViaWhatsApp}
                  className="cashoff-bag-secondary"
                >
                  <i className="fab fa-whatsapp" />
                  <span>Use Cash Off</span>
                </button>
              )}
            </div>

            <footer className="cashoff-bag-footer">
              <i className="fas fa-shield-alt" />
              <p>
                For reward verification, EmmyTech will match your registered
                phone number and email.
              </p>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
