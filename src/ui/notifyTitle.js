// Gancho de re-engajamento mais barato que existe: quando há algo pra RESGATAR,
// o título da ABA do navegador vira "(N) Rubinot Idle" — igual ao "(1)" de
// e-mail/chat. Some quando não sobra nada pendente. N = quantas CATEGORIAS têm
// algo a coletar (diária, task pronta, tier de Battle Pass).
//
// Cada subsistema REPORTA seu próprio flag de onde ele JÁ calcula o booleano
// (renderDailyBadge sabe `canClaim`, renderActiveTask sabe `ready`, o painel de
// BP sabe quais tiers dá pra resgatar). Este módulo só conta e escreve o título —
// nenhuma definição de "resgatável" é reinventada aqui, então não há falso-positivo.
//
// É stateful (guarda o Set de flags): tem que ser importado numa versão só em todo
// lugar (ver scripts/check-import-versions.mjs, lista COM_ESTADO).

const BASE_TITLE = 'Rubinot Idle';
const flags = new Set();

function render() {
  const n = flags.size;
  const wanted = n > 0 ? `(${n}) ${BASE_TITLE}` : BASE_TITLE;
  if (document.title !== wanted) document.title = wanted;
}

// Liga/desliga o flag de uma categoria ('daily' | 'task' | 'bp'). Idempotente.
export function setTitleFlag(key, on) {
  const had = flags.has(key);
  if (on) flags.add(key); else flags.delete(key);
  if (flags.has(key) !== had) render();
}

// Selo "!" na ABA do jogo (Tasks/Battle Pass) quando há algo pra resgatar —
// antes só a Daily avisava. Dirigido pelos MESMOS sinais do título (os painéis
// chamam isto de onde já sabem o booleano). Cria/mostra/esconde o ponto sem
// depender de nada (por isso mora aqui, num módulo sem imports — evita ciclo
// com tabs.js, que já importa os painéis). `tabName` = o data-tab do botão.
export function setTabBadge(tabName, on) {
  const tab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  if (!tab) return;
  let badge = tab.querySelector('.tab-badge');
  if (on) {
    if (!badge) { badge = document.createElement('span'); badge.className = 'tab-badge'; tab.appendChild(badge); }
    badge.style.display = '';
  } else if (badge) {
    badge.style.display = 'none';
  }
}
