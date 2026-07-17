export const LETTER_SEGMENTS = ["EM", "MY", "TE", "CH", "NO", "LO", "GY"];

export function normalizePhone(rawPhone: string | null | undefined) {
  if (!rawPhone) return null;

  const digits = String(rawPhone).replace(/\D/g, "");

  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  if (digits.length === 10) return `+234${digits}`;

  return rawPhone.trim();
}

export function cleanEmail(email: string | null | undefined) {
  if (!email) return null;
  return email.trim().toLowerCase();
}

export function moneyFmt(amount: number | string | null | undefined) {
  return `₦${Number(amount || 0).toLocaleString()}`;
}

export function getNextLetter(lettersUnlocked: string[] = []) {
  return LETTER_SEGMENTS.find((code) => !lettersUnlocked.includes(code)) || null;
}

export function safeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export function makeReferralCode(name: string) {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);

  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `${clean || "emmy"}${suffix}`;
}

export function weightedPick<T extends { gravity?: number | null }>(items: T[]) {
  const weighted = items.flatMap((item) => {
    const weight = Math.max(1, Number(item.gravity || 1));
    return Array.from({ length: weight }, () => item);
  });

  if (weighted.length === 0) return null;

  return weighted[Math.floor(Math.random() * weighted.length)];
}