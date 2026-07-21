// Casos de uso das Presas (Prey): travar uma criatura num slot, rerolar o
// bônus e ativar. Ver domain/prey.js pra as regras puras.
import { G } from './gameStore.js?v=180';
import { MONSTERS } from '../domain/bestiary.js?v=198';
import {
  PREY_SLOTS, PREY_DURATION_MS, PREY_REROLL_COST, PREY_BONUS_TYPES, PREY_STAR_PCT,
  rollPreyStars, rollPreyBonusType,
} from '../domain/prey.js?v=176';
import { emit, EVENTS } from '../shared/eventBus.js?v=178';
import { saveGame } from './saveGameUseCase.js?v=180';
import { t } from '../i18n/i18n.js?v=194';

const PREY_BONUS_NAME_KEY = { damage: 'bestiary.bonusDamage', xp: 'bestiary.bonusXp', loot: 'bestiary.bonusLoot' };

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
  const bt = PREY_BONUS_TYPES[p.bonusType];
  emit(EVENTS.NOTIFY, {
    msg: t('bestiary.preyLocked', {
      monster: MONSTERS[monsterId].name,
      icon: bt.icon,
      pct: Math.round(p.bonusPct * 100),
      bonus: t(PREY_BONUS_NAME_KEY[p.bonusType]),
      stars: p.stars,
    }),
    type: 'success',
  });
  emit(EVENTS.PREY_PANEL);
  saveGame();
}

// Rerola o bônus/estrelas de um slot já travado, pagando gold — mantém a mesma
// criatura, sorteia um novo bônus e RENOVA o tempo.
export function rerollPrey(slotIndex) {
  ensurePreyArray();
  const slot = G.prey[slotIndex];
  if (!slot || !slot.monster) return;
  // Carta de presa (prêmio de Arena/Battle Pass) paga o reroll no lugar do
  // gold — sempre gasta a carta primeiro, que é o recurso mais escasso.
  if (G.preyCards > 0) {
    G.preyCards--;
  } else if (G.gold >= PREY_REROLL_COST) {
    G.gold -= PREY_REROLL_COST;
  } else {
    emit(EVENTS.NOTIFY, { msg: t('bestiary.preyGoldInsufficient', { cost: PREY_REROLL_COST.toLocaleString() }), type: 'error' });
    return;
  }
  G.prey[slotIndex] = makePrey(slot.monster);
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.PREY_PANEL);
  emit(EVENTS.NOTIFY, { msg: t('bestiary.preyRerolled'), type: 'success' });
  saveGame();
}

// Libera um slot (deixa escolher outra criatura).
export function clearPrey(slotIndex) {
  ensurePreyArray();
  G.prey[slotIndex] = null;
  emit(EVENTS.PREY_PANEL);
  saveGame();
}
