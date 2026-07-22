// SOUL POINTS — a segunda "moeda" de conjuração do Tibia.
//
// Toda magia que FABRICA alguma coisa (munição do paladino, runas dos magos)
// custa mana E soul. É o que impede o jogador de virar uma fábrica infinita de
// runas: mana volta rápido, soul não. Ver domain/spells.js (campo `soul`).
//
// Os números são os do TFS (data/XML/vocations.xml), iguais pras quatro
// vocações — o que muda é a promoção:
//   soulmax        100  ->  200 promovido
//   gainsoulticks  120s ->   15s promovido   (1 ponto por intervalo)
//
// Não há ganho de soul por matar criatura: no Tibia atual soul só volta com o
// tempo. Por isso o valor é calculado a partir do RELÓGIO (quando o save foi
// gravado), e não somado a cada tick — assim o jogador que fecha a aba
// recupera soul do mesmo jeito que o que fica com ela aberta.

export const SOUL_MAX = 100;
export const SOUL_MAX_PROMOTED = 200;
export const SOUL_TICK_MS = 120000;
export const SOUL_TICK_MS_PROMOTED = 15000;

export function maxSoul(promoted) {
  return promoted ? SOUL_MAX_PROMOTED : SOUL_MAX;
}

export function soulTickMs(promoted) {
  return promoted ? SOUL_TICK_MS_PROMOTED : SOUL_TICK_MS;
}

// Quanto soul o personagem tem AGORA, dado o valor gravado e quando foi
// gravado. Nunca passa do teto e nunca diminui sozinho.
export function currentSoul(soul, lastAt, promoted, now = Date.now()) {
  const teto = maxSoul(promoted);
  const base = Math.max(0, Math.min(teto, Math.floor(Number(soul) || 0)));
  if (base >= teto) return teto;
  const decorrido = Math.max(0, now - (Number(lastAt) || now));
  return Math.min(teto, base + Math.floor(decorrido / soulTickMs(promoted)));
}

// Quanto falta (em ms) pro próximo ponto — só pra UI mostrar o contador.
export function msToNextSoul(soul, lastAt, promoted, now = Date.now()) {
  if (currentSoul(soul, lastAt, promoted, now) >= maxSoul(promoted)) return 0;
  const tick = soulTickMs(promoted);
  const decorrido = Math.max(0, now - (Number(lastAt) || now));
  return tick - (decorrido % tick);
}

// Gasta `custo` pontos. Devolve o novo par {soul, lastAt} ou null se não deu.
// `lastAt` é reiniciado no gasto porque o contador do próximo ponto recomeça —
// sem isso, um jogador podia esperar 119s, gastar, e ganhar o ponto de graça
// no segundo seguinte.
export function spendSoul(soul, lastAt, promoted, custo, now = Date.now()) {
  const atual = currentSoul(soul, lastAt, promoted, now);
  if (atual < custo) return null;
  return { soul: atual - custo, lastAt: now };
}
