// Bestiário e zonas de caça — dados puros do jogo, sem sprite/URL (isso é
// infraestrutura, ver src/infrastructure/tibiaSprites.js) e sem DOM.

// "theme" [cor de cima, cor de baixo] dá um cenário próprio pra cada dungeon
// na cena de batalha — sem depender de imagem hotlinkada (nenhuma fonte
// confiável de screenshot por zona), então é uma paleta de gradiente coerente
// com o bioma/clima de cada uma.
export const ZONES = {
  // --- Auroria (mundo inicial, sempre desbloqueado) ---
  rotworm_cave:  { city: 'rookgaard', name: 'Caverna de Rotworms', icon: '🪱',  worldReq: 'auroria', monsters: ['rotworm', 'cave_rat'], goldMult: 1.0, xpMult: 1.0, theme: ['#5a4a35', '#2e2419'], boss: 'rotworm' },
  sewer_rats:    { city: 'rookgaard', name: 'Esgoto de Ratos', icon: '🐁',  worldReq: 'auroria', monsters: ['rat', 'bug'], goldMult: 1.02, xpMult: 1.02, theme: ['#4a4234', '#231f18'], boss: 'rat', requiresBossOf: 'rotworm_cave' },
  goblin_village:{ city: 'rookgaard', name: 'Caverna dos Trolls', icon: '🧌',  worldReq: 'auroria', monsters: ['troll'], goldMult: 1.1, xpMult: 1.1, theme: ['#5c6b3a', '#33401f'], boss: 'troll', requiresBossOf: 'sewer_rats' },
  swamp_slimes:  { city: 'rookgaard', name: 'Charco das Cobras', icon: '🟢',  worldReq: 'auroria', monsters: ['snake', 'slime'], goldMult: 1.2, xpMult: 1.15, theme: ['#4a6b3f', '#1f331b'], boss: 'snake', requiresBossOf: 'goblin_village' },
  dwarf_mines:   { city: 'thais', name: 'Minas dos Dwarfs', icon: '⛏️',  worldReq: 'auroria', monsters: ['dwarf', 'dwarf_soldier', 'dwarf_geomancer', 'dwarf_guard'], goldMult: 1.3, xpMult: 1.25, theme: ['#6b5a44', '#3a2f22'], boss: 'dwarf_guard', requiresBossOf: 'swamp_slimes' },
  wolf_trail:    { city: 'abdendriel', name: 'Trilha da Matilha', icon: '🐺',  worldReq: 'auroria', monsters: ['wolf', 'bear'], goldMult: 1.35, xpMult: 1.3, theme: ['#3d5c47', '#1a2b20'], boss: 'bear', requiresBossOf: 'dwarf_mines' },
  spider_burrow: { city: 'abdendriel', name: 'Buraco de Aranhas', icon: '🕷️',  worldReq: 'auroria', monsters: ['spider', 'tarantula'], goldMult: 1.38, xpMult: 1.32, theme: ['#4a3a3a', '#201616'], boss: 'spider', requiresBossOf: 'wolf_trail' },
  elf_woods:     { city: 'abdendriel', name: 'Bosque dos Elfos', icon: '🧝', worldReq: 'auroria', monsters: ['elf', 'elf_scout', 'elf_arcanist'], goldMult: 1.4, xpMult: 1.35, theme: ['#3f7052', '#1e3d2b'], boss: 'elf', requiresBossOf: 'spider_burrow' },
  old_graveyard: { city: 'thais', name: 'Cemitério Antigo', icon: '💀', worldReq: 'auroria', monsters: ['skeleton', 'ghoul'], goldMult: 1.45, xpMult: 1.38, theme: ['#5a5560', '#211f28'], boss: 'ghoul', requiresBossOf: 'elf_woods' },
  minotaur_den:  { city: 'thais', name: 'Covil dos Minotauros', icon: '🐂', worldReq: 'auroria', monsters: ['minotaur', 'minotaur_archer', 'minotaur_mage', 'minotaur_guard'], goldMult: 1.48, xpMult: 1.39, theme: ['#7a5a3a', '#3a2818'], boss: 'minotaur_guard', requiresBossOf: 'old_graveyard' },
  cyclops_camp:  { city: 'thais', name: 'Acampamento Cyclops', icon: '🗿', worldReq: 'auroria', monsters: ['cyclops', 'juvenile_cyclops', 'cyclops_drone', 'cyclops_smith'], goldMult: 1.5, xpMult: 1.4, theme: ['#8a6a4a', '#4a3524'], boss: 'cyclops_smith', requiresBossOf: 'minotaur_den' },
  amazon_camp:   { city: 'carlin', name: 'Acampamento Amazona', icon: '🏹', worldReq: 'auroria', monsters: ['amazon', 'valkyrie'], goldMult: 1.8, xpMult: 1.6, theme: ['#5e7d3f', '#2e4a1f'], boss: 'valkyrie', requiresBossOf: 'cyclops_camp' },
  bandit_hideout:{ city: 'carlin', name: 'Esconderijo de Bandidos', icon: '🏴', worldReq: 'auroria', monsters: ['bandit', 'poacher'], goldMult: 1.9, xpMult: 1.7, theme: ['#6b5a3f', '#332a1c'], boss: 'poacher', requiresBossOf: 'amazon_camp' },
  scarab_desert: { city: 'ankrahmun', name: 'Deserto dos Scarabs', icon: '🪲', worldReq: 'auroria', monsters: ['scarab', 'larva'], goldMult: 2.0, xpMult: 1.8, theme: ['#c9a35c', '#8a6a30'], boss: 'scarab', requiresBossOf: 'bandit_hideout' },
  orc_fortress:  { city: 'venore', name: 'Forte dos Orcs', icon: '🏹', worldReq: 'auroria', monsters: ['orc', 'orc_rider', 'orc_shaman'], goldMult: 2.1, xpMult: 1.9, theme: ['#6b3f2f', '#2e1a12'], boss: 'orc_shaman', requiresBossOf: 'scarab_desert' },

  // --- Spectrum (PvP opcional, reqLevel 20) ---
  spider_lair:   { city: 'venore', name: 'Ninho de Giant Spiders', icon: '🕷️', worldReq: 'spectrum', monsters: ['giant_spider', 'tarantula'], goldMult: 2.2, xpMult: 2.0, theme: ['#4a3a5c', '#1c1526'], boss: 'giant_spider' },
  wyvern_ridge:  { city: 'carlin', name: 'Penhasco das Wyverns', icon: '🐲', worldReq: 'spectrum', monsters: ['wyvern'], goldMult: 2.5, xpMult: 2.2, theme: ['#4a6b6b', '#1c2e2e'], boss: 'wyvern', requiresBossOf: 'spider_lair' },
  haunted_ruins: { city: 'ankrahmun', name: 'Ruínas Assombradas', icon: '👻', worldReq: 'spectrum', monsters: ['ghost', 'mummy', 'bonelord'], goldMult: 2.8, xpMult: 2.4, theme: ['#4a3a5c', '#1c1526'], boss: 'mummy', requiresBossOf: 'wyvern_ridge' },
  golem_workshop:{ city: 'darashia', name: 'Oficina dos Golens', icon: '🗿', worldReq: 'spectrum', monsters: ['stone_golem', 'ice_golem', 'fire_elemental'], goldMult: 3.2, xpMult: 2.7, theme: ['#5a5a52', '#232320'], boss: 'stone_golem', requiresBossOf: 'haunted_ruins' },
  djinn_oasis:   { city: 'darashia', name: 'Oásis dos Djinns', icon: '🧞', worldReq: 'spectrum', monsters: ['efreet', 'marid'], goldMult: 3.6, xpMult: 3.1, theme: ['#c9a35c', '#1f4a45'], boss: 'marid', requiresBossOf: 'golem_workshop' },
  worm_hive:     { city: 'venore', name: 'Colmeia de Vermes', icon: '🪱', worldReq: 'spectrum', monsters: ['larva', 'carrion_worm', 'rotworm'], goldMult: 3.9, xpMult: 3.3, theme: ['#5a4a35', '#2e2419'], boss: 'carrion_worm', requiresBossOf: 'djinn_oasis' },

  // --- Bellum (PvP opcional, reqLevel 25) ---
  scorpion_flats:{ city: 'ankrahmun', name: 'Planície dos Escorpiões', icon: '🦂', worldReq: 'bellum', monsters: ['scorpion', 'centipede', 'cobra'], goldMult: 2.6, xpMult: 2.3, theme: ['#c98a4a', '#5c3a1a'], boss: 'scorpion' },
  crypt_shamblers_den:{ city: 'darashia', name: 'Covil dos Crypt Shamblers', icon: '⚰️', worldReq: 'bellum', monsters: ['crypt_shambler', 'priestess'], goldMult: 2.85, xpMult: 2.45, theme: ['#4a4a5c', '#1c1c26'], boss: 'crypt_shambler', requiresBossOf: 'scorpion_flats' },
  dragon_lair:   { city: 'darashia', name: 'Covil dos Dragões', icon: '🔥', worldReq: 'bellum',  monsters: ['dragon', 'dragon_lord'], goldMult: 3.0, xpMult: 2.5, theme: ['#a53d2b', '#4a1810'], boss: 'dragon_lord', requiresBossOf: 'crypt_shamblers_den' },
  frost_peak:    { city: 'svargrond', name: 'Pico Congelado', icon: '🧊', worldReq: 'bellum',  monsters: ['frost_dragon', 'frost_dragon_hatchling'], goldMult: 3.5, xpMult: 3.0, theme: ['#6fa3c9', '#294a63'], boss: 'frost_dragon', requiresBossOf: 'dragon_lair' },
  black_knight_hall:{ city: 'venore', name: 'Salão dos Cavaleiros Negros', icon: '⚔️', worldReq: 'bellum', monsters: ['black_knight'], goldMult: 3.9, xpMult: 3.35, theme: ['#3a4a5c', '#151c26'], boss: 'black_knight', requiresBossOf: 'frost_peak' },
  werewolf_woods:{ city: 'svargrond', name: 'Floresta dos Lobisomens', icon: '🌕', worldReq: 'bellum', monsters: ['werewolf', 'werelion'], goldMult: 4.3, xpMult: 3.9, theme: ['#2e3d24', '#141c10'], boss: 'werewolf', requiresBossOf: 'black_knight_hall' },
  ghastly_ruins: { city: 'porthope', name: 'Ruínas Sombrias', icon: '🐉', worldReq: 'bellum', monsters: ['ghastly_dragon', 'undead_dragon'], goldMult: 4.8, xpMult: 4.1, theme: ['#5c2b3a', '#26101a'], boss: 'ghastly_dragon', requiresBossOf: 'werewolf_woods' },

  // --- Solarian (PvP retro, reqLevel 35) ---
  poison_marsh:  { city: 'porthope', name: 'Pântano Venenoso', icon: '🕸️', worldReq: 'solarian', monsters: ['wasp', 'poison_spider'], goldMult: 3.5, xpMult: 3.0, theme: ['#5c7d3a', '#243315'], boss: 'poison_spider' },
  braindeath_bog:{ city: 'porthope', name: 'Pântano dos Braindeath', icon: '🧠', worldReq: 'solarian', monsters: ['braindeath', 'crypt_shambler'], goldMult: 3.7, xpMult: 3.2, theme: ['#3a4a35', '#161f14'], boss: 'braindeath', requiresBossOf: 'poison_marsh' },
  hydra_swamp:   { city: 'porthope', name: 'Pântano das Hydras', icon: '🐍', worldReq: 'solarian', monsters: ['hydra', 'medusa', 'serpent_spawn'], goldMult: 4.2, xpMult: 3.8, theme: ['#3c6b5e', '#173a30'], boss: 'medusa', requiresBossOf: 'braindeath_bog' },
  wraith_hollow: { city: 'edron', name: 'Covil dos Wraiths', icon: '👤', worldReq: 'solarian', monsters: ['betrayed_wraith', 'crypt_defiler'], goldMult: 4.6, xpMult: 4.0, theme: ['#4a3a5c', '#1a1424'], boss: 'betrayed_wraith', requiresBossOf: 'hydra_swamp' },
  nightmare_den: { city: 'edron', name: 'Covil dos Pesadelos', icon: '🌑', worldReq: 'solarian', monsters: ['nightmare', 'nightmare_scion'], goldMult: 5.6, xpMult: 4.6, theme: ['#3a1f2e', '#150a12'], boss: 'nightmare', requiresBossOf: 'wraith_hollow' },
  hellfire_bastion:{ city: 'cormaya', name: 'Bastião Infernal', icon: '🔥', worldReq: 'solarian', monsters: ['hellfire_fighter', 'dark_torturer'], goldMult: 6.5, xpMult: 5.2, theme: ['#a5391f', '#3a1208'], boss: 'hellfire_fighter', requiresBossOf: 'nightmare_den' },

  // --- Elysian (PvP retro, reqLevel 40) ---
  undead_crypt:  { city: 'edron', name: 'Cripta Profana', icon: '🦴', worldReq: 'elysian', monsters: ['bonebeast', 'banshee', 'vampire', 'blightwalker', 'vampire_bride'], goldMult: 3.8, xpMult: 3.3, theme: ['#5a5560', '#211f28'], boss: 'banshee' },
  lich_lair:     { city: 'edron', name: 'Cripta dos Liches', icon: '☠️', worldReq: 'elysian', monsters: ['lich', 'grim_reaper', 'undead_dragon'], goldMult: 4.0, xpMult: 3.5, theme: ['#4a3a63', '#1a1424'], boss: 'undead_dragon', requiresBossOf: 'undead_crypt' },
  demon_fortress:{ city: 'cormaya', name: 'Fortaleza Demoníaca', icon: '💀', worldReq: 'elysian', monsters: ['demon', 'fury', 'hellhound'], goldMult: 5.0, xpMult: 4.0, theme: ['#7a1f1f', '#2b0a0a'], boss: 'demon', requiresBossOf: 'lich_lair' },
  war_golem_yard:{ city: 'cormaya', name: 'Pátio dos War Golems', icon: '🤖', worldReq: 'elysian', monsters: ['war_golem', 'rustheap_golem'], goldMult: 6.8, xpMult: 5.4, theme: ['#5c5c52', '#242420'], boss: 'war_golem', requiresBossOf: 'demon_fortress' },
  falcon_bastion:{ city: 'cormaya', name: 'Bastião Falcão', icon: '🦅', worldReq: 'elysian', monsters: ['falcon_knight', 'falcon_paladin'], goldMult: 7.6, xpMult: 5.9, theme: ['#4a6b8a', '#1c2e3f'], boss: 'falcon_knight', requiresBossOf: 'war_golem_yard' },
  vexclaw_canyon:{ city: 'yalahar', name: 'Desfiladeiro dos Vexclaw', icon: '🦞', worldReq: 'elysian', monsters: ['vexclaw', 'retching_horror', 'nightstalker'], goldMult: 9.0, xpMult: 6.5, theme: ['#8a4a2f', '#3a1c10'], boss: 'vexclaw', requiresBossOf: 'falcon_bastion' },
  feversleep_marsh:{ city: 'yalahar', name: 'Pântano Feversleep', icon: '💤', worldReq: 'elysian', monsters: ['feversleep', 'nightmare'], goldMult: 10.0, xpMult: 7.0, theme: ['#6b7d3a', '#2b3315'], boss: 'feversleep', requiresBossOf: 'vexclaw_canyon' },
  grorlam_grotto:{ city: 'yalahar', name: 'Gruta do Grorlam', icon: '🐖', worldReq: 'elysian', monsters: ['grorlam'], goldMult: 11.5, xpMult: 7.8, theme: ['#2f4a4a', '#101f1f'], boss: 'grorlam', requiresBossOf: 'feversleep_marsh' },
  zorvorax_sanctum:{ city: 'yalahar', name: 'Santuário de Zorvorax', icon: '🔮', worldReq: 'elysian', monsters: ['zorvorax'], goldMult: 13.0, xpMult: 8.5, theme: ['#6b4a8a', '#251536'], boss: 'zorvorax', requiresBossOf: 'grorlam_grotto' },

  // --- Mystian (PvP retro, reqLevel 60, o mundo com os melhores bônus) ---
  hell_gate:     { city: 'roshamuul', name: 'Portão do Inferno', icon: '🔥', worldReq: 'mystian', monsters: ['juggernaut', 'plaguesmith', 'behemoth', 'gazharagoth'], goldMult: 6.0, xpMult: 5.0, theme: ['#a52a1f', '#1f0a08'], boss: 'juggernaut' },
  roshamuul_valley:{ city: 'roshamuul', name: 'Vale Guzzlemaw', icon: '👹', worldReq: 'mystian', monsters: ['frazzlemaw', 'guzzlemaw'], goldMult: 6.5, xpMult: 5.3, theme: ['#7a2a1f', '#2b0a08'], boss: 'guzzlemaw' },
  boss_sanctum:  { city: 'roshamuul', name: 'Santuário dos Bosses', icon: '🌀', worldReq: 'mystian', monsters: ['lothlorien', 'executioner', 'morgul', 'corrupted_one', 'nzoth'], goldMult: 8.0, xpMult: 6.0, theme: ['#6b4a9c', '#2a1a42'], boss: 'nzoth', requiresBossOf: 'hell_gate' },
  draken_wastes: { city: 'zao', name: 'Terras Draken', icon: '🐲', worldReq: 'mystian', monsters: ['draken_abomination', 'draken_warmaster'], goldMult: 14.0, xpMult: 9.0, theme: ['#5c2f2f', '#241010'], boss: 'draken_warmaster', requiresBossOf: 'boss_sanctum' },
  corruption_spire:{ city: 'zao', name: 'Torre da Corrupção', icon: '🕸️', worldReq: 'mystian', monsters: ['zulazza', 'latrivan'], goldMult: 15.5, xpMult: 9.8, theme: ['#3a2050', '#140a1f'], boss: 'latrivan', requiresBossOf: 'draken_wastes' },
  abyssal_throne:{ city: 'zao', name: 'Trono Abissal', icon: '😈', worldReq: 'mystian', monsters: ['ushuriel', 'madareth'], goldMult: 17.0, xpMult: 10.6, theme: ['#4a1520', '#1a060a'], boss: 'madareth', requiresBossOf: 'corruption_spire' },
  void_rift:     { city: 'zao', name: 'Fenda do Vazio', icon: '🔺', worldReq: 'mystian', monsters: ['zamulosh', 'shulgrax', 'tanjis'], goldMult: 18.5, xpMult: 11.5, theme: ['#1a1a3a', '#08081a'], boss: 'tanjis', requiresBossOf: 'abyssal_throne' },
  zao_draken_walls:{ city: 'zao', name: 'Muralhas Draken', icon: '🐲', worldReq: 'mystian', monsters: ['draken_elite', 'draken_spellweaver', 'draptor'], goldMult: 13.0, xpMult: 8.5, theme: ['#5c2f2f', '#241010'], boss: 'draken_elite' },
  ferumbras_citadel:{ city: 'ferumbras', name: 'Cidadela de Ferumbras', icon: '👑', worldReq: 'mystian', monsters: ['ferumbras', 'pale_worm', 'diblis', 'soul_despoiler', 'ferumbras_mortal_shell', 'devovorga'], goldMult: 20.0, xpMult: 13.0, theme: ['#3a1a5c', '#12081f'], boss: 'ferumbras', requiresBossOf: 'void_rift' },

  // --- Novas hunts das cidades (criaturas adicionadas acima). São hunts
  // "avulsas": liberadas só pelo nível mínimo (sem cadeia de boss), pra dar mais
  // opções de caçada em cada cidade sem travar atrás da progressão principal. ---
  fibula_dungeon:  { city: 'thais',     name: 'Masmorra de Fibula', icon: '🐾',  worldReq: 'auroria', monsters: ['stalker', 'cave_rat', 'rotworm', 'bat'], goldMult: 1.1, xpMult: 1.1, theme: ['#4a4234', '#231f18'], boss: 'stalker' },
  terror_valley:   { city: 'porthope', name: 'Vale dos Terror Birds', icon: '🦤', worldReq: 'spectrum', monsters: ['terror_bird'], goldMult: 2.4, xpMult: 2.1, theme: ['#c9a35c', '#8a6a30'], boss: 'terror_bird' },
  terramite_hive:  { city: 'ankrahmun', name: 'Formigueiro Terramite', icon: '🐜', worldReq: 'solarian', monsters: ['terramite', 'ancient_scarab'], goldMult: 4.2, xpMult: 3.7, theme: ['#c98a4a', '#5c3a1a'], boss: 'ancient_scarab' },
  tiquanda_jungle: { city: 'porthope',  name: 'Selva de Tiquanda', icon: '🌴', worldReq: 'solarian', monsters: ['sibang', 'kongra', 'merlkin'], goldMult: 3.3, xpMult: 2.9, theme: ['#2e5c2e', '#0f2b0f'], boss: 'kongra' },
  ice_caves:       { city: 'svargrond', name: 'Cavernas de Gelo', icon: '❄️', worldReq: 'bellum', monsters: ['frost_troll', 'ice_golem'], goldMult: 3.0, xpMult: 2.6, theme: ['#6fa3c9', '#294a63'], boss: 'ice_golem' },
  yeti_peak:       { city: 'svargrond', name: 'Pico dos Yetis', icon: '🦣', worldReq: 'bellum', monsters: ['yeti', 'crystal_wolf', 'frost_giant'], goldMult: 4.0, xpMult: 3.5, theme: ['#8fb8d9', '#3a5a73'], boss: 'yeti' },
  crystal_nest:    { city: 'svargrond', name: 'Ninho de Aranhas de Cristal', icon: '🕸️', worldReq: 'bellum', monsters: ['crystal_spider'], goldMult: 4.6, xpMult: 4.0, theme: ['#a9c9e0', '#4a6b85'], boss: 'crystal_spider' },
  wyrm_cavern:     { city: 'darashia',  name: 'Caverna dos Wyrms', icon: '🐉', worldReq: 'spectrum', monsters: ['wyrm'], goldMult: 4.2, xpMult: 3.8, theme: ['#4a6b6b', '#1c2e2e'], boss: 'wyrm' },
  hero_tower:      { city: 'edron',     name: 'Torre dos Heróis', icon: '🦸', worldReq: 'elysian', monsters: ['hero', 'dark_magician', 'dark_apprentice'], goldMult: 5.0, xpMult: 4.2, theme: ['#4a3a5c', '#1a1424'], boss: 'hero' },
  dworc_camp:      { city: 'porthope',  name: 'Acampamento Dworc', icon: '🌀', worldReq: 'auroria', monsters: ['dworc_venomsniper', 'dworc_fighter', 'dworc'], goldMult: 1.85, xpMult: 1.65, theme: ['#5c3a6b', '#241a33'], boss: 'dworc' },
  mutant_ward:     { city: 'yalahar',   name: 'Ala dos Mutantes', icon: '🧟', worldReq: 'auroria', monsters: ['mutated_human', 'slime', 'mutated_rat'], goldMult: 1.55, xpMult: 1.45, theme: ['#4a6b3a', '#1f331a'], boss: 'mutated_human' },
  warlock_tower:   { city: 'carlin',    name: 'Torre do Warlock', icon: '🧙', worldReq: 'solarian', monsters: ['warlock'], goldMult: 4.3, xpMult: 3.9, theme: ['#3a1a5c', '#150a24'], boss: 'warlock' },
  carlin_sewers:   { city: 'carlin',    name: 'Esgoto de Carlin', icon: '🐛', worldReq: 'auroria', monsters: ['bug', 'poison_spider', 'slime'], goldMult: 1.15, xpMult: 1.12, theme: ['#4a4234', '#231f18'], boss: 'slime' },
  ankrahmun_tombs: { city: 'ankrahmun', name: 'Túmulo da Península', icon: '🏺', worldReq: 'solarian', monsters: ['fleshcrawler', 'omruc'], goldMult: 5.0, xpMult: 4.3, theme: ['#c9a35c', '#5c3a1a'], boss: 'omruc' },
  porthope_water_dungeon:{ city: 'porthope', name: 'Calabouço dos Elementais', icon: '💧', worldReq: 'bellum', monsters: ['crocodile', 'massive_water_elemental'], goldMult: 3.0, xpMult: 2.6, theme: ['#2a5c6b', '#0f2e33'], boss: 'massive_water_elemental' },
  thais_dragon_cave:{ city: 'thais', name: 'Caverna dos Dragões', icon: '🐉', worldReq: 'bellum', monsters: ['dragon'], goldMult: 2.5, xpMult: 2.2, theme: ['#8a3020', '#3a1410'], boss: 'dragon' },
  femor_hills:     { city: 'carlin', name: 'Colinas de Femor', icon: '👺', worldReq: 'auroria', monsters: ['goblin', 'cyclops'], goldMult: 1.15, xpMult: 1.1, theme: ['#5c6b3a', '#33401f'], boss: 'cyclops' },
  yalahar_sunken_quarter:{ city: 'yalahar', name: 'Bairro Afundado', icon: '🦑', worldReq: 'spectrum', monsters: ['quara_pincher', 'quara_hydromancer'], goldMult: 3.3, xpMult: 2.9, theme: ['#1f3a5c', '#0a1826'], boss: 'quara_pincher' },
};

export const MONSTERS = {
  // --- Bestiário clássico de Tibia (o mundo do RubinOT) ---
  cave_rat:      { name: 'Cave Rat', icon: '🐀', hp: 30,  atk: 10,  def: 1,  xp: 10,   gold: [0,2],   loot: [['cheese',0.4]] },
  goblin:        { name: 'Goblin', icon: '👺', hp: 50,  atk: 10,  def: 2,  xp: 25,  gold: [1,4],   loot: [['goblin_ear',0.5],['bones',0.3]], spells: [{ element: 'physical', min: 0, max: 25 }] },
  dwarf:         { name: 'Dwarf', icon: '⛏️', hp: 90,  atk: 30, def: 5,  xp: 45,  gold: [3,10],  loot: [['dwarven_ring',0.02],['studded_armor',0.05]] },
  dwarf_soldier: { name: 'Dwarf Soldier', icon: '⛏️', hp: 135, atk: 70, def: 10, xp: 75,  gold: [5,16],  loot: [['studded_armor',0.06],['halberd',0.02]], spells: [{ element: 'physical', min: 0, max: 60 }] },
  dwarf_geomancer:{ name: 'Dwarf Geomancer', icon: '🪄', hp: 380, atk: 100, def: 8,  xp: 140, gold: [8,25],  loot: [['wand_of_vortex',0.03],['dwarven_ring',0.02]], spells: [{ element: 'earth', min: 50, max: 110 }, { element: 'death', min: 25, max: 80 }] },
  dwarf_guard:   { name: 'Dwarf Guard', icon: '🛡️', hp: 245, atk: 140, def: 18, xp: 165, gold: [10,30], loot: [['dwarven_ring',0.03],['halberd',0.04]] },
  elf:           { name: 'Elf', icon: '🧝', hp: 100, atk: 15, def: 4,  xp: 42,  gold: [3,9],   loot: [['elvish_talisman',0.3],['power_bolt',0.4]], spells: [{ element: 'physical', min: 0, max: 25 }] },
  dworc:         { name: 'Dworc Voodoomaster', icon: '🌀', hp: 80,  atk: 20, def: 4,  xp: 55,  gold: [2,8],   loot: [['orc_tooth',0.4],['spider_fangs',0.2]], spells: [{ element: 'death', min: 0, max: 40 }, { element: 'earth', min: 6, max: 18 }] },
  dworc_fighter: { name: 'Dworc Fleshhunter', icon: '🪓', hp: 140, atk: 50, def: 8,  xp: 70,  gold: [3,10],  loot: [['orc_tooth',0.5],['studded_armor',0.05]] },
  dworc_venomsniper:{ name: 'Dworc Venomsniper', icon: '🏹', hp: 70,  atk: 15, def: 3,  xp: 60,  gold: [2,9],   loot: [['orc_tooth',0.4],['spider_fangs',0.3]], spells: [{ element: 'earth', min: 10, max: 30 }] },
  scarab:        { name: 'Scarab', icon: '🪲', hp: 320, atk: 75, def: 12, xp: 120, gold: [8,25],  loot: [['scarab_coin',0.3],['meat',0.4]], spells: [{ element: 'earth', min: 0, max: 35 }] },
  mutated_human: { name: 'Mutated Human', icon: '🧟', hp: 240, atk: 90, def: 8,  xp: 150, gold: [10,28], loot: [['mutated_flesh',0.5],['studded_armor',0.04]], spells: [{ element: 'death', min: 50, max: 60 }, { element: 'earth', min: 190, max: 280 }] },
  frost_dragon:  { name: 'Frost Dragon', icon: '🧊', hp: 1800,atk: 225,def: 35, xp: 2100,gold: [90,190], loot: [['ice_rapier',0.02],['dragon_scale',0.4],['life_crystal',0.3]], spells: [{ element: 'death', min: 175, max: 380 }, { element: 'ice', min: 100, max: 240 }, { element: 'physical', min: 0, max: 220 }] },
  warlock:       { name: 'Warlock', icon: '🧙', hp: 3500,atk: 130,def: 40, xp: 4000,gold: [140,280],loot: [['skull_staff',0.03],['demon_dust',0.3],['crystal_coin',0.03],['boots_of_haste',0.004]], spells: [{ element: 'energy', min: 150, max: 230 }, { element: 'fire', min: 50, max: 180 }, { element: 'death', min: 0, max: 120 }] },
  bonebeast:     { name: 'Bonebeast', icon: '🦴', hp: 515, atk: 200, def: 22, xp: 580, gold: [30,80],  loot: [['bones',0.9],['plate_legs',0.03]], spells: [{ element: 'earth', min: 50, max: 90 }, { element: 'death', min: 25, max: 47 }] },
  banshee:       { name: 'Banshee', icon: '👤', hp: 1000,atk: 100, def: 28, xp: 900, gold: [50,120], loot: [['life_crystal',0.2],['death_ring',0.01]], spells: [{ element: 'death', min: 55, max: 350 }] },
  vampire:       { name: 'Vampire', icon: '🧛', hp: 475, atk: 150, def: 20, xp: 305, gold: [25,70],  loot: [['vampire_dust',0.4],['strange_helmet',0.01]], spells: [{ element: 'death', min: 50, max: 200 }] },
  grim_reaper:   { name: 'Grim Reaper', icon: '⚰️', hp: 3900,atk: 320,def: 45, xp: 5500,gold: [150,320],loot: [['demon_dust',0.5],['death_ring',0.03],['crystal_coin',0.05]], spells: [{ element: 'physical', min: 0, max: 300 }, { element: 'death', min: 350, max: 720 }] },
  fury:          { name: 'Fury', icon: '😡', hp: 4100,atk: 510,def: 42, xp: 4000,gold: [150,300],loot: [['demon_dust',0.4],['titan_axe',0.005],['platinum_coin',0.6]], spells: [{ element: 'fire', min: 200, max: 300 }, { element: 'death', min: 120, max: 700 }] },
  hellhound:     { name: 'Hellhound', icon: '🐕', hp: 7500,atk: 520,def: 50, xp: 5440,gold: [180,380],loot: [['hellhound_slobber',0.3],['demon_dust',0.5],['crystal_coin',0.08]], spells: [{ element: 'earth', min: 300, max: 700 }, { element: 'death', min: 350, max: 976 }, { element: 'fire', min: 350, max: 660 }] },
  plaguesmith:   { name: 'Plaguesmith', icon: '🔨', hp: 8250,atk: 539,def: 55, xp: 3800,gold: [160,340],loot: [['behemoth_claw',0.2],['giant_sword',0.008],['platinum_coin',0.7]], spells: [{ element: 'earth', min: 100, max: 350 }] },
  rotworm:       { name: 'Rotworm', icon: '🪱', hp: 65,  atk: 40,  def: 2,  xp: 40,  gold: [1,5],   loot: [['meat',0.7],['worm_dirt',0.5]] },
  troll:         { name: 'Troll', icon: '👹', hp: 50,  atk: 15,  def: 3,  xp: 20,  gold: [2,6],   loot: [['bones',0.9],['leather_boots',0.12]] },
  orc:           { name: 'Orc', icon: '🗡️', hp: 70,  atk: 35, def: 4,  xp: 25,  gold: [3,8],   loot: [['orc_tooth',0.5],['studded_armor',0.06]] },
  cyclops:       { name: 'Cyclops', icon: '🗿', hp: 260, atk: 105, def: 10, xp: 150, gold: [10,30], loot: [['cyclops_toe',0.4],['halberd',0.04]] },
  juvenile_cyclops:{ name: 'Juvenile Cyclops', icon: '🗿', hp: 220, atk: 22, def: 8,  xp: 120, gold: [8,24],  loot: [['cyclops_toe',0.3],['bones',0.4]] },
  cyclops_drone: { name: 'Cyclops Drone', icon: '🗿', hp: 325, atk: 105, def: 12, xp: 200, gold: [12,34], loot: [['cyclops_toe',0.4],['studded_armor',0.05]], spells: [{ element: 'physical', min: 0, max: 80 }] },
  cyclops_smith: { name: 'Cyclops Smith', icon: '🗿', hp: 435, atk: 150, def: 15, xp: 255, gold: [16,42], loot: [['cyclops_toe',0.5],['halberd',0.05],['iron_helmet',0.05]], spells: [{ element: 'physical', min: 0, max: 70 }] },
  minotaur:      { name: 'Minotaur', icon: '🐂', hp: 100, atk: 45, def: 6,  xp: 50,  gold: [5,15],  loot: [['minotaur_horn',0.4],['chain_armor',0.05]] },
  minotaur_archer:{ name: 'Minotaur Archer', icon: '🐂', hp: 100, atk: 25, def: 5,  xp: 65, gold: [6,18],  loot: [['minotaur_horn',0.3],['power_bolt',0.4]], spells: [{ element: 'physical', min: 0, max: 80 }] },
  minotaur_mage: { name: 'Minotaur Mage', icon: '🐂', hp: 155, atk: 20, def: 7,  xp: 150, gold: [10,28], loot: [['minotaur_horn',0.4],['wand_of_vortex',0.02]], spells: [{ element: 'energy', min: 20, max: 58 }, { element: 'fire', min: 50, max: 105 }] },
  minotaur_guard:{ name: 'Minotaur Guard', icon: '🐂', hp: 185, atk: 100, def: 10, xp: 160, gold: [12,32], loot: [['minotaur_horn',0.5],['chain_armor',0.06],['studded_shield',0.04]] },
  amazon:        { name: 'Amazon', icon: '🏹', hp: 110, atk: 45, def: 5,  xp: 60,  gold: [4,10],  loot: [['amazon_armor',0.08],['power_bolt',0.5]], spells: [{ element: 'physical', min: 0, max: 40 }] },
  valkyrie:      { name: 'Valkyrie', icon: '⚔️', hp: 190, atk: 70, def: 12, xp: 85, gold: [8,20],  loot: [['gold_coin',1.0]], spells: [{ element: 'physical', min: 0, max: 50 }] },
  giant_spider:  { name: 'Giant Spider', icon: '🕷️', hp: 1300,atk: 300, def: 20, xp: 900, gold: [40,100], loot: [['spider_silk',0.4],['knight_armor',0.02],['plate_legs',0.05]], spells: [{ element: 'earth', min: 40, max: 70 }] },
  tarantula:     { name: 'Tarantula', icon: '🕸️', hp: 225, atk: 90, def: 10, xp: 120, gold: [8,25],  loot: [['spider_fangs',0.6]] },
  dragon:        { name: 'Dragon', icon: '🐉', hp: 1000,atk: 120, def: 25, xp: 700, gold: [40,105], loot: [['dragon_scale',0.6],['dragon_ham',0.8],['dragonbone_staff',0.02]], spells: [{ element: 'fire', min: 100, max: 170 }] },
  dragon_lord:   { name: 'Dragon Lord', icon: '🔴', hp: 1900,atk: 230,def: 35, xp: 2100,gold: [100,200],loot: [['royal_helmet',0.01],['life_crystal',0.5]], spells: [{ element: 'fire', min: 150, max: 230 }] },
  hydra:         { name: 'Hydra', icon: '🐍', hp: 2350,atk: 270,def: 40, xp: 2100,gold: [100,250],loot: [['hydra_head',0.3],['hydra_egg',0.05],['medusa_shield',0.01]], spells: [{ element: 'ice', min: 100, max: 250 }, { element: 'earth', min: 66, max: 320 }] },
  medusa:        { name: 'Medusa', icon: '🐍', hp: 4500,atk: 450,def: 45, xp: 4050,gold: [150,300],loot: [['strand_of_medusa_hair',0.2],['titan_axe',0.008]], spells: [{ element: 'death', min: 75, max: 150 }, { element: 'earth', min: 250, max: 500 }] },
  lich:          { name: 'Lich', icon: '💀', hp: 880, atk: 75,def: 30, xp: 900, gold: [80,160], loot: [['death_ring',0.02]], spells: [{ element: 'death', min: 200, max: 245 }, { element: 'earth', min: 300, max: 400 }] },
  undead_dragon: { name: 'Undead Dragon', icon: '☠️', hp: 8350,atk: 480,def: 50, xp: 7500,gold: [200,400],loot: [['necromancer_shield',0.02],['dragon_scale_legs',0.005]], spells: [{ element: 'physical', min: 300, max: 400 }, { element: 'death', min: 300, max: 700 }, { element: 'earth', min: 150, max: 690 }] },
  behemoth:      { name: 'Behemoth', icon: '🦣', hp: 4000,atk: 455,def: 45, xp: 2500,gold: [150,300],loot: [['behemoth_claw',0.3],['giant_sword',0.015],['crystal_coin',0.05]], spells: [{ element: 'physical', min: 0, max: 200 }] },
  demon:         { name: 'Demon', icon: '😈', hp: 8200,atk: 500,def: 55, xp: 6000,gold: [200,400],loot: [['demon_dust',0.5],['demon_shield',0.01],['magic_plate_armor',0.005],['platinum_coin',0.8]], spells: [{ element: 'fire', min: 150, max: 250 }, { element: 'energy', min: 210, max: 300 }, { element: 'death', min: 300, max: 480 }] },
  juggernaut:    { name: 'Juggernaut', icon: '💥', hp: 20000,atk: 1470,def: 65, xp: 11200,gold: [300,600],loot: [['titan_axe',0.01],['crystal_coin',0.15]], spells: [{ element: 'physical', min: 0, max: 780 }] },
  // --- Bosses exclusivos do RubinOT (salas de Linked Tasks) ---
  lothlorien:    { name: 'Lothlorien', icon: '🌲', hp: 30000,atk: 280,def: 70, xp: 25000,gold: [400,800],  loot: [['lothlorien_bow',0.02],['crystal_coin',0.4],['rubini_shard',0.3]] },
  executioner:   { name: 'Executioner', icon: '🪓', hp: 35000,atk: 320,def: 75, xp: 30000,gold: [500,900],  loot: [['executioner_axe',0.02],['crystal_coin',0.4],['rubini_shard',0.35]] },
  morgul:        { name: 'Morgul', icon: '👻', hp: 40000,atk: 350,def: 80, xp: 35000,gold: [500,1000], loot: [['morgul_blade',0.015],['crystal_coin',0.5],['rubini_shard',0.4]] },
  corrupted_one: { name: 'The Corrupted', icon: '🩸', hp: 50000,atk: 400,def: 90, xp: 45000,gold: [600,1200], loot: [['corrupted_heart',0.1],['crystal_coin',0.6],['rubini_shard',0.5]] },
  nzoth:         { name: 'N\'Zoth', icon: '🌀', hp: 80000,atk: 500,def: 100,xp: 70000,gold: [1000,2000],loot: [['nzoth_tentacle',0.2],['rubini_shard',0.8]] },

  // --- 30+ novas zonas (Lv1-100): bestiário adicional, todos monstros REAIS
  // de Tibia (verificados via TibiaWiki API — action=query&titles=... antes de
  // entrar aqui). Stats escalados pela curva de crescimento observada nos 34
  // monstros originais. NOTA: o campo `xp` agora é o valor OFICIAL do Tibia
  // global (via API TibiaData), junto da curva de nível real (domain/character.js:
  // tibiaTotalExp); HP/atk/def seguem escalados pra dificuldade do idle. Uns
  // poucos bosses de endgame cujo XP não pôde ser confirmado mantêm valor
  // aproximado — ver .spec/90-regras-de-negocio-gerais.md.
  rat:                 { name: 'Rat', icon: '🐁', hp: 20, atk: 8, def: 2, xp: 5, gold: [0,3], loot: [['cheese',0.4],['bones',0.2]] },
  mutated_rat:         { name: 'Mutated Rat', icon: '🐀', hp: 80, atk: 40, def: 3, xp: 70, gold: [2,8], loot: [['cheese',0.3],['mutated_flesh',0.15]] },
  bug:                 { name: 'Bug', icon: '🐛', hp: 29, atk: 23, def: 1, xp: 18, gold: [0,1], loot: [['worm_dirt',0.3],['cheese',0.2]] },
  slime:               { name: 'Slime', icon: '🟢', hp: 150, atk: 110, def: 3, xp: 160, gold: [2,6], loot: [['worm_dirt',0.3],['meat',0.2]] },
  snake:               { name: 'Snake', icon: '🐍', hp: 15, atk: 8, def: 4, xp: 10, gold: [3,8], loot: [['meat',0.4],['bones',0.2]] },
  wolf:                { name: 'Wolf', icon: '🐺', hp: 25, atk: 17, def: 4, xp: 18, gold: [3,8], loot: [['meat',0.5],['bones',0.3]] },
  bear:                { name: 'Bear', icon: '🐻', hp: 80, atk: 25, def: 5, xp: 23, gold: [4,10], loot: [['meat',0.6],['leather_boots',0.08]] },
  spider:              { name: 'Spider', icon: '🕷️', hp: 20, atk: 9, def: 4, xp: 12, gold: [3,9], loot: [['spider_fangs',0.3],['worm_dirt',0.2]] },
  bat:                 { name: 'Bat', icon: '🦇', hp: 30, atk: 8, def: 2, xp: 10, gold: [1,5], loot: [['bones',0.3],['cheese',0.2]] },
  skeleton:            { name: 'Skeleton', icon: '💀', hp: 50, atk: 17, def: 6, xp: 35, gold: [5,12], loot: [['bones',0.9],['studded_armor',0.03]], spells: [{ element: 'death', min: 7, max: 13 }] },
  ghoul:               { name: 'Ghoul', icon: '🧟', hp: 100, atk: 70, def: 7, xp: 85, gold: [6,15], loot: [['bones',0.9],['meat',0.5],['leather_boots',0.1]], spells: [{ element: 'death', min: 15, max: 27 }] },
  bandit:              { name: 'Bandit', icon: '🏴', hp: 245, atk: 45, def: 8, xp: 65, gold: [8,20], loot: [['leather_boots',0.1],['gold_coin',1.0]] },
  poacher:             { name: 'Poacher', icon: '🪤', hp: 90, atk: 35, def: 10, xp: 70, gold: [10,25], loot: [['leather_boots',0.15],['studded_armor',0.05],['crossbow',0.03]], spells: [{ element: 'physical', min: 0, max: 35 }] },
  orc_rider:           { name: 'Orc Rider', icon: '🐗', hp: 180, atk: 130, def: 11, xp: 110, gold: [15,32], loot: [['orc_tooth',0.5],['studded_armor',0.06]] },
  orc_shaman:          { name: 'Orc Shaman', icon: '🪄', hp: 115, atk: 15, def: 13, xp: 110, gold: [18,40], loot: [['orc_tooth',0.5],['elvish_talisman',0.15],['wand_of_cosmic_energy',0.02]], spells: [{ element: 'energy', min: 20, max: 35 }, { element: 'fire', min: 5, max: 45 }] },
  quara_pincher:       { name: 'Quara Pincher', icon: '🦀', hp: 1800, atk: 340, def: 18, xp: 1500, gold: [55,90], loot: [['scarab_coin',0.2],['meat',0.3]] },
  wyvern:              { name: 'Wyvern', icon: '🐲', hp: 795, atk: 120, def: 21, xp: 515, gold: [65,110], loot: [['dragon_scale',0.15],['life_crystal',0.08]], spells: [{ element: 'earth', min: 240, max: 240 }] },
  ghost:               { name: 'Ghost', icon: '👻', hp: 150, atk: 80, def: 22, xp: 120, gold: [70,120], loot: [['life_crystal',0.15],['vampire_dust',0.1]], spells: [{ element: 'death', min: 20, max: 45 }] },
  mummy:               { name: 'Mummy', icon: '🪦', hp: 240, atk: 85, def: 27, xp: 150, gold: [85,150], loot: [['bones',0.9],['elvish_talisman',0.2],['death_ring',0.005]], spells: [{ element: 'death', min: 30, max: 40 }] },
  bonelord:            { name: 'Bonelord', icon: '👁️', hp: 260, atk: 5, def: 28, xp: 170, gold: [100,160], loot: [['life_crystal',0.2],['death_ring',0.008]], spells: [{ element: 'energy', min: 15, max: 45 }, { element: 'fire', min: 25, max: 45 }, { element: 'earth', min: 5, max: 45 }, { element: 'death', min: 30, max: 50 }] },
  stone_golem:         { name: 'Stone Golem', icon: '🗿', hp: 270, atk: 110, def: 36, xp: 160, gold: [130,200], loot: [['chain_armor',0.08],['plate_legs',0.06],['crystal_coin',0.03]] },
  efreet:              { name: 'Efreet', icon: '🧞‍♂️', hp: 550, atk: 110, def: 33, xp: 410, gold: [120,190], loot: [['demon_dust',0.15],['fire_sword',0.01]], spells: [{ element: 'fire', min: 40, max: 110 }, { element: 'energy', min: 65, max: 120 }] },
  marid:               { name: 'Marid', icon: '🧞', hp: 550, atk: 90, def: 38, xp: 410, gold: [150,230], loot: [['demon_dust',0.2],['wand_of_inferno',0.01],['crystal_coin',0.05]], spells: [{ element: 'energy', min: 100, max: 250 }, { element: 'death', min: 30, max: 90 }] },
  larva:               { name: 'Larva', icon: '🪱', hp: 70, atk: 35, def: 32, xp: 44, gold: [130,200], loot: [['worm_dirt',0.6],['meat',0.4]] },
  carrion_worm:        { name: 'Carrion Worm', icon: '🪱', hp: 145, atk: 45, def: 40, xp: 70, gold: [160,250], loot: [['worm_dirt',0.5],['life_crystal',0.2],['crystal_coin',0.05]] },
  centipede:           { name: 'Centipede', icon: '🐜', hp: 70, atk: 45, def: 18, xp: 34, gold: [60,100], loot: [['spider_fangs',0.3],['mutated_flesh',0.1]] },
  scorpion:            { name: 'Scorpion', icon: '🦂', hp: 45, atk: 50, def: 22, xp: 45, gold: [70,120], loot: [['spider_fangs',0.35],['scarab_coin',0.15]] },
  priestess:           { name: 'Priestess', icon: '🙏', hp: 390, atk: 75, def: 20, xp: 420, gold: [80,140], loot: [['elvish_talisman',0.2],['death_ring',0.01]], spells: [{ element: 'earth', min: 200, max: 200 }, { element: 'death', min: 2, max: 170 }] },
  crypt_shambler:      { name: 'Crypt Shambler', icon: '⚰️', hp: 330, atk: 140, def: 28, xp: 195, gold: [95,160], loot: [['bones',0.8],['life_crystal',0.15],['necromancer_shield',0.005]], spells: [{ element: 'death', min: 28, max: 55 }] },
  serpent_spawn:       { name: 'Serpent Spawn', icon: '🐍', hp: 3000, atk: 250, def: 38, xp: 3050, gold: [145,210], loot: [['life_crystal',0.15],['mutated_flesh',0.1]], spells: [{ element: 'earth', min: 200, max: 500 }, { element: 'death', min: 200, max: 500 }] },
  black_knight:        { name: 'Black Knight', icon: '⚔️', hp: 1800, atk: 300, def: 42, xp: 1600, gold: [170,260], loot: [['chain_armor',0.1],['studded_shield',0.08],['broadsword',0.05]], spells: [{ element: 'physical', min: 0, max: 200 }] },
  cobra:               { name: 'Cobra', icon: '🐍', hp: 3400, atk: 132, def: 38, xp: 30, gold: [195,300], loot: [['spider_fangs',0.2],['demon_dust',0.1]], spells: [{ element: 'earth', min: 20, max: 40 }] },
  werewolf:            { name: 'Werewolf', icon: '🌕', hp: 1955, atk: 350, def: 46, xp: 1900, gold: [250,380], loot: [['meat',0.5],['leather_boots',0.1],['strange_helmet',0.01]], spells: [{ element: 'death', min: 80, max: 200 }] },
  dark_torturer:       { name: 'Dark Torturer', icon: '🔪', hp: 7350, atk: 500, def: 44, xp: 4650, gold: [250,360], loot: [['demon_dust',0.2],['strange_helmet',0.015]], spells: [{ element: 'physical', min: 0, max: 781 }] },
  ghastly_dragon:      { name: 'Ghastly Dragon', icon: '🐉', hp: 7800, atk: 603, def: 50, xp: 4600, gold: [300,420], loot: [['dragon_scale',0.3],['dragon_ham',0.5],['life_crystal',0.3],['crystal_coin',0.08]], spells: [{ element: 'earth', min: 920, max: 1280 }, { element: 'death', min: 120, max: 250 }] },
  wasp:                { name: 'Wasp', icon: '🐝', hp: 35, atk: 20, def: 30, xp: 24, gold: [110,180], loot: [['demon_dust',0.1],['life_crystal',0.1]] },
  poison_spider:       { name: 'Poison Spider', icon: '🕸️', hp: 26, atk: 20, def: 38, xp: 22, gold: [140,220], loot: [['spider_silk',0.3],['spider_fangs',0.4]] },
  quara_hydromancer:   { name: 'Quara Hydromancer', icon: '🌊', hp: 1900, atk: 118, def: 36, xp: 950, gold: [140,210], loot: [['demon_dust',0.1],['life_crystal',0.15]], spells: [{ element: 'ice', min: 100, max: 180 }, { element: 'death', min: 170, max: 240 }] },
  braindeath:          { name: 'Braindeath', icon: '🧠', hp: 1225, atk: 100, def: 40, xp: 985, gold: [160,250], loot: [['life_crystal',0.2],['death_ring',0.01],['crystal_coin',0.05]], spells: [{ element: 'energy', min: 93, max: 170 }, { element: 'fire', min: 75, max: 125 }, { element: 'earth', min: 65, max: 125 }, { element: 'death', min: 85, max: 170 }] },
  crypt_defiler:       { name: 'Crypt Defiler', icon: '⚰️', hp: 180, atk: 90, def: 40, xp: 70, gold: [230,340], loot: [['demon_dust',0.15],['life_crystal',0.2]], spells: [{ element: 'physical', min: 0, max: 40 }] },
  betrayed_wraith:     { name: 'Betrayed Wraith', icon: '👤', hp: 4200, atk: 450, def: 48, xp: 3500, gold: [270,400], loot: [['life_crystal',0.25],['death_ring',0.02],['crystal_coin',0.07]] },
  fleshcrawler:        { name: 'Fleshcrawler', icon: '🦠', hp: 8000, atk: 178, def: 49, xp: 5900, gold: [260,380], loot: [['demon_dust',0.2],['mutated_flesh',0.1]] },
  nightmare:           { name: 'Nightmare', icon: '🐴', hp: 2700, atk: 150, def: 57, xp: 1800, gold: [300,440], loot: [['demon_dust',0.3],['death_ring',0.025],['crystal_coin',0.1]], spells: [{ element: 'death', min: 120, max: 170 }, { element: 'earth', min: 150, max: 350 }] },
  blightwalker:        { name: 'Blightwalker', icon: '🟣', hp: 8900, atk: 490, def: 58, xp: 6400, gold: [340,500], loot: [['demon_dust',0.25],['platinum_coin',0.5]], spells: [{ element: 'earth', min: 220, max: 405 }, { element: 'death', min: 65, max: 135 }] },
  hellfire_fighter:    { name: 'Hellfire Fighter', icon: '🔥', hp: 3800, atk: 520, def: 66, xp: 3800, gold: [400,600], loot: [['demon_dust',0.35],['platinum_coin',0.7],['crystal_coin',0.12]], spells: [{ element: 'fire', min: 392, max: 1500 }] },
  nightmare_scion:     { name: 'Nightmare Scion', icon: '🌑', hp: 1400, atk: 140, def: 63, xp: 1350, gold: [420,600], loot: [['demon_dust',0.25],['death_ring',0.015]], spells: [{ element: 'earth', min: 115, max: 180 }, { element: 'death', min: 70, max: 130 }] },
  war_golem:           { name: 'War Golem', icon: '🤖', hp: 4300, atk: 550, def: 73, xp: 2680, gold: [500,720], loot: [['chain_armor',0.1],['plate_legs',0.08],['crystal_coin',0.15]], spells: [{ element: 'energy', min: 165, max: 220 }] },
  retching_horror:     { name: 'Retching Horror', icon: '🤢', hp: 5300, atk: 400, def: 75, xp: 4100, gold: [640,900], loot: [['demon_dust',0.3],['platinum_coin',0.6]], spells: [{ element: 'physical', min: 0, max: 200 }, { element: 'fire', min: 200, max: 350 }] },
  falcon_knight:       { name: 'Falcon Knight', icon: '🦅', hp: 9000, atk: 400, def: 86, xp: 6300, gold: [750,1050], loot: [['chain_armor',0.1],['studded_shield',0.1],['crystal_coin',0.18]], spells: [{ element: 'earth', min: 400, max: 500 }, { element: 'holy', min: 290, max: 360 }] },
  draptor:             { name: 'Draptor', icon: '🦖', hp: 55000, atk: 390, def: 88, xp: 2400, gold: [880,1250], loot: [['dragon_scale',0.3],['platinum_coin',0.7]], spells: [{ element: 'energy', min: 130, max: 310 }, { element: 'fire', min: 70, max: 250 }] },
  vexclaw:             { name: 'Vexclaw', icon: '🦞', hp: 8500, atk: 550, def: 101, xp: 6248, gold: [1050,1450], loot: [['demon_dust',0.35],['platinum_coin',1.0],['crystal_coin',0.25]], spells: [{ element: 'fire', min: 150, max: 250 }, { element: 'death', min: 300, max: 490 }, { element: 'energy', min: 210, max: 300 }] },
  werelion:            { name: 'Werelion', icon: '🦁', hp: 70000, atk: 432, def: 98, xp: 2200, gold: [1080,1500], loot: [['demon_dust',0.35],['crystal_coin',0.2]] },
  feversleep:          { name: 'Feversleep', icon: '💤', hp: 5900, atk: 450, def: 113, xp: 5060, gold: [1300,1800], loot: [['dragon_scale',0.3],['titan_axe',0.008],['crystal_coin',0.3]], spells: [{ element: 'earth', min: 800, max: 1000 }, { element: 'death', min: 150, max: 300 }] },
  omruc:               { name: 'Omruc', icon: '🌋', hp: 90000, atk: 480, def: 111, xp: 76000, gold: [1340,1850], loot: [['demon_dust',0.4],['crystal_coin',0.25]], spells: [{ element: 'death', min: 100, max: 250 }, { element: 'earth', min: 200, max: 500 }, { element: 'fire', min: 120, max: 450 }] },
  grorlam:             { name: 'Grorlam', icon: '🐖', hp: 3000, atk: 300, def: 128, xp: 92000, gold: [1600,2200], loot: [['demon_shield',0.008],['platinum_coin',1.2],['crystal_coin',0.35]], spells: [{ element: 'physical', min: 150, max: 200 }] },
  massive_water_elemental:{ name: 'Massive Water Elemental', icon: '💧', hp: 120000, atk: 538, def: 125, xp: 1100, gold: [1650,2300], loot: [['life_crystal',0.3],['platinum_coin',1.0]], spells: [{ element: 'death', min: 330, max: 450 }, { element: 'ice', min: 170, max: 210 }, { element: 'earth', min: 355, max: 420 }] },
  zorvorax:            { name: 'Zorvorax', icon: '🔮', hp: 10000, atk: 385, def: 145, xp: 121000, gold: [2000,2750], loot: [['demon_dust',0.45],['skull_staff',0.01],['crystal_coin',0.4]], spells: [{ element: 'death', min: 300, max: 780 }, { element: 'fire', min: 330, max: 805 }] },
  draken_abomination:  { name: 'Draken Abomination', icon: '👹', hp: 6250, atk: 420, def: 132, xp: 4500, gold: [1850,2600], loot: [['demon_dust',0.4],['crystal_coin',0.35]], spells: [{ element: 'fire', min: 310, max: 630 }, { element: 'death', min: 170, max: 370 }] },
  draken_warmaster:    { name: 'Draken Warmaster', icon: '🐲', hp: 4150, atk: 300, def: 153, xp: 2400, gold: [2250,3100], loot: [['dragon_scale',0.4],['titan_axe',0.01],['crystal_coin',0.5]], spells: [{ element: 'fire', min: 240, max: 520 }] },
  zulazza:             { name: 'Zulazza the Corruptor', icon: '🕸️', hp: 46500, atk: 2100, def: 143, xp: 158000, gold: [2250,3100], loot: [['demon_dust',0.45],['death_ring',0.025]], spells: [{ element: 'physical', min: 500, max: 800 }, { element: 'earth', min: 300, max: 800 }, { element: 'death', min: 50, max: 130 }] },
  latrivan:            { name: 'Latrivan', icon: '⚡', hp: 25000, atk: 878, def: 166, xp: 192000, gold: [2700,3700], loot: [['demon_shield',0.01],['platinum_coin',1.5],['crystal_coin',0.55]], spells: [{ element: 'fire', min: 50, max: 850 }] },
  ushuriel:            { name: 'Ushuriel', icon: '😈', hp: 31500, atk: 1088, def: 156, xp: 208000, gold: [2700,3700], loot: [['demon_dust',0.5],['royal_helmet',0.005]], spells: [{ element: 'physical', min: 250, max: 500 }, { element: 'death', min: 30, max: 760 }, { element: 'earth', min: 200, max: 585 }, { element: 'ice', min: 0, max: 430 }, { element: 'energy', min: 250, max: 250 }] },
  madareth:            { name: 'Madareth', icon: '💥', hp: 75000, atk: 2000, def: 181, xp: 254000, gold: [3250,4400], loot: [['demon_shield',0.012],['titan_axe',0.015],['crystal_coin',0.6]], spells: [{ element: 'energy', min: 180, max: 660 }, { element: 'death', min: 600, max: 850 }] },
  zamulosh:            { name: 'Zamulosh', icon: '🔺', hp: 300000, atk: 2300, def: 168, xp: 265000, gold: [3200,4300], loot: [['demon_dust',0.5],['crystal_coin',0.55]], spells: [{ element: 'death', min: 2600, max: 3300 }, { element: 'fire', min: 900, max: 1500 }] },
  shulgrax:            { name: 'Shulgrax', icon: '🟠', hp: 290000, atk: 2500, def: 186, xp: 315000, gold: [3700,4900], loot: [['magic_plate_armor',0.006],['crystal_coin',0.65]], spells: [{ element: 'fire', min: 500, max: 1000 }, { element: 'death', min: 500, max: 800 }] },
  tanjis:               { name: 'Tanjis', icon: '🔶', hp: 30000, atk: 600, def: 202, xp: 365000, gold: [4300,5600], loot: [['demon_shield',0.015],['royal_helmet',0.01],['crystal_coin',0.75]], spells: [{ element: 'ice', min: 200, max: 400 }, { element: 'death', min: 300, max: 800 }, { element: 'physical', min: 100, max: 400 }, { element: 'energy', min: 200, max: 500 }] },
  pale_worm:           { name: 'The Pale Worm', icon: '⚪', hp: 420000, atk: 840, def: 185, xp: 340000, gold: [3800,5000], loot: [['demon_dust',0.6],['crystal_coin',0.7]] },
  diblis:              { name: 'Diblis the Fair', icon: '💍', hp: 1500, atk: 380, def: 195, xp: 390000, gold: [4200,5600], loot: [['magic_plate_armor',0.008],['crystal_coin',0.8]], spells: [{ element: 'death', min: 0, max: 155 }] },
  soul_despoiler:      { name: 'The Souldespoiler', icon: '🔥', hp: 290000, atk: 783, def: 210, xp: 450000, gold: [4800,6300], loot: [['demon_shield',0.02],['titan_axe',0.02],['crystal_coin',0.85]], spells: [{ element: 'death', min: 125, max: 640 }, { element: 'energy', min: 210, max: 538 }] },
  ferumbras_mortal_shell:{ name: 'Ferumbras Mortal Shell', icon: '⚱️', hp: 300000, atk: 1000, def: 225, xp: 530000, gold: [5400,7000], loot: [['boots_of_haste',0.003],['crystal_coin',0.9]], spells: [{ element: 'earth', min: 250, max: 520 }, { element: 'death', min: 590, max: 1050 }, { element: 'energy', min: 400, max: 650 }] },
  devovorga:           { name: 'Devovorga', icon: '🟪', hp: 750000, atk: 1010, def: 235, xp: 610000, gold: [6000,7800], loot: [['magic_plate_armor',0.012],['crystal_coin',1.0]] },
  gazharagoth:         { name: 'Gaz\'haragoth', icon: '🖤', hp: 350000, atk: 5000, def: 250, xp: 740000, gold: [6800,8800], loot: [['royal_helmet',0.02],['demon_shield',0.02],['crystal_coin',1.1]], spells: [{ element: 'ice', min: 900, max: 1100 }, { element: 'fire', min: 4000, max: 6000 }, { element: 'physical', min: 200, max: 480 }] },
  ferumbras:           { name: 'Ferumbras', icon: '👑', hp: 90000, atk: 350, def: 270, xp: 1000000, gold: [8000,10500], loot: [['boots_of_haste',0.006],['magic_plate_armor',0.02],['crystal_coin',1.3],['titan_axe',0.03]], spells: [{ element: 'death', min: 300, max: 700 }, { element: 'earth', min: 250, max: 550 }, { element: 'energy', min: 200, max: 400 }, { element: 'fire', min: 200, max: 800 }] },

  // --- Criaturas adicionadas com as novas cidades (sprites reais do TibiaWiki) ---
  stalker:         { name: 'Stalker', icon: '🐾', hp: 120,   atk: 70,  def: 3,  xp: 40,   gold: [1,8],    loot: [['bones',0.3],['spider_silk',0.02]], spells: [{ element: 'death', min: 20, max: 30 }] },
  crocodile:       { name: 'Crocodile', icon: '🐊', hp: 190,  atk: 20,  def: 8,  xp: 120,  gold: [5,18],   loot: [['meat',0.5]] },
  sibang:          { name: 'Sibang', icon: '🐒', hp: 225,  atk: 40,  def: 10, xp: 100,  gold: [3,15],   loot: [['cheese',0.3],['bones',0.2]], spells: [{ element: 'physical', min: 0, max: 55 }] },
  merlkin:         { name: 'Merlkin', icon: '🦧', hp: 235,  atk: 30,  def: 12, xp: 130,  gold: [5,20],   loot: [['elvish_talisman',0.1],['meat',0.3]], spells: [{ element: 'fire', min: 60, max: 90 }, { element: 'energy', min: 15, max: 45 }] },
  kongra:          { name: 'Kongra', icon: '🦍', hp: 340,  atk: 60,  def: 15, xp: 175,  gold: [10,28],  loot: [['meat',0.4],['orc_tooth',0.2]] },
  terror_bird:     { name: 'Terror Bird', icon: '🦤', hp: 300,  atk: 90,  def: 12, xp: 150,  gold: [8,24],   loot: [['meat',0.4]] },
  terramite:       { name: 'Terramite', icon: '🐜', hp: 365,  atk: 100,  def: 25, xp: 500,  gold: [20,60],  loot: [['bones',0.4],['scarab_coin',0.15]], spells: [{ element: 'earth', min: 5, max: 16 }] },
  ancient_scarab:  { name: 'Ancient Scarab', icon: '🪲', hp: 1000,  atk: 210,  def: 30, xp: 750,  gold: [40,90],  loot: [['scarab_coin',0.5],['strange_helmet',0.01]], spells: [{ element: 'earth', min: 440, max: 520 }] },
  frost_troll:     { name: 'Frost Troll', icon: '❄️', hp: 55,   atk: 20,   def: 3,  xp: 30,   gold: [1,10],   loot: [['meat',0.3],['leather_boots',0.1]] },
  ice_golem:       { name: 'Ice Golem', icon: '🧊', hp: 385,  atk: 220,  def: 30, xp: 260,  gold: [15,45],  loot: [['life_crystal',0.06]], spells: [{ element: 'ice', min: 50, max: 85 }] },
  yeti:            { name: 'Yeti', icon: '🦣', hp: 950,  atk: 200,  def: 22, xp: 580,  gold: [30,80],  loot: [['meat',0.4],['life_crystal',0.05]], spells: [{ element: 'physical', min: 0, max: 180 }, { element: 'energy', min: 0, max: 175 }] },
  crystal_wolf:    { name: 'Crystal Wolf', icon: '🐺', hp: 750,  atk: 80,  def: 30, xp: 900,  gold: [40,110], loot: [['life_crystal',0.08]], spells: [{ element: 'earth', min: 60, max: 130 }, { element: 'ice', min: 80, max: 150 }, { element: 'death', min: 25, max: 80 }] },
  crystal_spider:  { name: 'Crystal Spider', icon: '🕸️', hp: 1250, atk: 250,  def: 35, xp: 1400, gold: [60,140], loot: [['spider_silk',0.3],['life_crystal',0.1]], spells: [{ element: 'ice', min: 50, max: 100 }] },
  wyrm:            { name: 'Wyrm', icon: '🐉', hp: 1825, atk: 235, def: 40, xp: 1600, gold: [80,170], loot: [['dragon_scale',0.3],['life_crystal',0.15]], spells: [{ element: 'energy', min: 100, max: 220 }, { element: 'death', min: 98, max: 145 }] },
  hero:            { name: 'Hero', icon: '🦸', hp: 1400, atk: 240,  def: 35, xp: 1500, gold: [70,160], loot: [['plate_legs',0.05],['giant_sword',0.005]], spells: [{ element: 'physical', min: 0, max: 120 }] },
  nightstalker:    { name: 'Nightstalker', icon: '🌚', hp: 1150, atk: 88,  def: 30, xp: 1200, gold: [50,130], loot: [['demon_dust',0.1]], spells: [{ element: 'death', min: 60, max: 170 }] },

  // --- Auditoria de hunts (2026-07-13): família real de criaturas 1-monstro +
  // moradas dos órfãos, verificado via TibiaWiki antes de entrar aqui (ver
  // .spec/90-regras-de-negocio-gerais.md). xp é o valor oficial do Tibia; hp/
  // atk/def seguem a mesma curva escalada dos demais (não são o hp real).
  elf_scout:           { name: 'Elf Scout', icon: '🏹', hp: 160, atk: 35, def: 6, xp: 75, gold: [5,14], loot: [['elvish_talisman',0.35],['power_bolt',0.5]], spells: [{ element: 'physical', min: 0, max: 45 }] },
  elf_arcanist:        { name: 'Elf Arcanist', icon: '🪄', hp: 220, atk: 20, def: 8, xp: 175, gold: [8,20], loot: [['elvish_talisman',0.4],['wand_of_vortex',0.03],['crystal_coin',0.02]], spells: [{ element: 'energy', min: 30, max: 70 }, { element: 'earth', min: 20, max: 50 }] },
  dark_magician:       { name: 'Dark Magician', icon: '🧙', hp: 200, atk: 20, def: 10, xp: 185, gold: [10,22], loot: [['bones',0.4],['life_crystal',0.05]], spells: [{ element: 'death', min: 20, max: 50 }, { element: 'energy', min: 15, max: 40 }] },
  dark_apprentice:     { name: 'Dark Apprentice', icon: '📕', hp: 90, atk: 15, def: 5, xp: 90, gold: [4,12], loot: [['bones',0.3]], spells: [{ element: 'death', min: 10, max: 25 }] },
  rustheap_golem:      { name: 'Rustheap Golem', icon: '⚙️', hp: 2600, atk: 260, def: 60, xp: 2350, gold: [180,280], loot: [['chain_armor',0.08],['crystal_coin',0.1]], spells: [{ element: 'earth', min: 80, max: 150 }] },
  falcon_paladin:      { name: 'Falcon Paladin', icon: '🦅', hp: 8500, atk: 380, def: 90, xp: 6900, gold: [780,1100], loot: [['chain_armor',0.1],['studded_shield',0.1],['crystal_coin',0.2]], spells: [{ element: 'physical', min: 0, max: 300 }, { element: 'holy', min: 200, max: 300 }] },
  frost_dragon_hatchling:{ name: 'Frost Dragon Hatchling', icon: '🐣', hp: 700, atk: 90, def: 20, xp: 745, gold: [30,70], loot: [['dragon_scale',0.2],['meat',0.4]], spells: [{ element: 'ice', min: 40, max: 90 }] },
  frost_giant:         { name: 'Frost Giant', icon: '🏔️', hp: 220, atk: 60, def: 12, xp: 150, gold: [20,55], loot: [['meat',0.3],['leather_boots',0.05]], spells: [{ element: 'ice', min: 0, max: 70 }] },
  fire_elemental:      { name: 'Fire Elemental', icon: '🔥', hp: 260, atk: 70, def: 14, xp: 220, gold: [15,40], loot: [['demon_dust',0.1],['meat',0.2]], spells: [{ element: 'fire', min: 30, max: 80 }] },
  vampire_bride:       { name: 'Vampire Bride', icon: '🧛‍♀️', hp: 900, atk: 160, def: 25, xp: 1200, gold: [60,140], loot: [['vampire_dust',0.4],['life_crystal',0.15]], spells: [{ element: 'death', min: 60, max: 150 }] },
  draken_elite:        { name: 'Draken Elite', icon: '🐲', hp: 5400, atk: 420, def: 130, xp: 4750, gold: [1900,2650], loot: [['dragon_scale',0.35],['crystal_coin',0.4]], spells: [{ element: 'fire', min: 250, max: 500 }, { element: 'physical', min: 0, max: 300 }] },
  draken_spellweaver:  { name: 'Draken Spellweaver', icon: '🪄', hp: 3200, atk: 250, def: 110, xp: 3100, gold: [1400,2000], loot: [['dragon_scale',0.25],['crystal_coin',0.3]], spells: [{ element: 'energy', min: 200, max: 450 }, { element: 'fire', min: 150, max: 350 }] },
  frazzlemaw:          { name: 'Frazzlemaw', icon: '🟤', hp: 4200, atk: 380, def: 90, xp: 3740, gold: [1600,2200], loot: [['demon_dust',0.3],['crystal_coin',0.3]], spells: [{ element: 'physical', min: 0, max: 350 }] },
  guzzlemaw:           { name: 'Guzzlemaw', icon: '🟫', hp: 7000, atk: 560, def: 95, xp: 6050, gold: [2400,3200], loot: [['demon_dust',0.35],['platinum_coin',0.6],['crystal_coin',0.35]], spells: [{ element: 'physical', min: 0, max: 500 }] },
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
// worldId/level são mantidos na assinatura por compatibilidade com quem chama
// (Boss Rush, huntPanel), mas NÃO gateiam mais o acesso: a navegação é por
// CIDADE (ver domain/cities.js), o mundo virou só um bônus de fundo, e NÃO há
// restrição de nível pra entrar numa hunt (as criaturas escalam com o nível do
// jogador). A única trava que resta é a cadeia de boss: uma hunt encadeada só
// abre depois de derrotar o boss da anterior.
export function isZoneUnlocked(zoneId, level, worldId, defeatedZoneBosses) {
  const zone = ZONES[zoneId];
  if (!zone) return false;
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

// Hash da data com um "sal" próprio por categoria — assim Boosted Creature e
// Boosted Boss do dia não caem sempre no mesmo índice um do outro.
function hashWithSalt(dateStr, salt) {
  let hash = salt >>> 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  return hash;
}

// "Boosted Creature" do dia — qualquer criatura comum (não-boss) do bestiário,
// como o quadro BOOSTED do site oficial. Troca sozinho a cada dia.
export function boostedCreatureForDate(dateStr) {
  const commons = Object.keys(MONSTERS).filter(id => !BOSS_MONSTER_IDS.has(id));
  return commons[hashWithSalt(dateStr, 101) % commons.length];
}

// "Boosted Boss" do dia — sorteado entre os bosses de zona.
export function boostedBossForDate(dateStr) {
  const bosses = [...BOSS_MONSTER_IDS];
  return bosses[hashWithSalt(dateStr, 202) % bosses.length];
}
