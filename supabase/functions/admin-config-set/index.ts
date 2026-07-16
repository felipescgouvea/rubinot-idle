import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sanitizeAdminConfig } from "./adminConfig.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return new Response(JSON.stringify({ error: "missing token" }), { status: 401 });

  // Cliente autenticado como o CHAMADOR (RLS normal) — só pra descobrir quem é.
  const asUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await asUser.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "invalid token" }), { status: 401 });
  }
  const userId = userData.user.id;

  // Cliente com service role pra checar a whitelist de admins e gravar a config
  // (game_config não tem policy de escrita pra ninguém além do service role).
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: adminRow } = await admin.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!adminRow) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), { status: 400 });
  }

  const clean = sanitizeAdminConfig(body as Record<string, unknown>);

  const { error: upsertErr } = await admin
    .from("game_config")
    .upsert({ id: 1, config: clean, updated_at: new Date().toISOString() });
  if (upsertErr) {
    return new Response(JSON.stringify({ error: upsertErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, config: clean }), {
    headers: { "Content-Type": "application/json" },
  });
});
