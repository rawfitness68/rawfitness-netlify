// Member sign-up: the only server-side code. Holds the service role key so the
// account can be created already confirmed (members have no real email).
import { createClient } from "@supabase/supabase-js";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json(500, { error: "Sign-up is not configured yet. Please contact the gym." });
  }

  let input: { name?: unknown; phone?: unknown; pin?: unknown };
  try {
    input = await req.json();
  } catch {
    return json(400, { error: "Invalid request" });
  }
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const phone = typeof input.phone === "string" ? input.phone.replace(/\D/g, "") : "";
  const pin = typeof input.pin === "string" ? input.pin : "";
  if (name.length < 2 || name.length > 80) return json(400, { error: "Enter your full name" });
  if (!/^\d{10,15}$/.test(phone)) return json(400, { error: "Enter a valid phone number" });
  if (!/^\d{4}$/.test(pin)) return json(400, { error: "PIN must be 4 digits" });

  // Must match src/lib/customer-auth.ts
  const email = `${phone}@phone.rawfitness.app`;
  const password = `rfx:${phone}:${pin}`;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing } = await admin
    .from("customers")
    .select("id")
    .eq("phone_number", phone)
    .maybeSingle();
  if (existing) return json(409, { error: "This phone number is already registered. Please sign in." });

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !created.user) {
    const msg = (error?.message ?? "").toLowerCase();
    if (msg.includes("already") || msg.includes("exists") || msg.includes("duplicate")) {
      return json(409, { error: "This phone number is already registered. Please sign in." });
    }
    console.error("createUser failed:", error?.message);
    return json(500, { error: "Could not create your account. Please try again." });
  }

  const { error: insertError } = await admin
    .from("customers")
    .insert({ user_id: created.user.id, phone_number: phone, name });
  if (insertError) {
    console.error("customers insert failed:", insertError.message);
    await admin.auth.admin.deleteUser(created.user.id);
    return json(500, { error: "Could not create your account. Please try again." });
  }

  return json(200, { ok: true });
};
