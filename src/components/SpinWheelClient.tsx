"use client";

import { useEffect, useRef, useState } from "react";

const LOGO_URL =
  "https://ouvdainkxpaegczdinlp.supabase.co/storage/v1/object/public/assest/emmytech%20logo%202.png";

const COLORS = ["#003399", "#fbb03b", "#ffffff"];
const TEXT_COLORS: Record<string, string> = {
  "#003399": "#ffffff",
  "#fbb03b": "#000000",
  "#ffffff": "#003399",
};

const LETTER_SEGMENTS = ["EM", "MY", "TE", "CH", "NO", "LO", "GY"];
const SIZE = 800;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = SIZE / 2 - 15;

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
  return cleanDisplayText(value).toLowerCase()
    .replace(/[â‚¦,\s]/g, "")
    .trim();
}

function getUnlockedLetters(player: SpinPlayer | null) {
  return Array.isArray(player?.letters_unlocked) ? player.letters_unlocked : [];
}

function getCashoutDisplay(player: SpinPlayer | null) {
  const balance = Number(player?.wallet_balance || 0);
  const step = Math.max(1, Number(player?.cashout_target || 1000));
  const nextTarget = Math.max(step, (Math.floor(balance / step) + 1) * step);
  const percent = nextTarget > 0 ? Math.min(100, Math.round((balance / nextTarget) * 100)) : 0;
  const cashoutAvailable = balance >= step;
  const nextLeft = Math.max(0, nextTarget - balance);

  return {
    balance,
    step,
    nextTarget,
    percent,
    cashoutAvailable,
    nextLeft,
  };
}

function getCashoutMotivation(player: SpinPlayer | null) {
  const display = getCashoutDisplay(player);

  if (!player) return "Register and spin to start your cashout journey.";
  if (display.balance <= 0) return "Spin now. Your first win starts the journey.";

  if (!display.cashoutAvailable) {
    const left = Math.max(0, display.step - display.balance);
    return moneyFmt(left) + " remaining - you are " + display.percent + "% there";
  }

  if (display.nextLeft <= 0) {
    return "Cashout ready. Keep spinning to unlock the next level.";
  }

  return "Cashout ready - " + moneyFmt(display.nextLeft) + " to " + moneyFmt(display.nextTarget);
}

export default function SpinWheelClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hubRef = useRef<HTMLDivElement | null>(null);
  const lastTickIdxRef = useRef(-1);
  const angleRef = useRef(0);

  const [wheelItems, setWheelItems] = useState<WheelItem[]>([]);
  const [player, setPlayer] = useState<SpinPlayer | null>(null);
  const [prizeBag, setPrizeBag] = useState<PrizeBagItem[]>([]);
  const [cashOffAccount, setCashOffAccount] = useState<CashOffAccount | null>(null);
  const [loading, setLoading] = useState(true);
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
    if (preview === "no-spins") {
      setShowOutOfSpins(true);
    }
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

  const cashout = getCashoutDisplay(player);
  const unlockedLetters = getUnlockedLetters(player);
  const cashOffBalance = Number(cashOffAccount?.balance || 0);
  const totalCashOffEarned = Number(cashOffAccount?.total_credited || 0);
  const totalCashOffUsed = Number(cashOffAccount?.total_debited || 0);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    drawWheel(angleRef.current);
  }, [wheelItems]);

  async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref");

    if (refCode) {
      localStorage.setItem("emmy_ref", refCode);
    }

    await loadBootstrap();
    await loadSavedPlayer();

    setLoading(false);
  }

  async function loadBootstrap() {
    try {
      const res = await fetch("/api/spin/bootstrap");
      const data = await res.json();

      if (data.ok) {
        setWheelItems(data.wheelItems || []);
      }
    } catch (error) {
      console.error("Bootstrap error:", error);
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

    wheelItems.forEach((item, i) => {
      const color = COLORS[i % COLORS.length];
      const start = currentAngle + i * arc;

      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R, start, start + arc);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(start + arc / 2);
      ctx.fillStyle = TEXT_COLORS[color] || "#000";
      ctx.font = "800 22px 'Plus Jakarta Sans', Arial";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      const label = cleanDisplayText(item.label).toUpperCase();
      ctx.fillText(label.length > 18 ? `${label.slice(0, 17)}â€¦` : label, R - 40, 0);

      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.strokeStyle = "#003399";
    ctx.lineWidth = 4;
    ctx.stroke();
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

        if (hubRef.current) {
          hubRef.current.classList.remove("ticking");
          void hubRef.current.offsetWidth;
          hubRef.current.classList.add("ticking");
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
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
      setShowRegister(true);
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

      const res = await fetch("/api/spin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, referralCode }),
      });

      const data = await res.json();

      if (!data.ok) {
        setRegError(data.error || "Registration failed. Please try again.");
        return;
      }

      localStorage.setItem("emmy_spin_player_id", data.spinPlayer.id);
      setPlayer(data.spinPlayer);
      setShowRegister(false);
      setDrawerOpen(false);
      await refreshPlayer(data.spinPlayer.id);
    } catch (error) {
      console.error(error);
      setRegError("Network error. Please try again.");
    } finally {
      setRegistering(false);
    }
  }

  async function performSpin() {
    if (!player || spinning || !wheelItems.length) return;

    setSpinning(true);
    setLastResult(null);

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

      const res = await fetch("/api/spin/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spinPlayerId: player.id,
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
        setPlayer(data.spinPlayer);

        setCashOffAccount((current) => ({
          exists: true,
          identity_id:
            current?.identity_id ||
            player.identity_id ||
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

  function useCashOffViaWhatsApp() {
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
    return `${window.location.origin}?ref=${player.referral_code}`;
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

  async function shareToWhatsAppStatus() {
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
  }

  function buttonLabel() {
    if (loading) return "CONNECTING...";
    if (!player) return "✨ SPIN FOR CASH OFF";
    if (spinning) return "🎡 SPINNING...";
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
      <div className={`win-toast ${toast ? "show" : ""}`}>
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

      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white p-4 md:p-6">
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

      <main className="flex flex-grow flex-col items-center justify-center px-6 py-10">
        <section className="cashoff-hero-shell">
          <div className="cashoff-hero-copy">
            <div className="cashoff-hero-badge">
              <span className="cashoff-hero-emoji">🎁</span>
              <span>Tap the wheel. Win Cash Off.</span>
            </div>

            <h1>
              EmmyTech <span>Spin & Save</span>
            </h1>
          </div>
        </section>

        <div className="w-full max-w-lg text-center">
          <div className="wheel-outer mb-12">
            <div className="pointer-3d">
              <svg width="40" height="50" viewBox="0 0 40 50">
                <path
                  d="M20 50L0 15C0 6.7 6.7 0 15 0H25C33.3 0 40 6.7 40 15L20 50Z"
                  fill="#ef4444"
                />
                <circle cx="20" cy="15" r="5" fill="white" />
              </svg>
            </div>

            <canvas ref={canvasRef} className="wheel-canvas" />

            <div ref={hubRef} className="hub">
              <div className="h-2 w-2 rounded-full bg-blue-700" />
            </div>
          </div>

          <button
            onClick={requestAccess}
            disabled={loading || spinning}
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
                  onClick={useCashOffViaWhatsApp}
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
            onClick={() => setShowBag(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 py-4 text-sm font-800 uppercase tracking-widest text-slate-600 md:hidden"
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
                  useCashOffViaWhatsApp();
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
                <span>Your free spin is ready</span>
              </div>

              <h3 id="cashoff-register-title">
                One step to <span>Spin & Save</span>
              </h3>

              <p>
                Enter your correct details so every Cash Off reward stays linked
                to you and can be used on eligible EmmyTech orders.
              </p>
            </header>

            <div className="cashoff-register-steps" aria-label="How it works">
              <div>
                <span>1</span>
                <strong>Register</strong>
              </div>
              <i className="fas fa-chevron-right" />
              <div>
                <span>2</span>
                <strong>Spin</strong>
              </div>
              <i className="fas fa-chevron-right" />
              <div>
                <span>3</span>
                <strong>Save</strong>
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
                    <span>Unlock my free spin</span>
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
              {lastResult.result_type === "retry" ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowResult(false);
                    setShareCopied(false);
                    setShowShare(true);
                  }}
                  className="cashoff-result-primary"
                >
                  <i className="fas fa-user-plus" />
                  <span>Share & get another spin</span>
                </button>
              ) : lastResult.result_type === "cash" ? (
                <button
                  type="button"
                  onClick={useCashOffViaWhatsApp}
                  className="cashoff-result-primary"
                >
                  <i className="fab fa-whatsapp" />
                  <span>Use my Cash Off</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={claimViaWhatsApp}
                  className="cashoff-result-primary"
                >
                  <i className="fab fa-whatsapp" />
                  <span>Message EmmyTech</span>
                </button>
              )}

              <div className="cashoff-result-secondary-row">
                <button
                  type="button"
                  onClick={() => setShowResult(false)}
                  className="cashoff-result-secondary"
                >
                  <i className="fas fa-redo-alt" />
                  <span>
                    {Number(player?.spins_remaining || 0) > 0
                      ? "Back to wheel"
                      : "Close"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowResult(false);
                    setShowBag(true);
                  }}
                  className="cashoff-result-secondary"
                >
                  <i className="fas fa-box-open" />
                  <span>Prize bag</span>
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
                  onClick={shareToWhatsAppStatus}
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
                  onClick={useCashOffViaWhatsApp}
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