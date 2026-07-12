// Casos de uso das Presas (Prey): travar uma criatura num slot, rerolar o
// bônus e ativar. Ver domain/prey.js pra as regras puras.
import { G } from './gameStore.js?v=95';
import { MONSTERS } from '../domain/bestiary.js?v=95';
import {
  PREY_SLOTS, PREY_DURATION_MS, PREY_REROLL_COST, PREY_BONUS_TYPES, PREY_STAR_PCT,
  rollPreyStars, rollPreyBonusType,
} from '../domain/prey.js?v=95';
import { emit, EVENTS } from '../shared/eventBus.js?v=95';
import { saveGame } from './saveGameUseCase.js?v=95';

function ensurePreyArray() {
  if (!Array.isArray(G.prey)) G.prey = [];
  while (G.prey.length < PREY_SLOTS) G.prey.push(null);
}

function makePrey(monsterId) {
  const stars = rollPreyStars();
  const bonusType = rollPreyBonusType();
  return {
    monster: monsterId,
    bonusType,
    stars,
    bonusPct: PREY_STAR_PCT[stars],
    expires: Date.now() + PREY_DURATION_MS,
  };
}

// Trava uma criatura num slot (sorteia bônus + estrelas e inicia o timer).
export function activatePrey(slotIndex, monsterId) {
  ensurePreyArray();
  if (slotIndex < 0 || slotIndex >= PREY_SLOTS) return;
  if (!MONSTERS[monsterId]) return;
  G.prey[slotIndex] = makePrey(monsterId);
  const p = G.prey[slotIndex];
  const t = PREY_BONUS_TYPES[p.bonusType];
  emit(EVENTS.NOTIFY, { msg: `🐾 Presa: ${MONSTERS[monsterId].name} — ${t.icon} +${Math.round(p.bonusPct * 100)}% ${t.name} (${p.stars}★)`, type: 'success' });
  emit(EVENTS.PREY_PANEL);
  saveGame();
}

// Rerola o bônus/estrelas de um slot já travado, pagando gold — mantém a mesma
// criatura, sorteia um novo bônus e RENOVA o tempo.
export function rerollPrey(slotIndex) {
  ensurePreyArray();
  const slot = G.prey[slotIndex];
  if (!slot || !slot.monster) return;
  if (G.gold < PREY_REROLL_COST) {
    emit(EVENTS.NOTIFY, { msg: `Gold insuficiente (precisa de ${PREY_REROLL_COST.toLocaleString()}).`, type: 'error' });
    return;
  }
  G.gold -= PREY_REROLL_COST;
  G.prey[slotIndex] = makePrey(slot.monster);
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.PREY_PANEL);
  emit(EVENTS.NOTIFY, { msg: '🎲 Bônus da presa rerolado!', type: 'success' });
  saveGame();
}

// Libera um slot (deixa escolher outra criatura).
export function clearPrey(slotIndex) {
  ensurePreyArray();
  G.prey[slotIndex] = null;
  emit(EVENTS.PREY_PANEL);
  saveGame();
}
