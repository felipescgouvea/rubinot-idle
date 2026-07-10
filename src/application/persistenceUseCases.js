// Carregar o personagem, aplicar progresso offline e resetar. (saveGame mora
// em saveGameUseCase.js — ver o comentário lá para o motivo.)
import { G, replaceState } from './gameStore.js';
import { createDefaultState } from '../domain/gameState.js';
import { createDefaultSkills } from '../domain/character.js';
import { createDefaultRtc, computeRtcMods } from '../domain/shopCatalog.js';
import { isSpellAvailable } from '../domain/spells.js';
import { findOutfit } from '../domain/outfits.js';
import { ZONES, MONSTERS } from '../domain/bestiary.js';
import { worldXpMultiplier, worldGoldMultiplier } from '../domain/progression.js';
import { loadRawState, clearState } from '../infrastructure/storage.js';
import { emit, EVENTS } from '../shared/eventBus.js';
import { getMaxHp, getMaxMana } from './stats.js';
import { gainXp } from './huntUseCases.js';
import { checkBpTier } from './battlePassUseCases.js';

export function loadGame() {
  const parsed = loadRawState();
  if (!parsed) return;

  replaceState({ ...createDefaultState(), ...parsed });

  // migração: zona/tarefa de versões antigas do bestiário
  if (G.activeZone && !ZONES[G.activeZone]) G.activeZone = null;
  if (G.activeTask && !MONSTERS[G.activeTask.monster]) G.activeTask = null;
  // migração: sistema antigo de pontos de skill → skills de treino Tibia
  if (!G.sk || !G.sk.magic) G.sk = createDefaultSkills();
  if (!G.rtc) G.rtc = createDefaultRtc();
  if (!G.spells) G.spells = { attack: null, heal: null };
  if (!G.boosts) G.boosts = {};
  if (!G.outfitsOwned) G.outfitsOwned = [];
  if (!G.outfitGender) G.outfitGender = 'male';
  // migração: outfits antigos eram identificados por emoji/id de item de loja;
  // o sistema novo usa os ids reais do Tibia (ver domain/outfits.js) — qualquer
  // coisa que não bater com o catálogo novo simplesmente reseta pro padrão.
  G.outfitsOwned = G.outfitsOwned.filter(id => findOutfit(id));
  if (G.outfit && !findOutfit(G.outfit)) G.outfit = null;
  if (!('legs' in G.equipment)) { G.equipment.legs = null; G.equipment.boots = null; }
  if (G.spells.attack && !isSpellAvailable(G.spells.attack, G.vocation, G.level)) G.spells.attack = null;
  if (G.spells.heal && !isSpellAvailable(G.spells.heal, G.vocation, G.level)) G.spells.heal = null;
  // Clamp hp/mana to max on load
  if (G.vocation) {
    G.hp = Math.min(G.hp, getMaxHp());
    G.mana = Math.min(G.mana, getMaxMana());
  }
}

export function applyOfflineProgress() {
  if (!G.vocation || !G.lastSave || !G.wasHunting || !G.activeZone) return;
  const elapsedSec = Math.floor((Date.now() - G.lastSave) / 1000);
  if (elapsedSec < 60) return;
  const cappedSec = Math.min(elapsedSec, 8 * 3600); // máx 8h de ganho offline

  const zone = ZONES[G.activeZone];
  if (!zone) return;
  // média dos monstros da zona
  const avg = zone.monsters.reduce((acc, id) => {
    const m = MONSTERS[id];
    return { xp: acc.xp + m.xp / zone.monsters.length, gold: acc.gold + (m.gold[0] + m.gold[1]) / 2 / zone.monsters.length };
  }, { xp: 0, gold: 0 });

  const scaleFactor = 1 + (G.level - 1) * 0.05;
  const killsPerMin = 6; // ritmo offline reduzido (~metade do ativo)
  const kills = Math.floor((cappedSec / 60) * killsPerMin);
  const rtc = computeRtcMods(G.rtc);
  const xpGained = Math.floor(kills * avg.xp * scaleFactor * zone.xpMult * worldXpMultiplier(G.currentWorld) * rtc.xpMult * 0.5);
  const goldGained = Math.floor(kills * avg.gold * scaleFactor * zone.goldMult * worldGoldMultiplier(G.currentWorld) * rtc.goldMult * 0.5);

  G.gold += goldGained;
  G.totalGoldEarned += goldGained;
  G.totalKills += kills;
  G.bpXp += Math.floor(xpGained * 0.01);
  checkBpTier();
  gainXp(xpGained);

  const hours = Math.floor(cappedSec / 3600), minutes = Math.floor((cappedSec % 3600) / 60);
  emit(EVENTS.OFFLINE_PROGRESS, { zoneName: zone.name, zoneIcon: zone.icon, hours, minutes, kills, xpGained, goldGained });
}

export function confirmReset() {
  if (confirm('Tem certeza? Todo o progresso será perdido!')) {
    clearState();
    location.reload();
  }
}
