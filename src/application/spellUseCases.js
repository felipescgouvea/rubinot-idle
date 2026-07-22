// Lançamento manual de magia — hoje só as de CONJURAÇÃO (as que fabricam item:
// munição do paladino, runas dos magos, comida do druida). Ataque e cura são
// automáticos pelo motor de combate no servidor, não passam por aqui.
//
// Nada é decidido no cliente: nível, vocação, mana, soul points e a Blank Rune
// de reagente são todos conferidos no servidor (ver server/src/index.js:
// /conjure). Aqui só disparamos o pedido e aplicamos o que ele devolveu — se o
// cliente pudesse creditar a runa sozinho, runa viraria item infinito.
import { G } from './gameStore.js?v=210';
import { SPELLS } from '../domain/spells.js?v=150';
import { ITEMS } from '../domain/items.js?v=221';
import { conjureOnServer } from '../infrastructure/authClient.js?v=218';
import { emit, EVENTS } from '../shared/eventBus.js?v=208';

export async function conjureSpell(slot, spellId) {
  const s = SPELLS[spellId];
  if (!s || s.type !== 'conjure') return { ok: false };

  const r = await conjureOnServer(slot, spellId, G.vocation);
  if (!r || !r.ok) {
    emit(EVENTS.NOTIFY, { msg: (r && r.error) || 'não foi possível conjurar', type: 'error' });
    return { ok: false };
  }

  G.mana = r.mana;
  G.soul = r.soul;
  G.soulAt = Date.now();
  G.inventory[r.item] = r.qty;
  if (s.reagent) {
    G.inventory[s.reagent.item] = Math.max(0, (G.inventory[s.reagent.item] || 0) - s.reagent.count);
    if (!G.inventory[s.reagent.item]) delete G.inventory[s.reagent.item];
  }

  const nome = ITEMS[r.item] ? ITEMS[r.item].name : r.item;
  emit(EVENTS.LOG, { html: `🗣️ "${s.words}" → ${r.count}× ${nome}`, cat: 'magia' });
  emit(EVENTS.NOTIFY, { msg: `${r.count}× ${nome}`, type: 'success' });
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.INVENTORY);
  // Devolve a resposta do servidor inteira (mana/soul/quantidade) — é a única
  // medida confiável do custo: parado, o cliente regenera mana sozinho a cada
  // 2s e G.mana já não reflete a cobrança um instante depois.
  return { ok: true, ...r };
}
