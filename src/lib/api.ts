// All data access runs in the browser. Row Level Security in Supabase decides
// what each signed-in user can read or change.
import { supabase } from "./supabase";
import type { Customer } from "./customer-auth";

const COLUMNS =
  "id, name, phone_number, avatar_url, height_cm, weight_kg, goal, diet_plan, workout_plan, plan_start_date, plan_duration_days, created_at";

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Please sign in again.");
  return data.user.id;
}

/** Sign-up goes through the Netlify Function (needs the service role key). */
export async function signupCustomer({
  data,
}: {
  data: { name: string; phone: string; pin: string };
}): Promise<{ ok: true }> {
  const res = await fetch("/.netlify/functions/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? "Could not create your account. Please try again.");
  return { ok: true };
}

export async function getMyCustomer(): Promise<Customer | null> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("customers")
    .select(COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Customer | null) ?? null;
}

export async function updateMyCustomer({
  data,
}: {
  data: {
    height_cm?: number | null;
    weight_kg?: number | null;
    goal?: string | null;
    avatar_url?: string | null;
  };
}): Promise<{ ok: true }> {
  const userId = await currentUserId();
  const patch: Record<string, unknown> = {};
  for (const k of ["height_cm", "weight_kg", "goal", "avatar_url"] as const) {
    if (data[k] !== undefined) patch[k] = data[k];
  }
  const { error } = await supabase.from("customers").update(patch).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function assertOwner(): Promise<void> {
  const userId = await currentUserId();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: this area is for the owner only.");
}

export async function listCustomers(): Promise<Customer[]> {
  await assertOwner();
  const { data, error } = await supabase
    .from("customers")
    .select(COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Customer[];
}

export async function updateCustomerPlan({
  data,
}: {
  data: {
    id: string;
    diet_plan: string | null;
    workout_plan: string | null;
    plan_start_date: string | null;
    plan_duration_days: number | null;
  };
}): Promise<{ ok: true }> {
  await assertOwner();
  const { id, ...patch } = data;
  const { data: rows, error } = await supabase
    .from("customers")
    .update(patch)
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!rows?.length) throw new Error("Could not save — not allowed.");
  return { ok: true };
}
