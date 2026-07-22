// Casos de uso das Presas (Prey): travar uma criatura num slot, rerolar o
// bônus e ativar. Ver domain/prey.js pra as regras puras.
import { G } from './gameStore.js?v=219';
import { MONSTERS } from '../domain/bestiary.js?v=237';
import {
  PREY_SLOTS, PREY_DURATION_MS, PREY_BONUS_TYPES, PREY_MAX_RARITY,
  preyBonusPct, preyRerollCost, rollPreyRarity, rollPreyBonusType,
} from '../domain/prey.js?v=215';
import { emit, EVENTS } from '../shared/eventBus.js?v=217';
import { saveGame } from './saveGameUseCase.js?v=219';
import { t } from '../i18n/i18n.js?v=233';

const PREY_BONUS_NAME_KEY = { damage: 'bestiary.bonusDamage', defense: 'bestiary.bonusDefense', xp: 'bestiary.bonusXp', loot: 'bestiary.bonusLoot' };

function ensurePreyArray() {
  if (!Array.isArray(G.prey)) G.prey = [];
  while (G.prey.length < PREY_SLOTS) G.prey.push(null);
}

// `anterior` e o slot que ja estava ali (null quando e uma presa nova). E dele
// que sai a raridade atual — o reroll do Tibia parte da raridade que voce ja
// tem e SOBE, entao rerolar nunca piora. Presa nova comeca do zero.
function makePrey(monsterId, anterior = null) {
  const rarityBase = anterior ? (anterior.rarity || 0) : 0;
  const rarity = rollPreyRarity(rarityBase);
  const bonusType = rollPreyBonusType(anterior && anterior.bonusType, rarity);
  return {
    monster: monsterId,
    bonusType,
    rarity,
    bonusPct: preyBonusPct(bonusType, rarity),
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
      stars: p.rarity,
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
  // Preco do reroll escala com o nivel (200 x nivel, como no Tibia) em vez de
  // um valor fixo — 5000 fixo era proibitivo cedo e irrisorio depois.
  const custo = preyRerollCost(G.level);
  if (G.preyCards > 0) {
    G.preyCards--;
  } else if (G.gold >= custo) {
    G.gold -= custo;
  } else {
    emit(EVENTS.NOTIFY, { msg: t('bestiary.preyGoldInsufficient', { cost: custo.toLocaleString() }), type: 'error' });
    return;
  }
  G.prey[slotIndex] = makePrey(slot.monster, slot);
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
