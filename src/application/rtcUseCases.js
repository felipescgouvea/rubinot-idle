import { G } from './gameStore.js';
import { RTC_SETTINGS } from '../domain/shopCatalog.js';
import { emit, EVENTS } from '../shared/eventBus.js';
import { stopHunt, startHunt } from './huntUseCases.js';
import { saveGame } from './saveGameUseCase.js';

export function setRtc(id, value) {
  G.rtc[id] = value;
  // velocidade de ataque muda → reinicia o loop de caçada com o novo intervalo
  if (G.hunting) { stopHunt(); startHunt(); }
  emit(EVENTS.RTC_PANEL);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.NOTIFY, { msg: `RTC: ${RTC_SETTINGS.find(s => s.id === id).name} atualizado.`, type: 'info' });
  saveGame();
}
