// Cliente Supabase mínimo (fetch cru contra o REST/RPC do PostgREST) — o
// projeto já usa RLS + funções SECURITY DEFINER no banco como fronteira de
// segurança real; aqui é só o transporte HTTP, sem lógica de jogo nenhuma.

const SUPABASE_URL = 'https://tyjmyfpdqyjjxejudfmr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-Y4w7gioJ_cj6SwkNsiOpQ_NSEbg6VE';

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
}

// SELECT público via REST — retorna null em qualquer falha (offline, etc.),
// quem chama decide como comunicar isso ao jogador.
export async function selectRequest(pathAndQuery) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, { headers: headers() });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// RPC (função SECURITY DEFINER) — única forma de escrita permitida pelo banco.
// Lança um Error com a mensagem vinda do Postgres em caso de falha, pra quem
// chamar decidir a mensagem exibida ao jogador.
export async function rpcRequest(fnName, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Falha na operação de rede.');
  }
  return res.json().catch(() => null);
}
