"use client";

import { useEffect, useRef, useState } from "react";

const LOGO_URL =
  "https://ouvdainkxpaegczdinlp.supabase.co/storage/v1/object/public/assest/emmytech%20logo%202.png";

const AMBASSADOR_STORAGE_KEY = "emmy_ambassador_ref";
const AMBASSADOR_CODE_PATTERN = /^[a-z0-9_-]{3,40}$/i;

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
  letter_code: string | null;
  bonus_spins: number;
  cash_off_after: number;
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

type ReferrerInfo = {
  name: string;
  prize: string | null;
  prize_type: string | null;
};

function moneyFmt(amount: number | string | null | undefined) {
  return "\u20A6" + Number(amount || 0).toLocaleString();
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
      return prize
        ? `${referrer.name} won ${prize} Cash Off`
        : `${referrer.name} invited you to Spin & Save`;
    case "prize":
      return prize
        ? `${referrer.name} won ${prize}`
        : `${referrer.name} invited you to Spin & Save`;
    case "letter":
      return prize
        ? `${referrer.name} unlocked ${prize}!`
        : `${referrer.name} is collecting EmmyTech letters!`;
    case "bonus":
    case "bonus_spin":
      return `${referrer.name} earned a bonus spin!`;
    case "retry":
      return `${referrer.name} invited you to Spin & Save`;
    default:
      return prize
        ? `${referrer.name} landed on ${prize}`
        : `${referrer.name} invited you to Spin & Save`;
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
  const guideBubbleRef = useRef<HTMLElement | null>(null);
  const recordedGuideEventsRef = useRef<Set<string>>(new Set());
  const lastTickIdxRef = useRef(-1);
  const angleRef = useRef(0);

  const [wheelItems, setWheelItems] = useState<WheelItem[]>(FALLBACK_WHEEL_ITEMS);
  const [player, setPlayer] = useState<SpinPlayer | null>(null);
  const [prizeBag, setPrizeBag] = useState<PrizeBagItem[]>([]);
  const [cashOffAccount, setCashOffAccount] = useState<CashOffAccount | null>(null);
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
  const [rewardHelpEnabled, setRewardHelpEnabled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showRewardGuide, setShowRewardGuide] = useState(false);
  const [rewardGuideStep, setRewardGuideStep] = useState(0);
  const [rewardGuideCollapsed, setRewardGuideCollapsed] = useState(false);
  const [progressExpanded, setProgressExpanded] = useState(false);
  const [guidePosition, setGuidePosition] = useState({
    top: 24,
    left: 24,
    placement: "from-left",
    ready: false,
  });
  const [shareCopied, setShareCopied] = useState(false);
  const [showOutOfSpins, setShowOutOfSpins] = useState(false);

  // CASH OFF NO-SPINS PREVIEW V2
  useEffect(() => {
    if (!playerRestoreComplete) return;

    const preview = new URLSearchParams(window.location.search).get("preview");
    const previewTimer = window.setTimeout(() => {
      if (preview === "no-spins") {
        setShowOutOfSpins(true);
      }
      if (preview === "cash-timer") {
        setTimerPreview(true);
      }
      if (preview === "reward-guide") {
        setLastResult({
          label: "₦100 Cash Off",
          result_type: "cash",
          cash_amount: 100,
          letter_code: null,
          bonus_spins: 0,
          cash_off_after: 100,
          letter_challenge_completed: false,
        });
        setRewardGuideStep(0);
        setRewardGuideCollapsed(false);
        setShowRewardGuide(true);
      }
    }, 0);

    return () => window.clearTimeout(previewTimer);
  }, [playerRestoreComplete]);
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
    if (showRewardGuide) recordRewardGuideEvent("started");
    // The event recorder deduplicates this lifecycle event per spin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRewardGuide, player?.id, lastResult?.spin_log_id]);

  useEffect(() => {
    drawWheel(angleRef.current);
  }, [wheelItems]);

  async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref");
    const ambassadorCodeFromUrl = urlParams.get("amb")?.trim() || null;
    const handoffToken = urlParams.get("handoff");
    const preview = urlParams.get("preview");

    if (preview) {
      setPlayerRestoreComplete(true);
      return;
    }

    if (refCode) {
      localStorage.setItem("emmy_ref", refCode);
    }

    const activeRefCode = refCode || localStorage.getItem("emmy_ref");
    if (activeRefCode) {
      void loadReferrer(activeRefCode);
    }

    if (
      ambassadorCodeFromUrl &&
      AMBASSADOR_CODE_PATTERN.test(ambassadorCodeFromUrl) &&
      !localStorage.getItem(AMBASSADOR_STORAGE_KEY)
    ) {
      localStorage.setItem(AMBASSADOR_STORAGE_KEY, ambassadorCodeFromUrl);
    }

    const storedAmbassadorCode = localStorage
      .getItem(AMBASSADOR_STORAGE_KEY)
      ?.trim();
    const activeAmbassadorCode =
      storedAmbassadorCode && AMBASSADOR_CODE_PATTERN.test(storedAmbassadorCode)
        ? storedAmbassadorCode
        : null;

    if (activeAmbassadorCode) {
      void recordAmbassadorOpen(activeAmbassadorCode);
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

  async function recordAmbassadorOpen(ambassadorCode: string) {
    if (!AMBASSADOR_CODE_PATTERN.test(ambassadorCode)) return;

    const visitorId = getOrCreateVisitorId();
    const sessionKey = `emmy_ambassador_spin_open:${visitorId}:${ambassadorCode.toLowerCase()}`;

    if (sessionStorage.getItem(sessionKey)) return;

    try {
      const response = await fetch("/api/spin/ambassador-open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: ambassadorCode,
          visitorId,
        }),
      });
      const data = await response.json();

      if (data.ok) {
        sessionStorage.setItem(sessionKey, "1");
      }
    } catch {
      // Attribution tracking must never block the Spin Wheel experience.
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

        if (data.ok) {
          const helpEnabled = data.rewardHelpEnabled === true;
          setRewardHelpEnabled(helpEnabled);

          if (!helpEnabled) {
            setShowHelp(false);
            setShowRewardGuide(false);
            setRewardGuideCollapsed(false);
          }

          if (data.wheelItems?.length) {
            setWheelItems(data.wheelItems);
            return;
          }
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
      const storedAmbassadorCode = localStorage
        .getItem(AMBASSADOR_STORAGE_KEY)
        ?.trim();
      const ambassadorCode =
        storedAmbassadorCode && AMBASSADOR_CODE_PATTERN.test(storedAmbassadorCode)
          ? storedAmbassadorCode
          : null;
      const attributionVisitorId = ambassadorCode
        ? getOrCreateVisitorId()
        : null;
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
          ambassadorCode,
          attributionVisitorId,
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

        if (rewardHelpEnabled) {
          setRewardGuideStep(0);
          setShowRewardGuide(true);
        } else {
          setShowResult(true);
        }

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
    const isFirstPlayerSpin =
      isGuestSpin || Number(activePlayer?.spin_sequence_step || 0) === 0;

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
          rawResult.cash_off_credited ?? rawResult.cash_amount ?? 0
        ),
        letter_code: rawResult.letter_code || null,
        bonus_spins: Number(rawResult.bonus_spins || 0),
        cash_off_after: Number(rawResult.cash_off_balance_after || 0),
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
        if (isFirstPlayerSpin && rewardHelpEnabled) {
          setRewardGuideStep(0);
          setShowRewardGuide(true);
        } else {
          setShowResult(true);
        }
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
        " Cash Off on the Spin Wheel. I want to verify my reward."
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

  function recordRewardGuideEvent(
    event: "started" | "completed" | "skipped"
  ) {
    const spinPlayerId = player?.id;
    const spinLogId = lastResult?.spin_log_id;
    if (!spinPlayerId || !spinLogId) return;

    const eventKey = `${spinLogId}:${event}`;
    if (recordedGuideEventsRef.current.has(eventKey)) return;
    recordedGuideEventsRef.current.add(eventKey);

    void fetch("/api/spin/guide-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spinPlayerId, spinLogId, event }),
      keepalive: true,
    }).catch(() => {
      recordedGuideEventsRef.current.delete(eventKey);
    });
  }

  function finishRewardGuide(
    outcome: "completed" | "skipped" = "skipped"
  ) {
    recordRewardGuideEvent(outcome);
    setShowRewardGuide(false);
    setRewardGuideStep(0);
    setRewardGuideCollapsed(false);
    if (lastResult) setShowResult(true);
  }

  function advanceRewardGuide() {
    if (rewardGuideStep >= rewardGuideSlides.length - 1) {
      finishRewardGuide("completed");
      return;
    }

    const nextStep = rewardGuideStep + 1;
    if (nextStep >= 1 && nextStep <= 3) setProgressExpanded(true);
    setRewardGuideStep(nextStep);
  }

  function replayRewardGuide() {
    if (!rewardHelpEnabled) return;

    setShowHelp(false);
    setRewardGuideStep(0);
    setRewardGuideCollapsed(false);
    setShowRewardGuide(true);
  }

  const featuredPrizeName = cleanDisplayText(
    wheelItems.find((item) => item.prize_type === "prize")?.label || "Laptop"
  );
  const starterCashReward =
    lastResult?.result_type === "cash"
      ? `${cleanDisplayText(lastResult.label)}`
      : "a guaranteed Cash Off reward";
  const rewardGuideSlides = [
    {
      icon: "🏆",
      target: "wheel",
      title: "First win unlocked!",
      body: `Because you are new, your first spin starts you with ${starterCashReward}. It is credited straight to your Cash Off balance — no waiting.`,
      action: "What happens next?",
    },
    {
      icon: "⚡",
      target: "progress-daily",
      title: "More spins, more chances",
      body: "Use your daily spin and invite valid new players to earn extra spins. Every Cash reward you land on is added straight to your Cash Off balance.",
      action: "What is Cash Off?",
    },
    {
      icon: "🏷️",
      target: "cashoff-balance",
      title: "Cash Off means you pay less",
      body: "Cash Off is shopping credit, not withdrawable money. For example: a ₦150,000 product with ₦5,000 Cash Off costs you ₦145,000.",
      action: "What else can I win?",
    },
    {
      icon: "💻",
      target: "wheel",
      title: "A featured gadget can be yours",
      body: `This week's featured prize is ${featuredPrizeName}. Land on it and the product is yours—we save it in your Prize Bag so EmmyTech can verify and arrange collection.`,
      action: "Show me my reward",
    },
  ];
  const activeRewardGuideSlide =
    rewardGuideSlides[Math.min(rewardGuideStep, rewardGuideSlides.length - 1)];
  const activeGuideTarget = activeRewardGuideSlide?.target;

  const rewardGuidePreview = showRewardGuide && !player && !timerPreview;
  const dailyProgressSummary = timerPreview || rewardGuidePreview
    ? "1 spin ready"
    : dailyAvailable
      ? `${Number(player?.spins_remaining || 0)} spin${Number(player?.spins_remaining || 0) === 1 ? "" : "s"} ready`
      : nextDailyAt
        ? `Next spin ${dailyCountdown()}`
        : `${Number(player?.spins_remaining || 0)} spin${Number(player?.spins_remaining || 0) === 1 ? "" : "s"} ready`;

  useEffect(() => {
    if (!showRewardGuide || rewardGuideCollapsed || !activeGuideTarget) return;

    let positionTimer = 0;
    const positionGuide = () => {
      const currentTarget =
        document.querySelector<HTMLElement>(`[data-guide-target="${activeGuideTarget}"]`) ||
        document.querySelector<HTMLElement>('[data-guide-target="wheel"]');
      if (!currentTarget) return;

      const targetRect = currentTarget.getBoundingClientRect();
      const bubbleRect = guideBubbleRef.current?.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const bubbleWidth = bubbleRect?.width || Math.min(390, viewportWidth - 24);
      const bubbleHeight = bubbleRect?.height || 238;
      const gap = 18;
      const clamp = (value: number, min: number, max: number) =>
        Math.min(Math.max(value, min), Math.max(min, max));

      let top = 12;
      let left = 12;
      let placement = "from-left";

      if (viewportWidth <= 720) {
        const targetCenter = targetRect.top + targetRect.height / 2;
        const placeAbove = targetCenter > viewportHeight * 0.5;
        top = placeAbove
          ? targetRect.top - bubbleHeight - 14
          : targetRect.bottom + 14;
        top = clamp(top, 12, viewportHeight - bubbleHeight - 12);
        left = clamp((viewportWidth - bubbleWidth) / 2, 12, viewportWidth - bubbleWidth - 12);
        placement = placeAbove ? "from-bottom" : "from-top";
      } else if (viewportWidth - targetRect.right >= bubbleWidth + gap + 12) {
        top = clamp(
          targetRect.top + targetRect.height / 2 - bubbleHeight / 2,
          12,
          viewportHeight - bubbleHeight - 12
        );
        left = targetRect.right + gap;
        placement = "from-left";
      } else if (targetRect.left >= bubbleWidth + gap + 12) {
        top = clamp(
          targetRect.top + targetRect.height / 2 - bubbleHeight / 2,
          12,
          viewportHeight - bubbleHeight - 12
        );
        left = targetRect.left - bubbleWidth - gap;
        placement = "from-right";
      } else {
        const fitsBelow = viewportHeight - targetRect.bottom >= bubbleHeight + gap;
        top = fitsBelow
          ? targetRect.bottom + gap
          : targetRect.top - bubbleHeight - gap;
        top = clamp(top, 12, viewportHeight - bubbleHeight - 12);
        left = clamp(
          targetRect.left + targetRect.width / 2 - bubbleWidth / 2,
          12,
          viewportWidth - bubbleWidth - 12
        );
        placement = fitsBelow ? "from-top" : "from-bottom";
      }

      setGuidePosition({ top, left, placement, ready: true });
    };

    const prepareTimer = window.setTimeout(() => {
      const requestedTarget = document.querySelector<HTMLElement>(
        `[data-guide-target="${activeGuideTarget}"]`
      );
      const target =
        requestedTarget || document.querySelector<HTMLElement>('[data-guide-target="wheel"]');

      if (target && activeGuideTarget !== "cashoff-balance") {
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }

      positionTimer = window.setTimeout(positionGuide, 320);
      window.addEventListener("resize", positionGuide);
      window.addEventListener("scroll", positionGuide, true);
    }, 0);

    return () => {
      window.clearTimeout(prepareTimer);
      window.clearTimeout(positionTimer);
      window.removeEventListener("resize", positionGuide);
      window.removeEventListener("scroll", positionGuide, true);
    };
  }, [activeGuideTarget, progressExpanded, rewardGuideCollapsed, showRewardGuide]);

  function guideTargetClass(target: string) {
    return showRewardGuide && !rewardGuideCollapsed && activeGuideTarget === target
      ? " cashoff-guide-highlight"
      : "";
  }

  function buttonLabel() {
    if (spinning) return "Spinning...";
    if (!player) return "Start my free spin";
    if (Number(player.spins_remaining || 0) <= 0) return "Earn another spin";
    return "Spin now · " + player.spins_remaining + " remaining";
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
    <div className="cashoff-app-root cashoff-v5 flex min-h-screen flex-col">
      {toast && (
        <div className="win-toast show" aria-live="polite">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <i className="fas fa-gift" />
          </div>
          <div>
            <p className="mb-1 text-xs font-800 leading-none text-slate-900">
              {toast.name}
            </p>
            <p className="text-[10px] font-bold uppercase text-slate-500">
              {`just won ${toast.prize}`}
            </p>
          </div>
        </div>
      )}

      <nav
        className="cashoff-topbar"
        aria-label="EmmyTech Spin and Win"
      >
        <div className="cashoff-topbar-inner">
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

          <div className="cashoff-topbar-actions">
            <div
              className={`cashoff-nav-chip${guideTargetClass("cashoff-balance")}`}
              data-guide-target="cashoff-balance"
            >
              <span>Cash Off</span>
              <strong>{moneyFmt(cashOffBalance)}</strong>
            </div>

            <button
              type="button"
              onClick={() => setShowBag(true)}
              className="cashoff-prize-chip"
              aria-label="Open Prize Bag"
            >
              <i className="fas fa-gift" />
              <span>Prize Bag</span>
            </button>

            {rewardHelpEnabled && (
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="cashoff-help-button"
                aria-label="How Cash Off works"
                title="How Cash Off works"
              >
                ?
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="cashoff-trust-bar" aria-label="Campaign information">
        <div>
          <span className="cashoff-trust-dot" aria-hidden="true" />
          <span><strong>Free to play</strong></span>
          <span aria-hidden="true">·</span>
          {stats.totalPlayers > 0 ? (
            <span>
              <strong>{stats.totalPlayers.toLocaleString()}</strong> players joined
            </span>
          ) : (
            <span><strong>Real rewards</strong></span>
          )}
          <span aria-hidden="true">·</span>
          <span>Share to <strong>earn spins</strong></span>
        </div>
      </div>

      <main className="cashoff-main">
        <section className="cashoff-hero-shell">
          <div className="cashoff-hero-copy">
            <div className="cashoff-hero-badge">
              <span className="cashoff-hero-emoji" aria-hidden="true">✦</span>
              <span>EmmyTech Spin &amp; Save</span>
            </div>

            <h1>
              Spin today. <span>Pay less at EmmyTech.</span>
            </h1>

            <p className="cashoff-hero-description">
              Win Cash Off shopping credit, bonus spins and real prizes. Your
              rewards stay linked to you.
            </p>

            <div className="cashoff-hero-benefits" aria-label="Campaign benefits">
              <span><i className="fas fa-check" /> No payment required</span>
              <span><i className="fas fa-check" /> One free spin</span>
              <span><i className="fas fa-check" /> Rewards saved</span>
            </div>
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
              <span>Your free spin is ready. No payment needed.</span>
            </div>
          </aside>
        )}

        {(player || timerPreview || showRewardGuide) &&
          (dailyAvailable || nextDailyAt || timerPreview || showRewardGuide) && (
            <section
              className={`cashoff-progress-card${progressExpanded ? " expanded" : ""}`}
              aria-label="Your spin progress"
              aria-live="polite"
            >
              <button
                type="button"
                className="cashoff-progress-toggle"
                onClick={() => setProgressExpanded((current) => !current)}
                aria-expanded={progressExpanded}
                aria-controls="cashoff-progress-details"
              >
                <span className="cashoff-progress-summary-icon" aria-hidden="true">
                  <i className="fas fa-chart-line" />
                </span>

                <span className="cashoff-progress-summary-copy">
                  <span className="cashoff-progress-kicker">Your progress</span>
                  <strong>
                    <span>{dailyProgressSummary}</span>
                  </strong>
                </span>

                <span className="cashoff-progress-live">
                  <i aria-hidden="true" /> Live
                </span>

                <i
                  className={`fas fa-chevron-down cashoff-progress-chevron${progressExpanded ? " open" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {progressExpanded && (
                <div id="cashoff-progress-details" className="cashoff-progress-details">
                  <div className="cashoff-progress-grid">
                    {((player && (dailyAvailable || nextDailyAt)) || timerPreview || rewardGuidePreview) && (
                      <article
                        className={`cashoff-progress-item cashoff-progress-daily${guideTargetClass("progress-daily")}`}
                        data-guide-target="progress-daily"
                      >
                        <div className="cashoff-progress-item-icon" aria-hidden="true">
                          <i className="fas fa-sync-alt" />
                        </div>
                        <div className="cashoff-progress-item-copy">
                          <span>Daily spin</span>
                          <strong>
                            {timerPreview || rewardGuidePreview
                              ? "1 spin ready"
                              : dailyAvailable
                                ? `${Number(player?.spins_remaining || 0)} spin${Number(player?.spins_remaining || 0) === 1 ? "" : "s"} ready`
                                : `Next free spin in ${dailyCountdown()}`}
                          </strong>
                          <small>
                            {timerPreview || rewardGuidePreview || dailyAvailable
                              ? "Unused daily spins stay at one. Earned spins can increase your balance."
                              : `${Number(player?.spins_remaining || 0)} earned spin${Number(player?.spins_remaining || 0) === 1 ? "" : "s"} still available.`}
                          </small>
                        </div>
                      </article>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

        <div className="wheel-stage w-full max-w-lg text-center">
          <div
            className={`wheel-outer mb-12 ${spinning ? "spinning" : ""}${guideTargetClass("wheel")}`}
            data-guide-target="wheel"
          >
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

          <p className="cashoff-spin-note">
            Free to play. Register once to keep every reward linked to you.
          </p>

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
            <i className="fas fa-box-open" /> Open Prize Bag
          </button>
        </div>
      </main>

      {rewardHelpEnabled && showHelp && (
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
                <span aria-hidden="true">✦</span>
                <span>Quick reward guide</span>
              </div>
              <h3 id="cashoff-help-title">How Cash Off works</h3>
              <p>
                Simple, no waiting. Here is what happens every time you spin.
              </p>
            </header>

            <div className="cashoff-modal-body">
              <div className="cashoff-how-list">
                <article className="cashoff-how-item">
                  <div className="cashoff-how-emoji" aria-hidden="true">🎡</div>
                  <div>
                    <strong>1. Spin for free</strong>
                    <p>
                      Every spin can land on a Cash reward, a bonus spin, a
                      letter, or the featured prize.
                    </p>
                  </div>
                </article>

                <article className="cashoff-how-item">
                  <div className="cashoff-how-emoji" aria-hidden="true"><i className="fas fa-wallet" /></div>
                  <div>
                    <strong>2. Cash is credited instantly</strong>
                    <p>
                      A Cash reward is added straight to your Cash Off balance —
                      no waiting, no timer.
                    </p>
                  </div>
                </article>

                <article className="cashoff-how-item">
                  <div className="cashoff-how-emoji" aria-hidden="true"><i className="fas fa-tag" /></div>
                  <div>
                    <strong>3. Cash Off helps you pay less</strong>
                    <p>
                      It is shopping credit, not withdrawable money. Use it to
                      reduce an eligible EmmyTech product or service price.
                    </p>
                  </div>
                </article>
              </div>

              <div className="cashoff-help-note">
                <strong>Featured prize:</strong> {featuredPrizeName} can be won on
                the wheel. Once won, it is saved in your Prize Bag for collection.
              </div>

              <div className="cashoff-help-actions">
                <button
                  type="button"
                  onClick={replayRewardGuide}
                  className="cashoff-modal-primary"
                >
                  <i className="fas fa-play-circle" aria-hidden="true" />
                  Play the reward guide
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowHelp(false);
                    openCashOffViaWhatsApp();
                  }}
                  className="cashoff-modal-secondary"
                >
                  <span aria-hidden="true">🛍️</span>
                  Use My Cash Off
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {showRewardGuide && !rewardGuideCollapsed && activeRewardGuideSlide && (
        <div className="cashoff-guide-layer" aria-live="polite">
          <aside
            ref={guideBubbleRef}
            className={`cashoff-guide-bubble ${guidePosition.placement}${guidePosition.ready ? " ready" : ""}`}
            style={{ top: guidePosition.top, left: guidePosition.left }}
            role="region"
            aria-labelledby="cashoff-guide-title"
          >
            <div className="cashoff-guide-avatar" aria-hidden="true">
              <i className="fas fa-comment-dots" />
              <span />
            </div>

            <div className="cashoff-guide-chat">
              <header className="cashoff-guide-chat-header">
                <div>
                  <strong>EmmyTech Guide</strong>
                  <span>Step {rewardGuideStep + 1} of {rewardGuideSlides.length}</span>
                </div>

                <div className="cashoff-guide-chat-tools">
                  <button
                    type="button"
                    onClick={() => setRewardGuideCollapsed(true)}
                    aria-label="Collapse reward guide"
                    title="Collapse guide"
                  >
                    <i className="fas fa-minus" />
                  </button>
                  <button
                    type="button"
                    onClick={() => finishRewardGuide("skipped")}
                    aria-label="Skip reward guide and view result"
                    title="Skip guide"
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              </header>

              <div className="cashoff-guide-stage">
                <div className="cashoff-guide-message-icon" aria-hidden="true">
                  {activeRewardGuideSlide.icon}
                </div>
                <div>
                  <p className="cashoff-guide-unlocked">
                    {rewardGuideStep === 0 ? "New player bonus" : "Look here"}
                  </p>
                  <h2 id="cashoff-guide-title">{activeRewardGuideSlide.title}</h2>
                </div>
              </div>

              <p className="cashoff-guide-copy">{activeRewardGuideSlide.body}</p>

              <footer className="cashoff-guide-actions">
                <div
                  className="cashoff-guide-dots"
                  aria-label={`Step ${rewardGuideStep + 1} of ${rewardGuideSlides.length}`}
                >
                  {rewardGuideSlides.map((slide, index) => (
                    <span
                      key={slide.title}
                      className={index === rewardGuideStep ? "active" : index < rewardGuideStep ? "complete" : ""}
                    />
                  ))}
                </div>

                <div className="cashoff-guide-navigation">
                  {rewardGuideStep > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const previousStep = Math.max(0, rewardGuideStep - 1);
                        if (previousStep >= 1 && previousStep <= 3) setProgressExpanded(true);
                        setRewardGuideStep(previousStep);
                      }}
                      className="cashoff-guide-back"
                      aria-label="Previous reward guide step"
                    >
                      <i className="fas fa-arrow-left" aria-hidden="true" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={advanceRewardGuide}
                    className="cashoff-guide-next"
                  >
                    <span>{activeRewardGuideSlide.action}</span>
                    <i className="fas fa-arrow-right" aria-hidden="true" />
                  </button>
                </div>
              </footer>
            </div>
          </aside>
        </div>
      )}

      {showRewardGuide && rewardGuideCollapsed && (
        <button
          type="button"
          className="cashoff-guide-resume"
          onClick={() => setRewardGuideCollapsed(false)}
        >
          <span aria-hidden="true"><i className="fas fa-comment-dots" /></span>
          Continue reward guide
          <i className="fas fa-chevron-up" aria-hidden="true" />
        </button>
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
                  <>Save your details. <span>Keep every reward.</span></>
                )}
              </h3>

              <p>
                {guestResult
                  ? "Add your details to save this result and open your claim options."
                  : "We use these details to save your prizes and find your Cash Off balance when you shop."}
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
                    <span>Saving your details...</span>
                  </>
                ) : (
                  <>
                    <span>{guestResult ? "Save and view my reward" : "Continue to my free spin"}</span>
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
                    ? "Cash Off added"
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
                    ? `${cleanDisplayText(lastResult.label)} has been added straight to your Cash Off balance.`
                    : lastResult.result_type === "bonus_spin"
                      ? "A bonus spin has been added. Return to the wheel and try again."
                      : lastResult.result_type === "letter"
                        ? "Your new letter group has been added to the EMMYTECHNOLOGY challenge."
                    : lastResult.result_type === "prize"
                      ? `${cleanDisplayText(lastResult.label)} is yours. It has been saved in your Prize Bag for verification and collection.`
                      : "Your reward has been safely added to your EmmyTech Prize Bag."}
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
                  <span>New Cash Off balance</span>
                  <strong>{moneyFmt(lastResult.cash_off_after)}</strong>
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
                Share this result to earn one bonus spin. A valid friend referral
                can earn you another.
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
                      : "Share and earn +1 spin"}
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
                      ? "Message EmmyTech about my Cash Off"
                      : "Message EmmyTech about my reward"}
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
                  ? "Cash Off is shopping credit, linked to the phone number and email used for this spin."
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
              <span>Keep playing</span>
            </div>

            <h3 id="cashoff-no-spins-title">No spins available</h3>

            <p className="cashoff-no-spins-copy">
              {nextDailyAt ? `Your next daily spin is ready in ${dailyCountdown()}. ` : ""}
              Share your personal link now. When a new friend registers and
              completes a valid first spin, your extra spin is added automatically.
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
              <span>Share to earn a spin</span>
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
              <h3 id="cashoff-share-title">Share once. Earn another spin.</h3>
              <p>
                Your friend gets a free spin. You receive one extra spin after a
                valid registration and first spin.
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
