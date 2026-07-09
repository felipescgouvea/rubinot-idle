// ===== RUBINOT IDLE ENGINE =====

// ---- DATA DEFINITIONS ----

const VOCATIONS = {
  knight: {
    name: 'Knight', icon: '🛡️',
    baseHp: 200, baseMana: 60, baseAtk: 18, baseDef: 12, baseMgc: 0, baseSpd: 1.2,
    hpPerLevel: 25, manaPerLevel: 5, atkPerLevel: 3, defPerLevel: 2,
    hpRegen: 3, manaRegen: 1,
    style: 'melee',
    color: '#e74c3c',
  },
  paladin: {
    name: 'Paladin', icon: '🏹',
    baseHp: 150, baseMana: 120, baseAtk: 15, baseDef: 8, baseMgc: 8, baseSpd: 1.4,
    hpPerLevel: 18, manaPerLevel: 12, atkPerLevel: 2, defPerLevel: 1,
    hpRegen: 2, manaRegen: 3,
    style: 'range',
    color: '#3a7bd5',
  },
  sorcerer: {
    name: 'Sorcerer', icon: '🔮',
    baseHp: 80, baseMana: 250, baseAtk: 8, baseDef: 3, baseMgc: 22, baseSpd: 1.1,
    hpPerLevel: 8, manaPerLevel: 25, atkPerLevel: 1, defPerLevel: 0.5,
    hpRegen: 1, manaRegen: 8,
    style: 'magic',
    color: '#9b59b6',
  },
  druid: {
    name: 'Druid', icon: '🌿',
    baseHp: 100, baseMana: 200, baseAtk: 6, baseDef: 4, baseMgc: 18, baseSpd: 1.0,
    hpPerLevel: 10, manaPerLevel: 22, atkPerLevel: 1, defPerLevel: 1,
    hpRegen: 2, manaRegen: 7,
    style: 'magic',
    color: '#2ecc71',
  },
};

const ZONES = {
  rotworm_cave:  { name: 'Caverna de Rotworms', icon: '🪱', minLevel: 1,  worldReq: 'auroria', monsters: ['rotworm', 'cave_rat'], goldMult: 1.0, xpMult: 1.0 },
  troll_cave:    { name: 'Caverna dos Trolls', icon: '🟤', minLevel: 4,  worldReq: 'auroria', monsters: ['troll', 'orc'], goldMult: 1.2, xpMult: 1.2 },
  cyclops_camp:  { name: 'Acampamento Cyclops', icon: '🗿', minLevel: 8,  worldReq: 'auroria', monsters: ['cyclops', 'minotaur'], goldMult: 1.5, xpMult: 1.4 },
  amazon_camp:   { name: 'Acampamento Amazona', icon: '🏹', minLevel: 15, worldReq: 'auroria', monsters: ['amazon', 'valkyrie'], goldMult: 1.8, xpMult: 1.6 },
  spider_lair:   { name: 'Ninho de Giant Spiders', icon: '🕷️', minLevel: 22, worldReq: 'spectrum', monsters: ['giant_spider', 'tarantula'], goldMult: 2.2, xpMult: 2.0 },
  dragon_lair:   { name: 'Covil dos Dragões', icon: '🔥', minLevel: 30, worldReq: 'bellum',  monsters: ['dragon', 'dragon_lord'], goldMult: 3.0, xpMult: 2.5 },
  lich_lair:     { name: 'Cripta dos Liches', icon: '☠️', minLevel: 40, worldReq: 'elysian', monsters: ['lich', 'undead_dragon'], goldMult: 4.0, xpMult: 3.5 },
  demon_fortress:{ name: 'Fortaleza Demoníaca', icon: '💀', minLevel: 50, worldReq: 'elysian', monsters: ['demon', 'behemoth', 'juggernaut'], goldMult: 5.0, xpMult: 4.0 },
  hydra_swamp:   { name: 'Pântano das Hydras', icon: '🐍', minLevel: 45, worldReq: 'solarian', monsters: ['hydra', 'medusa'], goldMult: 4.2, xpMult: 3.8 },
  boss_sanctum:  { name: 'Santuário dos Bosses', icon: '🌀', minLevel: 70, worldReq: 'mystian', monsters: ['lothlorien', 'executioner', 'morgul', 'corrupted_one', 'nzoth'], goldMult: 8.0, xpMult: 6.0 },
};

const MONSTERS = {
  // --- Bestiário clássico de Tibia (o mundo do RubinOT) ---
  cave_rat:      { name: 'Cave Rat', icon: '🐀', hp: 15,  atk: 3,  def: 1,  xp: 8,   gold: [0,2],   loot: [['cheese',0.4],['rat_tail',0.7]] },
  rotworm:       { name: 'Rotworm', icon: '🪱', hp: 35,  atk: 6,  def: 2,  xp: 18,  gold: [1,5],   loot: [['meat',0.7],['worm_dirt',0.5]] },
  troll:         { name: 'Troll', icon: '👹', hp: 50,  atk: 7,  def: 3,  xp: 25,  gold: [2,6],   loot: [['bones',0.9],['troll_club',0.1]] },
  orc:           { name: 'Orc', icon: '🗡️', hp: 70,  atk: 10, def: 4,  xp: 35,  gold: [3,8],   loot: [['orc_tooth',0.5],['studded_armor',0.06]] },
  cyclops:       { name: 'Cyclops', icon: '🗿', hp: 260, atk: 30, def: 10, xp: 150, gold: [10,30], loot: [['cyclops_toe',0.4],['halberd',0.04]] },
  minotaur:      { name: 'Minotaur', icon: '🐂', hp: 120, atk: 18, def: 6,  xp: 80,  gold: [5,15],  loot: [['minotaur_horn',0.4],['chain_armor',0.05]] },
  amazon:        { name: 'Amazon', icon: '🏹', hp: 110, atk: 22, def: 5,  xp: 60,  gold: [4,10],  loot: [['amazon_armor',0.08],['power_bolt',0.5]] },
  valkyrie:      { name: 'Valkyrie', icon: '⚔️', hp: 190, atk: 30, def: 12, xp: 120, gold: [8,20],  loot: [['valkyrie_shield',0.04],['gold_coin',1.0]] },
  giant_spider:  { name: 'Giant Spider', icon: '🕷️', hp: 1300,atk: 75, def: 20, xp: 900, gold: [40,100], loot: [['spider_silk',0.4],['knight_armor',0.02],['plate_legs',0.05]] },
  tarantula:     { name: 'Tarantula', icon: '🕸️', hp: 225, atk: 35, def: 10, xp: 120, gold: [8,25],  loot: [['spider_fangs',0.6]] },
  dragon:        { name: 'Dragon', icon: '🐉', hp: 1000,atk: 85, def: 25, xp: 700, gold: [40,105], loot: [['dragon_scale',0.6],['dragon_ham',0.8],['dragonbone_staff',0.02]] },
  dragon_lord:   { name: 'Dragon Lord', icon: '🔴', hp: 1900,atk: 120,def: 35, xp: 2100,gold: [100,200],loot: [['dragon_lord_scale',0.4],['royal_helmet',0.01],['life_crystal',0.5]] },
  hydra:         { name: 'Hydra', icon: '🐍', hp: 2350,atk: 130,def: 40, xp: 2100,gold: [100,250],loot: [['hydra_head',0.3],['hydra_egg',0.05],['medusa_shield',0.01]] },
  medusa:        { name: 'Medusa', icon: '🐍', hp: 4500,atk: 160,def: 45, xp: 4050,gold: [150,300],loot: [['strand_of_medusa_hair',0.2],['titan_axe',0.008]] },
  lich:          { name: 'Lich', icon: '💀', hp: 880, atk: 100,def: 30, xp: 900, gold: [80,160], loot: [['lich_trophy',0.3],['death_ring',0.02]] },
  undead_dragon: { name: 'Undead Dragon', icon: '☠️', hp: 8350,atk: 180,def: 50, xp: 7200,gold: [200,400],loot: [['cursed_dragon_scale',0.5],['necromancer_shield',0.02],['dragon_scale_legs',0.005]] },
  behemoth:      { name: 'Behemoth', icon: '🦣', hp: 4000,atk: 150,def: 45, xp: 3000,gold: [150,300],loot: [['behemoth_claw',0.3],['giant_sword',0.015],['crystal_coin',0.05]] },
  demon:         { name: 'Demon', icon: '😈', hp: 8200,atk: 190,def: 55, xp: 6000,gold: [200,400],loot: [['demon_dust',0.5],['demon_shield',0.01],['magic_plate_armor',0.005],['platinum_coin',0.8]] },
  juggernaut:    { name: 'Juggernaut', icon: '💥', hp: 20000,atk: 250,def: 65, xp: 14000,gold: [300,600],loot: [['titan_axe',0.01],['juggernaut_trophy',0.1],['crystal_coin',0.15]] },
  // --- Bosses exclusivos do RubinOT (salas de Linked Tasks) ---
  lothlorien:    { name: 'Lothlorien', icon: '🌲', hp: 30000,atk: 280,def: 70, xp: 25000,gold: [400,800],  loot: [['lothlorien_bow',0.02],['crystal_coin',0.4],['rubini_shard',0.3]] },
  executioner:   { name: 'Executioner', icon: '🪓', hp: 35000,atk: 320,def: 75, xp: 30000,gold: [500,900],  loot: [['executioner_axe',0.02],['crystal_coin',0.4],['rubini_shard',0.35]] },
  morgul:        { name: 'Morgul', icon: '👻', hp: 40000,atk: 350,def: 80, xp: 35000,gold: [500,1000], loot: [['morgul_blade',0.015],['crystal_coin',0.5],['rubini_shard',0.4]] },
  corrupted_one: { name: 'The Corrupted', icon: '🩸', hp: 50000,atk: 400,def: 90, xp: 45000,gold: [600,1200], loot: [['corrupted_heart',0.1],['crystal_coin',0.6],['rubini_shard',0.5]] },
  nzoth:         { name: 'N\'Zoth', icon: '🌀', hp: 80000,atk: 500,def: 100,xp: 70000,gold: [1000,2000],loot: [['nzoth_tentacle',0.2],['abyssal_blade',0.01],['rubini_shard',0.8]] },
};

const ITEMS = {
  bones:          { name: 'Ossos', icon: '🦴', type: 'misc', sell: 1 },
  troll_club:     { name: 'Clava de Troll', icon: '🪵', type: 'weapon', atk: 5, sell: 50, rare: false },
  rat_tail:       { name: 'Rabo de Rato', icon: '🐭', type: 'misc', sell: 2 },
  minotaur_horn:  { name: 'Chifre Minotauro', icon: '📯', type: 'misc', sell: 80 },
  chain_armor:    { name: 'Armadura de Correntes', icon: '⛓️', type: 'armor', def: 8, sell: 300, rare: false },
  guardian_halberd:{ name: 'Alabarda Guardiã', icon: '🗡️', type: 'weapon', atk: 22, sell: 800, rare: true },
  amazon_armor:   { name: 'Amazon Armor', icon: '🥊', type: 'armor', def: 12, sell: 500, rare: true },
  cheese:         { name: 'Cheese', icon: '🧀', type: 'food', heal: 10, sell: 2 },
  meat:           { name: 'Meat', icon: '🍖', type: 'food', heal: 20, sell: 3 },
  worm_dirt:      { name: 'Lump of Dirt', icon: '🟫', type: 'misc', sell: 1 },
  orc_tooth:      { name: 'Orc Tooth', icon: '🦷', type: 'misc', sell: 15 },
  studded_armor:  { name: 'Studded Armor', icon: '🦺', type: 'armor', def: 5, sell: 90 },
  cyclops_toe:    { name: 'Cyclops Toe', icon: '🦶', type: 'misc', sell: 55 },
  halberd:        { name: 'Halberd', icon: '🗡️', type: 'weapon', atk: 15, sell: 400 },
  spider_silk:    { name: 'Spider Silk', icon: '🕸️', type: 'misc', sell: 100 },
  spider_fangs:   { name: 'Spider Fangs', icon: '🦷', type: 'misc', sell: 10 },
  knight_armor:   { name: 'Knight Armor', icon: '🛡️', type: 'armor', def: 14, sell: 5000, rare: true },
  plate_legs:     { name: 'Plate Legs', icon: '🦵', type: 'misc', sell: 115 },
  hydra_head:     { name: 'Hydra Head', icon: '🐍', type: 'misc', sell: 600 },
  hydra_egg:      { name: 'Hydra Egg', icon: '🥚', type: 'misc', sell: 500, rare: true },
  medusa_shield:  { name: 'Medusa Shield', icon: '🛡️', type: 'shield', def: 33, sell: 9000, rare: true },
  strand_of_medusa_hair: { name: 'Strand of Medusa Hair', icon: '〰️', type: 'misc', sell: 600 },
  behemoth_claw:  { name: 'Behemoth Claw', icon: '🪝', type: 'misc', sell: 2000 },
  giant_sword:    { name: 'Giant Sword', icon: '⚔️', type: 'weapon', atk: 46, sell: 17000, rare: true },
  crystal_coin:   { name: 'Crystal Coin', icon: '💠', type: 'currency', sell: 10000 },
  magic_plate_armor: { name: 'Magic Plate Armor', icon: '✨', type: 'armor', def: 17, sell: 45000, rare: true },
  dragon_scale_legs: { name: 'Dragon Scale Legs', icon: '🦵', type: 'misc', sell: 30000, rare: true },
  // --- Itens exclusivos dos bosses RubinOT ---
  rubini_shard:   { name: 'Rubini Shard', icon: '💎', type: 'currency', sell: 5000, rare: true },
  lothlorien_bow: { name: 'Lothlorien Bow', icon: '🏹', type: 'weapon', atk: 55, sell: 60000, rare: true },
  executioner_axe:{ name: 'Executioner Axe', icon: '🪓', type: 'weapon', atk: 60, sell: 70000, rare: true },
  morgul_blade:   { name: 'Morgul Blade', icon: '🗡️', type: 'weapon', atk: 65, magic: 10, sell: 85000, rare: true },
  corrupted_heart:{ name: 'Corrupted Heart', icon: '🩸', type: 'misc', sell: 25000, rare: true },
  nzoth_tentacle: { name: 'Tentacle of N\'Zoth', icon: '🦑', type: 'misc', sell: 40000, rare: true },
  power_bolt:     { name: 'Dardo Poderoso', icon: '🏹', type: 'ammo', atk: 3, sell: 5, qty: 10 },
  valkyrie_shield:{ name: 'Escudo Valkyrie', icon: '🛡️', type: 'shield', def: 15, sell: 1200, rare: true },
  gold_coin:      { name: 'Moeda de Ouro', icon: '🪙', type: 'currency', sell: 1 },
  dragon_scale:   { name: 'Escama de Dragão', icon: '🐉', type: 'misc', sell: 200 },
  dragon_ham:     { name: 'Presunto de Dragão', icon: '🍖', type: 'food', heal: 120, sell: 150 },
  dragonbone_staff:{ name: 'Cajado Osso de Dragão', icon: '🪄', type: 'weapon', atk: 40, magic: 15, sell: 5000, rare: true },
  dragon_lord_scale:{ name: 'Escama Lorde Dragão', icon: '🔴', type: 'misc', sell: 800 },
  royal_helmet:   { name: 'Elmo Real', icon: '👑', type: 'helmet', def: 20, atk: 5, sell: 8000, rare: true },
  life_crystal:   { name: 'Cristal de Vida', icon: '💎', type: 'misc', sell: 400 },
  demon_dust:     { name: 'Pó de Demônio', icon: '✨', type: 'misc', sell: 500 },
  demon_shield:   { name: 'Escudo Demoníaco', icon: '😈', type: 'shield', def: 30, sell: 15000, rare: true },
  platinum_coin:  { name: 'Moeda de Platina', icon: '⚪', type: 'currency', sell: 100 },
  titan_axe:      { name: 'Machado Titã', icon: '🪓', type: 'weapon', atk: 70, sell: 30000, rare: true },
  juggernaut_trophy:{ name: 'Troféu Juggernaut', icon: '🏆', type: 'misc', sell: 3000 },
  lich_trophy:    { name: 'Troféu Lich', icon: '💀', type: 'misc', sell: 1500 },
  death_ring:     { name: 'Anel da Morte', icon: '💍', type: 'ring', def: 5, magic: 10, sell: 12000, rare: true },
  cursed_dragon_scale:{ name: 'Escama Dragão Amaldiçoado', icon: '🖤', type: 'misc', sell: 1000 },
  necromancer_shield:{ name: 'Escudo Necromante', icon: '🛡️', type: 'shield', def: 28, magic: 8, sell: 18000, rare: true },
  void_crystal:   { name: 'Cristal do Vazio', icon: '🌀', type: 'misc', sell: 2000 },
  tentacle_piece: { name: 'Tentáculo de N\'Zoth', icon: '🦑', type: 'misc', sell: 500 },
  void_essence:   { name: 'Essência do Vazio', icon: '⚫', type: 'misc', sell: 5000 },
  abyssal_blade:  { name: 'Lâmina Abissal', icon: '🗡️', type: 'weapon', atk: 90, magic: 20, sell: 100000, rare: true },
};

const TASK_ROOMS = [
  { id: 'lothlorien', name: "Lothlorien's Room", icon: '🌲', monsters: ['rotworm','troll','orc','amazon'], required: 100 },
  { id: 'executioner', name: "Executioner's Room", icon: '🪓', monsters: ['cyclops','minotaur','valkyrie'], required: 200 },
  { id: 'morgul', name: "Morgul's Room", icon: '👻', monsters: ['lich','undead_dragon','giant_spider'], required: 150 },
  { id: 'corrupted', name: "Corrupted's Room", icon: '🩸', monsters: ['dragon','dragon_lord','demon','hydra'], required: 300 },
  { id: 'nzoth', name: "N'Zoth's Room", icon: '🌀', monsters: ['lothlorien','executioner','morgul','corrupted_one','nzoth'], required: 50 },
];

const WORLDS = [
  { id: 'auroria',  name: 'Auroria',  icon: '🌅', type: 'Open PvP',    reqLevel: 1,  bonus: '+10% XP', players: 2370, unlocked: true },
  { id: 'bellum',   name: 'Bellum',   icon: '⚔️', type: 'Optional PvP', reqLevel: 25, bonus: '+20% Gold', players: 1840, unlocked: false },
  { id: 'spectrum', name: 'Spectrum', icon: '🌈', type: 'Optional PvP', reqLevel: 20, bonus: '+15% XP', players: 1320, unlocked: false },
  { id: 'elysian',  name: 'Elysian',  icon: '✨', type: 'Retro PvP',   reqLevel: 40, bonus: '+25% XP +15% Gold', players: 3400, unlocked: false },
  { id: 'solarian', name: 'Solarian', icon: '☀️', type: 'Retro PvP',   reqLevel: 35, bonus: '+20% XP', players: 2100, unlocked: false },
  { id: 'mystian',  name: 'Mystian',  icon: '🌀', type: 'Retro PvP',   reqLevel: 60, bonus: '+40% XP +30% Gold', players: 1800, unlocked: false },
];

const SKILLS_DEF = [
  { id: 'vitality',    name: 'Vitalidade',    icon: '❤️', desc: '+20 HP máximo por nível.',   maxLevel: 20, baseCost: 1, costMult: 1.5, effect: (lv) => ({ maxHp: lv * 20 }) },
  { id: 'might',       name: 'Força',         icon: '💪', desc: '+3 ATK por nível.',           maxLevel: 20, baseCost: 1, costMult: 1.5, effect: (lv) => ({ atk: lv * 3 }) },
  { id: 'fortitude',   name: 'Resistência',   icon: '🛡️', desc: '+2 DEF por nível.',          maxLevel: 20, baseCost: 1, costMult: 1.5, effect: (lv) => ({ def: lv * 2 }) },
  { id: 'channeling',  name: 'Canalização',   icon: '🔮', desc: '+5 Mana máximo por nível.',  maxLevel: 20, baseCost: 1, costMult: 1.5, effect: (lv) => ({ maxMana: lv * 5 }) },
  { id: 'speed',       name: 'Velocidade',    icon: '⚡', desc: '+0.1 SPD por nível.',         maxLevel: 10, baseCost: 2, costMult: 2.0, effect: (lv) => ({ spd: lv * 0.1 }) },
  { id: 'loot_luck',   name: 'Sorte de Loot', icon: '🍀', desc: '+5% chance de loot por nível.',maxLevel: 10, baseCost: 2, costMult: 2.0, effect: (lv) => ({ lootBonus: lv * 0.05 }) },
  { id: 'gold_mastery',name: 'Mestre do Ouro',icon: '💰', desc: '+10% gold por nível.',       maxLevel: 10, baseCost: 2, costMult: 2.0, effect: (lv) => ({ goldBonus: lv * 0.1 }) },
  { id: 'xp_boost',    name: 'Bônus de XP',   icon: '⭐', desc: '+8% XP por nível.',          maxLevel: 10, baseCost: 3, costMult: 2.5, effect: (lv) => ({ xpBonus: lv * 0.08 }) },
];

const XP_TABLE = Array.from({ length: 100 }, (_, i) => Math.floor(100 * Math.pow(i + 1, 1.8)));

const ARENA_DIVISIONS = ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Mestre', 'Grão-Mestre'];

const BP_REWARDS = [
  { tier: 1,  icon: '💰', name: '500 Gold', type: 'gold', amount: 500 },
  { tier: 3,  icon: '⭐', name: '+2 Pts Skill', type: 'skillpts', amount: 2 },
  { tier: 5,  icon: '💎', name: '50 Rubini Coins', type: 'rubini', amount: 50 },
  { tier: 7,  icon: '🗡️', name: 'Espada Sazonal', type: 'item', itemId: 'guardian_halberd' },
  { tier: 10, icon: '💰', name: '2000 Gold', type: 'gold', amount: 2000 },
  { tier: 12, icon: '⭐', name: '+5 Pts Skill', type: 'skillpts', amount: 5 },
  { tier: 15, icon: '💎', name: '200 Rubini Coins', type: 'rubini', amount: 200 },
  { tier: 18, icon: '🛡️', name: 'Armadura Sazonal', type: 'item', itemId: 'amazon_armor' },
  { tier: 20, icon: '👑', name: 'Elmo Real', type: 'item', itemId: 'royal_helmet' },
];

// ---- GAME STATE ----

const DEFAULT_STATE = () => ({
  vocation: null,
  level: 1,
  xp: 0,
  gold: 0,
  rubini: 0,
  hp: 0,
  mana: 0,
  skillPoints: 5,
  skills: {},
  inventory: {},
  equipment: { weapon: null, armor: null, shield: null, helmet: null, ring: null },
  activeZone: null,
  hunting: false,
  taskKills: {},
  activeTask: null,
  taskCompletion: {},
  arenaPoints: 0,
  arenaWins: 0,
  arenaLosses: 0,
  arenaBattlesToday: 0,
  currentWorld: 'auroria',
  bpXp: 0,
  bpTier: 0,
  bpClaimed: [],
  totalKills: 0,
  totalGoldEarned: 0,
});

let G = DEFAULT_STATE();

// ---- DERIVED STATS ----

function getMaxHp() {
  if (!G.vocation) return 100;
  const v = VOCATIONS[G.vocation];
  const base = v.baseHp + (G.level - 1) * v.hpPerLevel;
  const bonus = skillBonus().maxHp || 0;
  const eqBonus = equipBonus().hp || 0;
  return base + bonus + eqBonus;
}

function getMaxMana() {
  if (!G.vocation) return 100;
  const v = VOCATIONS[G.vocation];
  const base = v.baseMana + (G.level - 1) * v.manaPerLevel;
  const bonus = skillBonus().maxMana || 0;
  return base + bonus;
}

function getAtk() {
  if (!G.vocation) return 0;
  const v = VOCATIONS[G.vocation];
  const base = v.baseAtk + (G.level - 1) * v.atkPerLevel;
  const sb = skillBonus().atk || 0;
  const eq = equipBonus().atk || 0;
  return base + sb + eq;
}

function getDef() {
  if (!G.vocation) return 0;
  const v = VOCATIONS[G.vocation];
  const base = v.baseDef;
  const sb = skillBonus().def || 0;
  const eq = equipBonus().def || 0;
  return base + sb + eq;
}

function getMagic() {
  if (!G.vocation) return 0;
  const v = VOCATIONS[G.vocation];
  const eq = equipBonus().magic || 0;
  return v.baseMgc + eq;
}

function getSpd() {
  if (!G.vocation) return 1;
  const v = VOCATIONS[G.vocation];
  return +(v.baseSpd + (skillBonus().spd || 0)).toFixed(2);
}

function skillBonus() {
  const totals = {};
  SKILLS_DEF.forEach(s => {
    const lv = G.skills[s.id] || 0;
    if (lv > 0) {
      const fx = s.effect(lv);
      Object.entries(fx).forEach(([k, v]) => { totals[k] = (totals[k] || 0) + v; });
    }
  });
  return totals;
}

function equipBonus() {
  const totals = {};
  Object.values(G.equipment).forEach(itemId => {
    if (!itemId) return;
    const item = ITEMS[itemId];
    if (!item) return;
    ['atk','def','magic','hp'].forEach(stat => {
      if (item[stat]) totals[stat] = (totals[stat] || 0) + item[stat];
    });
  });
  return totals;
}

function worldXpMult() {
  const world = WORLDS.find(w => w.id === G.currentWorld);
  if (!world) return 1;
  return world.id === 'auroria' ? 1.1 : world.id === 'elysian' ? 1.25 : world.id === 'mystian' ? 1.4 : 1.15;
}

function worldGoldMult() {
  const world = WORLDS.find(w => w.id === G.currentWorld);
  if (!world) return 1;
  return world.id === 'bellum' ? 1.2 : world.id === 'elysian' ? 1.15 : world.id === 'mystian' ? 1.3 : 1;
}

// ---- COMBAT ENGINE ----

let huntInterval = null;
let regenInterval = null;
let currentMonster = null;

function spawnMonster(zoneId) {
  const zone = ZONES[zoneId];
  const mId = zone.monsters[Math.floor(Math.random() * zone.monsters.length)];
  const mDef = MONSTERS[mId];
  const scaleFactor = 1 + (G.level - 1) * 0.05;
  return {
    id: mId,
    name: mDef.name,
    icon: mDef.icon,
    hp: Math.floor(mDef.hp * scaleFactor),
    maxHp: Math.floor(mDef.hp * scaleFactor),
    atk: Math.floor(mDef.atk * scaleFactor),
    def: mDef.def,
    xp: Math.floor(mDef.xp * scaleFactor),
    gold: mDef.gold,
    loot: mDef.loot,
    defKey: mId,
  };
}

function calcDamage(atk, def) {
  const base = Math.max(1, atk - Math.floor(def * 0.6));
  return Math.floor(base * (0.8 + Math.random() * 0.4));
}

function doHuntTick() {
  if (!G.hunting || !G.activeZone) return;

  if (!currentMonster) {
    currentMonster = spawnMonster(G.activeZone);
    addLog(`${currentMonster.icon} <span class="log-info">${currentMonster.name} apareceu!</span>`);
    renderMonsterDisplay();
  }

  const zone = ZONES[G.activeZone];
  const sb = skillBonus();
  const xpBonus = sb.xpBonus || 0;
  const goldBonus = sb.goldBonus || 0;
  const lootBonus = sb.lootBonus || 0;

  // Player attacks monster
  let playerDmg = calcDamage(getAtk() + getMagic(), currentMonster.def);
  // Vocation magic bonus
  if (G.vocation === 'sorcerer' || G.vocation === 'druid') {
    const manaCost = 8;
    if (G.mana >= manaCost) {
      playerDmg = Math.floor(playerDmg * 1.6);
      G.mana = Math.max(0, G.mana - manaCost);
    }
  }
  currentMonster.hp -= playerDmg;
  addLog(`⚔️ Você causou <span class="log-dmg">${playerDmg}</span> de dano ao ${currentMonster.name}.`);
  renderMonsterDisplay(true);

  // Druid self-heal chance
  if (G.vocation === 'druid' && Math.random() < 0.25 && G.mana >= 15) {
    const heal = Math.floor(getMagic() * 0.8);
    G.hp = Math.min(getMaxHp(), G.hp + heal);
    G.mana -= 15;
    addLog(`🌿 Você se curou em <span class="log-heal">${heal}</span> HP.`);
  }

  if (currentMonster.hp <= 0) {
    // Kill
    const goldGained = Math.floor((currentMonster.gold[0] + Math.random() * (currentMonster.gold[1] - currentMonster.gold[0])) * zone.goldMult * worldGoldMult() * (1 + goldBonus));
    const xpGained = Math.floor(currentMonster.xp * zone.xpMult * worldXpMult() * (1 + xpBonus));

    G.gold += goldGained;
    G.totalGoldEarned += goldGained;
    G.totalKills++;

    // Task tracking
    if (G.activeTask && G.activeTask.monster === currentMonster.defKey) {
      G.taskKills[G.activeTask.monster] = (G.taskKills[G.activeTask.monster] || 0) + 1;
    }
    // Kill counters per zone
    G.killCounters = G.killCounters || {};
    G.killCounters[currentMonster.defKey] = (G.killCounters[currentMonster.defKey] || 0) + 1;

    // Battle Pass XP
    G.bpXp += Math.floor(xpGained * 0.01);
    checkBpTier();

    addLog(`<span class="log-kill">💀 ${currentMonster.name} morreu!</span> +${xpGained} XP, +${goldGained} 💰`);

    // Loot
    const lootLine = [];
    currentMonster.loot.forEach(([itemId, chance]) => {
      if (Math.random() < chance + lootBonus) {
        addItemToInventory(itemId);
        const item = ITEMS[itemId];
        lootLine.push(`${item.icon} ${item.name}`);
      }
    });
    if (lootLine.length > 0) addLog(`<span class="log-loot">📦 Loot: ${lootLine.join(', ')}</span>`);

    gainXp(xpGained);
    currentMonster = null;
    renderMonsterDisplay();
    renderLoot();
    renderKillCounters();
    renderHeaderStats();
    renderInventory();
    checkTaskProgress();
    return;
  }

  // Monster attacks player
  const monsterDmg = calcDamage(currentMonster.atk, getDef());
  G.hp = Math.max(0, G.hp - monsterDmg);
  addLog(`🩸 ${currentMonster.name} causou <span class="log-dmg">${monsterDmg}</span> de dano em você.`);

  if (G.hp <= 0) {
    addLog(`<span class="log-kill">💔 Você morreu! Retornando ao templo...</span>`);
    G.hp = Math.floor(getMaxHp() * 0.3);
    G.xp = Math.floor(G.xp * 0.95); // 5% xp loss
    currentMonster = null;
    stopHunt();
  }

  renderBars();
  renderHeaderStats();
}

function gainXp(amount) {
  G.xp += amount;
  while (G.level < 100 && G.xp >= XP_TABLE[G.level - 1]) {
    G.xp -= XP_TABLE[G.level - 1];
    G.level++;
    G.skillPoints += 3;
    G.hp = getMaxHp();
    G.mana = getMaxMana();
    addLog(`<span class="log-xp">🎉 LEVEL UP! Você chegou ao nível ${G.level}!</span>`);
    notify(`Level Up! Nível ${G.level}`, 'success');
    checkWorldUnlocks();
    renderCharInfo();
    renderWorldsPanel();
    renderZonePicker();
  }
  renderBars();
}

function startRegen() {
  if (regenInterval) clearInterval(regenInterval);
  regenInterval = setInterval(() => {
    if (!G.vocation) return;
    const v = VOCATIONS[G.vocation];
    if (!G.hunting) {
      G.hp = Math.min(getMaxHp(), G.hp + v.hpRegen * 3);
      G.mana = Math.min(getMaxMana(), G.mana + v.manaRegen * 3);
    } else {
      G.hp = Math.min(getMaxHp(), G.hp + v.hpRegen);
      G.mana = Math.min(getMaxMana(), G.mana + v.manaRegen);
    }
    renderBars();
    renderHeaderStats();
  }, 2000);
}

// ---- MONSTER DISPLAY ----

function renderMonsterDisplay(hit = false) {
  const el = document.getElementById('monster-display');
  if (!el) return;
  if (!currentMonster) {
    el.innerHTML = G.hunting
      ? '<div class="monster-empty">Procurando próxima criatura…</div>'
      : '<div class="monster-empty">Nenhuma criatura. Inicie uma caçada!</div>';
    return;
  }
  const pct = Math.max(0, Math.round((currentMonster.hp / currentMonster.maxHp) * 100));
  el.innerHTML = `
    <div class="monster-icon${hit ? ' hit' : ''}">${currentMonster.icon}</div>
    <div class="monster-name">${currentMonster.name}</div>
    <div class="monster-hp-track">
      <div class="monster-hp-fill" style="width:${pct}%"></div>
      <div class="monster-hp-label">${Math.max(0, currentMonster.hp)} / ${currentMonster.maxHp}</div>
    </div>
  `;
}

// ---- OFFLINE PROGRESS ----

function applyOfflineProgress() {
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
  const sb = skillBonus();
  const xpGained = Math.floor(kills * avg.xp * scaleFactor * zone.xpMult * worldXpMult() * (1 + (sb.xpBonus || 0)) * 0.5);
  const goldGained = Math.floor(kills * avg.gold * scaleFactor * zone.goldMult * worldGoldMult() * (1 + (sb.goldBonus || 0)) * 0.5);

  G.gold += goldGained;
  G.totalGoldEarned += goldGained;
  G.totalKills += kills;
  G.bpXp += Math.floor(xpGained * 0.01);
  checkBpTier();
  gainXp(xpGained);

  const h = Math.floor(cappedSec / 3600), m = Math.floor((cappedSec % 3600) / 60);
  openModal(`
    <h3>🌙 Enquanto você esteve fora…</h3>
    <p>Seu personagem continuou caçando em <strong>${zone.icon} ${zone.name}</strong> por <strong>${h}h ${m}min</strong>.</p>
    <div class="item-detail-stats">
      💀 Criaturas abatidas: <span>${kills.toLocaleString()}</span><br/>
      ⭐ Experiência ganha: <span>${xpGained.toLocaleString()}</span><br/>
      💰 Gold coletado: <span>${goldGained.toLocaleString()}</span>
    </div>
  `);
}

// ---- UI HELPERS ----

function addLog(html) {
  const log = document.getElementById('combat-log');
  const line = document.createElement('div');
  line.innerHTML = html;
  log.appendChild(line);
  // keep last 80 lines
  while (log.children.length > 80) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
}

function notify(msg, type = 'info') {
  const area = document.getElementById('notif-area');
  const el = document.createElement('div');
  el.className = `notif ${type}`;
  el.textContent = msg;
  area.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

// ---- VOCATION ----

function selectVocation(voc) {
  if (G.vocation) return;
  G.vocation = voc;
  const v = VOCATIONS[voc];
  G.hp = v.baseHp;
  G.mana = v.baseMana;
  renderCharPanel();
  startRegen();
  saveGame();
  notify(`Vocação ${v.name} escolhida!`, 'success');
}

// ---- ZONE ----

function renderZonePicker() {
  const picker = document.getElementById('zone-picker');
  if (!picker) return;
  picker.innerHTML = '';
  Object.entries(ZONES).forEach(([id, z]) => {
    if (z.worldReq !== G.currentWorld) return;
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `${z.icon} ${z.name} (Lv${z.minLevel}+)`;
    opt.disabled = G.level < z.minLevel;
    picker.appendChild(opt);
  });
  // auto-select first valid
  const valid = Object.entries(ZONES).find(([id, z]) => z.worldReq === G.currentWorld && G.level >= z.minLevel);
  if (valid) { picker.value = valid[0]; G.activeZone = valid[0]; }
}

function selectZone(val) {
  G.activeZone = val;
  if (G.hunting) { stopHunt(); startHunt(); }
}

function toggleHunt() {
  if (G.hunting) stopHunt(); else startHunt();
}

function startHunt() {
  if (!G.vocation) { notify('Escolha uma vocação primeiro!', 'error'); return; }
  if (!G.activeZone) { notify('Selecione uma zona de caça!', 'error'); return; }
  const zone = ZONES[G.activeZone];
  if (G.level < zone.minLevel) { notify(`Nível mínimo: ${zone.minLevel}`, 'error'); return; }
  G.hunting = true;
  const btn = document.getElementById('hunt-toggle');
  btn.textContent = '⏹ Parar Caçada';
  btn.classList.add('stop');
  addLog(`<span class="log-info">🗺️ Entrando em ${zone.icon} ${zone.name}...</span>`);
  huntInterval = setInterval(doHuntTick, Math.max(400, 1200 / getSpd()));
}

function stopHunt() {
  G.hunting = false;
  if (huntInterval) { clearInterval(huntInterval); huntInterval = null; }
  currentMonster = null;
  const btn = document.getElementById('hunt-toggle');
  if (btn) { btn.textContent = '▶ Iniciar Caçada'; btn.classList.remove('stop'); }
  addLog('<span class="log-info">⏸ Caçada pausada.</span>');
}

// ---- INVENTORY ----

function addItemToInventory(itemId) {
  G.inventory[itemId] = (G.inventory[itemId] || 0) + 1;
}

function renderInventory() {
  const grid = document.getElementById('inventory-grid');
  if (!grid) return;
  grid.innerHTML = '';
  Object.entries(G.inventory).forEach(([id, qty]) => {
    if (qty <= 0) return;
    const item = ITEMS[id];
    if (!item) return;
    const div = document.createElement('div');
    div.className = `inv-item${item.rare ? ' rare' : ''}`;
    div.innerHTML = `<div class="item-qty">${qty}</div><div class="item-icon">${item.icon}</div><div class="item-name">${item.name}</div>`;
    div.onclick = () => openItemModal(id);
    grid.appendChild(div);
  });

  renderEquipmentSlots();
}

function openItemModal(itemId) {
  const item = ITEMS[itemId];
  const qty = G.inventory[itemId] || 0;
  const stats = ['atk','def','magic','heal'].filter(s => item[s]).map(s => `<span>${s.toUpperCase()} +${item[s]}</span>`).join(' | ');
  const isEquippable = ['weapon','armor','shield','helmet','ring'].includes(item.type);
  const equipped = Object.values(G.equipment).includes(itemId);
  openModal(`
    <h3>${item.icon} ${item.name}</h3>
    <p>${item.type} — Qtd: ${qty}</p>
    <div class="item-detail-stats">${stats}</div>
    <p style="margin-top:8px; color:#6272a4; font-size:12px">Venda: ${item.sell} 💰</p>
    ${isEquippable && !equipped ? `<button onclick="equipItem('${itemId}')" style="margin-top:8px;background:#c45c1a;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%;font-weight:700">Equipar</button>` : ''}
    ${equipped ? `<button onclick="unequipItem('${itemId}')" style="margin-top:8px;background:#6272a4;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%">Desequipar</button>` : ''}
    <button onclick="sellItem('${itemId}')" style="margin-top:6px;background:#2ecc71;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%">Vender (${item.sell} 💰)</button>
  `);
}

function equipItem(itemId) {
  const item = ITEMS[itemId];
  const slot = item.type;
  G.equipment[slot] = itemId;
  closeModal();
  renderInventory();
  renderCharInfo();
  notify(`${item.name} equipado!`, 'success');
  saveGame();
}

function unequipItem(itemId) {
  const item = ITEMS[itemId];
  G.equipment[item.type] = null;
  closeModal();
  renderInventory();
  renderCharInfo();
  notify(`${item.name} desequipado.`);
  saveGame();
}

function sellItem(itemId) {
  const item = ITEMS[itemId];
  const qty = G.inventory[itemId] || 0;
  if (qty <= 0) return;
  G.gold += item.sell;
  G.inventory[itemId]--;
  if (G.inventory[itemId] <= 0) delete G.inventory[itemId];
  closeModal();
  renderInventory();
  renderHeaderStats();
  notify(`Vendido ${item.name} por ${item.sell} 💰`, 'success');
  saveGame();
}

function renderEquipmentSlots() {
  const area = document.getElementById('equipment-slots');
  if (!area) return;
  const slots = ['weapon','armor','shield','helmet','ring'];
  const labels = { weapon:'Arma', armor:'Armadura', shield:'Escudo', helmet:'Elmo', ring:'Anel' };
  area.innerHTML = slots.map(slot => {
    const itemId = G.equipment[slot];
    const item = itemId ? ITEMS[itemId] : null;
    return `<div class="equip-slot ${item ? 'filled' : ''}" onclick="${item ? `openItemModal('${itemId}')` : ''}">
      <div class="equip-slot-name">${labels[slot]}</div>
      ${item ? `<div class="equip-slot-icon">${item.icon}</div><div class="equip-slot-item">${item.name}</div>` : '<div style="color:#6272a4;font-size:11px;margin-top:10px">Vazio</div>'}
    </div>`;
  }).join('');
}

function renderLoot() {
  const area = document.getElementById('loot-display');
  const card = document.getElementById('loot-card');
  if (!area || !card) return;
  card.style.display = 'block';
  // show last 12 unique items
  const items = Object.entries(G.inventory).slice(-12);
  area.innerHTML = items.map(([id, qty]) => {
    const item = ITEMS[id];
    return `<div class="loot-item ${item?.rare ? 'rare' : ''}" title="${item?.name}">${item?.icon || '?'} x${qty}</div>`;
  }).join('');
}

function renderKillCounters() {
  const area = document.getElementById('kill-counters');
  if (!area) return;
  const counters = G.killCounters || {};
  area.innerHTML = Object.entries(counters).map(([id, n]) => {
    const m = MONSTERS[id];
    return `<div class="kill-pill">${m?.icon || ''} ${m?.name || id}: <span>${n}</span></div>`;
  }).join('');
}

// ---- CHAR PANEL ----

function renderCharPanel() {
  const vocSel = document.getElementById('vocation-select');
  const charInfo = document.getElementById('char-info');
  if (G.vocation) {
    vocSel.style.display = 'none';
    charInfo.style.display = 'block';
    renderCharInfo();
    renderZonePicker();
  } else {
    vocSel.style.display = 'grid';
    charInfo.style.display = 'none';
  }
}

function renderCharInfo() {
  if (!G.vocation) return;
  const v = VOCATIONS[G.vocation];
  document.getElementById('char-voc-icon').textContent = v.icon;
  document.getElementById('char-voc-name').textContent = v.name;
  document.getElementById('char-level').textContent = G.level;
  document.getElementById('char-xp').textContent = G.xp;
  document.getElementById('char-xp-next').textContent = XP_TABLE[G.level - 1] || '---';
  document.getElementById('stat-atk').textContent = getAtk() + getMagic();
  document.getElementById('stat-def').textContent = getDef();
  document.getElementById('stat-spd').textContent = getSpd().toFixed(1);
  document.getElementById('stat-magic').textContent = getMagic();
  renderBars();
}

function renderBars() {
  if (!G.vocation) return;
  const maxHp = getMaxHp(), maxMana = getMaxMana();
  const hpPct = Math.round((G.hp / maxHp) * 100);
  const manaPct = Math.round((G.mana / maxMana) * 100);
  const xpPct = G.level < 100 ? Math.round((G.xp / XP_TABLE[G.level - 1]) * 100) : 100;

  document.getElementById('hp-bar').style.width = hpPct + '%';
  document.getElementById('mana-bar').style.width = manaPct + '%';
  document.getElementById('xp-bar').style.width = xpPct + '%';
  document.getElementById('hp-text').textContent = `${G.hp}/${maxHp}`;
  document.getElementById('mana-text').textContent = `${G.mana}/${maxMana}`;
  document.getElementById('xp-text').textContent = xpPct + '%';
}

function renderHeaderStats() {
  document.getElementById('hdr-level').textContent = G.level;
  document.getElementById('hdr-gold').textContent = formatNum(G.gold);
  document.getElementById('hdr-rubini').textContent = formatNum(G.rubini);
  if (G.vocation) {
    document.getElementById('hdr-hp').textContent = `${G.hp}/${getMaxHp()}`;
    document.getElementById('hdr-mana').textContent = `${G.mana}/${getMaxMana()}`;
  }
}

function formatNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n;
}

// ---- TASKS ----

function renderTasksPanel() {
  const roomsEl = document.getElementById('task-rooms');
  roomsEl.innerHTML = TASK_ROOMS.map(room => `
    <div class="task-room">
      <h4>${room.icon} ${room.name}</h4>
      ${room.monsters.map(mId => {
        const m = MONSTERS[mId];
        const kills = G.taskKills[mId] || 0;
        const required = room.required;
        const done = (G.taskCompletion[mId] || 0);
        const isActive = G.activeTask?.monster === mId;
        const pct = Math.min(100, Math.round((kills / required) * 100));
        return `<div class="task-entry">
          <span class="task-name">${m.icon} ${m.name} (${kills}/${required})</span>
          <span class="task-status">${done}x completo</span>
          <button class="task-btn ${isActive ? 'done' : ''}" onclick="startTask('${mId}', ${required})" ${isActive ? 'disabled' : ''}>
            ${isActive ? '✓ Ativo' : 'Iniciar'}
          </button>
        </div>`;
      }).join('')}
    </div>
  `).join('');

  renderActiveTask();
}

function startTask(monsterId, required) {
  if (G.activeTask) { notify('Cancele a tarefa atual primeiro.', 'error'); return; }
  G.activeTask = { monster: monsterId, required, started: Date.now() };
  G.taskKills[monsterId] = G.taskKills[monsterId] || 0;
  notify(`Tarefa iniciada: matar ${required}x ${MONSTERS[monsterId].name}`, 'success');
  renderTasksPanel();
  saveGame();
}

function checkTaskProgress() {
  if (!G.activeTask) return;
  const { monster, required } = G.activeTask;
  const kills = G.taskKills[monster] || 0;
  if (kills >= required) {
    G.taskCompletion[monster] = (G.taskCompletion[monster] || 0) + 1;
    const bonus = required * 5;
    const xpBonus = required * 20;
    G.gold += bonus;
    gainXp(xpBonus);
    G.rubini += 10;
    notify(`✅ Tarefa completa! +${bonus} 💰, +${xpBonus} XP, +10 RC`, 'success');
    G.taskKills[monster] = 0;
    G.activeTask = null;
    renderTasksPanel();
    renderHeaderStats();
    saveGame();
  }
  renderActiveTask();
}

function renderActiveTask() {
  const el = document.getElementById('active-task-display');
  if (!G.activeTask) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  const { monster, required } = G.activeTask;
  const kills = G.taskKills[monster] || 0;
  const pct = Math.min(100, Math.round((kills / required) * 100));
  const m = MONSTERS[monster];
  el.innerHTML = `
    <div class="active-task-header">📋 Tarefa Ativa: ${m.icon} ${m.name}</div>
    <div>${kills} / ${required} mortes (${pct}%)</div>
    <div class="task-progress-bar-track"><div class="task-progress-bar" style="width:${pct}%"></div></div>
    <button onclick="cancelTask()" style="margin-top:6px;background:#e74c3c;border:none;color:#fff;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px">Cancelar Tarefa</button>
  `;
}

function cancelTask() {
  G.activeTask = null;
  renderTasksPanel();
  notify('Tarefa cancelada.', 'error');
  saveGame();
}

// ---- SKILLS ----

function renderSkillsPanel() {
  const pts = document.getElementById('skill-points-display');
  pts.innerHTML = `<strong>Pontos de Habilidade disponíveis: <span style="color:var(--accent)">${G.skillPoints}</span></strong> (Ganhe 3 por level up)`;

  const grid = document.getElementById('skills-grid');
  grid.innerHTML = SKILLS_DEF.map(s => {
    const lv = G.skills[s.id] || 0;
    const cost = Math.ceil(s.baseCost * Math.pow(s.costMult, lv));
    const maxed = lv >= s.maxLevel;
    const canAfford = G.skillPoints >= cost;
    const fx = s.effect(lv);
    const fxText = Object.entries(fx).map(([k, v]) => `+${typeof v === 'number' ? (v % 1 ? v.toFixed(2) : v) : v} ${k}`).join(', ');
    return `<div class="skill-card">
      <div class="skill-card-header">
        <span class="skill-card-name">${s.icon} ${s.name}</span>
        <span class="skill-card-level">Lv ${lv}/${s.maxLevel}</span>
      </div>
      <div class="skill-card-desc">${s.desc}</div>
      ${lv > 0 ? `<div class="skill-card-cost" style="color:var(--green)">Atual: ${fxText}</div>` : ''}
      <div class="skill-card-cost">Próximo: ${maxed ? 'MAX' : `${cost} pts`}</div>
      <button class="skill-upgrade-btn" onclick="upgradeSkill('${s.id}')" ${maxed || !canAfford ? 'disabled' : ''}>
        ${maxed ? '✓ Máximo' : canAfford ? `Melhorar (${cost} pts)` : `Insuficiente (${cost} pts)`}
      </button>
    </div>`;
  }).join('');
}

function upgradeSkill(id) {
  const s = SKILLS_DEF.find(x => x.id === id);
  const lv = G.skills[id] || 0;
  const cost = Math.ceil(s.baseCost * Math.pow(s.costMult, lv));
  if (G.skillPoints < cost || lv >= s.maxLevel) return;
  G.skillPoints -= cost;
  G.skills[id] = lv + 1;
  renderSkillsPanel();
  renderCharInfo();
  notify(`${s.name} melhorada para nível ${lv + 1}!`, 'success');
  saveGame();
}

// ---- ARENA ----

function renderArenaPanel() {
  const divIndex = Math.min(ARENA_DIVISIONS.length - 1, Math.floor(G.arenaPoints / 100));
  const division = ARENA_DIVISIONS[divIndex];

  document.getElementById('arena-info').innerHTML = `
    <div class="arena-stat"><div class="arena-stat-val">${division}</div><div class="arena-stat-lbl">Divisão</div></div>
    <div class="arena-stat"><div class="arena-stat-val">${G.arenaPoints}</div><div class="arena-stat-lbl">Pontos Prestige</div></div>
    <div class="arena-stat"><div class="arena-stat-val">${G.arenaWins}</div><div class="arena-stat-lbl">Vitórias</div></div>
    <div class="arena-stat"><div class="arena-stat-val">${G.arenaLosses}</div><div class="arena-stat-lbl">Derrotas</div></div>
  `;

  const locked = G.level < 30;
  document.getElementById('arena-battle-area').innerHTML = locked
    ? `<p style="color:var(--muted);text-align:center;padding:20px">🔒 Arena requer Nível 30+. (Você está no nível ${G.level})</p>`
    : `
      <div class="arena-vs">
        <div class="arena-fighter">
          <div class="arena-fighter-name">${G.vocation ? VOCATIONS[G.vocation].icon : '⚔️'} Você</div>
          <div style="font-size:12px;color:var(--muted)">Lv ${G.level} — ${G.arenaPoints} pts</div>
          <div class="bar-row" style="margin-top:8px"><div class="bar-track" style="flex:1"><div class="bar hp-bar" style="width:100%"></div></div></div>
        </div>
        <div class="arena-vs-sep">VS</div>
        <div class="arena-fighter enemy">
          <div class="arena-fighter-name" id="arena-enemy-name">???</div>
          <div style="font-size:12px;color:var(--muted)" id="arena-enemy-info">Aguardando...</div>
        </div>
      </div>
      <button class="arena-btn" onclick="startArenaBattle()">⚔️ Buscar Batalha</button>
      <div class="arena-log" id="arena-log"></div>
    `;
}

function startArenaBattle() {
  const names = ['Zothrak', 'Sylvara', 'Drakonis', 'Morghul', 'Velindra', 'Thordak', 'Nyxara'];
  const enemyName = names[Math.floor(Math.random() * names.length)];
  const enemyLevel = G.level + Math.floor(Math.random() * 5) - 2;
  const enemyPts = Math.max(0, G.arenaPoints + Math.floor(Math.random() * 30) - 15);
  const enemyAtk = getAtk() * (0.7 + Math.random() * 0.6);
  const enemyHp = getMaxHp() * (0.8 + Math.random() * 0.4);

  document.getElementById('arena-enemy-name').textContent = `⚔️ ${enemyName}`;
  document.getElementById('arena-enemy-info').textContent = `Lv ${enemyLevel} — ${enemyPts} pts`;

  const alog = document.getElementById('arena-log');
  alog.innerHTML = '';
  const addALog = (html) => { alog.innerHTML += `<div>${html}</div>`; alog.scrollTop = alog.scrollHeight; };

  // Simulate best-of-2
  let wins = 0, losses = 0;
  let playerHp = getMaxHp(), eHp = enemyHp;

  addALog(`<span style="color:var(--purple)">⚔️ Arena: Você vs ${enemyName}</span>`);

  for (let round = 1; round <= 2; round++) {
    playerHp = getMaxHp(); eHp = enemyHp;
    addALog(`<span style="color:var(--muted)">— Round ${round} —</span>`);
    for (let t = 0; t < 30; t++) {
      const pd = Math.max(1, Math.floor((getAtk() + getMagic()) * (0.8 + Math.random() * 0.4) - getDef() * 0.3));
      const ed = Math.max(1, Math.floor(enemyAtk * (0.8 + Math.random() * 0.4) - getDef() * 0.5));
      eHp -= pd; playerHp -= ed;
      if (eHp <= 0) { addALog(`<span class="log-heal">✅ Round ${round}: Você venceu!</span>`); wins++; break; }
      if (playerHp <= 0) { addALog(`<span class="log-dmg">❌ Round ${round}: Você foi derrotado.</span>`); losses++; break; }
    }
    if (wins > losses && round === 1) { addALog('<span style="color:var(--muted)">— Fim dos rounds —</span>'); break; }
  }

  const won = wins > losses;
  const ptsDelta = won ? Math.floor(15 + Math.random() * 10) : -Math.floor(8 + Math.random() * 7);
  G.arenaPoints = Math.max(0, G.arenaPoints + ptsDelta);
  if (won) { G.arenaWins++; G.rubini += 25; addALog(`<span class="log-kill">🏆 Vitória! +${ptsDelta} pts, +25 Rubini Coins</span>`); notify('Vitória na Arena! +25 RC', 'success'); }
  else { G.arenaLosses++; addALog(`<span class="log-dmg">💔 Derrota. ${ptsDelta} pts</span>`); notify('Derrota na Arena.', 'error'); }

  G.arenaPoints = Math.max(0, G.arenaPoints);
  renderArenaPanel();
  renderHeaderStats();
  saveGame();
}

// ---- WORLDS ----

function renderWorldsPanel() {
  const grid = document.getElementById('worlds-grid');
  grid.innerHTML = WORLDS.map(w => {
    const unlocked = G.level >= w.reqLevel;
    const active = G.currentWorld === w.id;
    return `<div class="world-card ${active ? 'active-world' : ''} ${!unlocked ? 'locked' : ''}" onclick="${unlocked ? `selectWorld('${w.id}')` : ''}">
      <div class="world-icon">${w.icon}</div>
      <div class="world-name">${w.name} ${active ? '✓' : ''}</div>
      <div class="world-type">${w.type} — ${w.players.toLocaleString()} jogadores</div>
      <div class="world-bonus">🎁 ${w.bonus}</div>
      ${!unlocked ? `<div class="world-req">🔒 Requer Nível ${w.reqLevel}</div>` : ''}
    </div>`;
  }).join('');
}

function selectWorld(worldId) {
  const world = WORLDS.find(w => w.id === worldId);
  if (!world || G.level < world.reqLevel) return;
  if (G.hunting) stopHunt();
  G.currentWorld = worldId;
  currentMonster = null;
  renderWorldsPanel();
  renderZonePicker();
  notify(`Viajou para ${world.name}!`, 'success');
  addLog(`<span class="log-info">🌍 Viajando para ${world.icon} ${world.name}...</span>`);
  saveGame();
}

function checkWorldUnlocks() {
  WORLDS.forEach(w => {
    if (G.level >= w.reqLevel && !w._notified) {
      w._notified = true;
      notify(`🌍 Mundo desbloqueado: ${w.name}!`, 'success');
    }
  });
}

// ---- BATTLE PASS ----

const BP_XP_PER_TIER = 500;

function checkBpTier() {
  const newTier = Math.floor(G.bpXp / BP_XP_PER_TIER);
  if (newTier > G.bpTier) {
    G.bpTier = newTier;
    notify(`🎖️ Battle Pass: Tier ${G.bpTier} alcançado!`, 'success');
  }
}

function renderBattlePassPanel() {
  const xpInTier = G.bpXp % BP_XP_PER_TIER;
  const pct = Math.round((xpInTier / BP_XP_PER_TIER) * 100);

  document.getElementById('bp-progress-area').innerHTML = `
    <div><strong>Tier Atual: <span style="color:var(--accent)">${G.bpTier}</span></strong></div>
    <div class="bp-xp-row">
      <span style="font-size:12px;color:var(--muted)">${xpInTier}/${BP_XP_PER_TIER} XP</span>
      <div class="bp-xp-bar-track"><div class="bp-xp-bar" style="width:${pct}%"></div></div>
      <span style="font-size:12px;color:var(--muted)">${pct}%</span>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-top:4px">XP do Battle Pass ganho ao matar monstros.</div>
  `;

  const track = document.getElementById('bp-rewards-track');
  track.innerHTML = BP_REWARDS.map(r => {
    const claimed = G.bpClaimed.includes(r.tier);
    const available = G.bpTier >= r.tier && !claimed;
    return `<div class="bp-reward ${claimed ? 'claimed' : ''} ${available ? 'available' : ''}">
      <div class="bp-reward-tier">Tier ${r.tier}</div>
      <div class="bp-reward-icon">${r.icon}</div>
      <div class="bp-reward-name">${r.name}</div>
      <button class="bp-claim-btn" onclick="claimBpReward(${r.tier})" ${!available ? 'disabled' : ''}>
        ${claimed ? '✓' : available ? 'Coletar' : '🔒'}
      </button>
    </div>`;
  }).join('');
}

function claimBpReward(tier) {
  const r = BP_REWARDS.find(x => x.tier === tier);
  if (!r || G.bpTier < tier || G.bpClaimed.includes(tier)) return;
  G.bpClaimed.push(tier);
  if (r.type === 'gold') { G.gold += r.amount; notify(`+${r.amount} 💰 coletado!`, 'success'); }
  if (r.type === 'rubini') { G.rubini += r.amount; notify(`+${r.amount} Rubini Coins!`, 'success'); }
  if (r.type === 'skillpts') { G.skillPoints += r.amount; notify(`+${r.amount} pontos de habilidade!`, 'success'); }
  if (r.type === 'item') { addItemToInventory(r.itemId); notify(`Item recebido: ${ITEMS[r.itemId]?.name}!`, 'success'); }
  renderBattlePassPanel();
  renderHeaderStats();
  saveGame();
}

// ---- TABS ----

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    // Render on switch
    const t = tab.dataset.tab;
    if (t === 'tasks') renderTasksPanel();
    if (t === 'skills') renderSkillsPanel();
    if (t === 'arena') renderArenaPanel();
    if (t === 'inventory') renderInventory();
    if (t === 'worlds') renderWorldsPanel();
    if (t === 'battlepass') renderBattlePassPanel();
  });
});

// ---- SAVE / LOAD ----

function saveGame() {
  G.lastSave = Date.now();
  G.wasHunting = G.hunting;
  localStorage.setItem('rubinot_idle_v1', JSON.stringify(G));
}

function loadGame() {
  const saved = localStorage.getItem('rubinot_idle_v1');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      G = { ...DEFAULT_STATE(), ...parsed };
      // migração: zona/tarefa de versões antigas do bestiário
      if (G.activeZone && !ZONES[G.activeZone]) G.activeZone = null;
      if (G.activeTask && !MONSTERS[G.activeTask.monster]) G.activeTask = null;
      // Clamp hp/mana to max on load
      if (G.vocation) {
        G.hp = Math.min(G.hp, getMaxHp());
        G.mana = Math.min(G.mana, getMaxMana());
      }
    } catch(e) { G = DEFAULT_STATE(); }
  }
}

function confirmReset() {
  if (confirm('Tem certeza? Todo o progresso será perdido!')) {
    localStorage.removeItem('rubinot_idle_v1');
    location.reload();
  }
}

// ---- AUTO-SAVE ----
setInterval(saveGame, 30000);

// ---- INIT ----

loadGame();
G.hunting = false; // caçada nunca retoma sozinha — o ganho offline cobre o intervalo
applyOfflineProgress();
renderCharPanel();
renderHeaderStats();
renderMonsterDisplay();
checkWorldUnlocks();
startRegen();
addLog('<span class="log-info">⚔️ Bem-vindo ao Rubinot Idle! Escolha sua vocação para começar.</span>');

if (G.vocation) {
  addLog(`<span class="log-info">Partida carregada — ${VOCATIONS[G.vocation].name} Nível ${G.level}</span>`);
}
