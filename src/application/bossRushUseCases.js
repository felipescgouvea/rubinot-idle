// Boss Rush: desafiar diretamente o boss de uma zona já desbloqueada, sem os
// monstros comuns dela — reaproveita o MESMO motor de caçada (G.hunting,
// currentMonster, huntInterval) da aba Caçada normal, só restringindo o pool
// de spawn ao boss via setBossOnlyMode() (ver application/huntUseCases.js).
// Isso evita duplicar o loop de combate inteiro; o preço é ter que cuidar
// explicitamente pra não deixar a caçada normal do jogador "vazada" quando
// ele entra/sai do Boss Rush — ver startBossRush()/stopBossRush() abaixo.
import { G } from './gameStore.js?v=125';
import { ZONES, BOSS_MONSTER_IDS, isZoneUnlocked } from '../domain/bestiary.js?v=128';
import { startHunt, stopHunt, setBossOnlyMode, isBossOnlyHunt } from './huntUseCases.js?v=128';
import { emit, EVENTS } from '../shared/eventBus.js?v=125';
import { t } from '../i18n/i18n.js?v=126';

// Zona/estado de caçada "de fora" do Boss Rush — guardados só pra restaurar a
// escolha normal do jogador (aba Caçada) quando ele sai do Boss Rush, em vez
// de deixá-lo preso na zona do último boss desafiado.
let savedZone = null;
let savedHunting = false;

// Todo boss cujo jogador já tem acesso à zona dele (mesmo gate de
// nível/mundo/boss-anterior da caçada normal — ver domain/bestiary.js:
// isZoneUnlocked) — a lista do Boss Rush É a lista de zonas desbloqueadas do
// mundo atual, filtrada pra quem realmente tem um boss definido.
export function unlockedBossZones() {
  return Object.keys(ZONES)
    .filter(zoneId => isZoneUnlocked(zoneId, G.level, G.currentWorld, G.defeatedZoneBosses))
    .map(zoneId => ({ zoneId, zone: ZONES[zoneId] }))
    .filter(({ zone }) => zone.boss && BOSS_MONSTER_IDS.has(zone.boss));
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
  if (!isBossOnlyHunt()) {
    savedZone = G.activeZone;
    savedHunting = G.hunting;
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
  G.activeZone = savedZone;
  emit(EVENTS.ZONE_PICKER);
  if (savedHunting && G.activeZone) startHunt();
}
