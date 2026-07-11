// Bestiário e zonas de caça — dados puros do jogo, sem sprite/URL (isso é
// infraestrutura, ver src/infrastructure/tibiaSprites.js) e sem DOM.

// "theme" [cor de cima, cor de baixo] dá um cenário próprio pra cada dungeon
// na cena de batalha — sem depender de imagem hotlinkada (nenhuma fonte
// confiável de screenshot por zona), então é uma paleta de gradiente coerente
// com o bioma/clima de cada uma.
export const ZONES = {
  // --- Auroria (mundo inicial, sempre desbloqueado) ---
  rotworm_cave:  { name: 'Caverna de Rotworms', icon: '🪱', minLevel: 1,  worldReq: 'auroria', monsters: ['rotworm', 'cave_rat'], goldMult: 1.0, xpMult: 1.0, theme: ['#5a4a35', '#2e2419'], boss: 'rotworm' },
  sewer_rats:    { name: 'Esgoto de Ratos', icon: '🐁', minLevel: 2,  worldReq: 'auroria', monsters: ['bug', 'rat'], goldMult: 1.02, xpMult: 1.02, theme: ['#4a4234', '#231f18'], boss: 'rat', requiresBossOf: 'rotworm_cave' },
  goblin_village:{ name: 'Vila Goblin', icon: '👺', minLevel: 3,  worldReq: 'auroria', monsters: ['goblin', 'troll'], goldMult: 1.1, xpMult: 1.1, theme: ['#5c6b3a', '#33401f'], boss: 'troll', requiresBossOf: 'sewer_rats' },
  swamp_slimes:  { name: 'Charco das Cobras', icon: '🟢', minLevel: 5,  worldReq: 'auroria', monsters: ['slime', 'snake'], goldMult: 1.2, xpMult: 1.15, theme: ['#4a6b3f', '#1f331b'], boss: 'snake', requiresBossOf: 'goblin_village' },
  dwarf_mines:   { name: 'Minas dos Dwarfs', icon: '⛏️', minLevel: 6,  worldReq: 'auroria', monsters: ['dwarf', 'orc', 'elf'], goldMult: 1.3, xpMult: 1.25, theme: ['#6b5a44', '#3a2f22'], boss: 'elf', requiresBossOf: 'swamp_slimes' },
  wolf_trail:    { name: 'Trilha da Matilha', icon: '🐺', minLevel: 8,  worldReq: 'auroria', monsters: ['wolf', 'bear'], goldMult: 1.35, xpMult: 1.3, theme: ['#3d5c47', '#1a2b20'], boss: 'bear', requiresBossOf: 'dwarf_mines' },
  spider_burrow: { name: 'Buraco de Aranhas', icon: '🕷️', minLevel: 9,  worldReq: 'auroria', monsters: ['bat', 'spider'], goldMult: 1.38, xpMult: 1.32, theme: ['#4a3a3a', '#201616'], boss: 'spider', requiresBossOf: 'wolf_trail' },
  elf_woods:     { name: 'Acampamento Dworc', icon: '🌀', minLevel: 10, worldReq: 'auroria', monsters: ['dworc'], goldMult: 1.4, xpMult: 1.35, theme: ['#3f7052', '#1e3d2b'], boss: 'dworc', requiresBossOf: 'spider_burrow' },
  old_graveyard: { name: 'Cemitério Antigo', icon: '💀', minLevel: 12, worldReq: 'auroria', monsters: ['skeleton', 'ghoul'], goldMult: 1.45, xpMult: 1.38, theme: ['#5a5560', '#211f28'], boss: 'ghoul', requiresBossOf: 'elf_woods' },
  minotaur_den:  { name: 'Covil dos Minotauros', icon: '🐂', minLevel: 13, worldReq: 'auroria', monsters: ['minotaur', 'minotaur_archer', 'minotaur_mage', 'minotaur_guard'], goldMult: 1.48, xpMult: 1.39, theme: ['#7a5a3a', '#3a2818'], boss: 'minotaur_guard', requiresBossOf: 'old_graveyard' },
  cyclops_camp:  { name: 'Acampamento Cyclops', icon: '🗿', minLevel: 14, worldReq: 'auroria', monsters: ['cyclops', 'juvenile_cyclops', 'cyclops_drone', 'cyclops_smith'], goldMult: 1.5, xpMult: 1.4, theme: ['#8a6a4a', '#4a3524'], boss: 'cyclops_smith', requiresBossOf: 'minotaur_den' },
  amazon_camp:   { name: 'Acampamento Amazona', icon: '🏹', minLevel: 15, worldReq: 'auroria', monsters: ['amazon', 'valkyrie'], goldMult: 1.8, xpMult: 1.6, theme: ['#5e7d3f', '#2e4a1f'], boss: 'valkyrie', requiresBossOf: 'cyclops_camp' },
  bandit_hideout:{ name: 'Esconderijo de Bandidos', icon: '🏴', minLevel: 17, worldReq: 'auroria', monsters: ['bandit', 'poacher'], goldMult: 1.9, xpMult: 1.7, theme: ['#6b5a3f', '#332a1c'], boss: 'poacher', requiresBossOf: 'amazon_camp' },
  scarab_desert: { name: 'Deserto dos Scarabs', icon: '🪲', minLevel: 18, worldReq: 'auroria', monsters: ['scarab', 'mutated_human'], goldMult: 2.0, xpMult: 1.8, theme: ['#c9a35c', '#8a6a30'], boss: 'scarab', requiresBossOf: 'bandit_hideout' },
  orc_fortress:  { name: 'Forte dos Orcs', icon: '🏹', minLevel: 20, worldReq: 'auroria', monsters: ['orc_rider', 'orc_shaman'], goldMult: 2.1, xpMult: 1.9, theme: ['#6b3f2f', '#2e1a12'], boss: 'orc_shaman', requiresBossOf: 'scarab_desert' },

  // --- Spectrum (PvP opcional, reqLevel 20) ---
  spider_lair:   { name: 'Ninho de Giant Spiders', icon: '🕷️', minLevel: 22, worldReq: 'spectrum', monsters: ['giant_spider', 'tarantula'], goldMult: 2.2, xpMult: 2.0, theme: ['#4a3a5c', '#1c1526'], boss: 'giant_spider' },
  wyvern_ridge:  { name: 'Penhasco das Wyverns', icon: '🐲', minLevel: 25, worldReq: 'spectrum', monsters: ['quara_pincher', 'wyvern'], goldMult: 2.5, xpMult: 2.2, theme: ['#4a6b6b', '#1c2e2e'], boss: 'wyvern', requiresBossOf: 'spider_lair' },
  haunted_ruins: { name: 'Ruínas Assombradas', icon: '👻', minLevel: 28, worldReq: 'spectrum', monsters: ['ghost', 'mummy'], goldMult: 2.8, xpMult: 2.4, theme: ['#4a3a5c', '#1c1526'], boss: 'mummy', requiresBossOf: 'wyvern_ridge' },
  golem_workshop:{ name: 'Oficina dos Golens', icon: '🗿', minLevel: 32, worldReq: 'spectrum', monsters: ['bonelord', 'stone_golem'], goldMult: 3.2, xpMult: 2.7, theme: ['#5a5a52', '#232320'], boss: 'stone_golem', requiresBossOf: 'haunted_ruins' },
  djinn_oasis:   { name: 'Oásis dos Djinns', icon: '🧞', minLevel: 36, worldReq: 'spectrum', monsters: ['efreet', 'marid'], goldMult: 3.6, xpMult: 3.1, theme: ['#c9a35c', '#1f4a45'], boss: 'marid', requiresBossOf: 'golem_workshop' },
  worm_hive:     { name: 'Colmeia de Vermes', icon: '🪱', minLevel: 40, worldReq: 'spectrum', monsters: ['larva', 'carrion_worm'], goldMult: 3.9, xpMult: 3.3, theme: ['#5a4a35', '#2e2419'], boss: 'carrion_worm', requiresBossOf: 'djinn_oasis' },

  // --- Bellum (PvP opcional, reqLevel 25) ---
  scorpion_flats:{ name: 'Planície dos Escorpiões', icon: '🦂', minLevel: 26, worldReq: 'bellum', monsters: ['centipede', 'scorpion'], goldMult: 2.6, xpMult: 2.3, theme: ['#c98a4a', '#5c3a1a'], boss: 'scorpion' },
  crypt_shamblers_den:{ name: 'Covil dos Crypt Shamblers', icon: '⚰️', minLevel: 28, worldReq: 'bellum', monsters: ['priestess', 'crypt_shambler'], goldMult: 2.85, xpMult: 2.45, theme: ['#4a4a5c', '#1c1c26'], boss: 'crypt_shambler', requiresBossOf: 'scorpion_flats' },
  dragon_lair:   { name: 'Covil dos Dragões', icon: '🔥', minLevel: 30, worldReq: 'bellum',  monsters: ['dragon', 'dragon_lord'], goldMult: 3.0, xpMult: 2.5, theme: ['#a53d2b', '#4a1810'], boss: 'dragon_lord', requiresBossOf: 'crypt_shamblers_den' },
  frost_peak:    { name: 'Pico Congelado', icon: '🧊', minLevel: 35, worldReq: 'bellum',  monsters: ['frost_dragon'], goldMult: 3.5, xpMult: 3.0, theme: ['#6fa3c9', '#294a63'], boss: 'frost_dragon', requiresBossOf: 'dragon_lair' },
  black_knight_hall:{ name: 'Salão dos Cavaleiros Negros', icon: '⚔️', minLevel: 40, worldReq: 'bellum', monsters: ['serpent_spawn', 'black_knight'], goldMult: 3.9, xpMult: 3.35, theme: ['#3a4a5c', '#151c26'], boss: 'black_knight', requiresBossOf: 'frost_peak' },
  werewolf_woods:{ name: 'Floresta dos Lobisomens', icon: '🌕', minLevel: 47, worldReq: 'bellum', monsters: ['cobra', 'werewolf'], goldMult: 4.3, xpMult: 3.9, theme: ['#2e3d24', '#141c10'], boss: 'werewolf', requiresBossOf: 'black_knight_hall' },
  ghastly_ruins: { name: 'Ruínas Sombrias', icon: '🐉', minLevel: 52, worldReq: 'bellum', monsters: ['dark_torturer', 'ghastly_dragon'], goldMult: 4.8, xpMult: 4.1, theme: ['#5c2b3a', '#26101a'], boss: 'ghastly_dragon', requiresBossOf: 'werewolf_woods' },

  // --- Solarian (PvP retro, reqLevel 35) ---
  poison_marsh:  { name: 'Pântano Venenoso', icon: '🕸️', minLevel: 35, worldReq: 'solarian', monsters: ['wasp', 'poison_spider'], goldMult: 3.5, xpMult: 3.0, theme: ['#5c7d3a', '#243315'], boss: 'poison_spider' },
  braindeath_bog:{ name: 'Pântano dos Braindeath', icon: '🧠', minLevel: 38, worldReq: 'solarian', monsters: ['quara_hydromancer', 'braindeath'], goldMult: 3.7, xpMult: 3.2, theme: ['#3a4a35', '#161f14'], boss: 'braindeath', requiresBossOf: 'poison_marsh' },
  hydra_swamp:   { name: 'Pântano das Hydras', icon: '🐍', minLevel: 45, worldReq: 'solarian', monsters: ['hydra', 'medusa'], goldMult: 4.2, xpMult: 3.8, theme: ['#3c6b5e', '#173a30'], boss: 'medusa', requiresBossOf: 'braindeath_bog' },
  wraith_hollow: { name: 'Covil dos Wraiths', icon: '👤', minLevel: 50, worldReq: 'solarian', monsters: ['crypt_defiler', 'betrayed_wraith'], goldMult: 4.6, xpMult: 4.0, theme: ['#4a3a5c', '#1a1424'], boss: 'betrayed_wraith', requiresBossOf: 'hydra_swamp' },
  nightmare_den: { name: 'Covil dos Pesadelos', icon: '🌑', minLevel: 58, worldReq: 'solarian', monsters: ['fleshcrawler', 'nightmare'], goldMult: 5.6, xpMult: 4.6, theme: ['#3a1f2e', '#150a12'], boss: 'nightmare', requiresBossOf: 'wraith_hollow' },
  hellfire_bastion:{ name: 'Bastião Infernal', icon: '🔥', minLevel: 63, worldReq: 'solarian', monsters: ['blightwalker', 'hellfire_fighter'], goldMult: 6.5, xpMult: 5.2, theme: ['#a5391f', '#3a1208'], boss: 'hellfire_fighter', requiresBossOf: 'nightmare_den' },

  // --- Elysian (PvP retro, reqLevel 40) ---
  undead_crypt:  { name: 'Cripta Profana', icon: '🦴', minLevel: 40, worldReq: 'elysian', monsters: ['bonebeast', 'banshee', 'vampire'], goldMult: 3.8, xpMult: 3.3, theme: ['#5a5560', '#211f28'], boss: 'banshee' },
  lich_lair:     { name: 'Cripta dos Liches', icon: '☠️', minLevel: 48, worldReq: 'elysian', monsters: ['lich', 'grim_reaper', 'undead_dragon', 'warlock'], goldMult: 4.0, xpMult: 3.5, theme: ['#4a3a63', '#1a1424'], boss: 'undead_dragon', requiresBossOf: 'undead_crypt' },
  demon_fortress:{ name: 'Fortaleza Demoníaca', icon: '💀', minLevel: 55, worldReq: 'elysian', monsters: ['demon', 'fury', 'hellhound'], goldMult: 5.0, xpMult: 4.0, theme: ['#7a1f1f', '#2b0a0a'], boss: 'demon', requiresBossOf: 'lich_lair' },
  war_golem_yard:{ name: 'Pátio dos War Golems', icon: '🤖', minLevel: 65, worldReq: 'elysian', monsters: ['nightmare_scion', 'war_golem'], goldMult: 6.8, xpMult: 5.4, theme: ['#5c5c52', '#242420'], boss: 'war_golem', requiresBossOf: 'demon_fortress' },
  falcon_bastion:{ name: 'Bastião Falcão', icon: '🦅', minLevel: 69, worldReq: 'elysian', monsters: ['retching_horror', 'falcon_knight'], goldMult: 7.6, xpMult: 5.9, theme: ['#4a6b8a', '#1c2e3f'], boss: 'falcon_knight', requiresBossOf: 'war_golem_yard' },
  vexclaw_canyon:{ name: 'Desfiladeiro dos Vexclaw', icon: '🦞', minLevel: 74, worldReq: 'elysian', monsters: ['draptor', 'vexclaw'], goldMult: 9.0, xpMult: 6.5, theme: ['#8a4a2f', '#3a1c10'], boss: 'vexclaw', requiresBossOf: 'falcon_bastion' },
  feversleep_marsh:{ name: 'Pântano Feversleep', icon: '💤', minLevel: 78, worldReq: 'elysian', monsters: ['werelion', 'feversleep'], goldMult: 10.0, xpMult: 7.0, theme: ['#6b7d3a', '#2b3315'], boss: 'feversleep', requiresBossOf: 'vexclaw_canyon' },
  grorlam_grotto:{ name: 'Gruta do Grorlam', icon: '🐖', minLevel: 82, worldReq: 'elysian', monsters: ['omruc', 'grorlam'], goldMult: 11.5, xpMult: 7.8, theme: ['#2f4a4a', '#101f1f'], boss: 'grorlam', requiresBossOf: 'feversleep_marsh' },
  zorvorax_sanctum:{ name: 'Santuário de Zorvorax', icon: '🔮', minLevel: 86, worldReq: 'elysian', monsters: ['massive_water_elemental', 'zorvorax'], goldMult: 13.0, xpMult: 8.5, theme: ['#6b4a8a', '#251536'], boss: 'zorvorax', requiresBossOf: 'grorlam_grotto' },

  // --- Mystian (PvP retro, reqLevel 60, o mundo com os melhores bônus) ---
  hell_gate:     { name: 'Portão do Inferno', icon: '🔥', minLevel: 60, worldReq: 'mystian', monsters: ['juggernaut', 'plaguesmith', 'behemoth'], goldMult: 6.0, xpMult: 5.0, theme: ['#a52a1f', '#1f0a08'], boss: 'juggernaut' },
  boss_sanctum:  { name: 'Santuário dos Bosses', icon: '🌀', minLevel: 70, worldReq: 'mystian', monsters: ['lothlorien', 'executioner', 'morgul', 'corrupted_one', 'nzoth'], goldMult: 8.0, xpMult: 6.0, theme: ['#6b4a9c', '#2a1a42'], boss: 'nzoth', requiresBossOf: 'hell_gate' },
  draken_wastes: { name: 'Terras Draken', icon: '🐲', minLevel: 88, worldReq: 'mystian', monsters: ['draken_abomination', 'draken_warmaster'], goldMult: 14.0, xpMult: 9.0, theme: ['#5c2f2f', '#241010'], boss: 'draken_warmaster', requiresBossOf: 'boss_sanctum' },
  corruption_spire:{ name: 'Torre da Corrupção', icon: '🕸️', minLevel: 91, worldReq: 'mystian', monsters: ['zulazza', 'latrivan'], goldMult: 15.5, xpMult: 9.8, theme: ['#3a2050', '#140a1f'], boss: 'latrivan', requiresBossOf: 'draken_wastes' },
  abyssal_throne:{ name: 'Trono Abissal', icon: '😈', minLevel: 94, worldReq: 'mystian', monsters: ['ushuriel', 'madareth'], goldMult: 17.0, xpMult: 10.6, theme: ['#4a1520', '#1a060a'], boss: 'madareth', requiresBossOf: 'corruption_spire' },
  void_rift:     { name: 'Fenda do Vazio', icon: '🔺', minLevel: 97, worldReq: 'mystian', monsters: ['zamulosh', 'shulgrax', 'tanjis'], goldMult: 18.5, xpMult: 11.5, theme: ['#1a1a3a', '#08081a'], boss: 'tanjis', requiresBossOf: 'abyssal_throne' },
  ferumbras_citadel:{ name: 'Cidadela de Ferumbras', icon: '👑', minLevel: 100, worldReq: 'mystian', monsters: ['pale_worm', 'diblis', 'soul_despoiler', 'ferumbras_mortal_shell', 'devovorga', 'gazharagoth', 'ferumbras'], goldMult: 20.0, xpMult: 13.0, theme: ['#3a1a5c', '#12081f'], boss: 'ferumbras', requiresBossOf: 'void_rift' },
};

export const MONSTERS = {
  // --- Bestiário clássico de Tibia (o mundo do RubinOT) ---
  cave_rat:      { name: 'Cave Rat', icon: '🐀', hp: 15,  atk: 3,  def: 1,  xp: 8,   gold: [0,2],   loot: [['cheese',0.4]] },
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
  troll:         { name: 'Troll', icon: '👹', hp: 50,  atk: 7,  def: 3,  xp: 25,  gold: [2,6],   loot: [['bones',0.9],['leather_boots',0.12]] },
  orc:           { name: 'Orc', icon: '🗡️', hp: 70,  atk: 10, def: 4,  xp: 35,  gold: [3,8],   loot: [['orc_tooth',0.5],['studded_armor',0.06]] },
  cyclops:       { name: 'Cyclops', icon: '🗿', hp: 260, atk: 30, def: 10, xp: 150, gold: [10,30], loot: [['cyclops_toe',0.4],['halberd',0.04]] },
  juvenile_cyclops:{ name: 'Juvenile Cyclops', icon: '🗿', hp: 220, atk: 22, def: 8,  xp: 120, gold: [8,24],  loot: [['cyclops_toe',0.3],['bones',0.4]] },
  cyclops_drone: { name: 'Cyclops Drone', icon: '🗿', hp: 325, atk: 36, def: 12, xp: 200, gold: [12,34], loot: [['cyclops_toe',0.4],['studded_armor',0.05]] },
  cyclops_smith: { name: 'Cyclops Smith', icon: '🗿', hp: 435, atk: 46, def: 15, xp: 255, gold: [16,42], loot: [['cyclops_toe',0.5],['halberd',0.05],['iron_helmet',0.05]] },
  minotaur:      { name: 'Minotaur', icon: '🐂', hp: 120, atk: 18, def: 6,  xp: 80,  gold: [5,15],  loot: [['minotaur_horn',0.4],['chain_armor',0.05]] },
  minotaur_archer:{ name: 'Minotaur Archer', icon: '🐂', hp: 120, atk: 20, def: 5,  xp: 104, gold: [6,18],  loot: [['minotaur_horn',0.3],['power_bolt',0.4]] },
  minotaur_mage: { name: 'Minotaur Mage', icon: '🐂', hp: 185, atk: 26, def: 7,  xp: 240, gold: [10,28], loot: [['minotaur_horn',0.4],['wand_of_vortex',0.02]] },
  minotaur_guard:{ name: 'Minotaur Guard', icon: '🐂', hp: 220, atk: 28, def: 10, xp: 256, gold: [12,32], loot: [['minotaur_horn',0.5],['chain_armor',0.06],['studded_shield',0.04]] },
  amazon:        { name: 'Amazon', icon: '🏹', hp: 110, atk: 22, def: 5,  xp: 60,  gold: [4,10],  loot: [['amazon_armor',0.08],['power_bolt',0.5]] },
  valkyrie:      { name: 'Valkyrie', icon: '⚔️', hp: 190, atk: 30, def: 12, xp: 120, gold: [8,20],  loot: [['gold_coin',1.0]] },
  giant_spider:  { name: 'Giant Spider', icon: '🕷️', hp: 1300,atk: 75, def: 20, xp: 900, gold: [40,100], loot: [['spider_silk',0.4],['knight_armor',0.02],['plate_legs',0.05]] },
  tarantula:     { name: 'Tarantula', icon: '🕸️', hp: 225, atk: 35, def: 10, xp: 120, gold: [8,25],  loot: [['spider_fangs',0.6]] },
  dragon:        { name: 'Dragon', icon: '🐉', hp: 1000,atk: 85, def: 25, xp: 700, gold: [40,105], loot: [['dragon_scale',0.6],['dragon_ham',0.8],['dragonbone_staff',0.02]] },
  dragon_lord:   { name: 'Dragon Lord', icon: '🔴', hp: 1900,atk: 120,def: 35, xp: 2100,gold: [100,200],loot: [['royal_helmet',0.01],['life_crystal',0.5]] },
  hydra:         { name: 'Hydra', icon: '🐍', hp: 2350,atk: 130,def: 40, xp: 2100,gold: [100,250],loot: [['hydra_head',0.3],['hydra_egg',0.05],['medusa_shield',0.01]] },
  medusa:        { name: 'Medusa', icon: '🐍', hp: 4500,atk: 160,def: 45, xp: 4050,gold: [150,300],loot: [['strand_of_medusa_hair',0.2],['titan_axe',0.008]] },
  lich:          { name: 'Lich', icon: '💀', hp: 880, atk: 100,def: 30, xp: 900, gold: [80,160], loot: [['death_ring',0.02]] },
  undead_dragon: { name: 'Undead Dragon', icon: '☠️', hp: 8350,atk: 180,def: 50, xp: 7200,gold: [200,400],loot: [['necromancer_shield',0.02],['dragon_scale_legs',0.005]] },
  behemoth:      { name: 'Behemoth', icon: '🦣', hp: 4000,atk: 150,def: 45, xp: 3000,gold: [150,300],loot: [['behemoth_claw',0.3],['giant_sword',0.015],['crystal_coin',0.05]] },
  demon:         { name: 'Demon', icon: '😈', hp: 8200,atk: 190,def: 55, xp: 6000,gold: [200,400],loot: [['demon_dust',0.5],['demon_shield',0.01],['magic_plate_armor',0.005],['platinum_coin',0.8]] },
  juggernaut:    { name: 'Juggernaut', icon: '💥', hp: 20000,atk: 250,def: 65, xp: 14000,gold: [300,600],loot: [['titan_axe',0.01],['crystal_coin',0.15]] },
  // --- Bosses exclusivos do RubinOT (salas de Linked Tasks) ---
  lothlorien:    { name: 'Lothlorien', icon: '🌲', hp: 30000,atk: 280,def: 70, xp: 25000,gold: [400,800],  loot: [['lothlorien_bow',0.02],['crystal_coin',0.4],['rubini_shard',0.3]] },
  executioner:   { name: 'Executioner', icon: '🪓', hp: 35000,atk: 320,def: 75, xp: 30000,gold: [500,900],  loot: [['executioner_axe',0.02],['crystal_coin',0.4],['rubini_shard',0.35]] },
  morgul:        { name: 'Morgul', icon: '👻', hp: 40000,atk: 350,def: 80, xp: 35000,gold: [500,1000], loot: [['morgul_blade',0.015],['crystal_coin',0.5],['rubini_shard',0.4]] },
  corrupted_one: { name: 'The Corrupted', icon: '🩸', hp: 50000,atk: 400,def: 90, xp: 45000,gold: [600,1200], loot: [['corrupted_heart',0.1],['crystal_coin',0.6],['rubini_shard',0.5]] },
  nzoth:         { name: 'N\'Zoth', icon: '🌀', hp: 80000,atk: 500,def: 100,xp: 70000,gold: [1000,2000],loot: [['nzoth_tentacle',0.2],['rubini_shard',0.8]] },

  // --- 30+ novas zonas (Lv1-100): bestiário adicional, todos monstros REAIS
  // de Tibia (verificados via TibiaWiki API — action=query&titles=... antes de
  // entrar aqui). Stats escalados pela curva de crescimento observada nos 34
  // monstros originais (não são os HP/XP reais de Tibia, só usam eles como
  // referência de dificuldade RELATIVA) — ver .spec/90-regras-de-negocio-gerais.md.
  rat:                 { name: 'Rat', icon: '🐁', hp: 28, atk: 5, def: 2, xp: 14, gold: [0,3], loot: [['cheese',0.4],['bones',0.2]] },
  bug:                 { name: 'Bug', icon: '🐛', hp: 14, atk: 3, def: 1, xp: 7, gold: [0,1], loot: [['worm_dirt',0.3],['cheese',0.2]] },
  slime:               { name: 'Slime', icon: '🟢', hp: 60, atk: 9, def: 3, xp: 28, gold: [2,6], loot: [['worm_dirt',0.3],['meat',0.2]] },
  snake:               { name: 'Snake', icon: '🐍', hp: 78, atk: 12, def: 4, xp: 36, gold: [3,8], loot: [['meat',0.4],['bones',0.2]] },
  wolf:                { name: 'Wolf', icon: '🐺', hp: 80, atk: 11, def: 4, xp: 38, gold: [3,8], loot: [['meat',0.5],['bones',0.3]] },
  bear:                { name: 'Bear', icon: '🐻', hp: 112, atk: 15, def: 5, xp: 56, gold: [4,10], loot: [['meat',0.6],['leather_boots',0.08]] },
  spider:              { name: 'Spider', icon: '🕷️', hp: 95, atk: 14, def: 4, xp: 45, gold: [3,9], loot: [['spider_fangs',0.3],['worm_dirt',0.2]] },
  bat:                 { name: 'Bat', icon: '🦇', hp: 55, atk: 9, def: 2, xp: 25, gold: [1,5], loot: [['bones',0.3],['cheese',0.2]] },
  skeleton:            { name: 'Skeleton', icon: '💀', hp: 120, atk: 17, def: 6, xp: 62, gold: [5,12], loot: [['bones',0.9],['studded_armor',0.03]] },
  ghoul:               { name: 'Ghoul', icon: '🧟', hp: 165, atk: 20, def: 7, xp: 88, gold: [6,15], loot: [['bones',0.9],['meat',0.5],['leather_boots',0.1]] },
  bandit:              { name: 'Bandit', icon: '🏴', hp: 220, atk: 24, def: 8, xp: 115, gold: [8,20], loot: [['leather_boots',0.1],['gold_coin',1.0]] },
  poacher:             { name: 'Poacher', icon: '🪤', hp: 275, atk: 28, def: 10, xp: 148, gold: [10,25], loot: [['leather_boots',0.15],['studded_armor',0.05],['crossbow',0.03]] },
  orc_rider:           { name: 'Orc Rider', icon: '🐗', hp: 420, atk: 36, def: 11, xp: 230, gold: [15,32], loot: [['orc_tooth',0.5],['studded_armor',0.06]] },
  orc_shaman:          { name: 'Orc Shaman', icon: '🪄', hp: 505, atk: 42, def: 13, xp: 305, gold: [18,40], loot: [['orc_tooth',0.5],['elvish_talisman',0.15],['wand_of_cosmic_energy',0.02]] },
  quara_pincher:       { name: 'Quara Pincher', icon: '🦀', hp: 900, atk: 65, def: 18, xp: 680, gold: [55,90], loot: [['scarab_coin',0.2],['meat',0.3]] },
  wyvern:              { name: 'Wyvern', icon: '🐲', hp: 1080, atk: 75, def: 21, xp: 830, gold: [65,110], loot: [['dragon_scale',0.15],['life_crystal',0.08]] },
  ghost:               { name: 'Ghost', icon: '👻', hp: 1100, atk: 80, def: 22, xp: 950, gold: [70,120], loot: [['life_crystal',0.15],['vampire_dust',0.1]] },
  mummy:               { name: 'Mummy', icon: '🪦', hp: 1400, atk: 95, def: 27, xp: 1250, gold: [85,150], loot: [['bones',0.9],['elvish_talisman',0.2],['death_ring',0.005]] },
  bonelord:            { name: 'Bonelord', icon: '👁️', hp: 1450, atk: 95, def: 28, xp: 1500, gold: [100,160], loot: [['life_crystal',0.2],['death_ring',0.008]] },
  stone_golem:         { name: 'Stone Golem', icon: '🗿', hp: 1800, atk: 118, def: 36, xp: 1850, gold: [130,200], loot: [['chain_armor',0.08],['plate_legs',0.06],['crystal_coin',0.03]] },
  efreet:              { name: 'Efreet', icon: '🧞‍♂️', hp: 1700, atk: 110, def: 33, xp: 1950, gold: [120,190], loot: [['demon_dust',0.15],['fire_sword',0.01]] },
  marid:               { name: 'Marid', icon: '🧞', hp: 2000, atk: 125, def: 38, xp: 2350, gold: [150,230], loot: [['demon_dust',0.2],['wand_of_inferno',0.01],['crystal_coin',0.05]] },
  larva:               { name: 'Larva', icon: '🪱', hp: 1900, atk: 105, def: 32, xp: 2100, gold: [130,200], loot: [['worm_dirt',0.6],['meat',0.4]] },
  carrion_worm:        { name: 'Carrion Worm', icon: '🪱', hp: 2400, atk: 130, def: 40, xp: 2600, gold: [160,250], loot: [['worm_dirt',0.5],['life_crystal',0.2],['crystal_coin',0.05]] },
  centipede:           { name: 'Centipede', icon: '🐜', hp: 950, atk: 68, def: 18, xp: 740, gold: [60,100], loot: [['spider_fangs',0.3],['mutated_flesh',0.1]] },
  scorpion:            { name: 'Scorpion', icon: '🦂', hp: 1150, atk: 80, def: 22, xp: 900, gold: [70,120], loot: [['spider_fangs',0.35],['scarab_coin',0.15]] },
  priestess:           { name: 'Priestess', icon: '🙏', hp: 1100, atk: 90, def: 20, xp: 1000, gold: [80,140], loot: [['elvish_talisman',0.2],['death_ring',0.01]] },
  crypt_shambler:      { name: 'Crypt Shambler', icon: '⚰️', hp: 1450, atk: 92, def: 28, xp: 1300, gold: [95,160], loot: [['bones',0.8],['life_crystal',0.15],['necromancer_shield',0.005]] },
  serpent_spawn:       { name: 'Serpent Spawn', icon: '🐍', hp: 1950, atk: 120, def: 38, xp: 2000, gold: [145,210], loot: [['life_crystal',0.15],['mutated_flesh',0.1]] },
  black_knight:        { name: 'Black Knight', icon: '⚔️', hp: 2450, atk: 135, def: 42, xp: 2600, gold: [170,260], loot: [['chain_armor',0.1],['studded_shield',0.08],['broadsword',0.05]] },
  cobra:               { name: 'Cobra', icon: '🐍', hp: 3400, atk: 132, def: 38, xp: 3400, gold: [195,300], loot: [['spider_fangs',0.2],['demon_dust',0.1]] },
  werewolf:            { name: 'Werewolf', icon: '🌕', hp: 4300, atk: 155, def: 46, xp: 4300, gold: [250,380], loot: [['meat',0.5],['leather_boots',0.1],['strange_helmet',0.01]] },
  dark_torturer:       { name: 'Dark Torturer', icon: '🔪', hp: 5000, atk: 158, def: 44, xp: 4700, gold: [250,360], loot: [['demon_dust',0.2],['strange_helmet',0.015]] },
  ghastly_dragon:      { name: 'Ghastly Dragon', icon: '🐉', hp: 6100, atk: 172, def: 50, xp: 5700, gold: [300,420], loot: [['dragon_scale',0.3],['dragon_ham',0.5],['life_crystal',0.3],['crystal_coin',0.08]] },
  wasp:                { name: 'Wasp', icon: '🐝', hp: 1550, atk: 105, def: 30, xp: 1750, gold: [110,180], loot: [['demon_dust',0.1],['life_crystal',0.1]] },
  poison_spider:       { name: 'Poison Spider', icon: '🕸️', hp: 1950, atk: 120, def: 38, xp: 2300, gold: [140,220], loot: [['spider_silk',0.3],['spider_fangs',0.4]] },
  quara_hydromancer:   { name: 'Quara Hydromancer', icon: '🌊', hp: 1900, atk: 118, def: 36, xp: 2150, gold: [140,210], loot: [['demon_dust',0.1],['life_crystal',0.15]] },
  braindeath:          { name: 'Braindeath', icon: '🧠', hp: 2350, atk: 128, def: 40, xp: 2600, gold: [160,250], loot: [['life_crystal',0.2],['death_ring',0.01],['crystal_coin',0.05]] },
  crypt_defiler:       { name: 'Crypt Defiler', icon: '⚰️', hp: 4300, atk: 145, def: 40, xp: 4300, gold: [230,340], loot: [['demon_dust',0.15],['life_crystal',0.2]] },
  betrayed_wraith:     { name: 'Betrayed Wraith', icon: '👤', hp: 5300, atk: 162, def: 48, xp: 5300, gold: [270,400], loot: [['life_crystal',0.25],['death_ring',0.02],['crystal_coin',0.07]] },
  fleshcrawler:        { name: 'Fleshcrawler', icon: '🦠', hp: 8000, atk: 178, def: 49, xp: 5900, gold: [260,380], loot: [['demon_dust',0.2],['mutated_flesh',0.1]] },
  nightmare:           { name: 'Nightmare', icon: '🐴', hp: 9800, atk: 196, def: 57, xp: 7000, gold: [300,440], loot: [['demon_dust',0.3],['death_ring',0.025],['crystal_coin',0.1]] },
  blightwalker:        { name: 'Blightwalker', icon: '🟣', hp: 15200, atk: 222, def: 58, xp: 10700, gold: [340,500], loot: [['demon_dust',0.25],['platinum_coin',0.5]] },
  hellfire_fighter:    { name: 'Hellfire Fighter', icon: '🔥', hp: 18500, atk: 248, def: 66, xp: 13000, gold: [400,600], loot: [['demon_dust',0.35],['platinum_coin',0.7],['crystal_coin',0.12]] },
  nightmare_scion:     { name: 'Nightmare Scion', icon: '🌑', hp: 20500, atk: 252, def: 63, xp: 15200, gold: [420,600], loot: [['demon_dust',0.25],['death_ring',0.015]] },
  war_golem:           { name: 'War Golem', icon: '🤖', hp: 25000, atk: 282, def: 73, xp: 18700, gold: [500,720], loot: [['chain_armor',0.1],['plate_legs',0.08],['crystal_coin',0.15]] },
  retching_horror:     { name: 'Retching Horror', icon: '🤢', hp: 37000, atk: 328, def: 75, xp: 31000, gold: [640,900], loot: [['demon_dust',0.3],['platinum_coin',0.6]] },
  falcon_knight:       { name: 'Falcon Knight', icon: '🦅', hp: 45000, atk: 365, def: 86, xp: 38500, gold: [750,1050], loot: [['chain_armor',0.1],['studded_shield',0.1],['crystal_coin',0.18]] },
  draptor:             { name: 'Draptor', icon: '🦖', hp: 55000, atk: 390, def: 88, xp: 47000, gold: [880,1250], loot: [['dragon_scale',0.3],['platinum_coin',0.7]] },
  vexclaw:             { name: 'Vexclaw', icon: '🦞', hp: 67000, atk: 435, def: 101, xp: 58000, gold: [1050,1450], loot: [['demon_dust',0.35],['platinum_coin',1.0],['crystal_coin',0.25]] },
  werelion:            { name: 'Werelion', icon: '🦁', hp: 70000, atk: 432, def: 98, xp: 60000, gold: [1080,1500], loot: [['demon_dust',0.35],['crystal_coin',0.2]] },
  feversleep:          { name: 'Feversleep', icon: '💤', hp: 86000, atk: 485, def: 113, xp: 73000, gold: [1300,1800], loot: [['dragon_scale',0.3],['titan_axe',0.008],['crystal_coin',0.3]] },
  omruc:               { name: 'Omruc', icon: '🌋', hp: 90000, atk: 480, def: 111, xp: 76000, gold: [1340,1850], loot: [['demon_dust',0.4],['crystal_coin',0.25]] },
  grorlam:             { name: 'Grorlam', icon: '🐖', hp: 110000, atk: 538, def: 128, xp: 92000, gold: [1600,2200], loot: [['demon_shield',0.008],['platinum_coin',1.2],['crystal_coin',0.35]] },
  massive_water_elemental:{ name: 'Massive Water Elemental', icon: '💧', hp: 120000, atk: 538, def: 125, xp: 100000, gold: [1650,2300], loot: [['life_crystal',0.3],['platinum_coin',1.0]] },
  zorvorax:            { name: 'Zorvorax', icon: '🔮', hp: 146000, atk: 600, def: 145, xp: 121000, gold: [2000,2750], loot: [['demon_dust',0.45],['skull_staff',0.01],['crystal_coin',0.4]] },
  draken_abomination:  { name: 'Draken Abomination', icon: '👹', hp: 145000, atk: 575, def: 132, xp: 120000, gold: [1850,2600], loot: [['demon_dust',0.4],['crystal_coin',0.35]] },
  draken_warmaster:    { name: 'Draken Warmaster', icon: '🐲', hp: 177000, atk: 640, def: 153, xp: 146000, gold: [2250,3100], loot: [['dragon_scale',0.4],['titan_axe',0.01],['crystal_coin',0.5]] },
  zulazza:             { name: 'Zulazza the Corruptor', icon: '🕸️', hp: 192000, atk: 635, def: 143, xp: 158000, gold: [2250,3100], loot: [['demon_dust',0.45],['death_ring',0.025]] },
  latrivan:            { name: 'Latrivan', icon: '⚡', hp: 235000, atk: 706, def: 166, xp: 192000, gold: [2700,3700], loot: [['demon_shield',0.01],['platinum_coin',1.5],['crystal_coin',0.55]] },
  ushuriel:            { name: 'Ushuriel', icon: '😈', hp: 255000, atk: 700, def: 156, xp: 208000, gold: [2700,3700], loot: [['demon_dust',0.5],['royal_helmet',0.005]] },
  madareth:            { name: 'Madareth', icon: '💥', hp: 312000, atk: 779, def: 181, xp: 254000, gold: [3250,4400], loot: [['demon_shield',0.012],['titan_axe',0.015],['crystal_coin',0.6]] },
  zamulosh:            { name: 'Zamulosh', icon: '🔺', hp: 330000, atk: 770, def: 168, xp: 265000, gold: [3200,4300], loot: [['demon_dust',0.5],['crystal_coin',0.55]] },
  shulgrax:            { name: 'Shulgrax', icon: '🟠', hp: 390000, atk: 830, def: 186, xp: 315000, gold: [3700,4900], loot: [['magic_plate_armor',0.006],['crystal_coin',0.65]] },
  tanjis:               { name: 'Tanjis', icon: '🔶', hp: 450000, atk: 880, def: 202, xp: 365000, gold: [4300,5600], loot: [['demon_shield',0.015],['royal_helmet',0.01],['crystal_coin',0.75]] },
  pale_worm:           { name: 'The Pale Worm', icon: '⚪', hp: 420000, atk: 840, def: 185, xp: 340000, gold: [3800,5000], loot: [['demon_dust',0.6],['crystal_coin',0.7]] },
  diblis:              { name: 'Diblis the Fair', icon: '💍', hp: 480000, atk: 880, def: 195, xp: 390000, gold: [4200,5600], loot: [['magic_plate_armor',0.008],['crystal_coin',0.8]] },
  soul_despoiler:      { name: 'The Souldespoiler', icon: '🔥', hp: 550000, atk: 930, def: 210, xp: 450000, gold: [4800,6300], loot: [['demon_shield',0.02],['titan_axe',0.02],['crystal_coin',0.85]] },
  ferumbras_mortal_shell:{ name: 'Ferumbras Mortal Shell', icon: '⚱️', hp: 650000, atk: 970, def: 225, xp: 530000, gold: [5400,7000], loot: [['boots_of_haste',0.003],['crystal_coin',0.9]] },
  devovorga:           { name: 'Devovorga', icon: '🟪', hp: 750000, atk: 1010, def: 235, xp: 610000, gold: [6000,7800], loot: [['magic_plate_armor',0.012],['crystal_coin',1.0]] },
  gazharagoth:         { name: 'Gaz\'haragoth', icon: '🖤', hp: 900000, atk: 1060, def: 250, xp: 740000, gold: [6800,8800], loot: [['royal_helmet',0.02],['demon_shield',0.02],['crystal_coin',1.1]] },
  ferumbras:           { name: 'Ferumbras', icon: '👑', hp: 1200000, atk: 1150, def: 270, xp: 1000000, gold: [8000,10500], loot: [['boots_of_haste',0.006],['magic_plate_armor',0.02],['crystal_coin',1.3],['titan_axe',0.03]] },
};

// Definição única de "o que conta como boss" no jogo inteiro — reaproveitada
// tanto pra Relíquias (só caem de boss, ver application/huntUseCases.js)
// quanto pro Boss Rush (ver application/bossRushUseCases.js). Não duplicar
// essa lista em nenhum outro lugar: o boss de cada zona já é ZONES[id].boss.
export const BOSS_MONSTER_IDS = new Set(Object.values(ZONES).map(z => z.boss));

// Multiplicador de stats do Boss Rush: tier 1 já é bem mais forte que um
// encontro normal do mesmo bicho na zona (1.8x), e cada tier vencido soma
// +35% em cima do anterior — é o que torna o Boss Rush uma escada infinita
// de dificuldade em vez de repetir a mesma luta pra sempre. Sem teto de
// propósito (ver ui/bossRushPanel.js pro texto "tier N").
export function bossTierMultiplier(tier) {
  return 1.8 * Math.pow(1.35, Math.max(1, tier) - 1);
}

// Paleta de aura por tier — cores progressivamente mais intensas (bronze →
// prata → ouro → arcano → carmesim), repetindo/intensificando a carmesim a
// partir do tier 5 em diante pra não precisar de uma paleta infinita.
const BOSS_AURA_TIERS = ['bronze', 'silver', 'gold', 'arcane', 'crimson'];
export function bossAuraClass(tier) {
  const idx = Math.min(BOSS_AURA_TIERS.length - 1, Math.max(1, tier) - 1);
  return `boss-aura-${BOSS_AURA_TIERS[idx]}`;
}

// Uma zona com requiresBossOf só abre depois que o boss da zona anterior da
// cadeia morreu ≥1x (ver ZONES[id].requiresBossOf/.boss) — em cima do gate de
// nível/mundo que já existia. Pura o bastante pra usar tanto na UI (zonePicker,
// huntPanel) quanto num teste, sem tocar DOM/G diretamente: quem chama passa
// os dados já lidos do G.
export function isZoneUnlocked(zoneId, level, worldId, defeatedZoneBosses) {
  const zone = ZONES[zoneId];
  if (!zone) return false;
  if (level < zone.minLevel || zone.worldReq !== worldId) return false;
  if (zone.requiresBossOf && !(defeatedZoneBosses || []).includes(zone.requiresBossOf)) return false;
  return true;
}

// "Boosted Zone" do dia — mesma ideia do Boosted Creature/Boss real de Tibia:
// hash simples da data (string "YYYY-MM-DD", mesmo padrão de dailyMissionsFor
// em domain/progression.js) escolhe 1 zona entre todas; troca sozinho quando o
// dia muda, igual pra todo mundo, sem precisar de servidor.
export function boostedZoneForDate(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  const ids = Object.keys(ZONES);
  return ids[hash % ids.length];
}
