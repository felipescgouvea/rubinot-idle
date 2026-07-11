import { G } from './gameStore.js?v=25';
import { WORLDS } from '../domain/progression.js?v=25';
import { emit, on, EVENTS } from '../shared/eventBus.js?v=25';
import { stopHunt } from './huntUseCases.js?v=25';
import { saveGame } from './saveGameUseCase.js?v=25';

export function selectWorld(worldId) {
  const world = WORLDS.find(w => w.id === worldId);
  if (!world || G.level < world.reqLevel) return;
  if (G.hunting) stopHunt(); // já zera o monstro/intervalo de caçada em curso
  G.currentWorld = worldId;
  emit(EVENTS.WORLDS_PANEL);
  emit(EVENTS.ZONE_PICKER);
  emit(EVENTS.NOTIFY, { msg: `Viajou para ${world.name}!`, type: 'success' });
  emit(EVENTS.LOG, `<span class="log-info">🌍 Viajando para ${world.icon} ${world.name}...</span>`);
  saveGame();
}

export function checkWorldUnlocks() {
  WORLDS.forEach(w => {
    if (G.level >= w.reqLevel && !w._notified) {
      w._notified = true;
      emit(EVENTS.NOTIFY, { msg: `🌍 Mundo desbloqueado: ${w.name}!`, type: 'success' });
    }
  });
}

on(EVENTS.LEVEL_UP, checkWorldUnlocks);
