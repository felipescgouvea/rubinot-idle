// Casos de uso do Bestiário e Charms: creditar Charm Points quando uma
// criatura cruza etapas do bestiário, desbloquear charms e equipá-los.
// Escuta MONSTER_KILLED (como taskUseCases) — a caçada não precisa saber que
// bestiário existe, só anuncia a morte.
import { G } from './gameStore.js?v=128';
import { MONSTERS } from '../domain/bestiary.js?v=136';
import { CHARMS, CHARM_EQUIP_SLOTS, charmPointsForKills } from '../domain/charms.js?v=126';
import { emit, on, EVENTS } from '../shared/eventBus.js?v=126';
import { saveGame } from './saveGameUseCase.js?v=127';
import { t } from '../i18n/i18n.js?v=135';

// Credita a DIFERENÇA de Charm Points de uma criatura: total que ela já vale
// (pelas mortes acumuladas) menos o que já foi creditado dela antes. Assim uma
// mesma etapa nunca paga duas vezes, mesmo recarregando o save.
function creditBestiary(monsterId) {
  const kills = (G.killCounters && G.killCounters[monsterId]) || 0;
  const earned = charmPointsForKills(kills);
  G.bestiaryCredited = G.bestiaryCredited || {};
  const already = G.bestiaryCredited[monsterId] || 0;
  const delta = earned - already;
  if (delta <= 0) return;
  G.bestiaryCredited[monsterId] = earned;
  G.charmPoints = (G.charmPoints || 0) + delta;
  const m = MONSTERS[monsterId];
  const monsterName = m ? m.name : monsterId;
  emit(EVENTS.LOG, `<span class="log-loot">📖 ${t('bestiary.progressLog', { monster: monsterName, delta })}</span>`);
  emit(EVENTS.NOTIFY, { msg: `📖 ${t('bestiary.progressNotify', { delta, monster: monsterName })}`, type: 'success' });
  emit(EVENTS.HEADER_STATS);
}

export function unlockCharm(charmId) {
  const charm = CHARMS[charmId];
  if (!charm) return;
  G.charmsUnlocked = G.charmsUnlocked || [];
  if (G.charmsUnlocked.includes(charmId)) return;
  if ((G.charmPoints || 0) < charm.cost) {
    emit(EVENTS.NOTIFY, { msg: t('bestiary.insufficientCharmPoints', { cost: charm.cost }), type: 'error' });
    return;
  }
  G.charmPoints -= charm.cost;
  G.charmsUnlocked.push(charmId);
  emit(EVENTS.NOTIFY, { msg: `${charm.icon} ${t('bestiary.charmUnlocked', { name: charm.name })}`, type: 'success' });
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.BESTIARY_PANEL);
  saveGame();
}

// Liga/desliga um charm equipado (respeitando o limite de slots).
export function toggleCharmEquipped(charmId) {
  G.charmsEquipped = G.charmsEquipped || [];
  if (!(G.charmsUnlocked || []).includes(charmId)) return;
  const i = G.charmsEquipped.indexOf(charmId);
  if (i >= 0) {
    G.charmsEquipped.splice(i, 1);
  } else {
    if (G.charmsEquipped.length >= CHARM_EQUIP_SLOTS) {
      emit(EVENTS.NOTIFY, { msg: t('bestiary.maxCharmsEquipped', { max: CHARM_EQUIP_SLOTS }), type: 'error' });
      return;
    }
    G.charmsEquipped.push(charmId);
  }
  emit(EVENTS.BESTIARY_PANEL);
  saveGame();
}

on(EVENTS.MONSTER_KILLED, ({ monsterId }) => creditBestiary(monsterId));
