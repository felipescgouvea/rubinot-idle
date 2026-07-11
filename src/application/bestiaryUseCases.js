// Casos de uso do Bestiário e Charms: creditar Charm Points quando uma
// criatura cruza etapas do bestiário, desbloquear charms e equipá-los.
// Escuta MONSTER_KILLED (como taskUseCases) — a caçada não precisa saber que
// bestiário existe, só anuncia a morte.
import { G } from './gameStore.js?v=53';
import { MONSTERS } from '../domain/bestiary.js?v=53';
import { CHARMS, CHARM_EQUIP_SLOTS, charmPointsForKills } from '../domain/charms.js?v=53';
import { emit, on, EVENTS } from '../shared/eventBus.js?v=53';
import { saveGame } from './saveGameUseCase.js?v=53';

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
  emit(EVENTS.LOG, `<span class="log-loot">📖 Bestiário: ${m ? m.name : monsterId} avançou! +${delta} Charm Points.</span>`);
  emit(EVENTS.NOTIFY, { msg: `📖 +${delta} Charm Points (${m ? m.name : monsterId})`, type: 'success' });
  emit(EVENTS.HEADER_STATS);
}

export function unlockCharm(charmId) {
  const charm = CHARMS[charmId];
  if (!charm) return;
  G.charmsUnlocked = G.charmsUnlocked || [];
  if (G.charmsUnlocked.includes(charmId)) return;
  if ((G.charmPoints || 0) < charm.cost) {
    emit(EVENTS.NOTIFY, { msg: `Charm Points insuficientes (precisa de ${charm.cost}).`, type: 'error' });
    return;
  }
  G.charmPoints -= charm.cost;
  G.charmsUnlocked.push(charmId);
  emit(EVENTS.NOTIFY, { msg: `${charm.icon} Charm "${charm.name}" desbloqueado!`, type: 'success' });
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
      emit(EVENTS.NOTIFY, { msg: `Máximo de ${CHARM_EQUIP_SLOTS} charms equipados.`, type: 'error' });
      return;
    }
    G.charmsEquipped.push(charmId);
  }
  emit(EVENTS.BESTIARY_PANEL);
  saveGame();
}

on(EVENTS.MONSTER_KILLED, ({ monsterId }) => creditBestiary(monsterId));
