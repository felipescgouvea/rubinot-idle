import { G } from './gameStore.js?v=15';
import { RTC_SETTINGS } from '../domain/shopCatalog.js?v=15';
import { emit, EVENTS } from '../shared/eventBus.js?v=15';
import { stopHunt, startHunt } from './huntUseCases.js?v=15';
import { saveGame } from './saveGameUseCase.js?v=15';

export function setRtc(id, value) {
  G.rtc[id] = value;
  // velocidade de ataque muda → reinicia o loop de caçada com o novo intervalo
  if (G.hunting) { stopHunt(); startHunt(); }
  emit(EVENTS.RTC_PANEL);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.NOTIFY, { msg: `RTC: ${RTC_SETTINGS.find(s => s.id === id).name} atualizado.`, type: 'info' });
  saveGame();
}
