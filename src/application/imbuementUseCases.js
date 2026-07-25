// Aplicar Imbuements (aprimoramento temporário de equipamento). Validado no
// servidor (gold + materiais); o cliente só manda a INTENÇÃO e espelha o
// resultado. O efeito no combate é 100% server-side (ver huntEngine.js).
import { G, ACCOUNT } from './gameStore.js?v=285';
import { IMBUEMENTS } from '../domain/imbuements.js?v=281';
import { ITEMS } from '../domain/items.js?v=296';
import { emit, EVENTS } from '../shared/eventBus.js?v=283';
import { saveGame } from './saveGameUseCase.js?v=285';
import { imbueOnServer } from '../infrastructure/authClient.js?v=293';

// Pré-checagem local (só pra UX — o servidor revalida): tem a arma equipada, o
// gold e os materiais?
export function canImbue(imbuementId) {
  const def = IMBUEMENTS[imbuementId];
  if (!def) return { ok: false, reason: 'imbuement inválido' };
  if (!G.equipment[def.slot]) return { ok: false, reason: `equipe uma ${def.slot === 'weapon' ? 'arma' : 'peça'} primeiro` };
  if (G.gold < def.cost.gold) return { ok: false, reason: `precisa de ${def.cost.gold.toLocaleString()} de ouro` };
  for (const [itemId, qty] of def.cost.materials) {
    if ((G.inventory[itemId] || 0) < qty) return { ok: false, reason: `falta ${qty}x ${ITEMS[itemId]?.name || itemId}` };
  }
  return { ok: true };
}

export async function applyImbuement(imbuementId) {
  const def = IMBUEMENTS[imbuementId];
  if (!def) return;
  const pre = canImbue(imbuementId);
  if (!pre.ok) { emit(EVENTS.NOTIFY, { msg: pre.reason, type: 'error' }); return; }
  const res = await imbueOnServer(ACCOUNT.activeSlot, imbuementId);
  if (!res.ok) { emit(EVENTS.NOTIFY, { msg: `⚠️ ${res.error}`, type: 'error' }); return; }
  G.gold = res.gold;
  G.imbuements = G.imbuements || {};
  G.imbuements[res.eqSlot] = res.imbuement;
  // debita materiais localmente (só display — o servidor já debitou de verdade)
  for (const [itemId, qty] of def.cost.materials) {
    G.inventory[itemId] = Math.max(0, (G.inventory[itemId] || 0) - qty);
    if (G.inventory[itemId] === 0) delete G.inventory[itemId];
  }
  emit(EVENTS.NOTIFY, { msg: `🔮 ${def.name} aplicado! Dura ${def.durationH}h.`, type: 'success' });
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.INVENTORY);
  saveGame();
}
