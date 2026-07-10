// Bestiário e zonas de caça — dados puros do jogo, sem sprite/URL (isso é
// infraestrutura, ver src/infrastructure/tibiaSprites.js) e sem DOM.

// "theme" [cor de cima, cor de baixo] dá um cenário próprio pra cada dungeon
// na cena de batalha — sem depender de imagem hotlinkada (nenhuma fonte
// confiável de screenshot por zona), então é uma paleta de gradiente coerente
// com o bioma/clima de cada uma.
export const ZONES = {
  rotworm_cave:  { name: 'Caverna de Rotworms', icon: '🪱', minLevel: 1,  worldReq: 'auroria', monsters: ['rotworm', 'cave_rat'], goldMult: 1.0, xpMult: 1.0, theme: ['#5a4a35', '#2e2419'] },
  goblin_village:{ name: 'Vila Goblin', icon: '👺', minLevel: 3,  worldReq: 'auroria', monsters: ['goblin', 'troll'], goldMult: 1.1, xpMult: 1.1, theme: ['#5c6b3a', '#33401f'] },
  dwarf_mines:   { name: 'Minas dos Dwarfs', icon: '⛏️', minLevel: 6,  worldReq: 'auroria', monsters: ['dwarf', 'orc'], goldMult: 1.3, xpMult: 1.25, theme: ['#6b5a44', '#3a2f22'] },
  elf_woods:     { name: 'Bosque Élfico', icon: '🧝', minLevel: 10, worldReq: 'auroria', monsters: ['elf', 'dworc'], goldMult: 1.4, xpMult: 1.35, theme: ['#3f7052', '#1e3d2b'] },
  cyclops_camp:  { name: 'Acampamento Cyclops', icon: '🗿', minLevel: 14, worldReq: 'auroria', monsters: ['cyclops', 'minotaur'], goldMult: 1.5, xpMult: 1.4, theme: ['#8a6a4a', '#4a3524'] },
  amazon_camp:   { name: 'Acampamento Amazona', icon: '🏹', minLevel: 15, worldReq: 'auroria', monsters: ['amazon', 'valkyrie'], goldMult: 1.8, xpMult: 1.6, theme: ['#5e7d3f', '#2e4a1f'] },
  scarab_desert: { name: 'Deserto dos Scarabs', icon: '🪲', minLevel: 18, worldReq: 'auroria', monsters: ['scarab', 'mutated_human'], goldMult: 2.0, xpMult: 1.8, theme: ['#c9a35c', '#8a6a30'] },
  spider_lair:   { name: 'Ninho de Giant Spiders', icon: '🕷️', minLevel: 22, worldReq: 'spectrum', monsters: ['giant_spider', 'tarantula'], goldMult: 2.2, xpMult: 2.0, theme: ['#4a3a5c', '#1c1526'] },
  dragon_lair:   { name: 'Covil dos Dragões', icon: '🔥', minLevel: 30, worldReq: 'bellum',  monsters: ['dragon', 'dragon_lord'], goldMult: 3.0, xpMult: 2.5, theme: ['#a53d2b', '#4a1810'] },
  frost_peak:    { name: 'Pico Congelado', icon: '🧊', minLevel: 35, worldReq: 'bellum',  monsters: ['frost_dragon', 'warlock'], goldMult: 3.5, xpMult: 3.0, theme: ['#6fa3c9', '#294a63'] },
  undead_crypt:  { name: 'Cripta Profana', icon: '🦴', minLevel: 40, worldReq: 'elysian', monsters: ['bonebeast', 'banshee', 'vampire'], goldMult: 3.8, xpMult: 3.3, theme: ['#5a5560', '#211f28'] },
  lich_lair:     { name: 'Cripta dos Liches', icon: '☠️', minLevel: 48, worldReq: 'elysian', monsters: ['lich', 'grim_reaper', 'undead_dragon'], goldMult: 4.0, xpMult: 3.5, theme: ['#4a3a63', '#1a1424'] },
  hydra_swamp:   { name: 'Pântano das Hydras', icon: '🐍', minLevel: 45, worldReq: 'solarian', monsters: ['hydra', 'medusa'], goldMult: 4.2, xpMult: 3.8, theme: ['#3c6b5e', '#173a30'] },
  demon_fortress:{ name: 'Fortaleza Demoníaca', icon: '💀', minLevel: 55, worldReq: 'elysian', monsters: ['demon', 'fury', 'hellhound'], goldMult: 5.0, xpMult: 4.0, theme: ['#7a1f1f', '#2b0a0a'] },
  hell_gate:     { name: 'Portão do Inferno', icon: '🔥', minLevel: 60, worldReq: 'mystian', monsters: ['juggernaut', 'plaguesmith', 'behemoth'], goldMult: 6.0, xpMult: 5.0, theme: ['#a52a1f', '#1f0a08'] },
  boss_sanctum:  { name: 'Santuário dos Bosses', icon: '🌀', minLevel: 70, worldReq: 'mystian', monsters: ['lothlorien', 'executioner', 'morgul', 'corrupted_one', 'nzoth'], goldMult: 8.0, xpMult: 6.0, theme: ['#6b4a9c', '#2a1a42'] },
};

export const MONSTERS = {
  // --- Bestiário clássico de Tibia (o mundo do RubinOT) ---
  cave_rat:      { name: 'Cave Rat', icon: '🐀', hp: 15,  atk: 3,  def: 1,  xp: 8,   gold: [0,2],   loot: [['cheese',0.4],['rat_tail',0.7]] },
  goblin:        { name: 'Goblin', icon: '👺', hp: 25,  atk: 5,  def: 2,  xp: 12,  gold: [1,4],   loot: [['goblin_ear',0.5],['bones',0.3]] },
  dwarf:         { name: 'Dwarf', icon: '⛏️', hp: 90,  atk: 12, def: 5,  xp: 45,  gold: [3,10],  loot: [['dwarven_ring',0.02],['studded_armor',0.05]] },
  elf:           { name: 'Elf', icon: '🧝', hp: 100, atk: 14, def: 4,  xp: 42,  gold: [3,9],   loot: [['elvish_talisman',0.3],['power_bolt',0.4]] },
  dworc:         { name: 'Dworc Voodoomaster', icon: '🌀', hp: 85,  atk: 13, def: 4,  xp: 40,  gold: [2,8],   loot: [['orc_tooth',0.4],['spider_fangs',0.2]] },
  scarab:        { name: 'Scarab', icon: '🪲', hp: 320, atk: 28, def: 12, xp: 120, gold: [8,25],  loot: [['scarab_coin',0.3],['meat',0.4]] },
  mutated_human: { name: 'Mutated Human', icon: '🧟', hp: 240, atk: 25, def: 8,  xp: 150, gold: [10,28], loot: [['mutated_flesh',0.5],['studded_armor',0.04]] },
  frost_dragon:  { name: 'Frost Dragon', icon: '🧊', hp: 1800,atk: 115,def: 35, xp: 2100,gold: [90,190], loot: [['ice_rapier',0.02],['dragon_scale',0.4],['life_crystal',0.3]] },
  warlock:       { name: 'Warlock', icon: '🧙', hp: 3500,atk: 145,def: 40, xp: 4000,gold: [140,280],loot: [['skull_staff',0.03],['demon_dust',0.3],['crystal_coin',0.03],['boots_of_haste',0.004]] },
  bonebeast:     { name: 'Bonebeast', icon: '🦴', hp: 515, atk: 60, def: 22, xp: 580, gold: [30,80],  loot: [['bones',0.9],['plate_legs',0.03]] },
  banshee:       { name: 'Banshee', icon: '👤', hp: 1000,atk: 85, def: 28, xp: 900, gold: [50,120], loot: [['life_crystal',0.2],['death_ring',0.01]] },
  vampire:       { name: 'Vampire', icon: '🧛', hp: 475, atk: 55, def: 20, xp: 305, gold: [25,70],  loot: [['vampire_dust',0.4],['strange_helmet',0.01]] },
  grim_reaper:   { name: 'Grim Reaper', icon: '⚰️', hp: 3900,atk: 155,def: 45, xp: 5500,gold: [150,320],loot: [['demon_dust',0.5],['death_ring',0.03],['crystal_coin',0.05]] },
  fury:          { name: 'Fury', icon: '😡', hp: 4100,atk: 165,def: 42, xp: 4500,gold: [150,300],loot: [['demon_dust',0.4],['titan_axe',0.005],['platinum_coin',0.6]] },
  hellhound:     { name: 'Hellhound', icon: '🐕', hp: 7500,atk: 185,def: 50, xp: 6800,gold: [180,380],loot: [['hellhound_slobber',0.3],['demon_dust',0.5],['crystal_coin',0.08]] },
  plaguesmith:   { name: 'Plaguesmith', icon: '🔨', hp: 8250,atk: 175,def: 55, xp: 3555,gold: [160,340],loot: [['behemoth_claw',0.2],['giant_sword',0.008],['platinum_coin',0.7]] },
  rotworm:       { name: 'Rotworm', icon: '🪱', hp: 35,  atk: 6,  def: 2,  xp: 18,  gold: [1,5],   loot: [['meat',0.7],['worm_dirt',0.5]] },
  troll:         { name: 'Troll', icon: '👹', hp: 50,  atk: 7,  def: 3,  xp: 25,  gold: [2,6],   loot: [['bones',0.9],['troll_club',0.1],['leather_boots',0.12]] },
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
