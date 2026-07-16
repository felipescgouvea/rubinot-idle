// Rubinot Idle — servidor sempre-ligado (Railway) do motor de caçada
// autoritativo. MARCO 1: só o esqueleto — nenhuma lógica de jogo ainda.
// Objetivo deste marco: provar que a infra funciona (deploy, env vars,
// verificação de sessão do Supabase) antes de portar o combate de verdade
// (ver src/application/huntUseCases.js no cliente, que hoje roda tudo isso
// localmente no navegador).
import http from 'node:http';

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Faltando SUPABASE_URL / SUPABASE_ANON_KEY nas env vars do serviço.');
}

// Confere o access_token do Supabase (o MESMO token que o cliente já usa nas
// chamadas REST, ver src/infrastructure/authClient.js) chamando o GoTrue.
// Reaproveita o padrão existente em vez de verificar o JWT localmente — evita
// precisar do segredo de assinatura do projeto aqui.
async function verifySupabaseToken(token) {
  if (!token) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = await res.json().catch(() => null);
    return user && user.id ? user : null;
  } catch {
    return null;
  }
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(json);
}

const server = http.createServer(async (req, res) => {
  // CORS simples (o jogo é servido de felipescgouvea.github.io) — Marco 1 só
  // precisa liberar leitura; nada aqui ainda muda estado.
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/health') {
    return send(res, 200, { ok: true, service: 'rubinot-idle-hunt-server', stage: 'marco-1' });
  }

  if (url.pathname === '/whoami') {
    const auth = req.headers['authorization'] || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    const user = await verifySupabaseToken(token);
    if (!user) return send(res, 401, { error: 'token inválido ou ausente' });
    return send(res, 200, { ok: true, userId: user.id, email: user.email });
  }

  send(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`rubinot-idle-hunt-server (marco 1) ouvindo na porta ${PORT}`);
});
