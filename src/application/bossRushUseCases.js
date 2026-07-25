// Boss Rush: desafiar diretamente o boss de uma zona já desbloqueada, sem os
// monstros comuns dela — reaproveita o MESMO motor de caçada (G.hunting,
// currentMonster, huntInterval) da aba Caçada normal, só restringindo o pool
// de spawn ao boss via setBossOnlyMode() (ver application/huntUseCases.js).
// Isso evita duplicar o loop de combate inteiro; o preço é ter que cuidar
// explicitamente pra não deixar a caçada normal do jogador "vazada" quando
// ele entra/sai do Boss Rush — ver startBossRush()/stopBossRush() abaixo.
import { G } from './gameStore.js?v=296';
import { ZONES, MONSTERS, BOSS_MONSTER_IDS, isZoneUnlocked } from '../domain/bestiary.js?v=315';
import { startHunt, stopHunt, setBossOnlyMode, isBossOnlyHunt } from './huntUseCases.js?v=360';
import { emit, EVENTS } from '../shared/eventBus.js?v=294';
import { t } from '../i18n/i18n.js?v=312';

// Zona/estado de caçada "de fora" do Boss Rush — guardados só pra restaurar a
// escolha normal do jogador (aba Caçada) quando ele sai do Boss Rush, em vez
// de deixá-lo preso na zona do último boss desafiado.
let savedZone = null;
let savedHunting = false;

// Todo boss cujo jogador já tem acesso à zona dele (mesmo gate de
// nível/mundo/boss-anterior da caçada normal — ver domain/bestiary.js:
// isZoneUnlocked) — a lista do Boss Rush É a lista de zonas desbloqueadas do
// mundo atual, filtrada pra quem realmente tem um boss definido. Ordenada por
// FORÇA do boss (hp, do mais fraco pro mais forte) em vez da ordem bruta de
// definição de ZONES — assim a lista já nasce como uma progressão visível.
export function unlockedBossZones() {
  return Object.keys(ZONES)
    .filter(zoneId => isZoneUnlocked(zoneId, G.level, G.currentWorld, G.defeatedZoneBosses))
    .map(zoneId => ({ zoneId, zone: ZONES[zoneId] }))
    .filter(({ zone }) => zone.boss && BOSS_MONSTER_IDS.has(zone.boss))
    .sort((a, b) => (MONSTERS[a.zone.boss]?.hp || 0) - (MONSTERS[b.zone.boss]?.hp || 0));
}

export function isBossRushActive() {
  return G.hunting && isBossOnlyHunt();
}

export function startBossRush(zoneId) {
  const zone = ZONES[zoneId];
  if (!zone || !zone.boss) return;
  if (!isZoneUnlocked(zoneId, G.level, G.currentWorld, G.defeatedZoneBosses)) {
    emit(EVENTS.NOTIFY, { msg: t('bossrush.zoneLocked'), type: 'error' });
    return;
  }
  // Guarda a zona/estado normal só na 1ª entrada no Boss Rush (trocar de boss
  // dentro do próprio Boss Rush não deve sobrescrever o que tinha ANTES dele).
  // Persistimos TAMBÉM no G (não só em vars de módulo) porque um F5 dentro do
  // Boss Rush zera as vars de módulo — sem isso, sair do Boss Rush pós-refresh
  // fazia G.activeZone virar null e largava o jogador sem zona nem caçada.
  if (!isBossOnlyHunt()) {
    savedZone = G.activeZone;
    savedHunting = G.hunting;
    G.bossRushReturnZone = G.activeZone || null;
    G.bossRushReturnHunting = !!G.hunting;
  }
  if (G.hunting) stopHunt();
  G.activeZone = zoneId;
  setBossOnlyMode(true);
  startHunt();
  emit(EVENTS.ZONE_PICKER);
}

export function stopBossRush() {
  if (G.hunting) stopHunt();
  setBossOnlyMode(false);
  // Resolve a zona de retorno das vars de módulo OU do que ficou persistido no
  // G (caso de F5 dentro do Boss Rush). Nunca zera activeZone: se não houver
  // zona pra voltar, mantém a atual em vez de largar o jogador sem seleção.
  const returnZone = savedZone || G.bossRushReturnZone || null;
  const returnHunting = savedHunting || !!G.bossRushReturnHunting;
  if (returnZone) G.activeZone = returnZone;
  savedZone = null;
  savedHunting = false;
  delete G.bossRushReturnZone;
  delete G.bossRushReturnHunting;
  emit(EVENTS.ZONE_PICKER);
  if (returnHunting && G.activeZone) startHunt();
}
