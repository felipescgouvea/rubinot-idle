// Configuração do RTC (Rubinot Custom Client): ataque automático (uma lista
// de prioridade que mistura magias E runas livremente — ver domain/rtcConfig.js
// sobre o prefixo "rune:") e cura automática (spell E poção, cada uma com seu
// limiar de % de HP) — a UI mora em rtcPanel.js.
import { G, ACCOUNT } from './gameStore.js?v=162';
import { isSpellAvailable } from '../domain/spells.js?v=160';
import { runeEntry, canUseAttackRune, runeMinMl, ATTACK_SLOT_COUNT } from '../domain/rtcConfig.js?v=192';
import { getMagic } from './stats.js?v=159';
import { emit, EVENTS } from '../shared/eventBus.js?v=160';
import { saveGame } from './saveGameUseCase.js?v=162';
import { updateHuntRtc } from '../infrastructure/authClient.js?v=167';
import { t } from '../i18n/i18n.js?v=176';

// Empurra a config atual pra caçada JÁ RODANDO no servidor (sem isso, mudar
// prioridade de ataque/cura no meio da luta só valia a partir da PRÓXIMA
// caçada — bug reportado pelo Felipe: "rtc de cura não está funcionando").
// Parado (G.hunting=false), não há sessão viva pra atualizar — a próxima
// startHunt() já manda o RTC atual via buildHuntSnapshot, então não faz nada.
function syncRtcToServer() {
  if (G.hunting) updateHuntRtc(ACCOUNT.activeSlot, G.rtc);
}

function refresh(msg) {
  emit(EVENTS.RTC_PANEL);
  emit(EVENTS.NOTIFY, { msg, type: 'info' });
  saveGame();
  syncRtcToServer();
}

// Define a magia OU runa de uma caixinha de prioridade específica
// (idx = 0..ATTACK_SLOT_COUNT-1). `kind` distingue as duas ('spell' | 'rune').
// Se a mesma magia/runa já estiver noutra caixinha, ela é removida de lá
// (sem duplicata) — igual ao RTCaster real.
export function setRtcAttackSpellSlot(idx, id, kind = 'spell') {
  if (kind === 'rune') {
    if (!canUseAttackRune(id, G.vocation, getMagic())) {
      emit(EVENTS.NOTIFY, { msg: t('rtc.insufficientMlForRune', { ml: runeMinMl(id) }), type: 'error' });
      return;
    }
  } else if (!isSpellAvailable(id, G.vocation, G.level)) return;
  const entry = kind === 'rune' ? runeEntry(id) : id;
  const arr = Array.isArray(G.rtc.attackSpells) ? G.rtc.attackSpells.slice() : [];
  while (arr.length < ATTACK_SLOT_COUNT) arr.push(null);
  const dupIdx = arr.indexOf(entry);
  if (dupIdx !== -1) arr[dupIdx] = null;
  arr[idx] = entry;
  G.rtc.attackSpells = arr;
  refresh(kind === 'rune' ? t('rtc.runeConfigured') : t('rtc.spellAddedToPriority'));
}

// Esvazia uma caixinha de prioridade (idx = 0..ATTACK_SLOT_COUNT-1).
export function clearRtcAttackSpellSlot(idx) {
  const arr = Array.isArray(G.rtc.attackSpells) ? G.rtc.attackSpells.slice() : [];
  if (idx < arr.length) arr[idx] = null;
  G.rtc.attackSpells = arr;
  refresh(t('rtc.spellRemovedFromPriority'));
}

// Prioridade inteligente por elemento: quando ligada, entre as magias PRONTAS
// da lista de prioridade, o RTC casta a mais forte contra a fraqueza da criatura
// atual (ver domain/elements.js + application/huntUseCases.js). Padrão: desligada.
export function setRtcSmartElement(on) {
  G.rtc.smartElement = !!on;
  refresh(G.rtc.smartElement ? t('rtc.smartElementOn') : t('rtc.smartElementOff'));
}

export function setRtcHealSpell(spellId) {
  if (!isSpellAvailable(spellId, G.vocation, G.level)) return;
  G.rtc.healSpell = G.rtc.healSpell === spellId ? null : spellId;
  refresh(G.rtc.healSpell ? t('rtc.healSpellConfigured') : t('rtc.healSpellRemoved'));
}

// Define a poção do slot direto (arrastada da bag) — atribui, não alterna.
export function setRtcHealPotion(itemId) {
  G.rtc.healPotion = itemId;
  refresh(t('rtc.healPotionConfigured'));
}

export function setRtcManaPotion(itemId) {
  G.rtc.manaPotion = itemId;
  refresh(t('rtc.manaPotionConfigured'));
}

// Esvazia o slot de poção (clique no slot preenchido). kind = 'life' | 'mana'.
export function clearRtcPotion(kind) {
  if (kind === 'life') G.rtc.healPotion = null; else G.rtc.manaPotion = null;
  refresh(t('rtc.potionRemoved'));
}

export function setRtcThreshold(field, value) {
  G.rtc[field] = Math.max(5, Math.min(95, Math.round(Number(value)) || 0));
  emit(EVENTS.RTC_PANEL);
  saveGame();
  syncRtcToServer();
}
