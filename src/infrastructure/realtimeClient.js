// Canal de tempo real com o servidor de caçada.
//
// O jogo funciona sem isto. O poll (huntUseCases: reconcileWithServer) continua
// existindo e é ele quem garante o estado; o socket só ANTECIPA a entrega — o
// golpe chega no instante do tick (~120ms, uma via) em vez de esperar o próximo
// poll (até ~1,1s). Por isso todo caminho de erro aqui é silencioso: se o
// socket não conectar, cair ou o navegador não suportar, nada quebra.
//
// Quem aplica o estado é a MESMA função do poll (aplicarEstadoDoServidor) —
// duas cópias dessa lógica seria garantia de o jogo se comportar diferente
// conforme o socket estivesse de pé ou não.

const SERVER_WS = 'wss://rubinot-idle-hunt-server-production.up.railway.app/ws';

let ws = null;
let slotAtual = null;
let aoReceber = null;
let tentativas = 0;
let reconectarId = null;
let desligado = false;

function agendarReconexao() {
  if (desligado || reconectarId) return;
  // Espera crescente até 30s. Sem isso, um servidor fora do ar viraria uma
  // enxurrada de tentativas de conexão — justamente quando ele menos aguenta.
  const espera = Math.min(30000, 1000 * Math.pow(2, Math.min(tentativas, 5)));
  reconectarId = setTimeout(() => {
    reconectarId = null;
    if (!desligado && slotAtual != null) abrir(slotAtual);
  }, espera);
}

function abrir(slot) {
  if (typeof WebSocket === 'undefined') return;   // navegador sem suporte: só poll
  fecharSocket();
  const token = tokenAtual();
  if (!token) { agendarReconexao(); return; }
  try {
    ws = new WebSocket(`${SERVER_WS}?slot=${slot}&token=${encodeURIComponent(token)}`);
  } catch { agendarReconexao(); return; }

  ws.onopen = () => { tentativas = 0; };
  ws.onmessage = ev => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.tipo !== 'tick' || !aoReceber) return;
    // Remonta no formato que o /hunt/state devolve, pra aplicação ser a mesma.
    // `stats` vai só com hp/mana: gold e XP não vêm no push (têm escritores
    // fora da caçada) e a aplicação ignora campo ausente.
    aoReceber({
      ok: true,
      hunting: true,
      sessionId: msg.sessionId,
      zoneId: msg.zoneId,
      stats: { hp: msg.hp, mana: msg.mana },
      pack: msg.pack,
      combatEvents: msg.combatEvents,
      killEvents: msg.killEvents,
      inventory: msg.inventory,
      skills: msg.skills,
    });
  };
  ws.onerror = () => {};
  ws.onclose = () => { ws = null; tentativas++; agendarReconexao(); };
}

let tokenAtual = () => null;

function fecharSocket() {
  if (!ws) return;
  try { ws.onclose = null; ws.close(); } catch {}
  ws = null;
}

// `pegarToken` é injetado (o token vive no authClient) pra este módulo não
// depender de onde a sessão é guardada.
export function conectarRealtime(slot, pegarToken, callback) {
  tokenAtual = pegarToken;
  aoReceber = callback;
  slotAtual = slot;
  desligado = false;
  tentativas = 0;
  abrir(slot);
}

export function desconectarRealtime() {
  desligado = true;
  slotAtual = null;
  if (reconectarId) { clearTimeout(reconectarId); reconectarId = null; }
  fecharSocket();
}

// O poll usa isto pra afrouxar a cadência quando o socket está entregando.
export function realtimeAtivo() {
  return !!(ws && ws.readyState === 1);
}
