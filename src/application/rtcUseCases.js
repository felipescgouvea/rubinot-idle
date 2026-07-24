// Configuração do RTC (Rubinot Custom Client): ataque automático (uma lista
// de prioridade que mistura magias E runas livremente — ver domain/rtcConfig.js
// sobre o prefixo "rune:") e cura automática (spell E poção, cada uma com seu
// limiar de % de HP) — a UI mora em rtcPanel.js.
import { G, ACCOUNT } from './gameStore.js?v=253';
import { isSpellAvailable } from '../domain/spells.js?v=251';
import { runeEntry, canUseAttackRune, runeMinMl, ATTACK_SLOT_COUNT, HEAL_TIER_COUNT, TARGET_PRIORITIES, normalizeAttackSpells, normalizeHealTiers, isRuneEntry, runeEntryId, isRuneAvailableToVocation } from '../domain/rtcConfig.js?v=283';
import { getMagic } from './stats.js?v=250';
import { emit, EVENTS } from '../shared/eventBus.js?v=251';
import { saveGame } from './saveGameUseCase.js?v=253';
import { updateHuntRtc } from '../infrastructure/authClient.js?v=258';
import { t } from '../i18n/i18n.js?v=267';

// Empurra a config atual pra caçada JÁ RODANDO no servidor (sem isso, mudar
// prioridade de ataque/cura no meio da luta só valia a partir da PRÓXIMA
// caçada — bug reportado pelo Felipe: "rtc de cura não está funcionando").
// Parado (G.hunting=false), não há sessão viva pra atualizar — a próxima
// startHunt() já manda o RTC atual via buildHuntSnapshot, então não faz nada.
function syncRtcToServer() {
  // manda também estilo/densidade: o endpoint é o mesmo e assim uma mudança de
  // RTC não desatualiza as outras preferências na sessão viva.
  if (G.hunting) updateHuntRtc(ACCOUNT.activeSlot, G.rtc, G.fightMode, G.density || 'normal');
}

function refresh(msg) {
  emit(EVENTS.RTC_PANEL);
  emit(EVENTS.NOTIFY, { msg, type: 'info' });
  saveGame();
  syncRtcToServer();
}

// Tira do RTC toda magia/runa que a vocação/nível ATUAL não pode mais usar —
// ataque, degraus de cura e a spell de cura legada. Usado em DOIS momentos:
//  - no load do save (persistenceUseCases), pra um save antigo não trazer magia
//    inválida;
//  - na GRADUAÇÃO com troca de vocação (characterUseCases: graduate), que muda
//    G.vocation SEM recarregar a página — sem isto o paladino recém-graduado
//    seguia lançando as magias de sorcerer que estavam armadas (bug do Felipe:
//    "mudei de sorcerer pra paladin e continuo soltando magia de sorcerer").
// Só filtra o que existe; não injeta nada. Retorna quantos itens caíram.
export function pruneRtcForVocation() {
  const antesAtk = normalizeAttackSpells(G.rtc);
  G.rtc.attackSpells = antesAtk.filter(entry => isRuneEntry(entry)
    ? isRuneAvailableToVocation(runeEntryId(entry), G.vocation)
    : isSpellAvailable(entry, G.vocation, G.level));
  const antesHeal = normalizeHealTiers(G.rtc);
  G.rtc.healTiers = antesHeal.filter(d => d && d.spell && isSpellAvailable(d.spell, G.vocation, G.level));
  if (G.rtc.healSpell && !isSpellAvailable(G.rtc.healSpell, G.vocation, G.level)) G.rtc.healSpell = null;
  return (antesAtk.length - G.rtc.attackSpells.length) + (antesHeal.length - G.rtc.healTiers.length);
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

// --- Degraus de cura (ver domain/rtcConfig.js: normalizeHealTiers) ---------
// Guardamos SEMPRE os HEAL_TIER_COUNT degraus (com buracos), porque a UI é de
// posições fixas; a normalização filtra os vazios e ordena por gravidade.
function ensureTiers() {
  const arr = Array.isArray(G.rtc.healTiers) ? G.rtc.healTiers.slice() : [];
  const padrao = [70, 45, 25];
  while (arr.length < HEAL_TIER_COUNT) arr.push({ spell: null, pct: padrao[arr.length] || 40 });
  return arr;
}

export function setRtcHealTierSpell(idx, spellId) {
  if (!isSpellAvailable(spellId, G.vocation, G.level)) return;
  const arr = ensureTiers();
  arr[idx] = { spell: spellId, pct: (arr[idx] && arr[idx].pct) || 40 };
  G.rtc.healTiers = arr;
  refresh(t('rtc.healSpellConfigured'));
}

export function setRtcHealTierPct(idx, valor) {
  const arr = ensureTiers();
  arr[idx] = { spell: arr[idx] && arr[idx].spell, pct: Math.max(1, Math.min(99, Math.round(Number(valor)) || 0)) };
  G.rtc.healTiers = arr;
  emit(EVENTS.RTC_PANEL);
  saveGame();
  syncRtcToServer();
}

export function clearRtcHealTier(idx) {
  const arr = ensureTiers();
  arr[idx] = { spell: null, pct: (arr[idx] && arr[idx].pct) || 40 };
  G.rtc.healTiers = arr;
  refresh(t('rtc.healSpellRemoved'));
}

// Em quem o RTC bate primeiro quando a sala tem mais de um bicho.
export function setRtcTargetPriority(id) {
  if (!TARGET_PRIORITIES[id]) return;
  G.rtc.targetPriority = id;
  refresh(t('rtc.targetPriorityChanged', { nome: t(TARGET_PRIORITIES[id].name) }));
}

// A partir de quantas criaturas vivas o RTC prefere magia/runa de área.
// 0 desliga a regra e volta à ordem de prioridade crua.
export function setRtcAreaMinTargets(valor) {
  G.rtc.areaMinTargets = Math.max(0, Math.min(8, Math.round(Number(valor)) || 0));
  refresh(G.rtc.areaMinTargets
    ? t('rtc.areaRuleOn', { n: G.rtc.areaMinTargets })
    : t('rtc.areaRuleOff'));
}
