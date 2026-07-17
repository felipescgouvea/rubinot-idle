// Cliente PostgREST minimalista via fetch puro (sem @supabase/supabase-js —
// a lib crasha no runtime Node 20 do Railway porque o cliente Realtime dela
// exige WebSocket nativo, só disponível a partir do Node 22; nós não usamos
// Realtime, então é mais simples e mais leve falar direto com a REST API que
// o Postgres do Supabase já expõe, com a service role key (bypassa RLS de
// propósito — só este servidor deve ter esta chave).
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers(extra = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function qs(filters) {
  return Object.entries(filters).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
}

export async function selectOne(table, filters) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs(filters)}&select=*`, { headers: headers() });
  if (!res.ok) throw new Error(`selectOne ${table} falhou: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows.length ? rows[0] : null;
}

export async function selectMany(table, filters) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs(filters)}&select=*`, { headers: headers() });
  if (!res.ok) throw new Error(`selectMany ${table} falhou: ${res.status} ${await res.text()}`);
  return res.json();
}

// Última linha por uma coluna de ordenação (ex.: a sessão de caça mais
// recente, ativa ou não) — usado quando o dado que precisamos (vocação) só
// existe em hunt_sessions, mas a ação não depende de haver sessão ATIVA.
export async function selectLatest(table, filters, orderCol) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs(filters)}&select=*&order=${orderCol}.desc&limit=1`, { headers: headers() });
  if (!res.ok) throw new Error(`selectLatest ${table} falhou: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows.length ? rows[0] : null;
}

export async function insertRow(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST', headers: headers({ Prefer: 'return=representation' }), body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`insert ${table} falhou: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows[0];
}

export async function updateRows(table, filters, patch) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs(filters)}`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`update ${table} falhou: ${res.status} ${await res.text()}`);
}

export async function upsertRow(table, row, onConflict) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST', headers: headers({ Prefer: 'resolution=merge-duplicates' }), body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`upsert ${table} falhou: ${res.status} ${await res.text()}`);
}

export async function deleteRows(table, filters) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs(filters)}`, { method: 'DELETE', headers: headers() });
  if (!res.ok) throw new Error(`delete ${table} falhou: ${res.status} ${await res.text()}`);
}
