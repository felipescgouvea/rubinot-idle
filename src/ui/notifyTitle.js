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
