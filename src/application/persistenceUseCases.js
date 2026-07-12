// Carregar o personagem, aplicar progresso offline e resetar. (saveGame mora
// em saveGameUseCase.js — ver o comentário lá para o motivo.)
import { G, replaceState } from './gameStore.js?v=98';
import { createDefaultState } from '../domain/gameState.js?v=98';
import { createDefaultSkills } from '../domain/character.js?v=98';
import { createDefaultRtc, isRuneAvailableToVocation, normalizeAttackSpells } from '../domain/rtcConfig.js?v=98';
import { isSpellAvailable } from '../domain/spells.js?v=98';
import { findOutfit } from '../domain/outfits.js?v=98';
import { DEFAULT_OUTFIT_COLORS } from '../domain/outfitColors.js?v=98';
import { ZONES, MONSTERS } from '../domain/bestiary.js?v=98';
import { isRelicId } from '../domain/items.js?v=98';
import { LEGACY_RARITY_MAP } from '../domain/rarity.js?v=98';
import { worldXpMultiplier, worldGoldMultiplier } from '../domain/progression.js?v=98';
import { loadRawState, clearState, saveState } from '../infrastructure/storage.js?v=98';
import { emit, EVENTS } from '../shared/eventBus.js?v=98';
import { getMaxHp, getMaxMana } from './stats.js?v=98';
import { gainXp } from './huntUseCases.js?v=98';
import { checkBpTier } from './battlePassUseCases.js?v=98';
import { getXpRate, getGoldRate, getZoneMultiplier, isStaminaEnabled } from './adminUseCases.js?v=98';
import { STAMINA_MAX, staminaXpMult } from '../domain/stamina.js?v=98';

// Prepara o save da sessão do usuário logado ANTES do loadGame(): se há save na
// nuvem, ele vira o save local (a nuvem é a fonte de verdade da conta); se não
// há (conta nova), mantém o que estiver local — assim um jogador que já jogava
// sem conta importa o progresso ao criar a 1ª conta. Chamada só pelo main.js,
// logo após o login e antes de loadGame().
export function applyCloudSave(cloudData) {
  if (cloudData) saveState(cloudData);
}

export function loadGame() {
  const parsed = loadRawState();
  if (!parsed) return;

  replaceState({ ...createDefaultState(), ...parsed });

  // migração: zona/tarefa de versões antigas do bestiário
  if (G.activeZone && !ZONES[G.activeZone]) G.activeZone = null;
  // migração ONE-TIME: gate de boss de zona (requiresBossOf) é novo — sem isso,
  // um jogador que já estava além do nível de uma zona pela regra ANTIGA (só
  // nível+mundo) ficaria trancado retroativamente ao ligar o gate. Pra cada
  // zona que já era acessível pelo nível dele, marca o boss dela como "já
  // derrotado" — mesmo que ele nunca tenha efetivamente matado aquele boss.
  // Roda em TODO load (idempotente via .includes()/Set — nunca duplica).
  if (!G.defeatedZoneBosses) G.defeatedZoneBosses = [];
  const alreadyUnlocked = new Set(G.defeatedZoneBosses);
  for (const [zoneId, zone] of Object.entries(ZONES)) {
    if (zone.boss && G.level >= zone.minLevel) alreadyUnlocked.add(zoneId);
  }
  G.defeatedZoneBosses = [...alreadyUnlocked];
  if (G.activeTask && !MONSTERS[G.activeTask.monster]) G.activeTask = null;
  // migração: sistema antigo de pontos de skill → skills de treino Tibia
  if (!G.sk || !G.sk.magic) G.sk = createDefaultSkills();
  // migração: RTC ganhou ataque (spell/runa) e cura por poção — saves antigos têm só
  // os ajustes antigos (autoLoot/graphics/etc., já removidos) ou nenhum rtc ainda.
  G.rtc = { ...createDefaultRtc(), ...G.rtc };
  // migração: seleção de spell de ataque/cura morava em G.spells (aba "Spells",
  // removida) — agora mora dentro do próprio G.rtc, junto do resto da automação.
  if (G.spells) {
    if (G.spells.attack && !normalizeAttackSpells(G.rtc).length) { G.rtc.attackType = 'spell'; G.rtc.attackSpells = [G.spells.attack]; }
    if (G.spells.heal && !G.rtc.healSpell) G.rtc.healSpell = G.spells.heal;
    delete G.spells;
  }
  // migração: ataque automático virou lista de PRIORIDADE (attackSpells). Saves
  // antigos guardavam uma única attackSpell — converte pra lista de um item.
  G.rtc.attackSpells = normalizeAttackSpells(G.rtc);
  delete G.rtc.attackSpell;
  if (!G.boosts) G.boosts = {};
  // migração: auto-vender lixo, stamina e bênçãos são novos.
  if (typeof G.blessings !== 'number') G.blessings = 0;
  if (!G.autoSell) G.autoSell = { enabled: false, maxValue: 50 };
  if (typeof G.stamina !== 'number') G.stamina = STAMINA_MAX;
  // migração: Mochila-item + ordem do inventário (drag) são novos. Todo save
  // ganha o bag inicial e uma ordem inicial a partir dos itens que já tem.
  if (!G.backpack) G.backpack = 'bag';
  if (!Array.isArray(G.inventoryOrder)) G.inventoryOrder = [];
  Object.keys(G.inventory || {}).forEach(id => { if (!G.inventoryOrder.includes(id)) G.inventoryOrder.push(id); });
  // migração: Relíquias (itens com modificador de raridade — ver
  // domain/gameState.js) são novas; saves antigos não têm nenhum dos dois campos.
  if (!G.relics) G.relics = [];
  if (!G.relicSeq) G.relicSeq = 0;
  // migração: a escala de raridade foi renomeada/expandida (refined/exceptional
  // → incomum/raro/épico/lendário — ver domain/rarity.js). Remapeia os ids
  // antigos guardados nas relíquias pra a UI não achar RARITY_TIERS[rarity]
  // indefinido. O bônus efetivo (bonusPct) já vive na própria relíquia, então
  // o poder de itens antigos não muda — só o rótulo/cor.
  G.relics.forEach(r => { if (LEGACY_RARITY_MAP[r.rarity]) r.rarity = LEGACY_RARITY_MAP[r.rarity]; });
  // migração defensiva: um slot de equipamento apontando pra uma relíquia que
  // não existe mais em G.relics (save corrompido/editado à mão) travaria o
  // slot pra sempre — solta o slot em vez de propagar o id fantasma.
  Object.keys(G.equipment).forEach(slot => {
    const val = G.equipment[slot];
    if (isRelicId(val) && !G.relics.some(r => r.id === val)) G.equipment[slot] = null;
  });
  if (!G.outfitsOwned) G.outfitsOwned = [];
  if (!G.outfitGender) G.outfitGender = 'male';
  // migração: outfits antigos eram identificados por emoji/id de item de loja;
  // o sistema novo usa os ids reais do Tibia (ver domain/outfits.js) — qualquer
  // coisa que não bater com o catálogo novo simplesmente reseta pro padrão.
  G.outfitsOwned = G.outfitsOwned.filter(id => findOutfit(id));
  if (G.outfit && !findOutfit(G.outfit)) G.outfit = null;
  if (!G.outfitColors) G.outfitColors = { ...DEFAULT_OUTFIT_COLORS };
  if (!('legs' in G.equipment)) { G.equipment.legs = null; G.equipment.boots = null; }
  // migração: slot de Munição (ammo) é novo — ver domain/items.js.
  if (!('ammo' in G.equipment)) G.equipment.ammo = null;
  // Tira da prioridade magias que a vocação/nível atual não pode usar.
  G.rtc.attackSpells = normalizeAttackSpells(G.rtc).filter(id => isSpellAvailable(id, G.vocation, G.level));
  if (G.rtc.attackRune && !isRuneAvailableToVocation(G.rtc.attackRune, G.vocation)) { G.rtc.attackType = null; G.rtc.attackRune = null; }
  G.rtc.attackType = G.rtc.attackSpells.length ? 'spell' : (G.rtc.attackRune ? 'rune' : null);
  if (G.rtc.healSpell && !isSpellAvailable(G.rtc.healSpell, G.vocation, G.level)) G.rtc.healSpell = null;
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
  const zoneXpMult = getZoneMultiplier(G.activeZone, 'xp', zone.xpMult);
  const zoneGoldMult = getZoneMultiplier(G.activeZone, 'gold', zone.goldMult);
  // Stamina offline: caçar offline também consome stamina (se ligada) e a XP
  // sofre o mesmo multiplicador da stamina. Consome pelo tempo caçado.
  const staminaMult = isStaminaEnabled() ? staminaXpMult(G.stamina) : 1;
  const xpGained = Math.floor(kills * avg.xp * scaleFactor * zoneXpMult * worldXpMultiplier(G.currentWorld) * 0.5 * getXpRate() * staminaMult);
  const goldGained = Math.floor(kills * avg.gold * scaleFactor * zoneGoldMult * worldGoldMultiplier(G.currentWorld) * 0.5 * getGoldRate());
  if (isStaminaEnabled() && typeof G.stamina === 'number') {
    G.stamina = Math.max(0, G.stamina - cappedSec / 60);
  }

  G.gold += goldGained;
  G.totalGoldEarned += goldGained;
  G.totalKills += kills;
  G.bpXp += Math.floor(xpGained * 0.01);
  checkBpTier();
  gainXp(xpGained);

  const hours = Math.floor(cappedSec / 3600), minutes = Math.floor((cappedSec % 3600) / 60);
  emit(EVENTS.OFFLINE_PROGRESS, { zoneName: zone.name, zoneMainMonster: zone.monsters[0], hours, minutes, kills, xpGained, goldGained });
}

export function confirmReset() {
  if (confirm('Tem certeza? Todo o progresso será perdido!')) {
    clearState();
    location.reload();
  }
}
