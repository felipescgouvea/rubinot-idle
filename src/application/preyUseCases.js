// Casos de uso das Presas (Prey) — AUTORITATIVAS NO SERVIDOR (ver
// server/src/index.js: /prey/activate,reroll,clear,state). Antes G.prey era
// só local e /hunt/start aceitava o array inteiro do cliente (achado de
// auditoria: um cliente adulterado forjava raridade 10 em todo bônus, em toda
// criatura da zona, de graça — mesma classe do bug de charms, sem precisar
// nem jogar o minigame). rollPreyRarity/rollPreyBonusType/preyBonusPct agora
// só rodam no servidor; aqui só chamamos os endpoints e espelhamos G.prey com
// a resposta autoritativa.
import { G, ACCOUNT } from './gameStore.js?v=361';
import { MONSTERS } from '../domain/bestiary.js?v=380';
import { PREY_SLOTS, PREY_BONUS_TYPES, preyRerollCost } from '../domain/prey.js?v=357';
import { emit, EVENTS } from '../shared/eventBus.js?v=359';
import { saveGame } from './saveGameUseCase.js?v=361';
import { fetchPreyState, activatePreyOnServer, rerollPreyOnServer, clearPreyOnServer } from '../infrastructure/authClient.js?v=369';
import { t } from '../i18n/i18n.js?v=377';

const PREY_BONUS_NAME_KEY = { damage: 'bestiary.bonusDamage', defense: 'bestiary.bonusDefense', xp: 'bestiary.bonusXp', loot: 'bestiary.bonusLoot' };

function ensurePreyArray() {
  if (!Array.isArray(G.prey)) G.prey = [];
  while (G.prey.length < PREY_SLOTS) G.prey.push(null);
}

// Busca os 3 slots reais do servidor e espelha em G — chamado no boot e depois
// de qualquer ação de prey, pra tela sempre refletir o que está realmente
// gravado (nunca um valor que o próprio cliente inventou).
export async function syncPreyState() {
  const res = await fetchPreyState(ACCOUNT.activeSlot);
  if (!res.ok) return;
  ensurePreyArray();
  for (let i = 0; i < PREY_SLOTS; i++) G.prey[i] = res.slots[i] || null;
  emit(EVENTS.PREY_PANEL);
}

// Trava uma criatura num slot (o servidor sorteia bônus + raridade 1 e inicia
// o timer — ver /prey/activate).
export async function activatePrey(slotIndex, monsterId) {
  if (slotIndex < 0 || slotIndex >= PREY_SLOTS) return;
  if (!MONSTERS[monsterId]) return;
  const res = await activatePreyOnServer(ACCOUNT.activeSlot, slotIndex, monsterId);
  if (!res.ok) { emit(EVENTS.NOTIFY, { msg: `⚠️ ${res.error}`, type: 'error' }); return; }
  ensurePreyArray();
  for (let i = 0; i < PREY_SLOTS; i++) G.prey[i] = res.slots[i] || null;
  const p = G.prey[slotIndex];
  const bt = PREY_BONUS_TYPES[p.bonusType];
  emit(EVENTS.NOTIFY, {
    msg: t('bestiary.preyLocked', {
      monster: MONSTERS[monsterId].name,
      icon: bt.icon,
      pct: Math.round(p.bonusPct * 100),
      bonus: t(PREY_BONUS_NAME_KEY[p.bonusType]),
      stars: p.rarity,
    }),
    type: 'success',
  });
  emit(EVENTS.PREY_PANEL);
  saveGame();
}

// Rerola o bônus/estrelas de um slot já travado (o servidor sorteia — sempre
// SOBE a partir da raridade atual, nunca aceita o valor do cliente).
export async function rerollPrey(slotIndex) {
  ensurePreyArray();
  const slot = G.prey[slotIndex];
  if (!slot || !slot.monster) return;
  // Carta de presa (prêmio de Arena/Battle Pass) paga o reroll no lugar do
  // gold — a CONTAGEM da carta ainda é só local (mesmo limite já aceito hoje
  // pros prêmios não-materiais de Arena/BP, ver rewardGrants.js); o que
  // fecha o exploit real é a raridade/tipo sorteados no servidor, não a
  // origem do pagamento.
  const custo = preyRerollCost(G.level);
  const usaCarta = (G.preyCards || 0) > 0;
  if (!usaCarta && (G.gold || 0) < custo) {
    emit(EVENTS.NOTIFY, { msg: t('bestiary.preyGoldInsufficient', { cost: custo.toLocaleString() }), type: 'error' });
    return;
  }
  const res = await rerollPreyOnServer(ACCOUNT.activeSlot, slotIndex, usaCarta);
  if (!res.ok) { emit(EVENTS.NOTIFY, { msg: `⚠️ ${res.error}`, type: 'error' }); return; }
  if (usaCarta) G.preyCards--; else G.gold = res.gold;
  ensurePreyArray();
  for (let i = 0; i < PREY_SLOTS; i++) G.prey[i] = res.slots[i] || null;
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.PREY_PANEL);
  emit(EVENTS.NOTIFY, { msg: t('bestiary.preyRerolled'), type: 'success' });
  saveGame();
}

// Libera um slot (deixa escolher outra criatura).
export async function clearPrey(slotIndex) {
  const res = await clearPreyOnServer(ACCOUNT.activeSlot, slotIndex);
  if (!res.ok) return;
  ensurePreyArray();
  for (let i = 0; i < PREY_SLOTS; i++) G.prey[i] = res.slots[i] || null;
  emit(EVENTS.PREY_PANEL);
  saveGame();
}
