import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";

export type Customer = {
  id: string;
  name: string | null;
  phone_number: string;
  avatar_url: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string | null;
  diet_plan: string | null;
  workout_plan: string | null;
  plan_start_date: string | null;
  plan_duration_days: number | null;
  created_at?: string;
};

/**
 * Customers never receive emails, so their Supabase identity uses a synthetic
 * email derived from their phone number. The PIN is folded into the password.
 * Both values are derived the same way on sign-in and sign-up.
 */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function customerAuthEmail(phone: string): string {
  return `${normalizePhone(phone)}@phone.rawfitness.app`;
}

export function customerAuthPassword(phone: string, pin: string): string {
  return `rfx:${normalizePhone(phone)}:${pin}`;
}

export type PlanInfo = {
  endDate: Date | null;
  expired: boolean;
  daysLeft: number | null;
};

export function planEndDateInfo(c: {
  plan_start_date: string | null;
  plan_duration_days: number | null;
}): PlanInfo {
  if (!c.plan_start_date || !c.plan_duration_days) {
    return { endDate: null, expired: false, daysLeft: null };
  }
  const start = startOfDay(new Date(`${c.plan_start_date}T00:00:00`));
  if (Number.isNaN(start.getTime())) {
    return { endDate: null, expired: false, daysLeft: null };
  }
  const end = addDays(start, c.plan_duration_days);
  const today = startOfDay(new Date());
  const daysLeft = differenceInCalendarDays(end, today);
  return { endDate: end, expired: daysLeft < 0, daysLeft };
}

export function formatPhone(phone: string): string {
  return phone.length > 10 ? `+${phone}` : phone;
}

export function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function initials(name: string | null, phone: string): string {
  const n = (name ?? "").trim();
  if (n) return n.slice(0, 1).toUpperCase();
  return phone.slice(-2);
}
