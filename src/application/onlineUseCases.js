// Prova social ao vivo: mantém o "N online" do cabeçalho atualizado e guarda o
// topo do ranking pra quem quiser mostrar (ver ui/highscoresPanel). Puxa o
// /online do servidor (público) a cada 60s. Falha de rede não faz barulho — o
// pill só não atualiza; nunca some depois de ter aparecido uma vez, pra não
// piscar 0 num soluço de rede.
import { fetchOnline } from '../infrastructure/authClient.js?v=260';
import { t } from '../i18n/i18n.js?v=269';

let ultimo = { online: 0, top: [] };
let iniciado = false;

export function getOnlineSnapshot() {
  return ultimo;
}

function render() {
  const pill = document.getElementById('online-pill');
  const num = document.getElementById('online-count');
  if (!pill || !num) return;
  if (ultimo.online > 0) {
    num.textContent = ultimo.online;
    pill.style.display = '';
    pill.title = t('shell.onlineTitle', { n: ultimo.online });
  }
}

async function tick() {
  try {
    const r = await fetchOnline();
    if (r && r.ok && typeof r.online === 'number') {
      ultimo = { online: r.online, top: Array.isArray(r.top) ? r.top : [] };
      render();
    }
  } catch { /* silêncio: não derruba o cabeçalho por causa do contador */ }
}

export function startOnlinePolling() {
  if (iniciado) return;
  iniciado = true;
  tick();
  setInterval(tick, 60000);
}
