// Catálogo de itens e os kits iniciais por vocação.
import { primaryStatKeyForItem } from './rarity.js?v=117';

export const ITEMS = {
  // Container do inventário — o "bag" inicial do Tibia. Fica no slot de Mochila
  // (ver domain/gameState.js: backpack), não é equipável nos slots de atributo.
  bag:            { name: 'Bag', icon: '🎒', type: 'container', sell: 1 },
  bones:          { name: 'Ossos', icon: '🦴', type: 'misc', sell: 1 },
  minotaur_horn:  { name: 'Chifre Minotauro', icon: '📯', type: 'misc', sell: 80 },
  chain_armor:    { name: 'Armadura de Correntes', icon: '⛓️', type: 'armor', def: 8, sell: 300, rare: false },
  guardian_halberd:{ name: 'Alabarda Guardiã', icon: '🗡️', type: 'weapon', weaponType: 'axe', atk: 35, sell: 800, rare: true },
  amazon_armor:   { name: 'Amazon Armor', icon: '🥊', type: 'armor', def: 12, sell: 500, rare: true },
  cheese:         { name: 'Cheese', icon: '🧀', type: 'food', heal: 10, sell: 2 },
  meat:           { name: 'Meat', icon: '🍖', type: 'food', heal: 20, sell: 3 },
  worm_dirt:      { name: 'Lump of Dirt', icon: '🟫', type: 'misc', sell: 1 },
  orc_tooth:      { name: 'Orc Tooth', icon: '🦷', type: 'misc', sell: 15 },
  studded_armor:  { name: 'Studded Armor', icon: '🦺', type: 'armor', def: 5, sell: 90 },
  cyclops_toe:    { name: 'Cyclops Toe', icon: '🦶', type: 'misc', sell: 55 },
  halberd:        { name: 'Halberd', icon: '🗡️', type: 'weapon', weaponType: 'axe', atk: 35, sell: 400 },
  spider_silk:    { name: 'Spider Silk', icon: '🕸️', type: 'misc', sell: 100 },
  spider_fangs:   { name: 'Spider Fangs', icon: '🦷', type: 'misc', sell: 10 },
  knight_armor:   { name: 'Knight Armor', icon: '🛡️', type: 'armor', def: 14, sell: 5000, rare: true },
  plate_legs:     { name: 'Plate Legs', icon: '🦵', type: 'legs', def: 7, sell: 115 },
  leather_boots:  { name: 'Leather Boots', icon: '🥾', type: 'boots', def: 1, sell: 8 },
  boots_of_haste: { name: 'Boots of Haste', icon: '👢', type: 'boots', def: 0, spd: 0.3, sell: 30000, rare: true },
  hydra_head:     { name: 'Hydra Head', icon: '🐍', type: 'misc', sell: 600 },
  hydra_egg:      { name: 'Hydra Egg', icon: '🥚', type: 'misc', sell: 500, rare: true },
  medusa_shield:  { name: 'Medusa Shield', icon: '🛡️', type: 'shield', def: 33, sell: 9000, rare: true },
  strand_of_medusa_hair: { name: 'Strand of Medusa Hair', icon: '〰️', type: 'misc', sell: 600 },
  behemoth_claw:  { name: 'Behemoth Claw', icon: '🪝', type: 'misc', sell: 2000 },
  giant_sword:    { name: 'Giant Sword', icon: '⚔️', type: 'weapon', weaponType: 'sword', atk: 46, sell: 17000, rare: true },
  crystal_coin:   { name: 'Crystal Coin', icon: '💠', type: 'currency', sell: 10000 },
  magic_plate_armor: { name: 'Magic Plate Armor', icon: '✨', type: 'armor', def: 17, sell: 45000, rare: true },
  dragon_scale_legs: { name: 'Dragon Scale Legs', icon: '🦵', type: 'legs', def: 10, sell: 30000, rare: true },
  goblin_ear:     { name: 'Goblin Ear', icon: '👂', type: 'misc', sell: 5 },
  dwarven_ring:   { name: 'Dwarven Ring', icon: '💍', type: 'ring', def: 2, magic: 2, sell: 2000, rare: true },
  elvish_talisman:{ name: 'Elvish Talisman', icon: '🔮', type: 'misc', sell: 30 },
  scarab_coin:    { name: 'Scarab Coin', icon: '🪙', type: 'currency', sell: 100 },
  mutated_flesh:  { name: 'Mutated Flesh', icon: '🥩', type: 'misc', sell: 8 },
  ice_rapier:     { name: 'Ice Rapier', icon: '🧊', type: 'weapon', weaponType: 'sword', atk: 42, sell: 8000, rare: true },
  skull_staff:    { name: 'Skull Staff', icon: '💀', type: 'weapon', weaponType: 'magic', wandDmg: 35, sell: 12000, rare: true },
  vampire_dust:   { name: 'Vampire Dust', icon: '🌫️', type: 'misc', sell: 100 },
  strange_helmet: { name: 'Strange Helmet', icon: '🪖', type: 'helmet', def: 15, sell: 6000, rare: true },
  hellhound_slobber: { name: 'Hellhound Slobber', icon: '💧', type: 'misc', sell: 500 },
  // --- Itens exclusivos dos bosses RubinOT ---
  rubini_shard:   { name: 'Rubini Shard', icon: '💎', type: 'currency', sell: 5000, rare: true },
  lothlorien_bow: { name: 'Lothlorien Bow', icon: '🏹', type: 'weapon', weaponType: 'distance', distanceBonus: 8, atk: 0, sell: 60000, rare: true },
  executioner_axe:{ name: 'Executioner Axe', icon: '🪓', type: 'weapon', weaponType: 'axe', atk: 60, sell: 70000, rare: true },
  morgul_blade:   { name: 'Morgul Blade', icon: '🗡️', type: 'weapon', weaponType: 'sword', atk: 65, sell: 85000, rare: true },
  corrupted_heart:{ name: 'Corrupted Heart', icon: '🩸', type: 'misc', sell: 25000, rare: true },
  nzoth_tentacle: { name: 'Tentacle of N\'Zoth', icon: '🦑', type: 'misc', sell: 40000, rare: true },
  // --- Munição (equipada no slot Munição; define o ataque do paladino junto
  // com a skill Distance). Ataques reais do Tibia. Não é consumida (idle). ---
  arrow:          { name: 'Arrow', icon: '🏹', type: 'ammo', atk: 13, sell: 1 },
  bolt:           { name: 'Bolt', icon: '🏹', type: 'ammo', atk: 27, sell: 1 },
  sniper_arrow:   { name: 'Sniper Arrow', icon: '🏹', type: 'ammo', atk: 20, sell: 2 },
  power_bolt:     { name: 'Power Bolt', icon: '🏹', type: 'ammo', atk: 33, sell: 5 },
  gold_coin:      { name: 'Moeda de Ouro', icon: '🪙', type: 'currency', sell: 1 },
  dragon_scale:   { name: 'Escama de Dragão', icon: '🐉', type: 'misc', sell: 200 },
  dragon_ham:     { name: 'Presunto de Dragão', icon: '🍖', type: 'food', heal: 120, sell: 150 },
  dragonbone_staff:{ name: 'Cajado Osso de Dragão', icon: '🪄', type: 'weapon', weaponType: 'magic', wandDmg: 42, sell: 5000, rare: true },
  royal_helmet:   { name: 'Elmo Real', icon: '👑', type: 'helmet', def: 20, sell: 8000, rare: true },
  life_crystal:   { name: 'Cristal de Vida', icon: '💎', type: 'misc', sell: 400 },
  demon_dust:     { name: 'Pó de Demônio', icon: '✨', type: 'misc', sell: 500 },
  demon_shield:   { name: 'Escudo Demoníaco', icon: '😈', type: 'shield', def: 30, sell: 15000, rare: true },
  platinum_coin:  { name: 'Moeda de Platina', icon: '⚪', type: 'currency', sell: 100 },
  titan_axe:      { name: 'Machado Titã', icon: '🪓', type: 'weapon', weaponType: 'axe', atk: 55, sell: 30000, rare: true },
  death_ring:     { name: 'Anel da Morte', icon: '💍', type: 'ring', def: 5, magic: 10, sell: 12000, rare: true },
  necromancer_shield:{ name: 'Escudo Necromante', icon: '🛡️', type: 'shield', def: 28, magic: 8, sell: 18000, rare: true },
  tentacle_piece: { name: 'Tentáculo de N\'Zoth', icon: '🦑', type: 'misc', sell: 500 },

  // --- Kit inicial por vocação (entregue automaticamente ao escolher a vocação) ---
  dagger:         { name: 'Dagger', icon: '🗡️', type: 'weapon', weaponType: 'sword', atk: 6, sell: 6 },
  bow:            { name: 'Bow', icon: '🏹', type: 'weapon', weaponType: 'distance', atk: 0, sell: 20 },
  wand_of_vortex: { name: 'Wand of Vortex', icon: '🪄', type: 'weapon', weaponType: 'magic', wandDmg: 13, sell: 400 },
  snakebite_rod:  { name: 'Snakebite Rod', icon: '🪄', type: 'weapon', weaponType: 'magic', wandDmg: 13, sell: 400 },
  wooden_shield:  { name: 'Wooden Shield', icon: '🛡️', type: 'shield', def: 3, sell: 8 },
  leather_armor:  { name: 'Leather Armor', icon: '🥋', type: 'armor', def: 3, sell: 6 },
  leather_legs:   { name: 'Leather Legs', icon: '🦵', type: 'legs', def: 2, sell: 6 },
  robe:           { name: 'Robe', icon: '👘', type: 'armor', def: 3, sell: 15 },

  // --- Poções (curam HP/mana ao usar — não ocupam slot de equipamento) ---
  health_potion:        { name: 'Health Potion', icon: '🧪', type: 'potion', heal: 60, sell: 25 },
  strong_health_potion: { name: 'Strong Health Potion', icon: '🧪', type: 'potion', heal: 150, sell: 60, reqLevel: 50, reqVoc: ['knight','paladin'] },
  great_health_potion:  { name: 'Great Health Potion', icon: '🧪', type: 'potion', heal: 300, sell: 130, reqLevel: 80, reqVoc: ['knight','paladin'] },
  ultimate_health_potion:{ name: 'Ultimate Health Potion', icon: '🧪', type: 'potion', heal: 500, sell: 260, reqLevel: 130, reqVoc: ['knight'] },
  mana_potion:          { name: 'Mana Potion', icon: '🔵', type: 'potion', mana: 60, sell: 25 },
  strong_mana_potion:   { name: 'Strong Mana Potion', icon: '🔵', type: 'potion', mana: 150, sell: 60, reqLevel: 50, reqVoc: ['sorcerer','druid','paladin'] },
  great_mana_potion:    { name: 'Great Mana Potion', icon: '🔵', type: 'potion', mana: 300, sell: 130, reqLevel: 80, reqVoc: ['sorcerer','druid'] },

  // --- Runas (magia de uma carga só, consumida ao usar — como as runas reais de Tibia) ---
  ultimate_healing_rune:{ name: 'Ultimate Healing Rune', icon: '📜', type: 'rune', heal: 400, sell: 180 },
  intense_healing_rune: { name: 'Intense Healing Rune', icon: '📜', type: 'rune', heal: 150, sell: 70 },
  // `area` = forma de área do Tibia (ver domain/attackAreas.js): SD é alvo
  // único; Explosion/Fireball explodem numa área compacta; Avalanche e Great
  // Fireball cobrem o 3x3 inteiro (até 8 criaturas da sala).
  // `power` = base power REAL do Tibia/TFS [aMin, baseMin, aMax, baseMax]; o dano é
  // aleatório entre min/max, min = nível/5 + aMin·ML + baseMin (idem max) — mesma
  // fórmula das magias (ver domain/combatFormulas.js: runeDamage). `dmg` é só um
  // valor de referência pra listagem/ordenação (não entra no cálculo).
  sudden_death_rune:    { name: 'Sudden Death Rune', icon: '📜', type: 'rune', dmg: 320, power: [4.3, 32, 7.4, 48], area: 'single', element: 'death', reqMl: 15, sell: 200 },
  explosion_rune:       { name: 'Explosion Rune', icon: '📜', type: 'rune', dmg: 140, power: [1.6, 9, 3.2, 19], area: 'explosion', element: 'physical', reqMl: 6, sell: 60 },
  avalanche_rune:       { name: 'Avalanche Rune', icon: '📜', type: 'rune', dmg: 180, power: [1.2, 7, 2.85, 16], area: 'ball', element: 'ice', reqMl: 9, sell: 90 },
  fireball_rune:        { name: 'Fireball Rune', icon: '📜', type: 'rune', dmg: 40, power: [1.8, 12, 3.0, 17], area: 'explosion', element: 'fire', reqMl: 4, sell: 15 },
  great_fireball_rune:  { name: 'Great Fireball Rune', icon: '📜', type: 'rune', dmg: 90, power: [1.2, 7, 2.85, 16], area: 'ball', element: 'fire', reqMl: 7, sell: 45 },
  great_spirit_potion:  { name: 'Great Spirit Potion', icon: '🧪', type: 'potion', heal: 200, mana: 150, sell: 320 },

  // --- Loja de Equipamentos: mais opções reais de Tibia por categoria ---
  broadsword:      { name: 'Broadsword', icon: '⚔️', type: 'weapon', weaponType: 'sword', atk: 24, sell: 90 },
  fire_sword:      { name: 'Fire Sword', icon: '🔥', type: 'weapon', weaponType: 'sword', atk: 24, sell: 3000, rare: true },
  battle_axe:      { name: 'Battle Axe', icon: '🪓', type: 'weapon', weaponType: 'axe', atk: 25, sell: 80 },
  war_hammer:      { name: 'War Hammer', icon: '🔨', type: 'weapon', weaponType: 'club', atk: 35, sell: 90 },
  crossbow:        { name: 'Crossbow', icon: '🏹', type: 'weapon', weaponType: 'distance', atk: 0, sell: 70 },
  composite_hornbow:{ name: 'Composite Hornbow', icon: '🏹', type: 'weapon', weaponType: 'distance', distanceBonus: 4, atk: 0, sell: 12000, rare: true },
  wand_of_cosmic_energy:{ name: 'Wand of Cosmic Energy', icon: '🪄', type: 'weapon', weaponType: 'magic', wandDmg: 33, sell: 900 },
  wand_of_inferno: { name: 'Wand of Inferno', icon: '🪄', type: 'weapon', weaponType: 'magic', wandDmg: 38, sell: 3500, rare: true },
  moonlight_rod:   { name: 'Moonlight Rod', icon: '🪄', type: 'weapon', weaponType: 'magic', wandDmg: 18, sell: 900 },
  underworld_rod:  { name: 'Underworld Rod', icon: '🪄', type: 'weapon', weaponType: 'magic', wandDmg: 38, sell: 3500, rare: true },
  brass_armor:     { name: 'Brass Armor', icon: '🥋', type: 'armor', def: 8, sell: 180 },
  scale_armor:     { name: 'Scale Armor', icon: '🥋', type: 'armor', def: 8, sell: 90 },
  golden_armor:    { name: 'Golden Armor', icon: '🥋', type: 'armor', def: 12, sell: 1200 },
  crown_armor:     { name: 'Crown Armor', icon: '🥋', type: 'armor', def: 13, sell: 6500, rare: true },
  studded_shield:  { name: 'Studded Shield', icon: '🛡️', type: 'shield', def: 8, sell: 70 },
  guardian_shield: { name: 'Guardian Shield', icon: '🛡️', type: 'shield', def: 16, sell: 2500 },
  crown_shield:    { name: 'Crown Shield', icon: '🛡️', type: 'shield', def: 21, sell: 5000, rare: true },
  ancient_shield:  { name: 'Ancient Shield', icon: '🛡️', type: 'shield', def: 22, sell: 11000, rare: true },
  iron_helmet:     { name: 'Iron Helmet', icon: '⛑️', type: 'helmet', def: 5, sell: 30 },
  chain_helmet:    { name: 'Chain Helmet', icon: '⛑️', type: 'helmet', def: 6, sell: 45 },
  warrior_helmet:  { name: 'Warrior Helmet', icon: '⛑️', type: 'helmet', def: 10, sell: 350 },
  crown_helmet:    { name: 'Crown Helmet', icon: '👑', type: 'helmet', def: 13, sell: 5800, rare: true },
  studded_legs:    { name: 'Studded Legs', icon: '🦵', type: 'legs', def: 5, sell: 70 },
  golden_legs:     { name: 'Golden Legs', icon: '🦵', type: 'legs', def: 8, sell: 1100 },
  crown_legs:      { name: 'Crown Legs', icon: '🦵', type: 'legs', def: 11, sell: 5200, rare: true },
  steel_boots:     { name: 'Steel Boots', icon: '👢', type: 'boots', def: 3, sell: 220 },
  might_ring:      { name: 'Might Ring', icon: '💍', type: 'ring', def: 2, sell: 380, rare: true },
};

// Kit inicial por vocação — entregue e equipado automaticamente na 1ª escolha de vocação,
// como o equipamento que o RubinOT dá ao personagem recém-criado.
export const STARTER_KITS = {
  knight:   { weapon: 'dagger',        armor: 'leather_armor', shield: 'wooden_shield', boots: 'leather_boots' },
  paladin:  { weapon: 'bow', ammo: 'arrow', armor: 'leather_armor', legs: 'leather_legs', boots: 'leather_boots' },
  sorcerer: { weapon: 'wand_of_vortex',armor: 'robe',                                    boots: 'leather_boots' },
  druid:    { weapon: 'snakebite_rod', armor: 'robe',                                    boots: 'leather_boots' },
};

export const EQUIPMENT_SLOTS = ['helmet', 'weapon', 'armor', 'shield', 'ammo', 'ring', 'legs', 'boots'];
export const EQUIPPABLE_TYPES = ['weapon', 'armor', 'shield', 'helmet', 'ammo', 'ring', 'legs', 'boots'];
export const CONSUMABLE_TYPES = ['potion', 'rune', 'food'];

// Tipos de ARMA que cada vocação pode empunhar (fiel ao Tibia: cada profissão
// usa sua classe de arma). Armadura/elmo/anel/etc. não são restritos aqui. A
// munição (ammo) é exclusiva do paladino. Ver equipItem em inventoryUseCases.
export const VOCATION_WEAPON_TYPES = {
  knight:   ['sword', 'axe', 'club'],
  paladin:  ['distance'],
  sorcerer: ['magic'],
  druid:    ['magic'],
};
export function canVocationEquip(item, vocation) {
  if (!item || !vocation) return true;
  if (item.type === 'weapon') return (VOCATION_WEAPON_TYPES[vocation] || []).includes(item.weaponType);
  if (item.type === 'ammo') return vocation === 'paladin'; // só o paladino usa munição
  return true; // demais peças (armadura/elmo/anel/calças/botas/escudo) livres
}
// Motivo do bloqueio (pra mensagem), ou null se pode equipar.
export function equipBlockReason(item, vocation) {
  if (canVocationEquip(item, vocation)) return null;
  if (item.type === 'weapon') return 'sua vocação não usa esse tipo de arma';
  if (item.type === 'ammo') return 'só o paladino usa munição';
  return 'não pode equipar';
}

// Requisito de nível/vocação de uma poção, fiel ao Tibia (ver reqLevel/reqVoc
// nas poções acima). Retorna null se PODE usar, ou uma string com o motivo do
// bloqueio (pra mostrar ao jogador). Poções sem requisito (Health/Mana Potion)
// nunca bloqueiam. Usado no uso manual (inventoryUseCases), no auto-uso do RTC
// (huntUseCases) e na exibição (loja/RTC).
const VOC_DISPLAY = { knight: 'Knight', paladin: 'Paladin', sorcerer: 'Sorcerer', druid: 'Druid' };
export function potionUseBlockReason(item, vocation, level) {
  if (!item) return null;
  if (item.reqLevel && level < item.reqLevel) return `Requer nível ${item.reqLevel}.`;
  if (item.reqVoc && vocation && !item.reqVoc.includes(vocation)) {
    return `Só ${item.reqVoc.map(v => VOC_DISPLAY[v] || v).join('/')} podem usar.`;
  }
  return null;
}
export function canUsePotion(item, vocation, level) {
  return potionUseBlockReason(item, vocation, level) === null;
}

// Rótulo estático do requisito de uma poção (pra loja/RTC), ex.:
// "Nível 50 · Knight/Paladin". Vazio quando não há requisito.
export function potionReqLabel(item) {
  if (!item || (!item.reqLevel && !item.reqVoc)) return '';
  const parts = [];
  if (item.reqLevel) parts.push(`Nível ${item.reqLevel}`);
  if (item.reqVoc) parts.push(item.reqVoc.map(v => VOC_DISPLAY[v] || v).join('/'));
  return parts.join(' · ');
}

// Um valor de slot de equipamento (G.equipment[slot]) pode ser um itemId comum
// (chave direta de ITEMS) OU o id de uma Relíquia (G.relics — ver
// domain/gameState.js), no formato "relic_<n>". Esta função é o único critério
// usado no jogo inteiro pra distinguir os dois formatos.
export function isRelicId(id) {
  return typeof id === 'string' && id.startsWith('relic_');
}

// Resolve o item "efetivo" equipado num slot: um itemId comum vira
// ITEMS[itemId] direto; o id de uma Relíquia vira uma cópia do item base com
// o stat principal reforçado pelo bônus de raridade (ver domain/rarity.js).
// `relics` é passada explicitamente (em vez de ler G direto) pra manter esta
// função pura — quem chama passa G.relics (ver application/stats.js).
// Ponto único de resolução: todo cálculo de stat/skill que hoje lê
// ITEMS[equipment[slot]] deve passar por aqui em vez de duplicar o
// if (isRelicId(...)) em cada lugar.
export function resolveEquippedItem(slotValue, relics) {
  if (!slotValue) return null;
  if (!isRelicId(slotValue)) return ITEMS[slotValue] || null;
  const relic = (relics || []).find(r => r.id === slotValue);
  if (!relic) return null;
  const base = ITEMS[relic.itemId];
  if (!base) return null;
  const statKey = primaryStatKeyForItem(base);
  if (!statKey) return { ...base };
  return { ...base, [statKey]: Math.round(base[statKey] * (1 + relic.bonusPct)) };
}
