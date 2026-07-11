// Cliente de autenticação e save na nuvem — falando direto com o Supabase
// (GoTrue em /auth/v1 e PostgREST em /rest/v1) via fetch, sem biblioteca
// externa, pra manter o jogo self-hosted (nenhuma dependência de CDN).
//
// A URL e a chave abaixo são PÚBLICAS de propósito: a "anon key" só dá acesso
// ao papel anônimo e todo dado de save é protegido por Row Level Security no
// banco (cada usuário só enxerga a própria linha em public.saves). Não há
// segredo aqui — é o modelo padrão do Supabase para apps de front-end.
const SUPABASE_URL = 'https://qrkqhqdfneumymhiczki.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya3FocWRmbmV1bXltaGljemtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTk0NjIsImV4cCI6MjA5OTM3NTQ2Mn0.iBf7aQBVj583Q1TzRw1NeIuKK5jYpLuxByLFmkSnkhk';

const SESSION_KEY = 'rubinot_session';

// ---- sessão local (persistida entre reloads) ----
let session = null; // { access_token, refresh_token, expires_at (epoch s), user }

function loadStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    session = raw ? JSON.parse(raw) : null;
  } catch { session = null; }
  return session;
}

function storeSession(s) {
  session = s;
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* storage cheio/indisponível: segue em memória */ }
}

// Monta o objeto de sessão a partir da resposta de token do GoTrue.
function sessionFromTokenResponse(j) {
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    // expires_in vem em segundos; guardamos o instante absoluto de expiração
    expires_at: Math.floor(Date.now() / 1000) + (j.expires_in || 3600),
    user: j.user || (j.access_token ? decodeJwtUser(j.access_token) : null),
  };
}

function decodeJwtUser(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return { id: payload.sub, email: payload.email };
  } catch { return null; }
}

// ---- helpers HTTP ----
async function authFetch(path, { method = 'POST', body, token } = {}) {
  const headers = { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* resposta não-JSON */ }
  return { ok: res.ok, status: res.status, json };
}

// Mensagem de erro amigável (em PT) a partir da resposta do GoTrue.
function authError(json, status) {
  const code = (json && json.error_code) || '';
  const msg = (json && (json.msg || json.error_description || json.error || json.message)) || '';
  const m = msg.toLowerCase();
  if (code === 'over_email_send_rate_limit' || (m.includes('email') && m.includes('rate'))) return 'Limite de envio de e-mails de confirmação atingido. Aguarde alguns minutos e tente de novo.';
  if (code === 'email_not_confirmed' || m.includes('not confirmed')) return 'Confirme seu e-mail pelo link enviado antes de entrar.';
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (m.includes('already registered') || m.includes('already been registered') || status === 422) return 'Este e-mail já tem uma conta.';
  if (m.includes('password') && m.includes('least')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('email') && m.includes('invalid')) return 'E-mail inválido.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
  return msg || 'Não foi possível completar a solicitação.';
}

// ---- API pública ----
export function getSession() { return session || loadStoredSession(); }
export function currentUser() { const s = getSession(); return s ? s.user : null; }
export function isLoggedIn() { return !!(getSession() && getSession().access_token); }

// URL do próprio jogo, pra onde o link de confirmação deve retornar (precisa
// estar na allowlist de Redirect URLs / Site URL do Supabase).
function gameRedirectUrl() {
  return location.origin + location.pathname;
}

// Criar conta. A conta só é ATIVADA depois que o usuário confirma o e-mail pelo
// link enviado no cadastro. Retorna { ok, needsConfirmation, error }:
//  - needsConfirmation:true  => e-mail de confirmação enviado; ainda não logou.
//  - needsConfirmation:false => (só se o projeto estiver sem confirmação) já logou.
export async function signUp(email, password) {
  const path = '/auth/v1/signup?redirect_to=' + encodeURIComponent(gameRedirectUrl());
  const { ok, status, json } = await authFetch(path, { body: { email, password } });
  if (!ok) return { ok: false, error: authError(json, status) };
  if (json && json.access_token) {
    storeSession(sessionFromTokenResponse(json));
    return { ok: true, needsConfirmation: false };
  }
  // Sem sessão: um e-mail de confirmação foi disparado. Não autentica ainda —
  // o login só funciona após o clique no link (GoTrue barra "email_not_confirmed").
  return { ok: true, needsConfirmation: true };
}

// Reenvia o e-mail de confirmação (caso o usuário não tenha recebido).
export async function resendConfirmation(email) {
  const path = '/auth/v1/resend?redirect_to=' + encodeURIComponent(gameRedirectUrl());
  const { ok, status, json } = await authFetch(path, { body: { type: 'signup', email } });
  if (!ok) return { ok: false, error: authError(json, status) };
  return { ok: true };
}

// Quando o usuário volta pelo link de confirmação, o GoTrue devolve os tokens no
// fragmento da URL (#access_token=...&refresh_token=...). Captura, guarda a
// sessão e limpa a URL. Retorna true se logou por aqui. Chamado no boot (main.js).
export function consumeAuthRedirect() {
  const hash = location.hash || '';
  if (hash.indexOf('access_token') === -1) return false;
  const params = new URLSearchParams(hash.slice(1));
  const access_token = params.get('access_token');
  if (!access_token) return false;
  storeSession({
    access_token,
    refresh_token: params.get('refresh_token'),
    expires_at: Math.floor(Date.now() / 1000) + (parseInt(params.get('expires_in'), 10) || 3600),
    user: decodeJwtUser(access_token),
  });
  history.replaceState(null, '', location.origin + location.pathname + location.search);
  return true;
}

export async function signIn(email, password) {
  const { ok, status, json } = await authFetch('/auth/v1/token?grant_type=password', { body: { email, password } });
  if (!ok) return { ok: false, error: authError(json, status) };
  storeSession(sessionFromTokenResponse(json));
  return { ok: true };
}

export async function signOut() {
  const s = getSession();
  if (s && s.access_token) {
    try { await authFetch('/auth/v1/logout', { token: s.access_token }); } catch { /* ignora */ }
  }
  storeSession(null);
}

// Garante um access_token válido, renovando com o refresh_token se estiver
// perto de expirar. Retorna o token ou null (sessão inválida => precisa logar).
export async function ensureValidToken() {
  const s = getSession();
  if (!s || !s.access_token) return null;
  const now = Math.floor(Date.now() / 1000);
  if (s.expires_at && s.expires_at - now > 60) return s.access_token; // ainda válido
  if (!s.refresh_token) return s.access_token;
  const { ok, json } = await authFetch('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: s.refresh_token } });
  if (!ok || !json || !json.access_token) { storeSession(null); return null; }
  storeSession(sessionFromTokenResponse(json));
  return json.access_token;
}

// ---- save na nuvem (public.saves, uma linha por usuário) ----
export async function loadCloudSave() {
  const token = await ensureValidToken();
  const user = currentUser();
  if (!token || !user) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/saves?user_id=eq.${user.id}&select=data`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const rows = await res.json().catch(() => []);
  return rows && rows.length ? rows[0].data : null;
}

export async function saveCloudSave(data) {
  const token = await ensureValidToken();
  const user = currentUser();
  if (!token || !user) return { ok: false };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/saves`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates', // upsert pela PK (user_id)
    },
    body: JSON.stringify({ user_id: user.id, data, updated_at: new Date().toISOString() }),
  });
  return { ok: res.ok };
}
