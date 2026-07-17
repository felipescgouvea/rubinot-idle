import { G } from './gameStore.js?v=129';
import { WORLDS } from '../domain/progression.js?v=128';
import { emit, on, EVENTS } from '../shared/eventBus.js?v=126';
import { stopHunt, setBossOnlyMode } from './huntUseCases.js?v=169';
import { saveGame } from './saveGameUseCase.js?v=128';
import { t } from '../i18n/i18n.js?v=138';

export function selectWorld(worldId) {
  const world = WORLDS.find(w => w.id === worldId);
  if (!world || G.level < world.reqLevel) return;
  if (G.hunting) stopHunt(); // já zera o monstro/intervalo de caçada em curso
  setBossOnlyMode(false); // trocar de mundo sempre sai do Boss Rush (o boss pertence a uma zona de um mundo específico)
  G.currentWorld = worldId;
  emit(EVENTS.WORLDS_PANEL);
  emit(EVENTS.ZONE_PICKER);
  emit(EVENTS.NOTIFY, { msg: t('worlds.traveled', { world: world.name }), type: 'success' });
  emit(EVENTS.LOG, `<span class="log-info">${t('worlds.traveling', { icon: world.icon, world: world.name })}</span>`);
  saveGame();
}

export function checkWorldUnlocks() {
  G.notifiedWorlds = G.notifiedWorlds || [];
  let changed = false;
  WORLDS.forEach(w => {
    if (G.level >= w.reqLevel && !G.notifiedWorlds.includes(w.id)) {
      G.notifiedWorlds.push(w.id);
      changed = true;
      emit(EVENTS.NOTIFY, { msg: t('worlds.unlocked', { world: w.name }), type: 'success' });
    }
  });
  // Sem isso, uma sessão curta (login, olha o jogo, fecha a aba antes do
  // autosave de ~8s pra nuvem) nunca grava a marcação e o toast reaparece do
  // zero no próximo login — saveGame() já é local-imediato + nuvem debounced.
  if (changed) saveGame();
}

on(EVENTS.LEVEL_UP, checkWorldUnlocks);
