// Bestiário e zonas de caça — dados puros do jogo, sem sprite/URL (isso é
// infraestrutura, ver src/infrastructure/tibiaSprites.js) e sem DOM.

// "theme" [cor de cima, cor de baixo] dá um cenário próprio pra cada dungeon
// na cena de batalha — sem depender de imagem hotlinkada (nenhuma fonte
// confiável de screenshot por zona), então é uma paleta de gradiente coerente
// com o bioma/clima de cada uma.
// `name` de cada zona é uma chave de tradução (zone.<id>, ver i18n/locales/*.js
// e ui/zonePicker.js: t(zone.name)) — são dungeons originais deste jogo, não
// nomes canônicos de Tibia, então mudam de idioma como qualquer outro texto de
// UI (diferente de MONSTERS/ITEMS, cujo `name` é o nome real da criatura/item
// em Tibia e nunca muda de idioma).
export const ZONES = {
  // --- Rookgaard (ilha inicial, sempre desbloqueada — única cidade disponível
  // até o nível 8, ver domain/cities.js: ROOKGAARD_LEVEL_CAP). As 5 hunts
  // seguem a progressão real de criaturas de Rookgaard no Tibia global (fonte:
  // otland/forgottenserver). Nenhuma trava de boss entre elas: as 5 já vêm
  // TODAS abertas (pedido do Felipe) — `boss` continua marcado só pra
  // alimentar a aba de Linked Tasks (Boss Rush), não pra gatear a hunt. ---
  rat_nest:      { city: 'rookgaard', name: 'zone.rat_nest', icon: '🐁',  worldReq: 'auroria', monsters: ['rat'], theme: ['#4a4234', '#231f18'], boss: 'rat' },
  rat_cellar:    { city: 'rookgaard', name: 'zone.rat_cellar', icon: '🐀',  worldReq: 'auroria', monsters: ['rat', 'cave_rat'], theme: ['#4a4234', '#231f18'], boss: 'cave_rat' },
  bug_hole:      { city: 'rookgaard', name: 'zone.bug_hole', icon: '🐛',  worldReq: 'auroria', monsters: ['bug'], theme: ['#4a4234', '#2e2419'], boss: 'bug' },
  spider_den:    { city: 'rookgaard', name: 'zone.spider_den', icon: '🕷️',  worldReq: 'auroria', monsters: ['spider', 'poison_spider'], theme: ['#4a3a3a', '#201616'], boss: 'poison_spider' },
  wolf_den:      { city: 'rookgaard', name: 'zone.wolf_den', icon: '🐺',  worldReq: 'auroria', monsters: ['wolf'], theme: ['#3d5c47', '#1a2b20'], boss: 'wolf' },

  // --- Dawnport (ilha inicial removida do Tibia global — travada até nível 8
  // como qualquer outra cidade do mainland, ver domain/cities.js: isCityUnlocked) ---
  dawnport_coast_meadows: { city: 'dawnport', name: 'zone.dawnport_coast_meadows', icon: '🌅', worldReq: 'auroria', monsters: ['badger', 'bear', 'dawnfly', 'deer', 'meadow_strider', 'mountain_troll', 'rabbit', 'squirrel', 'troll_trained_salamander', 'wolf', 'woodling'], theme: ['#c9a35c', '#8a6a30'], boss: 'bear' },
  dawnport_high_hills:    { city: 'dawnport', name: 'zone.dawnport_high_hills', icon: '⛰️', worldReq: 'auroria', monsters: ['deer', 'mountain_troll', 'rabbit', 'sheep', 'troll_trained_salamander', 'woodling'], theme: ['#8fae7a', '#4a6338'], boss: 'mountain_troll' },
  dawnport_marsh_cave:    { city: 'dawnport', name: 'zone.dawnport_marsh_cave', icon: '🌾', worldReq: 'auroria', monsters: ['dawnfly', 'meadow_strider', 'mountain_troll', 'troll_trained_salamander'], theme: ['#6b7a4f', '#33401f'], boss: 'mountain_troll' },
  dawnport_troll_cave:    { city: 'dawnport', name: 'zone.dawnport_troll_cave', icon: '🧌', worldReq: 'auroria', monsters: ['mountain_troll', 'troll_trained_salamander', 'skeleton', 'salamander_trainer'], theme: ['#6b5a3f', '#332a1c'], boss: 'salamander_trainer' },
  dawnport_ud_east:       { city: 'dawnport', name: 'zone.dawnport_ud_east', icon: '🏴', worldReq: 'auroria', monsters: ['muglex_clan_assassin', 'muglex_clan_footman', 'muglex_clan_scavenger', 'crazed_dwarf', 'dwarf_miner', 'lesser_fire_devil', 'poison_spider', 'spider', 'wasp', 'dawn_bat'], theme: ['#6b5a3f', '#332a1c'], boss: 'muglex_clan_assassin' },
  dawnport_ud_north:      { city: 'dawnport', name: 'zone.dawnport_ud_north', icon: '🦇', worldReq: 'auroria', monsters: ['cave_rat', 'brittle_skeleton', 'dawn_bat', 'rat', 'lesser_fire_devil', 'skeleton', 'juvenile_cyclops'], theme: ['#5a6b7a', '#28323d'], boss: 'juvenile_cyclops' },
  dawnport_ud_south:      { city: 'dawnport', name: 'zone.dawnport_ud_south', icon: '🐛', worldReq: 'auroria', monsters: ['dawnfly', 'orc', 'troll_trained_salamander', 'woodling', 'carrion_worm', 'rotworm', 'scar_tribe_shaman', 'scar_tribe_warrior', 'wolf'], theme: ['#7a6b3f', '#3d331c'], boss: 'scar_tribe_warrior' },
  dawnport_ud_west:       { city: 'dawnport', name: 'zone.dawnport_ud_west', icon: '🪓', worldReq: 'auroria', monsters: ['minotaur_bruiser', 'minotaur_poacher', 'poison_spider', 'spider', 'wasp', 'brittle_skeleton', 'cave_rat', 'juvenile_cyclops', 'dawn_scorpion', 'minotaur_occultist', 'minotaur', 'skeleton'], theme: ['#a9c9e0', '#4a6b85'], boss: 'minotaur' },

  dwarf_mines:   { city: 'thais', name: 'zone.dwarf_mines', icon: '⛏️',  worldReq: 'auroria', monsters: ['dwarf', 'dwarf_soldier', 'dwarf_geomancer', 'dwarf_guard'], theme: ['#6b5a44', '#3a2f22'], boss: 'gnorre_chyllson', requiresBossOf: 'wolf_den' },
  wolf_trail:    { city: 'abdendriel', name: 'zone.wolf_trail', icon: '🐺',  worldReq: 'auroria', monsters: ['wolf', 'bear'], theme: ['#3d5c47', '#1a2b20'], boss: 'bear', requiresBossOf: 'dwarf_mines' },
  spider_burrow: { city: 'abdendriel', name: 'zone.spider_burrow', icon: '🕷️',  worldReq: 'auroria', monsters: ['spider', 'tarantula'], theme: ['#4a3a3a', '#201616'], boss: 'spider', requiresBossOf: 'wolf_trail' },
  elf_woods:     { city: 'abdendriel', name: 'zone.elf_woods', icon: '🧝', worldReq: 'auroria', monsters: ['elf', 'elf_scout', 'elf_arcanist'], theme: ['#3f7052', '#1e3d2b'], boss: 'elf', requiresBossOf: 'spider_burrow' },
  old_graveyard: { city: 'thais', name: 'zone.old_graveyard', icon: '💀', worldReq: 'auroria', monsters: ['skeleton', 'ghoul', 'demon_skeleton'], theme: ['#5a5560', '#211f28'], boss: 'necropharus', requiresBossOf: 'elf_woods' },
  minotaur_den:  { city: 'thais', name: 'zone.minotaur_den', icon: '🐂', worldReq: 'auroria', monsters: ['minotaur', 'minotaur_archer', 'minotaur_mage', 'minotaur_guard'], theme: ['#7a5a3a', '#3a2818'], boss: 'minotaur_guard', requiresBossOf: 'old_graveyard' },
  cyclops_camp:  { city: 'thais', name: 'zone.cyclops_camp', icon: '🗿', worldReq: 'auroria', monsters: ['cyclops', 'cyclops_drone', 'cyclops_smith'], theme: ['#8a6a4a', '#4a3524'], boss: 'cyclops_smith', requiresBossOf: 'minotaur_den' },
  amazon_camp:   { city: 'carlin', name: 'zone.amazon_camp', icon: '🏹', worldReq: 'auroria', monsters: ['amazon', 'valkyrie'], theme: ['#5e7d3f', '#2e4a1f'], boss: 'valkyrie', requiresBossOf: 'cyclops_camp' },
  bandit_hideout:{ city: 'carlin', name: 'zone.bandit_hideout', icon: '🏴', worldReq: 'auroria', monsters: ['bandit', 'poacher'], theme: ['#6b5a3f', '#332a1c'], boss: 'poacher', requiresBossOf: 'amazon_camp' },
  scarab_desert: { city: 'ankrahmun', name: 'zone.scarab_desert', icon: '🪲', worldReq: 'auroria', monsters: ['scarab', 'larva'], theme: ['#c9a35c', '#8a6a30'], boss: 'scarab', requiresBossOf: 'bandit_hideout' },
  // Orc Fortress vira 2 hunts em sequência: primeiro os orcs mais simples,
  // depois os mais fortes (cavaleiros/xamã/berserker, chefiados pelo Warlord).
  orc_fortress:  { city: 'venore', name: 'zone.orc_fortress', icon: '🏹', worldReq: 'auroria', monsters: ['orc', 'orc_spearman', 'orc_warrior'], theme: ['#6b3f2f', '#2e1a12'], boss: 'renegade_orc_boss', requiresBossOf: 'scarab_desert' },
  orc_warlord_camp:{ city: 'venore', name: 'zone.orc_warlord_camp', icon: '👑', worldReq: 'auroria', monsters: ['orc_rider', 'orc_shaman', 'orc_berserker', 'orc_warlord'], theme: ['#6b3f2f', '#2e1a12'], boss: 'warlord_ruzad', requiresBossOf: 'orc_fortress' },

  // --- Spectrum (PvP opcional, reqLevel 20) ---
  spider_lair:   { city: 'venore', name: 'zone.spider_lair', icon: '🕷️', worldReq: 'spectrum', monsters: ['giant_spider', 'tarantula', 'wailing_widow', 'brimstone_bug'], theme: ['#4a3a5c', '#1c1526'], boss: 'giant_spider' },
  wyvern_ridge:  { city: 'carlin', name: 'zone.wyvern_ridge', icon: '🐲', worldReq: 'spectrum', monsters: ['wyvern'], theme: ['#4a6b6b', '#1c2e2e'], boss: 'wyvern', requiresBossOf: 'spider_lair' },
  haunted_ruins: { city: 'ankrahmun', name: 'zone.haunted_ruins', icon: '👻', worldReq: 'spectrum', monsters: ['ghost', 'mummy', 'bonelord'], theme: ['#4a3a5c', '#1c1526'], boss: 'mummy', requiresBossOf: 'wyvern_ridge' },
  golem_workshop:{ city: 'darashia', name: 'zone.golem_workshop', icon: '🗿', worldReq: 'spectrum', monsters: ['stone_golem', 'ice_golem', 'fire_elemental'], theme: ['#5a5a52', '#232320'], boss: 'stone_golem', requiresBossOf: 'haunted_ruins' },
  djinn_oasis:   { city: 'darashia', name: 'zone.djinn_oasis', icon: '🧞', worldReq: 'spectrum', monsters: ['efreet', 'marid', 'green_djinn', 'blue_djinn'], theme: ['#c9a35c', '#1f4a45'], boss: 'fahim_the_wise', requiresBossOf: 'golem_workshop' },
  worm_hive:     { city: 'venore', name: 'zone.worm_hive', icon: '🪱', worldReq: 'spectrum', monsters: ['larva', 'carrion_worm', 'rotworm'], theme: ['#5a4a35', '#2e2419'], boss: 'rottie_the_rotworm', requiresBossOf: 'djinn_oasis' },

  // --- Bellum (PvP opcional, reqLevel 25) ---
  scorpion_flats:{ city: 'ankrahmun', name: 'zone.scorpion_flats', icon: '🦂', worldReq: 'bellum', monsters: ['scorpion', 'centipede', 'cobra'], theme: ['#c98a4a', '#5c3a1a'], boss: 'scorpion' },
  crypt_shamblers_den:{ city: 'darashia', name: 'zone.crypt_shamblers_den', icon: '⚰️', worldReq: 'bellum', monsters: ['crypt_shambler', 'priestess'], theme: ['#4a4a5c', '#1c1c26'], boss: 'crypt_shambler', requiresBossOf: 'scorpion_flats' },
  dragon_lair:   { city: 'darashia', name: 'zone.dragon_lair', icon: '🔥', worldReq: 'bellum',  monsters: ['dragon', 'dragon_lord', 'dragon_lord_hatchling'], theme: ['#a53d2b', '#4a1810'], boss: 'dracola', requiresBossOf: 'crypt_shamblers_den' },
  frost_peak:    { city: 'svargrond', name: 'zone.frost_peak', icon: '🧊', worldReq: 'bellum',  monsters: ['frost_dragon', 'frost_dragon_hatchling'], theme: ['#6fa3c9', '#294a63'], boss: 'frost_dragon', requiresBossOf: 'dragon_lair' },
  black_knight_hall:{ city: 'venore', name: 'zone.black_knight_hall', icon: '⚔️', worldReq: 'bellum', monsters: ['black_knight'], theme: ['#3a4a5c', '#151c26'], boss: 'black_knight', requiresBossOf: 'frost_peak' },
  werewolf_woods:{ city: 'svargrond', name: 'zone.werewolf_woods', icon: '🌕', worldReq: 'bellum', monsters: ['werewolf', 'werelion', 'werefox', 'werebadger', 'wereboar', 'werebear'], theme: ['#2e3d24', '#141c10'], boss: 'werewolf', requiresBossOf: 'black_knight_hall' },
  ghastly_ruins: { city: 'porthope', name: 'zone.ghastly_ruins', icon: '🐉', worldReq: 'bellum', monsters: ['ghastly_dragon', 'undead_dragon'], theme: ['#5c2b3a', '#26101a'], boss: 'ghastly_dragon', requiresBossOf: 'werewolf_woods' },

  // --- Solarian (PvP retro, reqLevel 35) ---
  poison_marsh:  { city: 'porthope', name: 'zone.poison_marsh', icon: '🕸️', worldReq: 'solarian', monsters: ['wasp', 'poison_spider'], theme: ['#5c7d3a', '#243315'], boss: 'poison_spider' },
  braindeath_bog:{ city: 'porthope', name: 'zone.braindeath_bog', icon: '🧠', worldReq: 'solarian', monsters: ['braindeath', 'crypt_shambler'], theme: ['#3a4a35', '#161f14'], boss: 'braindeath', requiresBossOf: 'poison_marsh' },
  hydra_swamp:   { city: 'porthope', name: 'zone.hydra_swamp', icon: '🐍', worldReq: 'solarian', monsters: ['hydra', 'medusa', 'serpent_spawn', 'eternal_guardian'], theme: ['#3c6b5e', '#173a30'], boss: 'medusa', requiresBossOf: 'braindeath_bog' },
  wraith_hollow: { city: 'edron', name: 'zone.wraith_hollow', icon: '👤', worldReq: 'solarian', monsters: ['betrayed_wraith', 'crypt_defiler'], theme: ['#4a3a5c', '#1a1424'], boss: 'betrayed_wraith', requiresBossOf: 'hydra_swamp' },
  nightmare_den: { city: 'edron', name: 'zone.nightmare_den', icon: '🌑', worldReq: 'solarian', monsters: ['nightmare', 'nightmare_scion'], theme: ['#3a1f2e', '#150a12'], boss: 'nightmare', requiresBossOf: 'wraith_hollow' },
  hellfire_bastion:{ city: 'cormaya', name: 'zone.hellfire_bastion', icon: '🔥', worldReq: 'solarian', monsters: ['hellfire_fighter', 'dark_torturer'], theme: ['#a5391f', '#3a1208'], boss: 'hellfire_fighter', requiresBossOf: 'nightmare_den' },

  // --- Elysian (PvP retro, reqLevel 40) ---
  undead_crypt:  { city: 'edron', name: 'zone.undead_crypt', icon: '🦴', worldReq: 'elysian', monsters: ['bonebeast', 'banshee', 'vampire', 'blightwalker', 'vampire_bride'], theme: ['#5a5560', '#211f28'], boss: 'countess_sorrow' },
  lich_lair:     { city: 'edron', name: 'zone.lich_lair', icon: '☠️', worldReq: 'elysian', monsters: ['lich', 'grim_reaper', 'undead_dragon'], theme: ['#4a3a63', '#1a1424'], boss: 'koshei_the_deathless', requiresBossOf: 'undead_crypt' },
  demon_fortress:{ city: 'cormaya', name: 'zone.demon_fortress', icon: '💀', worldReq: 'elysian', monsters: ['demon', 'fury', 'hellhound', 'floating_savant'], theme: ['#7a1f1f', '#2b0a0a'], boss: 'morgaroth', requiresBossOf: 'lich_lair' },
  war_golem_yard:{ city: 'cormaya', name: 'zone.war_golem_yard', icon: '🤖', worldReq: 'elysian', monsters: ['war_golem', 'rustheap_golem'], theme: ['#5c5c52', '#242420'], boss: 'grand_canon_dominus', requiresBossOf: 'demon_fortress' },
  falcon_bastion:{ city: 'cormaya', name: 'zone.falcon_bastion', icon: '🦅', worldReq: 'elysian', monsters: ['falcon_knight', 'falcon_paladin'], theme: ['#4a6b8a', '#1c2e3f'], boss: 'adlerauge', requiresBossOf: 'war_golem_yard' },
  vexclaw_canyon:{ city: 'yalahar', name: 'zone.vexclaw_canyon', icon: '🦞', worldReq: 'elysian', monsters: ['vexclaw', 'retching_horror', 'nightstalker'], theme: ['#8a4a2f', '#3a1c10'], boss: 'vexclaw', requiresBossOf: 'falcon_bastion' },
  feversleep_marsh:{ city: 'yalahar', name: 'zone.feversleep_marsh', icon: '💤', worldReq: 'elysian', monsters: ['feversleep', 'nightmare'], theme: ['#6b7d3a', '#2b3315'], boss: 'feversleep', requiresBossOf: 'vexclaw_canyon' },
  grorlam_grotto:{ city: 'yalahar', name: 'zone.grorlam_grotto', icon: '🐖', worldReq: 'elysian', monsters: ['grorlam'], theme: ['#2f4a4a', '#101f1f'], boss: 'grorlam', requiresBossOf: 'feversleep_marsh' },
  zorvorax_sanctum:{ city: 'yalahar', name: 'zone.zorvorax_sanctum', icon: '🔮', worldReq: 'elysian', monsters: ['zorvorax'], theme: ['#6b4a8a', '#251536'], boss: 'zorvorax', requiresBossOf: 'grorlam_grotto' },

  // --- Mystian (PvP retro, reqLevel 60, o mundo com os melhores bônus) ---
  hell_gate:     { city: 'roshamuul', name: 'zone.hell_gate', icon: '🔥', worldReq: 'mystian', monsters: ['juggernaut', 'plaguesmith', 'behemoth', 'gazharagoth'], theme: ['#a52a1f', '#1f0a08'], boss: 'twisterror' },
  roshamuul_valley:{ city: 'roshamuul', name: 'zone.roshamuul_valley', icon: '👹', worldReq: 'mystian', monsters: ['frazzlemaw', 'guzzlemaw', 'weakened_frazzlemaw', 'enfeebled_silencer'], theme: ['#7a2a1f', '#2b0a08'], boss: 'guzzlemaw' },
  boss_sanctum:  { city: 'roshamuul', name: 'zone.boss_sanctum', icon: '🌀', worldReq: 'mystian', monsters: ['lothlorien', 'executioner', 'morgul', 'corrupted_one', 'nzoth'], theme: ['#6b4a9c', '#2a1a42'], boss: 'nzoth', requiresBossOf: 'hell_gate' },
  draken_wastes: { city: 'zao', name: 'zone.draken_wastes', icon: '🐲', worldReq: 'mystian', monsters: ['draken_abomination', 'draken_warmaster'], theme: ['#5c2f2f', '#241010'], boss: 'draken_warmaster', requiresBossOf: 'boss_sanctum' },
  corruption_spire:{ city: 'zao', name: 'zone.corruption_spire', icon: '🕸️', worldReq: 'mystian', monsters: ['zulazza', 'latrivan'], theme: ['#3a2050', '#140a1f'], boss: 'latrivan', requiresBossOf: 'draken_wastes' },
  abyssal_throne:{ city: 'zao', name: 'zone.abyssal_throne', icon: '😈', worldReq: 'mystian', monsters: ['ushuriel', 'madareth'], theme: ['#4a1520', '#1a060a'], boss: 'madareth', requiresBossOf: 'corruption_spire' },
  void_rift:     { city: 'zao', name: 'zone.void_rift', icon: '🔺', worldReq: 'mystian', monsters: ['zamulosh', 'shulgrax', 'tanjis'], theme: ['#1a1a3a', '#08081a'], boss: 'tanjis', requiresBossOf: 'abyssal_throne' },
  zao_draken_walls:{ city: 'zao', name: 'zone.zao_draken_walls', icon: '🐲', worldReq: 'mystian', monsters: ['draken_elite', 'draken_spellweaver', 'draptor'], theme: ['#5c2f2f', '#241010'], boss: 'draken_elite' },
  ferumbras_citadel:{ city: 'ferumbras', name: 'zone.ferumbras_citadel', icon: '👑', worldReq: 'mystian', monsters: ['ferumbras', 'pale_worm', 'diblis', 'soul_despoiler', 'ferumbras_mortal_shell', 'devovorga'], theme: ['#3a1a5c', '#12081f'], boss: 'ferumbras', requiresBossOf: 'void_rift' },

  // --- Novas hunts das cidades (criaturas adicionadas acima). São hunts
  // "avulsas": liberadas só pelo nível mínimo (sem cadeia de boss), pra dar mais
  // opções de caçada em cada cidade sem travar atrás da progressão principal. ---
  fibula_dungeon:  { city: 'thais',     name: 'zone.fibula_dungeon', icon: '🐾',  worldReq: 'auroria', monsters: ['stalker', 'cave_rat', 'rotworm', 'bat'], theme: ['#4a4234', '#231f18'], boss: 'stalker' },
  terror_valley:   { city: 'porthope', name: 'zone.terror_valley', icon: '🦤', worldReq: 'spectrum', monsters: ['terror_bird'], theme: ['#c9a35c', '#8a6a30'], boss: 'terror_bird' },
  terramite_hive:  { city: 'ankrahmun', name: 'zone.terramite_hive', icon: '🐜', worldReq: 'solarian', monsters: ['terramite', 'ancient_scarab'], theme: ['#c98a4a', '#5c3a1a'], boss: 'ancient_scarab' },
  tiquanda_jungle: { city: 'porthope',  name: 'zone.tiquanda_jungle', icon: '🌴', worldReq: 'solarian', monsters: ['sibang', 'kongra', 'merlkin'], theme: ['#2e5c2e', '#0f2b0f'], boss: 'kongra' },
  ice_caves:       { city: 'svargrond', name: 'zone.ice_caves', icon: '❄️', worldReq: 'bellum', monsters: ['frost_troll', 'ice_golem'], theme: ['#6fa3c9', '#294a63'], boss: 'ice_golem' },
  yeti_peak:       { city: 'svargrond', name: 'zone.yeti_peak', icon: '🦣', worldReq: 'bellum', monsters: ['yeti', 'crystal_wolf', 'frost_giant'], theme: ['#8fb8d9', '#3a5a73'], boss: 'norgle_glacierbeard' },
  crystal_nest:    { city: 'svargrond', name: 'zone.crystal_nest', icon: '🕸️', worldReq: 'bellum', monsters: ['crystal_spider'], theme: ['#a9c9e0', '#4a6b85'], boss: 'crystal_spider' },
  wyrm_cavern:     { city: 'darashia',  name: 'zone.wyrm_cavern', icon: '🐉', worldReq: 'spectrum', monsters: ['wyrm', 'elder_wyrm'], theme: ['#4a6b6b', '#1c2e2e'], boss: 'glitterscale' },
  hero_tower:      { city: 'edron',     name: 'zone.hero_tower', icon: '🦸', worldReq: 'elysian', monsters: ['hero', 'dark_magician', 'dark_apprentice'], theme: ['#4a3a5c', '#1a1424'], boss: 'michael_the_stalwart' },
  dworc_camp:      { city: 'porthope',  name: 'zone.dworc_camp', icon: '🌀', worldReq: 'auroria', monsters: ['dworc_venomsniper', 'dworc_fighter', 'dworc'], theme: ['#5c3a6b', '#241a33'], boss: 'dworc' },
  mutant_ward:     { city: 'yalahar',   name: 'zone.mutant_ward', icon: '🧟', worldReq: 'auroria', monsters: ['mutated_human', 'slime', 'mutated_rat'], theme: ['#4a6b3a', '#1f331a'], boss: 'mutated_human' },
  warlock_tower:   { city: 'carlin',    name: 'zone.warlock_tower', icon: '🧙', worldReq: 'solarian', monsters: ['warlock'], theme: ['#3a1a5c', '#150a24'], boss: 'warlock' },
  carlin_sewers:   { city: 'carlin',    name: 'zone.carlin_sewers', icon: '🐛', worldReq: 'auroria', monsters: ['bug', 'poison_spider', 'slime'], theme: ['#4a4234', '#231f18'], boss: 'slime' },
  ankrahmun_tombs: { city: 'ankrahmun', name: 'zone.ankrahmun_tombs', icon: '🏺', worldReq: 'solarian', monsters: ['fleshcrawler', 'omruc'], theme: ['#c9a35c', '#5c3a1a'], boss: 'omruc' },
  porthope_water_dungeon:{ city: 'porthope', name: 'zone.porthope_water_dungeon', icon: '💧', worldReq: 'bellum', monsters: ['crocodile', 'massive_water_elemental'], theme: ['#2a5c6b', '#0f2e33'], boss: 'leviathan_boss' },
  thais_dragon_cave:{ city: 'thais', name: 'zone.thais_dragon_cave', icon: '🐉', worldReq: 'bellum', monsters: ['dragon', 'dragon_hatchling'], theme: ['#8a3020', '#3a1410'], boss: 'the_first_dragon' },
  femor_hills:     { city: 'carlin', name: 'zone.femor_hills', icon: '👺', worldReq: 'auroria', monsters: ['goblin', 'goblin_scavenger', 'goblin_assassin', 'goblin_leader'], theme: ['#5c6b3a', '#33401f'], boss: 'muglex_clan_chief' },
  yalahar_sunken_quarter:{ city: 'yalahar', name: 'zone.yalahar_sunken_quarter', icon: '🦑', worldReq: 'spectrum', monsters: ['quara_pincher', 'quara_hydromancer', 'quara_mantassin_scout', 'quara_constrictor_scout', 'quara_pincher_scout', 'quara_predator_scout', 'quara_hydromancer_scout'], theme: ['#1f3a5c', '#0a1826'], boss: 'quara_pincher' },

  // --- Salas 1-2 de Linked Tasks (auditoria 2026-07-14): zonas novas pra
  // grupos temáticos de criaturas que não cabiam em nenhuma hunt existente —
  // ver .spec/90-regras-de-negocio-gerais.md. "Avulsas" (sem requiresBossOf),
  // mesmo padrão das "Novas hunts das cidades" acima. ---
  troll_cave:      { city: 'venore',    name: 'zone.troll_cave', icon: '👹', worldReq: 'auroria', monsters: ['troll', 'swamp_troll', 'island_troll'], theme: ['#3d5c3a', '#182b16'], boss: 'island_troll' },
  dark_cathedral:  { city: 'edron',     name: 'zone.dark_cathedral', icon: '⛪', worldReq: 'auroria', monsters: ['dark_monk', 'assassin'], theme: ['#3a2f4a', '#151022'], boss: 'assassin' },
  corym_camp:      { city: 'abdendriel',name: 'zone.corym_camp', icon: '👹', worldReq: 'auroria', monsters: ['corym_charlatan', 'corym_skirmisher', 'corym_vanguard'], theme: ['#4a5c3a', '#1c2b16'], boss: 'corym_vanguard' },
  pirate_cove:     { city: 'venore',    name: 'zone.pirate_cove', icon: '🏴‍☠️', worldReq: 'auroria', monsters: ['pirate_marauder', 'pirate_cutthroat', 'pirate_corsair', 'pirate_buccaneer'], theme: ['#2a5c6b', '#0f2e33'], boss: 'pirate_buccaneer' },
  barbarian_camp:  { city: 'svargrond', name: 'zone.barbarian_camp', icon: '🪓', worldReq: 'auroria', monsters: ['barbarian_bloodwalker', 'barbarian_brutetamer', 'barbarian_headsplitter', 'barbarian_skullhunter'], theme: ['#6b5a3f', '#332a1c'], boss: 'barbarian_skullhunter' },
  stonerefiner_quarry:{ city: 'thais',  name: 'zone.stonerefiner_quarry', icon: '💎', worldReq: 'auroria', monsters: ['stonerefiner'], theme: ['#6b6a5c', '#2a2924'], boss: 'stonerefiner' },
  oramond_camp:    { city: 'venore',    name: 'zone.oramond_camp', icon: '🐂', worldReq: 'auroria', monsters: ['minotaur_hunter', 'moohtah_warrior', 'minotaur_amazon', 'worm_priestess', 'execowtioner', 'moohtant'], theme: ['#7a5a3a', '#3a2818'], boss: 'execowtioner' },
  cult_sanctum:    { city: 'yalahar',   name: 'zone.cult_sanctum', icon: '🧙', worldReq: 'spectrum', monsters: ['cult_believer', 'vicious_squire', 'cult_enforcer', 'renegade_knight', 'vile_grandmaster', 'cult_scholar'], theme: ['#3a1a5c', '#150a24'], boss: 'vile_grandmaster' },
  deepling_trench: { city: 'yalahar',   name: 'zone.deepling_trench', icon: '👹', worldReq: 'spectrum', monsters: ['deepling_spellsinger', 'deepling_scout', 'deepling_warrior', 'deepling_guard'], theme: ['#1f3a5c', '#0a1826'], boss: 'deepling_guard' },
  minotaur_cult_lair:{ city: 'thais',   name: 'zone.minotaur_cult_lair', icon: '🐂', worldReq: 'bellum', monsters: ['minotaur_cult_follower', 'minotaur_cult_prophet', 'minotaur_cult_zealot'], theme: ['#7a5a3a', '#3a2818'], boss: 'minotaur_cult_zealot' },
  glooth_factory:  { city: 'yalahar',   name: 'zone.glooth_factory', icon: '⚙️', worldReq: 'bellum', monsters: ['glooth_bandit', 'glooth_brigand'], theme: ['#4a6b3a', '#1f331a'], boss: 'glooth_brigand' },
  exotic_cave:     { city: 'porthope',  name: 'zone.exotic_cave', icon: '🕷️', worldReq: 'bellum', monsters: ['exotic_cave_spider', 'exotic_bat'], theme: ['#2e5c2e', '#0f2b0f'], boss: 'exotic_bat' },
  pirat_cove:      { city: 'cormaya',   name: 'zone.pirat_cove', icon: '🏴‍☠️', worldReq: 'bellum', monsters: ['pirat_bombardier', 'pirat_cutthroat', 'pirat_mate', 'pirat_scoundrel'], theme: ['#2a5c6b', '#0f2e33'], boss: 'pirat_bombardier' },
  werehyaena_den:  { city: 'svargrond', name: 'zone.werehyaena_den', icon: '🐺', worldReq: 'bellum', monsters: ['werehyaena', 'werehyaena_shaman'], theme: ['#2e3d24', '#141c10'], boss: 'werehyaena_shaman' },
  lizard_city:     { city: 'zao',       name: 'zone.lizard_city', icon: '🐊', worldReq: 'solarian', monsters: ['lizard_legionnaire', 'lizard_magistratus', 'lizard_noble', 'lizard_chosen', 'lizard_dragon_priest', 'lizard_high_guard'], theme: ['#5c2f2f', '#241010'], boss: 'lizard_high_guard' },
  the_hive:        { city: 'roshamuul', name: 'zone.the_hive', icon: '👹', worldReq: 'solarian', monsters: ['waspoid', 'crawler', 'spitter', 'kollos', 'spidris', 'spidris_elite', 'hive_overseer'], theme: ['#7a2a1f', '#2b0a08'], boss: 'hive_overseer' },
};

export const MONSTERS = {
  // --- Bestiário clássico de Tibia (o mundo do RubinOT) ---
  cave_rat:      { name: 'Cave Rat', icon: '🐀', hp: 30,  atk: 10,  def: 1,  xp: 10,   gold: [0,2],   loot: [['cheese',0.4]] },
  goblin:        { name: 'Goblin', icon: '👺', hp: 50,  atk: 10,  def: 2,  xp: 25,  gold: [1,4],   loot: [['goblin_ear',0.5],['bones',0.3]], spells: [{ element: 'physical', min: 0, max: 25 }] },
  // Femor Hills (Carlin) é o acampamento goblin — ver domain/bestiary.js:
  // ZONES.femor_hills. goblin_leader é o chefe da hunt.
  goblin_scavenger:{ name: 'Goblin Scavenger', icon: '👺', hp: 65,  atk: 18,  def: 3,  xp: 35,  gold: [2,6],   loot: [['goblin_ear',0.5],['bones',0.3]] },
  goblin_assassin: { name: 'Goblin Assassin', icon: '🗡️', hp: 80,  atk: 25,  def: 4,  xp: 45,  gold: [3,9],   loot: [['dagger',0.05],['goblin_ear',0.5],['bones',0.3]] },
  goblin_leader:   { name: 'Goblin Leader', icon: '👑', hp: 110, atk: 30,  def: 6,  xp: 70,  gold: [6,15],  loot: [['goblin_ear',0.6],['leather_armor',0.1],['bones',0.3]] },
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
  // Orc Fortress (Venore) vira 2 hunts: essa é a mais simples, ver
  // ZONES.orc_fortress — orc_warrior é o chefe. Os mais fortes (orc_rider/
  // orc_shaman/orc_berserker/orc_warlord) ficam em ZONES.orc_warlord_camp.
  orc_spearman:  { name: 'Orc Spearman', icon: '🔱', hp: 95,  atk: 40, def: 5,  xp: 40,  gold: [4,10],  loot: [['orc_tooth',0.5],['bones',0.3]] },
  orc_warrior:   { name: 'Orc Warrior', icon: '⚔️', hp: 120, atk: 55, def: 6,  xp: 55,  gold: [5,12],  loot: [['orc_tooth',0.5],['studded_armor',0.05],['bones',0.3]] },
  cyclops:       { name: 'Cyclops', icon: '🗿', hp: 260, atk: 105, def: 10, xp: 150, gold: [10,30], loot: [['cyclops_toe',0.4],['halberd',0.04]] },
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
  orc_berserker:       { name: 'Orc Berserker', icon: '💢', hp: 230, atk: 145, def: 12, xp: 190, gold: [15,35], loot: [['orc_tooth',0.5],['studded_armor',0.08]] },
  orc_warlord:         { name: 'Orc Warlord', icon: '👑', hp: 520, atk: 220, def: 22, xp: 380, gold: [40,90], loot: [['orc_tooth',0.6],['studded_armor',0.15],['halberd',0.05]] },
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

  // --- Criaturas exclusivas de Dawnport (ilha inicial removida do Tibia
  // global, patch 15.12 — ver domain/cities.js: city 'dawnport'). Não estão
  // no forgottenserver (engine genérica, sem o mapa de Dawnport), então hp/
  // exp/armor vêm do TibiaWiki (Infobox Creature de cada uma); atk é o teto
  // do dano de melee documentado (campo `abilities`, ex. {{Melee|0-12}}). ---
  badger:              { name: 'Badger', icon: '🦡', hp: 23, atk: 12, def: 1, xp: 5, gold: [0,3], loot: [['badger_fur',0.4]] },
  rabbit:              { name: 'Rabbit', icon: '🐇', hp: 15, atk: 0, def: 1, xp: 0, gold: [0,0], loot: [['cheese',0.2]] },
  sheep:               { name: 'Sheep', icon: '🐑', hp: 20, atk: 1, def: 1, xp: 0, gold: [0,0], loot: [['wool',0.5]] },
  squirrel:            { name: 'Squirrel', icon: '🐿️', hp: 20, atk: 0, def: 1, xp: 0, gold: [0,0], loot: [['acorn',0.6]] },
  deer:                { name: 'Deer', icon: '🦌', hp: 25, atk: 1, def: 2, xp: 0, gold: [0,0], loot: [['antlers',0.3],['meat',0.4]] },
  dawn_bat:            { name: 'Dawn Bat', icon: '🦇', hp: 30, atk: 8, def: 1, xp: 10, gold: [0,4], loot: [['bones',0.3]] },
  mountain_troll:      { name: 'Mountain Troll', icon: '👹', hp: 30, atk: 9, def: 0, xp: 12, gold: [1,5], loot: [['bones',0.6],['leather_boots',0.05]] },
  sacred_snake:        { name: 'Sacred Snake', icon: '🐍', hp: 10, atk: 8, def: 0, xp: 0, gold: [0,0], loot: [['meat',0.3]] },
  muglex_clan_footman: { name: 'Muglex Clan Footman', icon: '🛡️', hp: 30, atk: 10, def: 0, xp: 24, gold: [1,6], loot: [['orc_tooth',0.3]], spells: [{ element: 'earth', min: 0, max: 10 }] },
  muglex_clan_assassin:{ name: 'Muglex Clan Assassin', icon: '🗡️', hp: 45, atk: 12, def: 0, xp: 34, gold: [2,8], loot: [['orc_tooth',0.4],['spider_fangs',0.2]] },
  muglex_clan_scavenger:{ name: 'Muglex Clan Scavenger', icon: '🏴', hp: 60, atk: 15, def: 7, xp: 37, gold: [2,9], loot: [['orc_tooth',0.4]] },
  brittle_skeleton:    { name: 'Brittle Skeleton', icon: '🦴', hp: 50, atk: 17, def: 2, xp: 35, gold: [3,10], loot: [['bones',0.9]], spells: [{ element: 'death', min: 5, max: 15 }] },
  dawn_scorpion:       { name: 'Dawn Scorpion', icon: '🦂', hp: 65, atk: 20, def: 11, xp: 45, gold: [3,10], loot: [['spider_fangs',0.35]] },
  troll_trained_salamander:{ name: 'Troll-Trained Salamander', icon: '🦎', hp: 70, atk: 13, def: 1, xp: 23, gold: [2,8], loot: [['bones',0.4]], spells: [{ element: 'earth', min: 4, max: 6 }] },
  troll_marauder:      { name: 'Troll Marauder', icon: '👹', hp: 70, atk: 29, def: 8, xp: 40, gold: [3,10], loot: [['bones',0.6]] },
  woodling:            { name: 'Woodling', icon: '🌳', hp: 80, atk: 15, def: 2, xp: 40, gold: [2,8], loot: [['worm_dirt',0.3]], spells: [{ element: 'earth', min: 0, max: 8 }] },
  dawnfly:             { name: 'Dawnfly', icon: '🪰', hp: 90, atk: 20, def: 3, xp: 35, gold: [1,6], loot: [['worm_dirt',0.2]], spells: [{ element: 'earth', min: 4, max: 8 }] },
  minotaur_bruiser:    { name: 'Minotaur Bruiser', icon: '🐂', hp: 100, atk: 45, def: 11, xp: 50, gold: [5,15], loot: [['minotaur_horn',0.4],['chain_armor',0.05]] },
  meadow_strider:      { name: 'Meadow Strider', icon: '🦗', hp: 100, atk: 16, def: 1, xp: 50, gold: [3,10], loot: [['meat',0.4]], spells: [{ element: 'physical', min: 8, max: 19 }] },
  crazed_dwarf:        { name: 'Crazed Dwarf', icon: '⛏️', hp: 105, atk: 15, def: 9, xp: 50, gold: [3,10], loot: [['iron_ore',0.4],['studded_armor',0.05]] },
  dwarf_miner:         { name: 'Dwarf Miner', icon: '⛏️', hp: 120, atk: 35, def: 7, xp: 60, gold: [5,16], loot: [['iron_ore',0.5],['studded_armor',0.05]] },
  scar_tribe_shaman:   { name: 'Scar Tribe Shaman', icon: '🪄', hp: 115, atk: 20, def: 6, xp: 85, gold: [6,18], loot: [['elvish_talisman',0.15]], spells: [{ element: 'energy', min: 10, max: 30 }] },
  minotaur_occultist:  { name: 'Minotaur Occultist', icon: '🐂', hp: 125, atk: 29, def: 8, xp: 100, gold: [8,22], loot: [['minotaur_horn',0.4],['wand_of_vortex',0.02]], spells: [{ element: 'energy', min: 16, max: 27 }, { element: 'fire', min: 24, max: 64 }] },
  scar_tribe_warrior:  { name: 'Scar Tribe Warrior', icon: '🪓', hp: 125, atk: 45, def: 7, xp: 85, gold: [7,18], loot: [['studded_armor',0.05]] },
  minotaur_poacher:    { name: 'Minotaur Poacher', icon: '🐂', hp: 160, atk: 40, def: 6, xp: 55, gold: [6,17], loot: [['minotaur_horn',0.4],['power_bolt',0.4]] },
  lesser_fire_devil:   { name: 'Lesser Fire Devil', icon: '🔥', hp: 175, atk: 33, def: 9, xp: 110, gold: [10,26], loot: [['demon_dust',0.15]], spells: [{ element: 'fire', min: 4, max: 38 }] },
  salamander_trainer:  { name: 'Salamander Trainer', icon: '🦎', hp: 220, atk: 23, def: 7, xp: 70, gold: [8,22], loot: [['bones',0.3]] },
  juvenile_cyclops:    { name: 'Juvenile Cyclops', icon: '👁️', hp: 260, atk: 70, def: 11, xp: 130, gold: [12,32], loot: [['cyclops_toe',0.4],['halberd',0.03]], spells: [{ element: 'physical', min: 0, max: 45 }] },

  // --- Bosses reais do Tibia (substituem monstros comuns reaproveitados como
  // "boss" — ver auditoria de Boss Zone). hp/xp escalados pro range da zona,
  // mantendo a ordem de grandeza relativa dos valores reais do TibiaWiki
  // (curl direto na API do MediaWiki, header de UA de navegador — a wiki
  // bloqueia agente de IA nas ferramentas WebFetch/WebSearch com HTTP 402).
  gnorre_chyllson:     { name: 'Gnorre Chyllson', icon: '⛏️', hp: 520, atk: 200, def: 24, xp: 380, gold: [20,50], loot: [['dwarven_ring',0.05],['halberd',0.06]] },
  necropharus:         { name: 'Necropharus', icon: '💀', hp: 230, atk: 90, def: 12, xp: 200, gold: [12,28], loot: [['bones',0.9],['leather_boots',0.15]], spells: [{ element: 'death', min: 20, max: 40 }] },
  warlord_ruzad:       { name: 'Warlord Ruzad', icon: '👑', hp: 650, atk: 250, def: 26, xp: 480, gold: [50,110], loot: [['orc_tooth',0.6],['studded_armor',0.18],['halberd',0.06]] },
  renegade_orc_boss:   { name: 'Renegade Orc', icon: '⚔️', hp: 200, atk: 65, def: 8, xp: 140, gold: [8,18], loot: [['orc_tooth',0.5],['studded_armor',0.06],['bones',0.3]] },
  muglex_clan_chief:   { name: 'Muglex Clan Chief', icon: '👺', hp: 160, atk: 40, def: 8, xp: 120, gold: [8,20], loot: [['goblin_ear',0.6],['leather_armor',0.12],['bones',0.3]] },
  fahim_the_wise:      { name: 'Fahim the Wise', icon: '🧞', hp: 750, atk: 110, def: 40, xp: 560, gold: [180,260], loot: [['demon_dust',0.25],['crystal_coin',0.06]], spells: [{ element: 'energy', min: 110, max: 260 }, { element: 'death', min: 35, max: 95 }] },
  rottie_the_rotworm:  { name: 'Rottie the Rotworm', icon: '🪱', hp: 220, atk: 55, def: 42, xp: 110, gold: [170,260], loot: [['worm_dirt',0.5],['life_crystal',0.2],['crystal_coin',0.05]] },
  glitterscale:        { name: 'Glitterscale', icon: '🐉', hp: 2100, atk: 260, def: 42, xp: 1850, gold: [90,180], loot: [['dragon_scale',0.35],['life_crystal',0.18]], spells: [{ element: 'energy', min: 110, max: 230 }] },
  dracola:             { name: 'Dracola', icon: '🔥', hp: 3200, atk: 300, def: 45, xp: 3500, gold: [120,220], loot: [['royal_helmet',0.015],['life_crystal',0.55],['dragon_scale',0.6]], spells: [{ element: 'fire', min: 180, max: 280 }] },
  norgle_glacierbeard: { name: 'Norgle Glacierbeard', icon: '🧊', hp: 1300, atk: 230, def: 26, xp: 850, gold: [40,90], loot: [['meat',0.4],['life_crystal',0.08]], spells: [{ element: 'ice', min: 60, max: 100 }] },
  leviathan_boss:      { name: 'Leviathan', icon: '🐍', hp: 6800, atk: 560, def: 130, xp: 3200, gold: [1700,2400], loot: [['life_crystal',0.32],['platinum_coin',1]], spells: [{ element: 'ice', min: 180, max: 230 }, { element: 'earth', min: 360, max: 430 }] },
  the_first_dragon:    { name: 'The First Dragon', icon: '🐉', hp: 5200, atk: 350, def: 48, xp: 4200, gold: [150, 300], loot: [['dragon_scale',0.65],['dragon_ham',0.8],['dragonbone_staff',0.03]], spells: [{ element: 'fire', min: 200, max: 320 }] },
  countess_sorrow:     { name: 'Countess Sorrow', icon: '👤', hp: 5200, atk: 220, def: 55, xp: 6200, gold: [220,380], loot: [['life_crystal',0.3],['death_ring',0.02]], spells: [{ element: 'death', min: 90, max: 400 }] },
  koshei_the_deathless:{ name: 'Koshei the Deathless', icon: '☠️', hp: 3400, atk: 260, def: 40, xp: 3800, gold: [180,320], loot: [['necromancer_shield',0.025],['bones',0.6]], spells: [{ element: 'death', min: 120, max: 240 }] },
  morgaroth:           { name: 'Morgaroth', icon: '😈', hp: 9500, atk: 560, def: 60, xp: 8200, gold: [260,480], loot: [['demon_dust',0.55],['demon_shield',0.012],['platinum_coin',0.85]], spells: [{ element: 'fire', min: 170, max: 280 }, { element: 'death', min: 320, max: 500 }] },
  grand_canon_dominus: { name: 'Grand Canon Dominus', icon: '🤖', hp: 6200, atk: 580, def: 78, xp: 4200, gold: [520,760], loot: [['chain_armor',0.12],['plate_legs',0.09],['crystal_coin',0.16]], spells: [{ element: 'energy', min: 180, max: 240 }] },
  adlerauge:           { name: 'Adlerauge', icon: '🦅', hp: 11000, atk: 430, def: 92, xp: 9500, gold: [800,1100], loot: [['chain_armor',0.11],['studded_shield',0.11],['crystal_coin',0.2]], spells: [{ element: 'earth', min: 420, max: 520 }, { element: 'holy', min: 300, max: 380 }] },
  michael_the_stalwart:{ name: 'Michael the Stalwart', icon: '🦸', hp: 2200, atk: 260, def: 38, xp: 2400, gold: [90,180], loot: [['plate_legs',0.06],['giant_sword',0.006]], spells: [{ element: 'physical', min: 0, max: 130 }] },
  twisterror:          { name: 'Twisterror', icon: '🔥', hp: 26000, atk: 900, def: 90, xp: 15500, gold: [900,1400], loot: [['demon_dust',0.4],['titan_axe',0.012],['crystal_coin',0.4]], spells: [{ element: 'fire', min: 300, max: 650 }, { element: 'physical', min: 0, max: 500 }] },

  // --- Criaturas das 94 Linked Tasks reais do RubinOT (auditoria 2026-07-14) ---
  // Stats escalados pela posição da task na progressão (ver domain/progression.js:
  // TASK_ROOMS) — fórmula geométrica xp=15*1.135^taskNum, calibrada pelas
  // primeiras (Goblin xp25 ~ task1) e últimas tasks (task94, mobs de endgame).
  // Ícone: emoji heurístico por palavra-chave do nome (sem sprite real baixado
  // — volume grande demais pra baixar 1 a 1 nesta rodada; ver relatório final).
  swamp_troll: { name: 'Swamp Troll', icon: '👹', hp: 67, atk: 10, def: 6, xp: 19, gold: [1,2], loot: [['bones',0.3]] },
  island_troll: { name: 'Island Troll', icon: '👹', hp: 67, atk: 10, def: 6, xp: 19, gold: [1,2], loot: [['bones',0.3]] },
  dark_monk: { name: 'Dark Monk', icon: '👹', hp: 97, atk: 13, def: 17, xp: 41, gold: [2,5], loot: [['bones',0.3]] },
  assassin: { name: 'Assassin', icon: '👹', hp: 97, atk: 13, def: 17, xp: 41, gold: [2,5], loot: [['bones',0.3]] },
  demon_skeleton: { name: 'Demon Skeleton', icon: '😈', hp: 106, atk: 14, def: 19, xp: 47, gold: [2,6], loot: [['bones',0.3]] },
  corym_charlatan: { name: 'Corym Charlatan', icon: '👹', hp: 149, atk: 17, def: 27, xp: 78, gold: [3,9], loot: [['bones',0.3]] },
  corym_skirmisher: { name: 'Corym Skirmisher', icon: '👹', hp: 149, atk: 17, def: 27, xp: 78, gold: [3,9], loot: [['bones',0.3]] },
  corym_vanguard: { name: 'Corym Vanguard', icon: '⚔️', hp: 149, atk: 17, def: 27, xp: 78, gold: [3,9], loot: [['bones',0.3]] },
  pirate_marauder: { name: 'Pirate Marauder', icon: '🏴‍☠️', hp: 180, atk: 20, def: 31, xp: 100, gold: [4,12], loot: [['bones',0.3]] },
  pirate_cutthroat: { name: 'Pirate Cutthroat', icon: '🏴‍☠️', hp: 180, atk: 20, def: 31, xp: 100, gold: [4,12], loot: [['bones',0.3]] },
  pirate_corsair: { name: 'Pirate Corsair', icon: '🏴‍☠️', hp: 180, atk: 20, def: 31, xp: 100, gold: [4,12], loot: [['bones',0.3]] },
  pirate_buccaneer: { name: 'Pirate Buccaneer', icon: '🏴‍☠️', hp: 180, atk: 20, def: 31, xp: 100, gold: [4,12], loot: [['bones',0.3]] },
  barbarian_bloodwalker: { name: 'Barbarian Bloodwalker', icon: '👹', hp: 200, atk: 22, def: 32, xp: 114, gold: [5,14], loot: [['bones',0.3]] },
  barbarian_brutetamer: { name: 'Barbarian Brutetamer', icon: '👹', hp: 200, atk: 22, def: 32, xp: 114, gold: [5,14], loot: [['bones',0.3]] },
  barbarian_headsplitter: { name: 'Barbarian Headsplitter', icon: '👹', hp: 200, atk: 22, def: 32, xp: 114, gold: [5,14], loot: [['bones',0.3]] },
  barbarian_skullhunter: { name: 'Barbarian Skullhunter', icon: '👹', hp: 200, atk: 22, def: 32, xp: 114, gold: [5,14], loot: [['bones',0.3]] },
  green_djinn: { name: 'Green Djinn', icon: '👹', hp: 221, atk: 23, def: 34, xp: 129, gold: [5,15], loot: [['bones',0.3]] },
  blue_djinn: { name: 'Blue Djinn', icon: '👹', hp: 221, atk: 23, def: 34, xp: 129, gold: [5,15], loot: [['bones',0.3]] },
  stonerefiner: { name: 'Stonerefiner', icon: '💎', hp: 246, atk: 26, def: 36, xp: 147, gold: [6,18], loot: [['bones',0.3]] },
  dragon_hatchling: { name: 'Dragon Hatchling', icon: '🐉', hp: 272, atk: 28, def: 38, xp: 166, gold: [7,20], loot: [['bones',0.3]] },
  minotaur_hunter: { name: 'Minotaur Hunter', icon: '🐂', hp: 305, atk: 31, def: 40, xp: 189, gold: [8,23], loot: [['bones',0.3]] },
  moohtah_warrior: { name: 'Mooh\'Tah Warrior', icon: '⚔️', hp: 305, atk: 31, def: 40, xp: 189, gold: [8,23], loot: [['bones',0.3]] },
  minotaur_amazon: { name: 'Minotaur Amazon', icon: '🐂', hp: 305, atk: 31, def: 40, xp: 189, gold: [8,23], loot: [['bones',0.3]] },
  worm_priestess: { name: 'Worm Priestess', icon: '🪱', hp: 305, atk: 31, def: 40, xp: 189, gold: [8,23], loot: [['bones',0.3]] },
  execowtioner: { name: 'Execowtioner', icon: '👹', hp: 305, atk: 31, def: 40, xp: 189, gold: [8,23], loot: [['bones',0.3]] },
  moohtant: { name: 'Moohtant', icon: '👹', hp: 305, atk: 31, def: 40, xp: 189, gold: [8,23], loot: [['bones',0.3]] },
  quara_mantassin_scout: { name: 'Quara Mantassin Scout', icon: '🦑', hp: 340, atk: 34, def: 42, xp: 214, gold: [9,26], loot: [['bones',0.3]] },
  quara_constrictor_scout: { name: 'Quara Constrictor Scout', icon: '🦑', hp: 340, atk: 34, def: 42, xp: 214, gold: [9,26], loot: [['bones',0.3]] },
  quara_pincher_scout: { name: 'Quara Pincher Scout', icon: '🦑', hp: 340, atk: 34, def: 42, xp: 214, gold: [9,26], loot: [['bones',0.3]] },
  quara_predator_scout: { name: 'Quara Predator Scout', icon: '🦑', hp: 340, atk: 34, def: 42, xp: 214, gold: [9,26], loot: [['bones',0.3]] },
  quara_hydromancer_scout: { name: 'Quara Hydromancer Scout', icon: '🦑', hp: 340, atk: 34, def: 42, xp: 214, gold: [9,26], loot: [['bones',0.3]] },
  wailing_widow: { name: 'Wailing Widow', icon: '👹', hp: 426, atk: 41, def: 46, xp: 276, gold: [11,33], loot: [['bones',0.3]] },
  brimstone_bug: { name: 'Brimstone Bug', icon: '🪱', hp: 426, atk: 41, def: 46, xp: 276, gold: [11,33], loot: [['bones',0.3]] },
  elder_wyrm: { name: 'Elder Wyrm', icon: '🐉', hp: 478, atk: 46, def: 48, xp: 313, gold: [13,38], loot: [['bones',0.3]] },
  cult_believer: { name: 'Cult Believer', icon: '🧙', hp: 538, atk: 51, def: 50, xp: 356, gold: [14,43], loot: [['bones',0.3]] },
  vicious_squire: { name: 'Vicious Squire', icon: '👹', hp: 538, atk: 51, def: 50, xp: 356, gold: [14,43], loot: [['bones',0.3]] },
  cult_enforcer: { name: 'Cult Enforcer', icon: '👺', hp: 538, atk: 51, def: 50, xp: 356, gold: [14,43], loot: [['bones',0.3]] },
  renegade_knight: { name: 'Renegade Knight', icon: '⚔️', hp: 538, atk: 51, def: 50, xp: 356, gold: [14,43], loot: [['bones',0.3]] },
  vile_grandmaster: { name: 'Vile Grandmaster', icon: '👹', hp: 538, atk: 51, def: 50, xp: 356, gold: [14,43], loot: [['bones',0.3]] },
  cult_scholar: { name: 'Cult Scholar', icon: '🧙', hp: 538, atk: 51, def: 50, xp: 356, gold: [14,43], loot: [['bones',0.3]] },
  deepling_spellsinger: { name: 'Deepling Spellsinger', icon: '👹', hp: 606, atk: 56, def: 51, xp: 404, gold: [16,48], loot: [['bones',0.3]] },
  deepling_scout: { name: 'Deepling Scout', icon: '👹', hp: 606, atk: 56, def: 51, xp: 404, gold: [16,48], loot: [['bones',0.3]] },
  deepling_warrior: { name: 'Deepling Warrior', icon: '⚔️', hp: 606, atk: 56, def: 51, xp: 404, gold: [16,48], loot: [['bones',0.3]] },
  deepling_guard: { name: 'Deepling Guard', icon: '⚔️', hp: 606, atk: 56, def: 51, xp: 404, gold: [16,48], loot: [['bones',0.3]] },
  werefox: { name: 'Werefox', icon: '🐺', hp: 681, atk: 63, def: 53, xp: 458, gold: [18,55], loot: [['bones',0.3]] },
  werebadger: { name: 'Werebadger', icon: '🐺', hp: 681, atk: 63, def: 53, xp: 458, gold: [18,55], loot: [['bones',0.3]] },
  wereboar: { name: 'Wereboar', icon: '🐺', hp: 681, atk: 63, def: 53, xp: 458, gold: [18,55], loot: [['bones',0.3]] },
  werebear: { name: 'Werebear', icon: '🐺', hp: 681, atk: 63, def: 53, xp: 458, gold: [18,55], loot: [['bones',0.3]] },
  minotaur_cult_follower: { name: 'Minotaur Cult Follower', icon: '🐂', hp: 768, atk: 70, def: 55, xp: 520, gold: [21,62], loot: [['bones',0.3]] },
  minotaur_cult_prophet: { name: 'Minotaur Cult Prophet', icon: '🐂', hp: 768, atk: 70, def: 55, xp: 520, gold: [21,62], loot: [['bones',0.3]] },
  minotaur_cult_zealot: { name: 'Minotaur Cult Zealot', icon: '🐂', hp: 768, atk: 70, def: 55, xp: 520, gold: [21,62], loot: [['bones',0.3]] },
  weakened_frazzlemaw: { name: 'Weakened Frazzlemaw', icon: '👹', hp: 866, atk: 79, def: 57, xp: 590, gold: [24,71], loot: [['bones',0.3]] },
  enfeebled_silencer: { name: 'Enfeebled Silencer', icon: '👹', hp: 866, atk: 79, def: 57, xp: 590, gold: [24,71], loot: [['bones',0.3]] },
  glooth_bandit: { name: 'Glooth Bandit', icon: '👹', hp: 978, atk: 88, def: 59, xp: 670, gold: [27,80], loot: [['bones',0.3]] },
  glooth_brigand: { name: 'Glooth Brigand', icon: '👹', hp: 978, atk: 88, def: 59, xp: 670, gold: [27,80], loot: [['bones',0.3]] },
  exotic_cave_spider: { name: 'Exotic Cave Spider', icon: '🕷️', hp: 1104, atk: 99, def: 61, xp: 760, gold: [30,91], loot: [['bones',0.3]] },
  exotic_bat: { name: 'Exotic Bat', icon: '👹', hp: 1104, atk: 99, def: 61, xp: 760, gold: [30,91], loot: [['bones',0.3]] },
  pirat_bombardier: { name: 'Pirat Bombardier', icon: '🏴‍☠️', hp: 1248, atk: 112, def: 63, xp: 863, gold: [35,104], loot: [['bones',0.3]] },
  pirat_cutthroat: { name: 'Pirat Cutthroat', icon: '🏴‍☠️', hp: 1248, atk: 112, def: 63, xp: 863, gold: [35,104], loot: [['bones',0.3]] },
  pirat_mate: { name: 'Pirat Mate', icon: '🏴‍☠️', hp: 1248, atk: 112, def: 63, xp: 863, gold: [35,104], loot: [['bones',0.3]] },
  pirat_scoundrel: { name: 'Pirat Scoundrel', icon: '🏴‍☠️', hp: 1248, atk: 112, def: 63, xp: 863, gold: [35,104], loot: [['bones',0.3]] },
  werehyaena: { name: 'Werehyaena', icon: '🐺', hp: 1411, atk: 125, def: 65, xp: 979, gold: [39,117], loot: [['bones',0.3]] },
  werehyaena_shaman: { name: 'Werehyaena Shaman', icon: '🐺', hp: 1411, atk: 125, def: 65, xp: 979, gold: [39,117], loot: [['bones',0.3]] },
  dragon_lord_hatchling: { name: 'Dragon Lord Hatchling', icon: '🐉', hp: 1597, atk: 141, def: 67, xp: 1112, gold: [44,133], loot: [['bones',0.3]] },
  eternal_guardian: { name: 'Eternal Guardian', icon: '⚔️', hp: 2045, atk: 180, def: 70, xp: 1432, gold: [57,172], loot: [['bones',0.3]] },
  lizard_legionnaire: { name: 'Lizard Legionnaire', icon: '🐊', hp: 2623, atk: 229, def: 74, xp: 1845, gold: [74,221], loot: [['bones',0.3]] },
  lizard_magistratus: { name: 'Lizard Magistratus', icon: '🐊', hp: 2623, atk: 229, def: 74, xp: 1845, gold: [74,221], loot: [['bones',0.3]] },
  lizard_noble: { name: 'Lizard Noble', icon: '🐊', hp: 2623, atk: 229, def: 74, xp: 1845, gold: [74,221], loot: [['bones',0.3]] },
  lizard_chosen: { name: 'Lizard Chosen', icon: '🐊', hp: 2623, atk: 229, def: 74, xp: 1845, gold: [74,221], loot: [['bones',0.3]] },
  lizard_dragon_priest: { name: 'Lizard Dragon Priest', icon: '🐉', hp: 2623, atk: 229, def: 74, xp: 1845, gold: [74,221], loot: [['bones',0.3]] },
  lizard_high_guard: { name: 'Lizard High Guard', icon: '⚔️', hp: 2623, atk: 229, def: 74, xp: 1845, gold: [74,221], loot: [['bones',0.3]] },
  waspoid: { name: 'Waspoid', icon: '👹', hp: 2972, atk: 259, def: 76, xp: 2094, gold: [84,251], loot: [['bones',0.3]] },
  crawler: { name: 'Crawler', icon: '👹', hp: 2972, atk: 259, def: 76, xp: 2094, gold: [84,251], loot: [['bones',0.3]] },
  spitter: { name: 'Spitter', icon: '👹', hp: 2972, atk: 259, def: 76, xp: 2094, gold: [84,251], loot: [['bones',0.3]] },
  kollos: { name: 'Kollos', icon: '👹', hp: 2972, atk: 259, def: 76, xp: 2094, gold: [84,251], loot: [['bones',0.3]] },
  spidris: { name: 'Spidris', icon: '🕷️', hp: 2972, atk: 259, def: 76, xp: 2094, gold: [84,251], loot: [['bones',0.3]] },
  spidris_elite: { name: 'Spidris Elite', icon: '🕷️', hp: 2972, atk: 259, def: 76, xp: 2094, gold: [84,251], loot: [['bones',0.3]] },
  hive_overseer: { name: 'Hive Overseer', icon: '👹', hp: 2972, atk: 259, def: 76, xp: 2094, gold: [84,251], loot: [['bones',0.3]] },
  floating_savant: { name: 'Floating Savant', icon: '👹', hp: 3366, atk: 293, def: 78, xp: 2376, gold: [95,285], loot: [['bones',0.3]] },
  iks_yapunac: { name: 'Iks Yapunac', icon: '👹', hp: 3816, atk: 332, def: 80, xp: 2697, gold: [108,324], loot: [['bones',0.3]] },
  mitmah_scout: { name: 'Mitmah Scout', icon: '👹', hp: 3816, atk: 332, def: 80, xp: 2697, gold: [108,324], loot: [['bones',0.3]] },
  mitmah_seer: { name: 'Mitmah Seer', icon: '👹', hp: 3816, atk: 332, def: 80, xp: 2697, gold: [108,324], loot: [['bones',0.3]] },
  lumbering_carnivor: { name: 'Lumbering Carnivor', icon: '👹', hp: 4325, atk: 375, def: 82, xp: 3061, gold: [122,367], loot: [['bones',0.3]] },
  spiky_carnivor: { name: 'Spiky Carnivor', icon: '👹', hp: 4325, atk: 375, def: 82, xp: 3061, gold: [122,367], loot: [['bones',0.3]] },
  menacing_carnivor: { name: 'Menacing Carnivor', icon: '👹', hp: 4325, atk: 375, def: 82, xp: 3061, gold: [122,367], loot: [['bones',0.3]] },
  hellspawn: { name: 'Hellspawn', icon: '😈', hp: 4905, atk: 425, def: 84, xp: 3475, gold: [139,417], loot: [['bones',0.3]] },
  candy_horror: { name: 'Candy Horror', icon: '👹', hp: 5562, atk: 481, def: 86, xp: 3944, gold: [158,473], loot: [['bones',0.3]] },
  nibblemaw: { name: 'Nibblemaw', icon: '👹', hp: 5562, atk: 481, def: 86, xp: 3944, gold: [158,473], loot: [['bones',0.3]] },
  honey_elemental: { name: 'Honey Elemental', icon: '👹', hp: 5562, atk: 481, def: 86, xp: 3944, gold: [158,473], loot: [['bones',0.3]] },
  angry_sugar_fairy: { name: 'Angry Sugar Fairy', icon: '👹', hp: 5562, atk: 481, def: 86, xp: 3944, gold: [158,473], loot: [['bones',0.3]] },
  candy_floss_elemental: { name: 'Candy Floss Elemental', icon: '👹', hp: 5562, atk: 481, def: 86, xp: 3944, gold: [158,473], loot: [['bones',0.3]] },
  goggle_cake: { name: 'Goggle Cake', icon: '👹', hp: 5562, atk: 481, def: 86, xp: 3944, gold: [158,473], loot: [['bones',0.3]] },
  werelioness: { name: 'Werelioness', icon: '🐺', hp: 6306, atk: 545, def: 88, xp: 4476, gold: [179,537], loot: [['bones',0.3]] },
  breach_brood: { name: 'Breach Brood', icon: '👹', hp: 7152, atk: 618, def: 89, xp: 5080, gold: [203,610], loot: [['bones',0.3]] },
  dread_intruder: { name: 'Dread Intruder', icon: '👹', hp: 7152, atk: 618, def: 89, xp: 5080, gold: [203,610], loot: [['bones',0.3]] },
  sparkion: { name: 'Sparkion', icon: '👹', hp: 7152, atk: 618, def: 89, xp: 5080, gold: [203,610], loot: [['bones',0.3]] },
  reality_reaver: { name: 'Reality Reaver', icon: '👹', hp: 7152, atk: 618, def: 89, xp: 5080, gold: [203,610], loot: [['bones',0.3]] },
  dawnfire_asura: { name: 'Dawnfire Asura', icon: '🔥', hp: 8112, atk: 700, def: 91, xp: 5766, gold: [231,692], loot: [['bones',0.3]] },
  midnight_asura: { name: 'Midnight Asura', icon: '👹', hp: 8112, atk: 700, def: 91, xp: 5766, gold: [231,692], loot: [['bones',0.3]] },
  frost_flower_asura: { name: 'Frost Flower Asura', icon: '❄️', hp: 8112, atk: 700, def: 91, xp: 5766, gold: [231,692], loot: [['bones',0.3]] },
  gazer_spectre: { name: 'Gazer Spectre', icon: '👻', hp: 9203, atk: 793, def: 93, xp: 6545, gold: [262,785], loot: [['bones',0.3]] },
  burster_spectre: { name: 'Burster Spectre', icon: '👻', hp: 9203, atk: 793, def: 93, xp: 6545, gold: [262,785], loot: [['bones',0.3]] },
  ripper_spectre: { name: 'Ripper Spectre', icon: '👻', hp: 9203, atk: 793, def: 93, xp: 6545, gold: [262,785], loot: [['bones',0.3]] },
  destroyer: { name: 'Destroyer', icon: '👹', hp: 10439, atk: 899, def: 95, xp: 7428, gold: [297,891], loot: [['bones',0.3]] },
  silencer: { name: 'Silencer', icon: '👹', hp: 11843, atk: 1020, def: 97, xp: 8431, gold: [337,1012], loot: [['bones',0.3]] },
  choking_fear: { name: 'Choking Fear', icon: '👹', hp: 11843, atk: 1020, def: 97, xp: 8431, gold: [337,1012], loot: [['bones',0.3]] },
  hideous_fungus: { name: 'Hideous Fungus', icon: '🌿', hp: 13437, atk: 1156, def: 99, xp: 9569, gold: [383,1148], loot: [['bones',0.3]] },
  humongous_fungus: { name: 'Humongous Fungus', icon: '🌿', hp: 13437, atk: 1156, def: 99, xp: 9569, gold: [383,1148], loot: [['bones',0.3]] },
  humorless_fungus: { name: 'Humorless Fungus', icon: '🌿', hp: 13437, atk: 1156, def: 99, xp: 9569, gold: [383,1148], loot: [['bones',0.3]] },
  stone_devourer: { name: 'Stone Devourer', icon: '💎', hp: 13437, atk: 1156, def: 99, xp: 9569, gold: [383,1148], loot: [['bones',0.3]] },
  weeper: { name: 'Weeper', icon: '👹', hp: 13437, atk: 1156, def: 99, xp: 9569, gold: [383,1148], loot: [['bones',0.3]] },
  magma_crawler: { name: 'Magma Crawler', icon: '👹', hp: 13437, atk: 1156, def: 99, xp: 9569, gold: [383,1148], loot: [['bones',0.3]] },
  lost_berserker: { name: 'Lost Berserker', icon: '👹', hp: 13437, atk: 1156, def: 99, xp: 9569, gold: [383,1148], loot: [['bones',0.3]] },
  lava_golem: { name: 'Lava Golem', icon: '🔥', hp: 13437, atk: 1156, def: 99, xp: 9569, gold: [383,1148], loot: [['bones',0.3]] },
  cliff_strider: { name: 'Cliff Strider', icon: '👹', hp: 13437, atk: 1156, def: 99, xp: 9569, gold: [383,1148], loot: [['bones',0.3]] },
  ironblight: { name: 'Ironblight', icon: '👹', hp: 13437, atk: 1156, def: 99, xp: 9569, gold: [383,1148], loot: [['bones',0.3]] },
  orewalker: { name: 'Orewalker', icon: '👹', hp: 13437, atk: 1156, def: 99, xp: 9569, gold: [383,1148], loot: [['bones',0.3]] },
  weretiger: { name: 'Weretiger', icon: '🐺', hp: 15245, atk: 1311, def: 101, xp: 10861, gold: [434,1303], loot: [['bones',0.3]] },
  white_weretiger: { name: 'White Weretiger', icon: '🐺', hp: 15245, atk: 1311, def: 101, xp: 10861, gold: [434,1303], loot: [['bones',0.3]] },
  cunning_werepanther: { name: 'Cunning Werepanther', icon: '🐺', hp: 15245, atk: 1311, def: 101, xp: 10861, gold: [434,1303], loot: [['bones',0.3]] },
  werecrocodile: { name: 'Werecrocodile', icon: '🐺', hp: 17298, atk: 1487, def: 103, xp: 12327, gold: [493,1479], loot: [['bones',0.3]] },
  feral_werecrocodile: { name: 'Feral Werecrocodile', icon: '🐺', hp: 17298, atk: 1487, def: 103, xp: 12327, gold: [493,1479], loot: [['bones',0.3]] },
  werepanther: { name: 'Werepanther', icon: '🐺', hp: 17298, atk: 1487, def: 103, xp: 12327, gold: [493,1479], loot: [['bones',0.3]] },
  crazed_summer_rearguard: { name: 'Crazed Summer Rearguard', icon: '⚔️', hp: 19629, atk: 1687, def: 105, xp: 13992, gold: [560,1679], loot: [['bones',0.3]] },
  crazed_summer_vanguard: { name: 'Crazed Summer Vanguard', icon: '⚔️', hp: 19629, atk: 1687, def: 105, xp: 13992, gold: [560,1679], loot: [['bones',0.3]] },
  crazed_winter_rearguard: { name: 'Crazed Winter Rearguard', icon: '⚔️', hp: 19629, atk: 1687, def: 105, xp: 13992, gold: [560,1679], loot: [['bones',0.3]] },
  crazed_winter_vanguard: { name: 'Crazed Winter Vanguard', icon: '⚔️', hp: 19629, atk: 1687, def: 105, xp: 13992, gold: [560,1679], loot: [['bones',0.3]] },
  insane_siren: { name: 'Insane Siren', icon: '👹', hp: 19629, atk: 1687, def: 105, xp: 13992, gold: [560,1679], loot: [['bones',0.3]] },
  soul_broken_harbinger: { name: 'Soul-broken Harbinger', icon: '👹', hp: 19629, atk: 1687, def: 105, xp: 13992, gold: [560,1679], loot: [['bones',0.3]] },
  deathling_scout: { name: 'Deathling Scout', icon: '👹', hp: 22272, atk: 1914, def: 107, xp: 15880, gold: [635,1906], loot: [['bones',0.3]] },
  deathling_spellsinger: { name: 'Deathling Spellsinger', icon: '👹', hp: 22272, atk: 1914, def: 107, xp: 15880, gold: [635,1906], loot: [['bones',0.3]] },
  foam_stalker: { name: 'Foam Stalker', icon: '👹', hp: 25274, atk: 2171, def: 108, xp: 18024, gold: [721,2163], loot: [['bones',0.3]] },
  two_headed_turtle: { name: 'Two-headed Turtle', icon: '🐢', hp: 25274, atk: 2171, def: 108, xp: 18024, gold: [721,2163], loot: [['bones',0.3]] },
  makara: { name: 'Makara', icon: '👹', hp: 28681, atk: 2463, def: 110, xp: 20458, gold: [818,2455], loot: [['bones',0.3]] },
  naga_archer: { name: 'Naga Archer', icon: '🐍', hp: 28681, atk: 2463, def: 110, xp: 20458, gold: [818,2455], loot: [['bones',0.3]] },
  naga_warrior: { name: 'Naga Warrior', icon: '🐍', hp: 28681, atk: 2463, def: 110, xp: 20458, gold: [818,2455], loot: [['bones',0.3]] },
  dark_carnisylvan: { name: 'Dark Carnisylvan', icon: '🌿', hp: 32547, atk: 2794, def: 112, xp: 23219, gold: [929,2786], loot: [['bones',0.3]] },
  hulking_carnisylvan: { name: 'Hulking Carnisylvan', icon: '🌿', hp: 32547, atk: 2794, def: 112, xp: 23219, gold: [929,2786], loot: [['bones',0.3]] },
  poisonous_carnisylvan: { name: 'Poisonous Carnisylvan', icon: '🌿', hp: 32547, atk: 2794, def: 112, xp: 23219, gold: [929,2786], loot: [['bones',0.3]] },
  burning_gladiator: { name: 'Burning Gladiator', icon: '🔥', hp: 36936, atk: 3170, def: 114, xp: 26354, gold: [1054,3162], loot: [['bones',0.3]] },
  black_sphinx_acolyte: { name: 'Black Sphinx Acolyte', icon: '👹', hp: 36936, atk: 3170, def: 114, xp: 26354, gold: [1054,3162], loot: [['bones',0.3]] },
  priestess_of_the_wild_sun: { name: 'Priestess Of The Wild Sun', icon: '👹', hp: 36936, atk: 3170, def: 114, xp: 26354, gold: [1054,3162], loot: [['bones',0.3]] },
  sphinx: { name: 'Sphinx', icon: '👹', hp: 41917, atk: 3597, def: 116, xp: 29912, gold: [1196,3589], loot: [['bones',0.3]] },
  manticore: { name: 'Manticore', icon: '👹', hp: 41917, atk: 3597, def: 116, xp: 29912, gold: [1196,3589], loot: [['bones',0.3]] },
  lamassu: { name: 'Lamassu', icon: '👹', hp: 41917, atk: 3597, def: 116, xp: 29912, gold: [1196,3589], loot: [['bones',0.3]] },
  feral_sphinx: { name: 'Feral Sphinx', icon: '👹', hp: 41917, atk: 3597, def: 116, xp: 29912, gold: [1196,3589], loot: [['bones',0.3]] },
  crypt_warden: { name: 'Crypt Warden', icon: '👹', hp: 41917, atk: 3597, def: 116, xp: 29912, gold: [1196,3589], loot: [['bones',0.3]] },
  chasm_spawn: { name: 'Chasm Spawn', icon: '👹', hp: 47570, atk: 4082, def: 118, xp: 33950, gold: [1358,4074], loot: [['bones',0.3]] },
  drillworm: { name: 'Drillworm', icon: '🪱', hp: 47570, atk: 4082, def: 118, xp: 33950, gold: [1358,4074], loot: [['bones',0.3]] },
  cave_devourer: { name: 'Cave Devourer', icon: '👹', hp: 47570, atk: 4082, def: 118, xp: 33950, gold: [1358,4074], loot: [['bones',0.3]] },
  tunnel_tyrant: { name: 'Tunnel Tyrant', icon: '👹', hp: 47570, atk: 4082, def: 118, xp: 33950, gold: [1358,4074], loot: [['bones',0.3]] },
  deepworm: { name: 'Deepworm', icon: '🪱', hp: 47570, atk: 4082, def: 118, xp: 33950, gold: [1358,4074], loot: [['bones',0.3]] },
  diremaw: { name: 'Diremaw', icon: '👹', hp: 47570, atk: 4082, def: 118, xp: 33950, gold: [1358,4074], loot: [['bones',0.3]] },
  ogre_rowdy: { name: 'Ogre Rowdy', icon: '👹', hp: 61269, atk: 5256, def: 122, xp: 43735, gold: [1749,5248], loot: [['bones',0.3]] },
  ogre_ruffian: { name: 'Ogre Ruffian', icon: '👹', hp: 61269, atk: 5256, def: 122, xp: 43735, gold: [1749,5248], loot: [['bones',0.3]] },
  ogre_sage: { name: 'Ogre Sage', icon: '👹', hp: 61269, atk: 5256, def: 122, xp: 43735, gold: [1749,5248], loot: [['bones',0.3]] },
  young_goanna: { name: 'Young Goanna', icon: '🐊', hp: 69535, atk: 5965, def: 124, xp: 49639, gold: [1986,5957], loot: [['bones',0.3]] },
  adult_goanna: { name: 'Adult Goanna', icon: '🐊', hp: 69535, atk: 5965, def: 124, xp: 49639, gold: [1986,5957], loot: [['bones',0.3]] },
  demon_outcast: { name: 'Demon Outcast', icon: '😈', hp: 78917, atk: 6769, def: 126, xp: 56341, gold: [2254,6761], loot: [['bones',0.3]] },
  cobra_assassin: { name: 'Cobra Assassin', icon: '🐍', hp: 89566, atk: 7682, def: 127, xp: 63947, gold: [2558,7674], loot: [['bones',0.3]] },
  cobra_scout: { name: 'Cobra Scout', icon: '🐍', hp: 89566, atk: 7682, def: 127, xp: 63947, gold: [2558,7674], loot: [['bones',0.3]] },
  cobra_vizier: { name: 'Cobra Vizier', icon: '🐍', hp: 89566, atk: 7682, def: 127, xp: 63947, gold: [2558,7674], loot: [['bones',0.3]] },
  bulltaur_alchemist: { name: 'Bulltaur Alchemist', icon: '🐂', hp: 101652, atk: 8718, def: 129, xp: 72580, gold: [2903,8710], loot: [['bones',0.3]] },
  bulltaur_brute: { name: 'Bulltaur Brute', icon: '🐂', hp: 101652, atk: 8718, def: 129, xp: 72580, gold: [2903,8710], loot: [['bones',0.3]] },
  bulltaur_forgepriest: { name: 'Bulltaur Forgepriest', icon: '🐂', hp: 101652, atk: 8718, def: 129, xp: 72580, gold: [2903,8710], loot: [['bones',0.3]] },
  flimsy_lost_soul: { name: 'Flimsy Lost Soul', icon: '👹', hp: 115369, atk: 9893, def: 131, xp: 82378, gold: [3295,9885], loot: [['bones',0.3]] },
  mean_lost_soul: { name: 'Mean Lost Soul', icon: '👹', hp: 115369, atk: 9893, def: 131, xp: 82378, gold: [3295,9885], loot: [['bones',0.3]] },
  freakish_lost_soul: { name: 'Freakish Lost Soul', icon: '👹', hp: 115369, atk: 9893, def: 131, xp: 82378, gold: [3295,9885], loot: [['bones',0.3]] },
  skeleton_elite_warrior: { name: 'Skeleton Elite Warrior', icon: '💀', hp: 130939, atk: 11228, def: 133, xp: 93499, gold: [3740,11220], loot: [['bones',0.3]] },
  undead_elite_gladiator: { name: 'Undead Elite Gladiator', icon: '💀', hp: 130939, atk: 11228, def: 133, xp: 93499, gold: [3740,11220], loot: [['bones',0.3]] },
  dragolisk: { name: 'Dragolisk', icon: '👹', hp: 148609, atk: 12743, def: 135, xp: 106121, gold: [4245,12735], loot: [['bones',0.3]] },
  mega_dragon: { name: 'Mega Dragon', icon: '🐉', hp: 148609, atk: 12743, def: 135, xp: 106121, gold: [4245,12735], loot: [['bones',0.3]] },
  wardragon: { name: 'Wardragon', icon: '🐉', hp: 148609, atk: 12743, def: 135, xp: 106121, gold: [4245,12735], loot: [['bones',0.3]] },
  bashmu: { name: 'Bashmu', icon: '🐊', hp: 168666, atk: 14462, def: 137, xp: 120447, gold: [4818,14454], loot: [['bones',0.3]] },
  juvenile_bashmu: { name: 'Juvenile Bashmu', icon: '🐊', hp: 168666, atk: 14462, def: 137, xp: 120447, gold: [4818,14454], loot: [['bones',0.3]] },
  girtablilu_warrior: { name: 'Girtablilu Warrior', icon: '⚔️', hp: 191431, atk: 16413, def: 139, xp: 136708, gold: [5468,16405], loot: [['bones',0.3]] },
  venerable_girtablilu: { name: 'Venerable Girtablilu', icon: '👹', hp: 191431, atk: 16413, def: 139, xp: 136708, gold: [5468,16405], loot: [['bones',0.3]] },
  boar_man: { name: 'Boar Man', icon: '🐗', hp: 217268, atk: 18628, def: 141, xp: 155163, gold: [6207,18620], loot: [['bones',0.3]] },
  carnivostrich: { name: 'Carnivostrich', icon: '👹', hp: 217268, atk: 18628, def: 141, xp: 155163, gold: [6207,18620], loot: [['bones',0.3]] },
  crape_man: { name: 'Crape Man', icon: '🦍', hp: 217268, atk: 18628, def: 141, xp: 155163, gold: [6207,18620], loot: [['bones',0.3]] },
  harpy: { name: 'Harpy', icon: '🦅', hp: 217268, atk: 18628, def: 141, xp: 155163, gold: [6207,18620], loot: [['bones',0.3]] },
  liodile: { name: 'Liodile', icon: '👹', hp: 217268, atk: 18628, def: 141, xp: 155163, gold: [6207,18620], loot: [['bones',0.3]] },
  rhindeer: { name: 'Rhindeer', icon: '🦌', hp: 217268, atk: 18628, def: 141, xp: 155163, gold: [6207,18620], loot: [['bones',0.3]] },
  grimeleech: { name: 'Grimeleech', icon: '👹', hp: 246594, atk: 21141, def: 143, xp: 176110, gold: [7044,21133], loot: [['bones',0.3]] },
  hellflayer: { name: 'Hellflayer', icon: '😈', hp: 246594, atk: 21141, def: 143, xp: 176110, gold: [7044,21133], loot: [['bones',0.3]] },
  afflicted_strider: { name: 'Afflicted Strider', icon: '👹', hp: 279879, atk: 23994, def: 145, xp: 199885, gold: [7995,23986], loot: [['bones',0.3]] },
  blemished_spawn: { name: 'Blemished Spawn', icon: '👹', hp: 279879, atk: 23994, def: 145, xp: 199885, gold: [7995,23986], loot: [['bones',0.3]] },
  eyeless_devourer: { name: 'Eyeless Devourer', icon: '👹', hp: 279879, atk: 23994, def: 145, xp: 199885, gold: [7995,23986], loot: [['bones',0.3]] },
  lavafungus: { name: 'Lavafungus', icon: '🌿', hp: 279879, atk: 23994, def: 145, xp: 199885, gold: [7995,23986], loot: [['bones',0.3]] },
  lavaworm: { name: 'Lavaworm', icon: '🪱', hp: 279879, atk: 23994, def: 145, xp: 199885, gold: [7995,23986], loot: [['bones',0.3]] },
  streaked_devourer: { name: 'Streaked Devourer', icon: '👹', hp: 279879, atk: 23994, def: 145, xp: 199885, gold: [7995,23986], loot: [['bones',0.3]] },
  cave_chimera: { name: 'Cave Chimera', icon: '👹', hp: 279879, atk: 23994, def: 145, xp: 199885, gold: [7995,23986], loot: [['bones',0.3]] },
  tremendous_tyrant: { name: 'Tremendous Tyrant', icon: '👹', hp: 279879, atk: 23994, def: 145, xp: 199885, gold: [7995,23986], loot: [['bones',0.3]] },
  varnished_diremaw: { name: 'Varnished Diremaw', icon: '👹', hp: 279879, atk: 23994, def: 145, xp: 199885, gold: [7995,23986], loot: [['bones',0.3]] },
  rootthing_amber_shaper: { name: 'Rootthing Amber Shaper', icon: '🌿', hp: 317658, atk: 27232, def: 146, xp: 226870, gold: [9075,27224], loot: [['bones',0.3]] },
  rootthing_nutshell: { name: 'Rootthing Nutshell', icon: '😈', hp: 317658, atk: 27232, def: 146, xp: 226870, gold: [9075,27224], loot: [['bones',0.3]] },
  rootthing_bug_tracker: { name: 'Rootthing Bug Tracker', icon: '🪱', hp: 317658, atk: 27232, def: 146, xp: 226870, gold: [9075,27224], loot: [['bones',0.3]] },
  true_dawnfire_asura: { name: 'True Dawnfire Asura', icon: '🔥', hp: 360536, atk: 30908, def: 148, xp: 257497, gold: [10300,30900], loot: [['bones',0.3]] },
  true_midnight_asura: { name: 'True Midnight Asura', icon: '👹', hp: 360536, atk: 30908, def: 148, xp: 257497, gold: [10300,30900], loot: [['bones',0.3]] },
  true_frost_flower_asura: { name: 'True Frost Flower Asura', icon: '❄️', hp: 360536, atk: 30908, def: 148, xp: 257497, gold: [10300,30900], loot: [['bones',0.3]] },
  quara_looter: { name: 'Quara Looter', icon: '🦑', hp: 409203, atk: 35079, def: 150, xp: 292259, gold: [11690,35071], loot: [['bones',0.3]] },
  quara_plunderer: { name: 'Quara Plunderer', icon: '🦑', hp: 409203, atk: 35079, def: 150, xp: 292259, gold: [11690,35071], loot: [['bones',0.3]] },
  quara_raider: { name: 'Quara Raider', icon: '🦑', hp: 409203, atk: 35079, def: 150, xp: 292259, gold: [11690,35071], loot: [['bones',0.3]] },
  cursed_book: { name: 'Cursed Book', icon: '📕', hp: 464440, atk: 39814, def: 152, xp: 331714, gold: [13269,39806], loot: [['bones',0.3]] },
  ink_blob: { name: 'Ink Blob', icon: '👹', hp: 464440, atk: 39814, def: 152, xp: 331714, gold: [13269,39806], loot: [['bones',0.3]] },
  icecold_book: { name: 'Icecold Book', icon: '📕', hp: 527134, atk: 45188, def: 154, xp: 376496, gold: [15060,45180], loot: [['bones',0.3]] },
  squid_warden: { name: 'Squid Warden', icon: '🦑', hp: 527134, atk: 45188, def: 154, xp: 376496, gold: [15060,45180], loot: [['bones',0.3]] },
  animated_feather: { name: 'Animated Feather', icon: '👹', hp: 527134, atk: 45188, def: 154, xp: 376496, gold: [15060,45180], loot: [['bones',0.3]] },
  burning_book: { name: 'Burning Book', icon: '📕', hp: 598292, atk: 51287, def: 156, xp: 427323, gold: [17093,51279], loot: [['bones',0.3]] },
  rage_squid: { name: 'Rage Squid', icon: '🦑', hp: 598292, atk: 51287, def: 156, xp: 427323, gold: [17093,51279], loot: [['bones',0.3]] },
  guardian_of_tales: { name: 'Guardian Of Tales', icon: '⚔️', hp: 598292, atk: 51287, def: 156, xp: 427323, gold: [17093,51279], loot: [['bones',0.3]] },
  energetic_book: { name: 'Energetic Book', icon: '📕', hp: 679055, atk: 58209, def: 158, xp: 485011, gold: [19400,58201], loot: [['bones',0.3]] },
  brain_squid: { name: 'Brain Squid', icon: '🦑', hp: 679055, atk: 58209, def: 158, xp: 485011, gold: [19400,58201], loot: [['bones',0.3]] },
  energuardian_of_tales: { name: 'Energuardian Of Tales', icon: '⚔️', hp: 679055, atk: 58209, def: 158, xp: 485011, gold: [19400,58201], loot: [['bones',0.3]] },
  vibrant_phantom: { name: 'Vibrant Phantom', icon: '👻', hp: 770723, atk: 66067, def: 160, xp: 550488, gold: [22020,66059], loot: [['bones',0.3]] },
  courage_leech: { name: 'Courage Leech', icon: '👹', hp: 770723, atk: 66067, def: 160, xp: 550488, gold: [22020,66059], loot: [['bones',0.3]] },
  cloak_of_terror: { name: 'Cloak Of Terror', icon: '👹', hp: 770723, atk: 66067, def: 160, xp: 550488, gold: [22020,66059], loot: [['bones',0.3]] },
  many_faces: { name: 'Many Faces', icon: '👹', hp: 874766, atk: 74984, def: 162, xp: 624804, gold: [24992,74976], loot: [['bones',0.3]] },
  druids_apparition: { name: 'Druid\'s Apparition', icon: '👻', hp: 874766, atk: 74984, def: 162, xp: 624804, gold: [24992,74976], loot: [['bones',0.3]] },
  knights_apparition: { name: 'Knight\'s Apparition', icon: '👻', hp: 874766, atk: 74984, def: 162, xp: 624804, gold: [24992,74976], loot: [['bones',0.3]] },
  paladins_apparition: { name: 'Paladin\'s Apparition', icon: '👻', hp: 874766, atk: 74984, def: 162, xp: 624804, gold: [24992,74976], loot: [['bones',0.3]] },
  sorcerers_apparition: { name: 'Sorcerer\'s Apparition', icon: '👻', hp: 874766, atk: 74984, def: 162, xp: 624804, gold: [24992,74976], loot: [['bones',0.3]] },
  monks_apparition: { name: 'Monk\'s Apparition', icon: '👻', hp: 874766, atk: 74984, def: 162, xp: 624804, gold: [24992,74976], loot: [['bones',0.3]] },
  distorted_phantom: { name: 'Distorted Phantom', icon: '👻', hp: 874766, atk: 74984, def: 162, xp: 624804, gold: [24992,74976], loot: [['bones',0.3]] },
  branchy_crawler: { name: 'Branchy Crawler', icon: '👹', hp: 992853, atk: 85106, def: 164, xp: 709152, gold: [28366,85098], loot: [['bones',0.3]] },
  rotten_golem: { name: 'Rotten Golem', icon: '🗿', hp: 992853, atk: 85106, def: 164, xp: 709152, gold: [28366,85098], loot: [['bones',0.3]] },
  mould_phantom: { name: 'Mould Phantom', icon: '👻', hp: 992853, atk: 85106, def: 164, xp: 709152, gold: [28366,85098], loot: [['bones',0.3]] },
  brachiodemon: { name: 'Brachiodemon', icon: '😈', hp: 1126883, atk: 96595, def: 165, xp: 804888, gold: [32196,96587], loot: [['bones',0.3]] },
  infernal_demon: { name: 'Infernal Demon', icon: '😈', hp: 1126883, atk: 96595, def: 165, xp: 804888, gold: [32196,96587], loot: [['bones',0.3]] },
  infernal_phantom: { name: 'Infernal Phantom', icon: '👻', hp: 1126883, atk: 96595, def: 165, xp: 804888, gold: [32196,96587], loot: [['bones',0.3]] },
  bony_sea_devil: { name: 'Bony Sea Devil', icon: '🦑', hp: 1279007, atk: 109634, def: 167, xp: 913548, gold: [36542,109626], loot: [['bones',0.3]] },
  turbulent_elemental: { name: 'Turbulent Elemental', icon: '👹', hp: 1279007, atk: 109634, def: 167, xp: 913548, gold: [36542,109626], loot: [['bones',0.3]] },
  capricious_phantom: { name: 'Capricious Phantom', icon: '👻', hp: 1279007, atk: 109634, def: 167, xp: 913548, gold: [36542,109626], loot: [['bones',0.3]] },
  emerald_tortoise: { name: 'Emerald Tortoise', icon: '🐢', hp: 1451668, atk: 124433, def: 169, xp: 1036877, gold: [41475,124425], loot: [['bones',0.3]] },
  gore_horn: { name: 'Gore Horn', icon: '👹', hp: 1451668, atk: 124433, def: 169, xp: 1036877, gold: [41475,124425], loot: [['bones',0.3]] },
  gorerilla: { name: 'Gorerilla', icon: '👹', hp: 1451668, atk: 124433, def: 169, xp: 1036877, gold: [41475,124425], loot: [['bones',0.3]] },
  hulking_prehemoth: { name: 'Hulking Prehemoth', icon: '👹', hp: 1451668, atk: 124433, def: 169, xp: 1036877, gold: [41475,124425], loot: [['bones',0.3]] },
  sabretooth: { name: 'Sabretooth', icon: '👹', hp: 1451668, atk: 124433, def: 169, xp: 1036877, gold: [41475,124425], loot: [['bones',0.3]] },
  headpecker: { name: 'Headpecker', icon: '👹', hp: 1647637, atk: 141231, def: 171, xp: 1176855, gold: [47074,141223], loot: [['bones',0.3]] },
  mantosaurus: { name: 'Mantosaurus', icon: '👹', hp: 1647637, atk: 141231, def: 171, xp: 1176855, gold: [47074,141223], loot: [['bones',0.3]] },
  mercurial_menace: { name: 'Mercurial Menace', icon: '👹', hp: 1647637, atk: 141231, def: 171, xp: 1176855, gold: [47074,141223], loot: [['bones',0.3]] },
  noxious_ripptor: { name: 'Noxious Ripptor', icon: '👹', hp: 1647637, atk: 141231, def: 171, xp: 1176855, gold: [47074,141223], loot: [['bones',0.3]] },
  shrieking_cry_stal: { name: 'Shrieking Cry-stal', icon: '👹', hp: 1647637, atk: 141231, def: 171, xp: 1176855, gold: [47074,141223], loot: [['bones',0.3]] },
  sulphider: { name: 'Sulphider', icon: '👹', hp: 1870062, atk: 160296, def: 173, xp: 1335730, gold: [53429,160288], loot: [['bones',0.3]] },
  sulphur_spouter: { name: 'Sulphur Spouter', icon: '👹', hp: 1870062, atk: 160296, def: 173, xp: 1335730, gold: [53429,160288], loot: [['bones',0.3]] },
  nighthunter: { name: 'Nighthunter', icon: '👹', hp: 1870062, atk: 160296, def: 173, xp: 1335730, gold: [53429,160288], loot: [['bones',0.3]] },
  stalking_stalk: { name: 'Stalking Stalk', icon: '👹', hp: 1870062, atk: 160296, def: 173, xp: 1335730, gold: [53429,160288], loot: [['bones',0.3]] },
  undertaker: { name: 'Undertaker', icon: '👹', hp: 1870062, atk: 160296, def: 173, xp: 1335730, gold: [53429,160288], loot: [['bones',0.3]] },
  meandering_mushroom: { name: 'Meandering Mushroom', icon: '🌿', hp: 2122516, atk: 181934, def: 175, xp: 1516054, gold: [60642,181926], loot: [['bones',0.3]] },
  oozing_carcass: { name: 'Oozing Carcass', icon: '👹', hp: 2122516, atk: 181934, def: 175, xp: 1516054, gold: [60642,181926], loot: [['bones',0.3]] },
  rotten_man_maggot: { name: 'Rotten Man-maggot', icon: '🪱', hp: 2122516, atk: 181934, def: 175, xp: 1516054, gold: [60642,181926], loot: [['bones',0.3]] },
  sopping_carcass: { name: 'Sopping Carcass', icon: '👹', hp: 2122516, atk: 181934, def: 175, xp: 1516054, gold: [60642,181926], loot: [['bones',0.3]] },
  bloodjaw: { name: 'Bloodjaw', icon: '👹', hp: 2122516, atk: 181934, def: 175, xp: 1516054, gold: [60642,181926], loot: [['bones',0.3]] },
  converter: { name: 'Converter', icon: '👹', hp: 2409049, atk: 206495, def: 177, xp: 1720721, gold: [68829,206487], loot: [['bones',0.3]] },
  darklight_construct: { name: 'Darklight Construct', icon: '🗿', hp: 2409049, atk: 206495, def: 177, xp: 1720721, gold: [68829,206487], loot: [['bones',0.3]] },
  darklight_emitter: { name: 'Darklight Emitter', icon: '🔮', hp: 2409049, atk: 206495, def: 177, xp: 1720721, gold: [68829,206487], loot: [['bones',0.3]] },
  wandering_pillar: { name: 'Wandering Pillar', icon: '🔮', hp: 2409049, atk: 206495, def: 177, xp: 1720721, gold: [68829,206487], loot: [['bones',0.3]] },
  bloated_man_maggot: { name: 'Bloated Man-maggot', icon: '🪱', hp: 2734267, atk: 234370, def: 179, xp: 1953019, gold: [78121,234362], loot: [['bones',0.3]] },
  mycobiontic_beetle: { name: 'Mycobiontic Beetle', icon: '🪱', hp: 2734267, atk: 234370, def: 179, xp: 1953019, gold: [78121,234362], loot: [['bones',0.3]] },
  oozing_corpus: { name: 'Oozing Corpus', icon: '👹', hp: 2734267, atk: 234370, def: 179, xp: 1953019, gold: [78121,234362], loot: [['bones',0.3]] },
  sopping_corpus: { name: 'Sopping Corpus', icon: '👹', hp: 2734267, atk: 234370, def: 179, xp: 1953019, gold: [78121,234362], loot: [['bones',0.3]] },
  darklight_matter: { name: 'Darklight Matter', icon: '🔮', hp: 3103386, atk: 266009, def: 181, xp: 2216676, gold: [88667,266001], loot: [['bones',0.3]] },
  darklight_source: { name: 'Darklight Source', icon: '🔮', hp: 3103386, atk: 266009, def: 181, xp: 2216676, gold: [88667,266001], loot: [['bones',0.3]] },
  darklight_striker: { name: 'Darklight Striker', icon: '🔮', hp: 3103386, atk: 266009, def: 181, xp: 2216676, gold: [88667,266001], loot: [['bones',0.3]] },
  walking_pillar: { name: 'Walking Pillar', icon: '🔮', hp: 3103386, atk: 266009, def: 181, xp: 2216676, gold: [88667,266001], loot: [['bones',0.3]] },
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
  // Trava de "boss da zona anterior" desligada de propósito (pedido do
  // Felipe) — todas as hunts ficam livres, sem precisar encadear derrotando
  // boss por boss. `requiresBossOf` continua nos dados de ZONES (usado só
  // pra decidir a ORDEM de exibição, ver zonePicker.js), só não bloqueia
  // mais o acesso.
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
