// Mundos, Linked Tasks, Arena e Battle Pass — sistemas de progressão além do
// combate direto. Regras puras; nada aqui toca DOM, storage ou rede.

export const WORLDS = [
  { id: 'auroria',  name: 'Auroria',  icon: '🌅', type: 'Open PvP',    reqLevel: 1,  bonus: '+10% XP', players: 2370, unlocked: true },
  { id: 'bellum',   name: 'Bellum',   icon: '⚔️', type: 'Optional PvP', reqLevel: 25, bonus: '+20% Gold', players: 1840, unlocked: false },
  { id: 'spectrum', name: 'Spectrum', icon: '🌈', type: 'Optional PvP', reqLevel: 20, bonus: '+15% XP', players: 1320, unlocked: false },
  { id: 'elysian',  name: 'Elysian',  icon: '✨', type: 'Retro PvP',   reqLevel: 40, bonus: '+25% XP +15% Gold', players: 3400, unlocked: false },
  { id: 'solarian', name: 'Solarian', icon: '☀️', type: 'Retro PvP',   reqLevel: 35, bonus: '+20% XP', players: 2100, unlocked: false },
  { id: 'mystian',  name: 'Mystian',  icon: '🌀', type: 'Retro PvP',   reqLevel: 60, bonus: '+40% XP +30% Gold', players: 1800, unlocked: false },
];

export function worldXpMultiplier(worldId) {
  const world = WORLDS.find(w => w.id === worldId);
  if (!world) return 1;
  return world.id === 'auroria' ? 1.1 : world.id === 'elysian' ? 1.25 : world.id === 'mystian' ? 1.4 : 1.15;
}

export function worldGoldMultiplier(worldId) {
  const world = WORLDS.find(w => w.id === worldId);
  if (!world) return 1;
  return world.id === 'bellum' ? 1.2 : world.id === 'elysian' ? 1.15 : world.id === 'mystian' ? 1.3 : 1;
}

// Linked Tasks: cadeia SEQUENCIAL por sala (como no RubinOT — completar uma
// task desbloqueia a próxima). Dados REAIS e completos do RubinOT (94 tasks em
// 5 salas, colados pelo usuário jogador em 2026-07-14) — cada task pode ter
// vários monstros que contam pra mesma contagem (m é sempre array), e duas
// recompensas: firstReward (só na 1ª conclusão, ADICIONAL à repeatReward) e
// repeatReward (toda conclusão, incluindo a 1ª). Tasks sem repetição informada
// pelo usuário usam um fallback de XP razoável (documentado tarefa a tarefa
// nos dados originais) em vez de ficarem vazias.
export const TASK_ROOMS = [
  { id: 'lothlorien', name: "Lothlorien's Room", icon: '🌲', tasks: [
    { name: '#1 Goblin', m: ['goblin'], n: 100, firstReward: [{ type: 'xp', amount: 5000 }, { type: 'gold', amount: 10000 }], repeatReward: [{ type: 'xp', amount: 4000 }] },
    { name: '#2 Troll', m: ['troll', 'swamp_troll', 'frost_troll', 'island_troll'], n: 100, firstReward: [{ type: 'xp', amount: 7000 }, { type: 'gold', amount: 10000 }], repeatReward: [{ type: 'xp', amount: 5000 }] },
    { name: '#3 Rotworm', m: ['rotworm', 'carrion_worm'], n: 200, firstReward: [{ type: 'xp', amount: 10000 }, { type: 'gold', amount: 20000 }], repeatReward: [{ type: 'gold', amount: 10000 }] },
    { name: '#4 Minotaur', m: ['minotaur', 'minotaur_archer', 'minotaur_guard', 'minotaur_mage'], n: 200, firstReward: [{ type: 'xp', amount: 15000 }], repeatReward: [{ type: 'xp', amount: 11000 }] },
    { name: '#5 Dwarf', m: ['dwarf', 'dwarf_soldier', 'dwarf_guard', 'dwarf_geomancer'], n: 300, firstReward: [{ type: 'item', itemId: 'exercise_weapon', qty: 1, charges: 3600 }], repeatReward: [{ type: 'xp', amount: 13000 }] },
    { name: '#6 Dworcs', m: ['dworc_venomsniper', 'dworc', 'dworc_fighter'], n: 300, firstReward: [{ type: 'gold', amount: 50000 }], repeatReward: [{ type: 'gold', amount: 20000 }] },
    { name: '#7 Elf', m: ['elf', 'elf_scout', 'elf_arcanist'], n: 400, firstReward: [{ type: 'xp', amount: 25000 }, { type: 'gold', amount: 40000 }], repeatReward: [{ type: 'xp', amount: 17000 }] },
    { name: '#8 Dark Cathedral', m: ['dark_apprentice', 'dark_magician', 'dark_monk', 'assassin'], n: 400, firstReward: [{ type: 'xp', amount: 25000 }, { type: 'gold', amount: 50000 }], repeatReward: [{ type: 'xp', amount: 20000 }] },
    { name: '#9 Tombs', m: ['ghost', 'mummy', 'ghoul', 'demon_skeleton', 'skeleton', 'crypt_shambler'], n: 800, firstReward: [{ type: 'item', itemId: 'prey_cards', qty: 5 }], repeatReward: [{ type: 'xp', amount: 30000 }] },
    { name: '#10 Scarab', m: ['scarab'], n: 600, firstReward: [{ type: 'xp', amount: 30000 }, { type: 'gold', amount: 50000 }], repeatReward: [{ type: 'xp', amount: 22000 }] },
    { name: '#11 Cyclops', m: ['cyclops', 'cyclops_smith', 'cyclops_drone'], n: 500, firstReward: [{ type: 'xp', amount: 35000 }, { type: 'gold', amount: 60000 }], repeatReward: [{ type: 'xp', amount: 25000 }] },
    { name: '#12 Mutated Humans', m: ['mutated_human'], n: 600, firstReward: [{ type: 'xp', amount: 50000 }], repeatReward: [{ type: 'xp', amount: 40000 }] },
    { name: '#13 Coryms', m: ['corym_charlatan', 'corym_skirmisher', 'corym_vanguard'], n: 400, firstReward: [{ type: 'xp', amount: 70000 }, { type: 'gold', amount: 60000 }], repeatReward: [{ type: 'xp', amount: 50000 }] },
    { name: '#14 Banuta Surface', m: ['kongra', 'sibang', 'merlkin'], n: 500, firstReward: [{ type: 'gold', amount: 100000 }], repeatReward: [{ type: 'gold', amount: 70000 }] },
    { name: '#15 Pirates', m: ['pirate_marauder', 'pirate_cutthroat', 'pirate_corsair', 'pirate_buccaneer'], n: 700, firstReward: [{ type: 'item', itemId: 'exercise_weapon', qty: 1, charges: 7200 }], repeatReward: [{ type: 'randomItem', itemIds: ['brutus_bloodbeards_hat', 'the_lethal_lissys_shirt', 'ron_the_rippers_sabre', 'deadeye_devious_eye_patch'] }] },
    { name: '#16 Barbarians', m: ['barbarian_bloodwalker', 'barbarian_brutetamer', 'barbarian_headsplitter', 'barbarian_skullhunter'], n: 700, firstReward: [{ type: 'xp', amount: 200000 }, { type: 'item', itemId: 'shard', qty: 5 }], repeatReward: [{ type: 'xp', amount: 100000 }, { type: 'item', itemId: 'shard', qty: 1 }] },
    { name: '#17 Djinn', m: ['marid', 'efreet', 'green_djinn', 'blue_djinn'], n: 700, firstReward: [{ type: 'xp', amount: 250000 }], repeatReward: [{ type: 'xp', amount: 150000 }] },
    { name: '#18 Stonerefiner', m: ['stonerefiner'], n: 500, firstReward: [{ type: 'xp', amount: 300000 }, { type: 'gold', amount: 150000 }], repeatReward: [{ type: 'xp', amount: 200000 }] },
    { name: '#19 Dragon', m: ['dragon', 'dragon_hatchling'], n: 800, firstReward: [{ type: 'xp', amount: 400000 }], repeatReward: [{ type: 'xp', amount: 300000 }] },
    { name: '#20 Oramond', m: ['minotaur_hunter', 'moohtah_warrior', 'minotaur_amazon', 'worm_priestess', 'execowtioner', 'moohtant'], n: 1000, firstReward: [{ type: 'xp', amount: 800000 }, { type: 'item', itemId: 'exercise_weapon', qty: 1, charges: 10800 }], repeatReward: [{ type: 'xp', amount: 800000 }] },
  ]},
  { id: 'executioner', name: "Executioner's Room", icon: '🪓', tasks: [
    { name: '#21 Quara', m: ['quara_mantassin_scout', 'quara_constrictor_scout', 'quara_pincher_scout', 'quara_predator_scout', 'quara_hydromancer_scout'], n: 1000, firstReward: [{ type: 'xp', amount: 1000000 }, { type: 'gold', amount: 200000 }], repeatReward: [{ type: 'xp', amount: 700000 }] },
    { name: '#22 Ancient Scarab', m: ['ancient_scarab'], n: 1000, firstReward: [{ type: 'item', itemId: 'prey_cards', qty: 5 }], repeatReward: [{ type: 'gold', amount: 200000 }] },
    { name: '#23 Giant Spider', m: ['wailing_widow', 'brimstone_bug', 'giant_spider'], n: 2000, firstReward: [{ type: 'xp', amount: 1300000 }], repeatReward: [{ type: 'xp', amount: 1000000 }] },
    { name: '#24 Wyrm', m: ['wyrm', 'elder_wyrm'], n: 2000, firstReward: [{ type: 'xp', amount: 1500000 }, { type: 'gold', amount: 300000 }], repeatReward: [{ type: 'xp', amount: 1200000 }] },
    { name: '#25 Cult', m: ['cult_believer', 'vicious_squire', 'cult_enforcer', 'renegade_knight', 'vile_grandmaster', 'cult_scholar', 'hero'], n: 3000, firstReward: [{ type: 'xp', amount: 2000000 }, { type: 'gold', amount: 500000 }], repeatReward: [{ type: 'xp', amount: 1500000 }] },
    { name: '#26 Deepling', m: ['deepling_spellsinger', 'deepling_scout', 'deepling_warrior', 'deepling_guard'], n: 2500, firstReward: [{ type: 'item', itemId: 'zaoan_chess_box', qty: 1 }], repeatReward: [{ type: 'gold', amount: 300000 }] },
    { name: '#27 Wereboar', m: ['werefox', 'werebadger', 'wereboar', 'werebear', 'werewolf'], n: 2000, firstReward: [{ type: 'xp', amount: 2500000 }, { type: 'gold', amount: 500000 }], repeatReward: [{ type: 'xp', amount: 2000000 }] },
    { name: '#28 Minotaur Cult', m: ['minotaur_cult_follower', 'minotaur_cult_prophet', 'minotaur_cult_zealot'], n: 3000, firstReward: [{ type: 'item', itemId: 'exercise_weapon', qty: 1, charges: 14400 }], repeatReward: [{ type: 'gold', amount: 400000 }] },
    { name: '#29 Feyrist Nightmare', m: ['weakened_frazzlemaw', 'enfeebled_silencer'], n: 3000, firstReward: [{ type: 'xp', amount: 3000000 }, { type: 'gold', amount: 500000 }], repeatReward: [{ type: 'xp', amount: 2500000 }] },
    { name: '#30 Glooth', m: ['glooth_bandit', 'glooth_brigand'], n: 4000, firstReward: [{ type: 'item', itemId: 'gold_token', qty: 20 }, { type: 'item', itemId: 'silver_token', qty: 20 }], repeatReward: [{ type: 'item', itemId: 'gold_token', qty: 7 }, { type: 'item', itemId: 'silver_token', qty: 7 }] },
    { name: '#31 Exotic Cave', m: ['exotic_cave_spider', 'exotic_bat'], n: 3000, firstReward: [{ type: 'item', itemId: 'roulette_coin', qty: 1 }], repeatReward: [{ type: 'gold', amount: 500000 }] },
    { name: '#32 Pirat', m: ['pirat_bombardier', 'pirat_cutthroat', 'pirat_mate', 'pirat_scoundrel'], n: 3000, firstReward: [{ type: 'xp', amount: 3500000 }, { type: 'gold', amount: 500000 }], repeatReward: [{ type: 'xp', amount: 3000000 }] },
    { name: '#33 Werehyaena', m: ['werehyaena', 'werehyaena_shaman'], n: 2000, firstReward: [{ type: 'item', itemId: 'mystic_bag', qty: 1 }], repeatReward: [{ type: 'xp', amount: 3500000 }] },
    { name: '#34 Dragon Lord', m: ['dragon_lord', 'dragon_lord_hatchling'], n: 2000, firstReward: [{ type: 'item', itemId: 'dragon_claw', qty: 1 }], repeatReward: [{ type: 'gold', amount: 600000 }] },
    { name: '#35 Frost Dragon', m: ['frost_dragon', 'frost_dragon_hatchling'], n: 3000, firstReward: [{ type: 'xp', amount: 5000000 }], repeatReward: [{ type: 'xp', amount: 4000000 }] },
    { name: '#36 Banuta Deeper', m: ['medusa', 'serpent_spawn', 'hydra', 'eternal_guardian'], n: 4000, firstReward: [{ type: 'item', itemId: 'common_mount_box', qty: 2 }], repeatReward: [{ type: 'gold', amount: 800000 }] },
    { name: '#37 Nightmare', m: ['nightmare', 'nightmare_scion'], n: 2000, firstReward: [{ type: 'item', itemId: 'exercise_weapon', qty: 1, charges: 18000 }], repeatReward: [{ type: 'gold', amount: 1000000 }] },
    { name: '#38 Draken', m: ['draken_abomination', 'draken_elite', 'draken_spellweaver', 'draken_warmaster', 'lizard_legionnaire', 'lizard_magistratus', 'lizard_noble', 'lizard_chosen', 'lizard_dragon_priest', 'lizard_high_guard'], n: 5000, firstReward: [{ type: 'xp', amount: 6000000 }, { type: 'gold', amount: 1000000 }], repeatReward: [{ type: 'xp', amount: 4500000 }] },
    { name: '#39 The Hive', m: ['waspoid', 'crawler', 'spitter', 'kollos', 'spidris', 'spidris_elite', 'hive_overseer'], n: 5000, firstReward: [{ type: 'xp', amount: 7000000 }, { type: 'gold', amount: 1500000 }], repeatReward: [{ type: 'xp', amount: 5000000 }] },
    { name: '#40 MOTA', m: ['fury', 'floating_savant'], n: 3000, firstReward: [{ type: 'item', itemId: 'mini_obelisk', qty: 1 }], repeatReward: [{ type: 'gold', amount: 1500000 }] },
  ]},
  { id: 'morgul', name: "Morgul's Room", icon: '👻', tasks: [
    { name: '#41 Iksupan', m: ['iks_yapunac', 'mitmah_scout', 'mitmah_seer'], n: 6000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'music_box', qty: 1 }], repeatReward: [{ type: 'item', itemId: 'gold_token', qty: 15 }] },
    { name: '#42 Carnivor', m: ['lumbering_carnivor', 'spiky_carnivor', 'menacing_carnivor'], n: 10000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'prey_cards', qty: 10 }], repeatReward: [{ type: 'item', itemId: 'silver_token', qty: 20 }] },
    { name: '#43 Grim Reaper', m: ['hellspawn', 'grim_reaper'], n: 3000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'xp', amount: 8000000 }], repeatReward: [{ type: 'xp', amount: 6000000 }] },
    { name: '#44 Candia', m: ['candy_horror', 'nibblemaw', 'honey_elemental', 'angry_sugar_fairy', 'candy_floss_elemental', 'goggle_cake'], n: 5000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'gold', amount: 3000000 }], repeatReward: [{ type: 'gold', amount: 2000000 }] },
    { name: '#45 Lycanthrope', m: ['werelion', 'werelioness'], n: 6000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'mystic_bag', qty: 2 }], repeatReward: [{ type: 'item', itemId: 'exalted_core', qty: 2 }] },
    { name: '#46 The Void', m: ['breach_brood', 'dread_intruder', 'sparkion', 'reality_reaver'], n: 10000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'xp', amount: 9000000 }, { type: 'gold', amount: 2000000 }], repeatReward: [{ type: 'xp', amount: 7000000 }] },
    { name: '#47 Asura', m: ['dawnfire_asura', 'midnight_asura', 'frost_flower_asura'], n: 7000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'exercise_weapon', qty: 1, charges: 21600 }], repeatReward: [{ type: 'gold', amount: 2500000 }] },
    { name: '#48 Spectre', m: ['gazer_spectre', 'burster_spectre', 'ripper_spectre'], n: 12000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'xp', amount: 10000000 }], repeatReward: [{ type: 'xp', amount: 8000000 }] },
    { name: '#49 Catacombs', m: ['destroyer', 'dark_torturer', 'demon', 'grim_reaper', 'hellhound', 'hellspawn', 'juggernaut'], n: 15000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'prey_cards', qty: 10 }], repeatReward: [{ type: 'item', itemId: 'gold_token', qty: 15 }, { type: 'item', itemId: 'silver_token', qty: 20 }] },
    { name: '#50 Roshamuul', m: ['guzzlemaw', 'frazzlemaw', 'silencer', 'choking_fear', 'retching_horror'], n: 8000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'cluster_of_solace', qty: 300 }], repeatReward: [{ type: 'item', itemId: 'cluster_of_solace', qty: 100 }] },
    { name: '#51 Warzone 1 2 3', m: ['hideous_fungus', 'humongous_fungus', 'humorless_fungus', 'stone_devourer', 'weeper', 'magma_crawler', 'lost_berserker', 'lava_golem', 'cliff_strider', 'ironblight', 'orewalker'], n: 10000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'major_crystalline_token', qty: 50 }], repeatReward: [{ type: 'item', itemId: 'major_crystalline_token', qty: 20 }] },
    { name: '#52 Weretiger', m: ['weretiger', 'white_weretiger', 'cunning_werepanther'], n: 6000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'gold', amount: 4000000 }], repeatReward: [{ type: 'gold', amount: 3000000 }] },
    { name: '#53 Werecrocodile', m: ['werecrocodile', 'feral_werecrocodile', 'werepanther'], n: 6000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'roulette_coin', qty: 2 }], repeatReward: [{ type: 'xp', amount: 10000000 }] },
    { name: '#54 Winter & Summer', m: ['crazed_summer_rearguard', 'crazed_summer_vanguard', 'crazed_winter_rearguard', 'crazed_winter_vanguard', 'insane_siren', 'soul_broken_harbinger'], n: 5000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'xp', amount: 12000000 }, { type: 'gold', amount: 5000000 }], repeatReward: [{ type: 'xp', amount: 10000000 }, { type: 'gold', amount: 2000000 }] },
    { name: '#55 Deathling', m: ['deathling_scout', 'deathling_spellsinger'], n: 4000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'exercise_weapon', qty: 1, charges: 25200 }], repeatReward: [{ type: 'gold', amount: 3000000 }] },
    { name: '#56 Great Pearl', m: ['foam_stalker', 'two_headed_turtle'], n: 8000, firstReward: [{ type: 'taskCoin', qty: 2 }, { type: 'item', itemId: 'fire_amplification', qty: 1 }, { type: 'item', itemId: 'ice_amplification', qty: 1 }, { type: 'item', itemId: 'energy_amplification', qty: 1 }, { type: 'item', itemId: 'earth_amplification', qty: 1 }], repeatReward: [{ type: 'randomItem', itemIds: ['bestiary_betterment', 'strike_enhancement', 'stamina_extension'] }] },
    { name: '#57 Moon Goddess', m: ['makara', 'naga_archer', 'naga_warrior'], n: 10000, firstReward: [{ type: 'taskCoin', qty: 2 }, { type: 'randomItem', itemIds: ['red_tome', 'purple_tome', 'blue_tome', 'green_tome', 'grey_tome'] }], repeatReward: [{ type: 'randomItem', itemIds: ['lemon_cupcake', 'blueberry_cupcake', 'strawberry_cupcake'] }] },
    { name: '#58 Forest of Life', m: ['dark_carnisylvan', 'hulking_carnisylvan', 'poisonous_carnisylvan'], n: 8000, firstReward: [{ type: 'taskCoin', qty: 2 }, { type: 'item', itemId: 'mystic_bag', qty: 3 }], repeatReward: [{ type: 'gold', amount: 4000000 }] },
    { name: '#59 Kilmaresh Deeper', m: ['burning_gladiator', 'black_sphinx_acolyte', 'priestess_of_the_wild_sun'], n: 10000, firstReward: [{ type: 'taskCoin', qty: 2 }, { type: 'item', itemId: 'stamina_extension', qty: 1 }, { type: 'item', itemId: 'strike_enhancement', qty: 1 }, { type: 'item', itemId: 'wealth_duplex', qty: 1 }, { type: 'item', itemId: 'bestiary_betterment', qty: 1 }], repeatReward: [{ type: 'gold', amount: 3000000 }] },
    { name: '#60 Issavi', m: ['sphinx', 'manticore', 'lamassu', 'feral_sphinx', 'crypt_warden'], n: 7000, firstReward: [{ type: 'taskCoin', qty: 2 }, { type: 'xp', amount: 10000000 }], repeatReward: [{ type: 'xp', amount: 8000000 }] },
  ]},
  { id: 'corrupted', name: "Corrupted's Room", icon: '🩸', tasks: [
    { name: '#61 Warzone 4 5 6', m: ['chasm_spawn', 'drillworm', 'cave_devourer', 'tunnel_tyrant', 'deepworm', 'diremaw'], n: 14000, firstReward: [{ type: 'taskCoin', qty: 5 }, { type: 'xp', amount: 12000000 }], repeatReward: [{ type: 'xp', amount: 12000000 }] },
    { name: '#62 Falcon Bastion', m: ['falcon_knight', 'falcon_paladin'], n: 16000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'oberon_chest', qty: 1 }], repeatReward: [{ type: 'randomItem', itemIds: ['lemon_cupcake', 'strawberry_cupcake', 'blueberry_cupcake'] }] },
    { name: '#63 Kilmaresh Mountains', m: ['ogre_rowdy', 'ogre_ruffian', 'ogre_sage'], n: 14000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'xp', amount: 15000000 }], repeatReward: [{ type: 'xp', amount: 13000000 }] },
    { name: '#64 Goanna', m: ['young_goanna', 'adult_goanna'], n: 15000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'prey_cards', qty: 15 }], repeatReward: [{ type: 'xp', amount: 15000000 }] },
    { name: '#65 Prison', m: ['demon_outcast', 'blightwalker', 'plaguesmith', 'dark_torturer', 'hellhound', 'juggernaut'], n: 17000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'gold', amount: 8000000 }], repeatReward: [{ type: 'gold', amount: 6000000 }] },
    { name: '#66 Cobra Bastion', m: ['cobra_assassin', 'cobra_scout', 'cobra_vizier'], n: 18000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'scarlett_chest', qty: 1 }], repeatReward: [{ type: 'xp', amount: 15000000 }] },
    { name: '#67 Bulltaur Lair', m: ['bulltaur_alchemist', 'bulltaur_brute', 'bulltaur_forgepriest'], n: 20000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'xp', amount: 15000000 }, { type: 'gold', amount: 6000000 }], repeatReward: [{ type: 'xp', amount: 12000000 }, { type: 'gold', amount: 2000000 }] },
    { name: '#68 Lost Soul', m: ['flimsy_lost_soul', 'mean_lost_soul', 'freakish_lost_soul'], n: 18000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'exercise_weapon', qty: 1, charges: 32400 }], repeatReward: [{ type: 'gold', amount: 7000000 }] },
    { name: '#69 Deep Desert', m: ['skeleton_elite_warrior', 'undead_elite_gladiator'], n: 20000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'gold', amount: 10000000 }], repeatReward: [{ type: 'gold', amount: 7000000 }] },
    { name: '#70 Nimmersatt\'s', m: ['dragolisk', 'mega_dragon', 'wardragon'], n: 20000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'xp', amount: 17000000 }, { type: 'gold', amount: 7000000 }], repeatReward: [{ type: 'xp', amount: 15000000 }, { type: 'gold', amount: 3000000 }] },
    { name: '#71 Salt Cave', m: ['bashmu', 'juvenile_bashmu'], n: 20000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'mini_obelisk', qty: 2 }], repeatReward: [{ type: 'item', itemId: 'golden_prison_key', qty: 1 }] },
    { name: '#72 Ruins of Nuur', m: ['girtablilu_warrior', 'venerable_girtablilu'], n: 22000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'soul_core_bag', qty: 3 }, { type: 'gold', amount: 5000000 }], repeatReward: [{ type: 'gold', amount: 8000000 }] },
    { name: '#73 Ingol', m: ['boar_man', 'carnivostrich', 'crape_man', 'harpy', 'liodile', 'rhindeer'], n: 23000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'roulette_coin', qty: 3 }], repeatReward: [{ type: 'gold', amount: 10000000 }] },
    { name: '#74 Ferumbras Seal', m: ['vexclaw', 'grimeleech', 'hellflayer'], n: 20000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'xp', amount: 20000000 }, { type: 'item', itemId: 'boots_of_homecoming', qty: 1 }], repeatReward: [{ type: 'xp', amount: 17000000 }] },
    { name: '#75 Warzone 7 8 9', m: ['afflicted_strider', 'blemished_spawn', 'eyeless_devourer', 'lavafungus', 'lavaworm', 'streaked_devourer', 'cave_chimera', 'tremendous_tyrant', 'varnished_diremaw'], n: 16000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'fiery_horseshoe', qty: 1 }], repeatReward: [{ type: 'item', itemId: 'gold_token', qty: 50 }, { type: 'item', itemId: 'silver_token', qty: 50 }] },
    { name: '#76 Podzilla Stalk', m: ['rootthing_amber_shaper', 'rootthing_nutshell', 'rootthing_bug_tracker'], n: 21000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'stone_of_ascension', qty: 2 }], repeatReward: [{ type: 'xp', amount: 18000000 }] },
    { name: '#77 True Asura', m: ['true_dawnfire_asura', 'true_midnight_asura', 'true_frost_flower_asura'], n: 23000, firstReward: [{ type: 'taskCoin', qty: 1 }, { type: 'item', itemId: 'exercise_weapon', qty: 1, charges: 43200 }], repeatReward: [{ type: 'gold', amount: 10000000 }] },
    { name: '#78 Podzilla Bottom', m: ['quara_looter', 'quara_plunderer', 'quara_raider'], n: 21000, firstReward: [{ type: 'taskCoin', qty: 5 }], repeatReward: [{ type: 'xp', amount: 20000000 }] },
  ]},
  { id: 'nzoth', name: "N'Zoth's Room", icon: '🌀', tasks: [
    { name: '#79 Earth Library', m: ['cursed_book', 'ink_blob'], n: 10000, firstReward: [{ type: 'taskCoin', qty: 3 }, { type: 'xp', amount: 25000000 }], repeatReward: [{ type: 'xp', amount: 20000000 }] },
    { name: '#80 Ice Library', m: ['icecold_book', 'squid_warden', 'animated_feather'], n: 25000, firstReward: [{ type: 'taskCoin', qty: 3 }, { type: 'xp', amount: 25000000 }], repeatReward: [{ type: 'xp', amount: 20000000 }] },
    { name: '#81 Fire Library', m: ['burning_book', 'rage_squid', 'guardian_of_tales'], n: 25000, firstReward: [{ type: 'taskCoin', qty: 3 }, { type: 'xp', amount: 25000000 }], repeatReward: [{ type: 'xp', amount: 20000000 }] },
    { name: '#82 Energy Library', m: ['energetic_book', 'brain_squid', 'energuardian_of_tales'], n: 25000, firstReward: [{ type: 'taskCoin', qty: 3 }, { type: 'item', itemId: 'library_ticket', qty: 1 }], repeatReward: [{ type: 'xp', amount: 20000000 }] },
    { name: '#83 Furious Crater', m: ['vibrant_phantom', 'courage_leech', 'cloak_of_terror'], n: 35000, firstReward: [{ type: 'taskCoin', qty: 3 }, { type: 'item', itemId: 'bag_you_desire', qty: 1 }, { type: 'item', itemId: 'mini_obelisk', qty: 1 }], repeatReward: [{ type: 'xp', amount: 20000000 }] },
    { name: '#84 Mirrored Nightmare', m: ['many_faces', 'druids_apparition', 'knights_apparition', 'paladins_apparition', 'sorcerers_apparition', 'monks_apparition', 'distorted_phantom'], n: 35000, firstReward: [{ type: 'taskCoin', qty: 3 }, { type: 'item', itemId: 'bag_you_desire', qty: 1 }, { type: 'item', itemId: 'mini_obelisk', qty: 1 }], repeatReward: [{ type: 'xp', amount: 20000000 }] },
    { name: '#85 Rotten Wasteland', m: ['branchy_crawler', 'rotten_golem', 'mould_phantom'], n: 35000, firstReward: [{ type: 'taskCoin', qty: 3 }, { type: 'item', itemId: 'bag_you_desire', qty: 1 }, { type: 'item', itemId: 'mini_obelisk', qty: 1 }], repeatReward: [{ type: 'xp', amount: 20000000 }] },
    { name: '#86 Claustrophobic Inferno', m: ['brachiodemon', 'infernal_demon', 'infernal_phantom'], n: 35000, firstReward: [{ type: 'taskCoin', qty: 3 }, { type: 'item', itemId: 'bag_you_desire', qty: 1 }, { type: 'item', itemId: 'mini_obelisk', qty: 1 }], repeatReward: [{ type: 'xp', amount: 20000000 }] },
    { name: '#87 Ebb and Flow', m: ['bony_sea_devil', 'turbulent_elemental', 'capricious_phantom'], n: 35000, firstReward: [{ type: 'taskCoin', qty: 3 }, { type: 'item', itemId: 'bag_you_desire', qty: 1 }, { type: 'item', itemId: 'mini_obelisk', qty: 1 }], repeatReward: [{ type: 'xp', amount: 20000000 }] },
    { name: '#88 Sparkling Pools', m: ['emerald_tortoise', 'gore_horn', 'gorerilla', 'hulking_prehemoth', 'sabretooth'], n: 50000, firstReward: [{ type: 'taskCoin', qty: 3 }, { type: 'item', itemId: 'primal_bag', qty: 1 }, { type: 'item', itemId: 'stone_of_ascension', qty: 1 }], repeatReward: [{ type: 'xp', amount: 25000000 }] },
    { name: '#89 Crystal Enigma', m: ['headpecker', 'mantosaurus', 'mercurial_menace', 'noxious_ripptor', 'shrieking_cry_stal'], n: 50000, firstReward: [{ type: 'taskCoin', qty: 3 }, { type: 'item', itemId: 'primal_bag', qty: 1 }, { type: 'item', itemId: 'stone_of_ascension', qty: 1 }], repeatReward: [{ type: 'xp', amount: 25000000 }] },
    { name: '#90 Monster Graveyard', m: ['sulphider', 'sulphur_spouter', 'nighthunter', 'stalking_stalk', 'undertaker'], n: 50000, firstReward: [{ type: 'taskCoin', qty: 3 }, { type: 'item', itemId: 'primal_bag', qty: 1 }, { type: 'item', itemId: 'stone_of_ascension', qty: 1 }], repeatReward: [{ type: 'xp', amount: 25000000 }] },
    { name: '#91 Putrefactory', m: ['meandering_mushroom', 'oozing_carcass', 'rotten_man_maggot', 'sopping_carcass', 'bloodjaw'], n: 60000, firstReward: [{ type: 'taskCoin', qty: 3 }, { type: 'item', itemId: 'tainted_heart', qty: 5 }], repeatReward: [{ type: 'xp', amount: 30000000 }] },
    { name: '#92 Gloom Pillars', m: ['converter', 'darklight_construct', 'darklight_emitter', 'wandering_pillar', 'bloodjaw'], n: 60000, firstReward: [{ type: 'taskCoin', qty: 3 }, { type: 'item', itemId: 'exercise_weapon', qty: 1, charges: 46800 }], repeatReward: [{ type: 'xp', amount: 30000000 }] },
    { name: '#93 Jaded Roots', m: ['bloated_man_maggot', 'mycobiontic_beetle', 'oozing_corpus', 'sopping_corpus', 'bloodjaw'], n: 60000, firstReward: [{ type: 'taskCoin', qty: 3 }, { type: 'item', itemId: 'roulette_coin', qty: 5 }], repeatReward: [{ type: 'xp', amount: 30000000 }] },
    { name: '#94 Darklight Core', m: ['darklight_matter', 'darklight_source', 'darklight_striker', 'walking_pillar', 'bloodjaw'], n: 60000, firstReward: [{ type: 'taskCoin', qty: 3 }, { type: 'item', itemId: 'darklight_heart', qty: 5 }], repeatReward: [{ type: 'xp', amount: 30000000 }] },
  ]},
];

// Uma task só desbloqueia quando a anterior da cadeia foi completa ≥1x (Linked!).
// Sem trava de nível de propósito (pedido do Felipe): qualquer personagem pode
// entrar em qualquer sala a qualquer nível, mesmo que a criatura da task seja
// bem mais forte — a progressão é só a cadeia sequencial dentro da sala.
// A chave de progresso/conclusão de cada task é o próprio `task.name` (único
// em todo o jogo, ex.: "#1 Goblin") — não dá mais pra usar `task.m` como chave
// (virou array, e várias tasks compartilham monstro, ex.: Grim Reaper aparece
// nas tasks #43 e #49). Ver application/taskUseCases.js.
export function taskKey(task) {
  return task.name;
}
export function isTaskUnlocked(room, index, taskCompletion) {
  if (index === 0) return true;
  const prev = room.tasks[index - 1];
  return (taskCompletion[taskKey(prev)] || 0) >= 1;
}

// Sala só libera quando TODAS as tasks da sala anterior foram concluídas
// ≥1x (pedido do Felipe: a cadeia Linked não é só dentro da sala, é entre
// salas também — Executioner's Room só abre depois de fechar a Lothlorien's
// Room inteira, e assim por diante).
export function isRoomUnlocked(roomIndex, taskCompletion) {
  if (roomIndex === 0) return true;
  const prevRoom = TASK_ROOMS[roomIndex - 1];
  return prevRoom.tasks.every(task => (taskCompletion[taskKey(task)] || 0) >= 1);
}

// Nomes de divisão em inglês nos dois idiomas de propósito — são termos
// padrão de ranking competitivo (Bronze/Silver/Gold/...), universais mesmo em
// clientes de jogo em português (como em League of Legends, Valorant etc).
// Não persiste em G (G só guarda arenaPoints; a divisão é sempre recalculada
// por arenaDivisionForPoints), então renomear aqui não quebra save antigo.
export const ARENA_DIVISIONS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'];

export function arenaDivisionForPoints(points) {
  const index = Math.min(ARENA_DIVISIONS.length - 1, Math.floor(points / 100));
  return ARENA_DIVISIONS[index];
}

// Limite diário de lutas — sem isso, Arena Points é só uma torneira infinita
// de Rubini Coins; o limite é o que faz "voltar amanhã" valer a pena.
export const ARENA_DAILY_LIMIT = 15;

// Recompensa única ao alcançar cada divisão pela primeira vez (não repete,
// mesmo se cair de divisão depois) — dá um motivo extra pra subir, além dos
// pontos em si.
// Migração: os nomes de divisão eram em português (ver comentário acima de
// ARENA_DIVISIONS) — saves antigos têm essas strings em G.arenaDivisionsClaimed
// (ver application/persistenceUseCases.js). Sem isso, quem já resgatou a
// divisão antiga conseguiria resgatar de novo sob o novo nome.
export const LEGACY_ARENA_DIVISION_MAP = {
  Prata: 'Silver', Ouro: 'Gold', Platina: 'Platinum', Diamante: 'Diamond',
  Mestre: 'Master', 'Grão-Mestre': 'Grandmaster',
};

export const ARENA_DIVISION_REWARDS = {
  Bronze: { type: 'gold', amount: 300 },
  Silver: { type: 'gold', amount: 800 },
  Gold: { type: 'rubini', amount: 40 },
  Platinum: { type: 'rubini', amount: 100 },
  Diamond: { type: 'item', itemId: 'crown_helmet' },
  Master: { type: 'item', itemId: 'crown_shield' },
  Grandmaster: { type: 'rubini', amount: 500 },
};

export const BP_XP_PER_TIER = 500;

// `name` dos tiers de item é chave de tradução (ver ui/battlePassPanel.js e
// i18n/locales/*.js: battlepass.reward.*) — os de gold/rubini já são só
// número+unidade, iguais nos dois idiomas, então ficam como string literal.
export const BP_REWARDS = [
  { tier: 1,  icon: '💰', name: '500 Gold', type: 'gold', amount: 500 },
  { tier: 3,  icon: '💰', name: '1000 Gold', type: 'gold', amount: 1000 },
  { tier: 5,  icon: '💎', name: '50 Rubini Coins', type: 'rubini', amount: 50 },
  { tier: 7,  icon: '🗡️', name: 'battlepass.reward.seasonalSword', type: 'item', itemId: 'guardian_halberd' },
  { tier: 10, icon: '💰', name: '2000 Gold', type: 'gold', amount: 2000 },
  { tier: 12, icon: '💎', name: '100 Rubini Coins', type: 'rubini', amount: 100 },
  { tier: 15, icon: '💎', name: '200 Rubini Coins', type: 'rubini', amount: 200 },
  { tier: 18, icon: '🛡️', name: 'battlepass.reward.seasonalArmor', type: 'item', itemId: 'amazon_armor' },
  { tier: 20, icon: '👑', name: 'battlepass.reward.royalHelmet', type: 'item', itemId: 'royal_helmet' },
];

export function bpTierForXp(bpXp) {
  return Math.floor(bpXp / BP_XP_PER_TIER);
}

// Custo da trilha PREMIUM (paga em Rubini Coins) — desbloqueia a coluna de
// recompensas premium, mais valiosa que a gratuita.
export const BP_PREMIUM_COST_RUBINI = 250;
// Trilha PREMIUM: recompensas paralelas por tier, melhores que a gratuita. Só
// gold/rubini (nome numérico, sem i18n) nesta v1.
export const BP_PREMIUM_REWARDS = [
  { tier: 1,  icon: '💎', name: '100 Rubini Coins', type: 'rubini', amount: 100 },
  { tier: 3,  icon: '💰', name: '5000 Gold', type: 'gold', amount: 5000 },
  { tier: 5,  icon: '💎', name: '150 Rubini Coins', type: 'rubini', amount: 150 },
  { tier: 7,  icon: '💰', name: '15000 Gold', type: 'gold', amount: 15000 },
  { tier: 10, icon: '💎', name: '250 Rubini Coins', type: 'rubini', amount: 250 },
  { tier: 12, icon: '💰', name: '30000 Gold', type: 'gold', amount: 30000 },
  { tier: 15, icon: '💎', name: '400 Rubini Coins', type: 'rubini', amount: 400 },
  { tier: 18, icon: '💰', name: '60000 Gold', type: 'gold', amount: 60000 },
  { tier: 20, icon: '💎', name: '750 Rubini Coins', type: 'rubini', amount: 750 },
];

// Missões diárias do Battle Pass: XP extra além do trickle passivo de matar
// monstros, ligadas a ações que o jogador já faz no jogo (caçar, tasks,
// Arena) — não é busywork inventado à parte. `track` casa com uma chave de
// G.bpMissionProgress (ver application/battlePassUseCases.js).
// `name` é chave de tradução (ver ui/battlePassPanel.js e i18n/locales/*.js:
// battlepass.mission.<id>) — texto original deste jogo, não canon de Tibia.
const BP_MISSION_POOL = [
  { id: 'kill_50',   name: 'battlepass.mission.kill_50',   goal: 50,   track: 'kills',     xp: 150 },
  { id: 'kill_150',  name: 'battlepass.mission.kill_150',  goal: 150,  track: 'kills',     xp: 350 },
  { id: 'kill_300',  name: 'battlepass.mission.kill_300',  goal: 300,  track: 'kills',     xp: 600 },
  { id: 'gold_1000', name: 'battlepass.mission.gold_1000', goal: 1000, track: 'gold',      xp: 150 },
  { id: 'gold_5000', name: 'battlepass.mission.gold_5000', goal: 5000, track: 'gold',      xp: 350 },
  { id: 'task_1',    name: 'battlepass.mission.task_1',    goal: 1,    track: 'tasks',     xp: 250 },
  { id: 'task_2',    name: 'battlepass.mission.task_2',    goal: 2,    track: 'tasks',     xp: 450 },
  { id: 'arena_1',   name: 'battlepass.mission.arena_1',   goal: 1,    track: 'arenaWins', xp: 200 },
  { id: 'arena_3',   name: 'battlepass.mission.arena_3',   goal: 3,    track: 'arenaWins', xp: 450 },
];

const BP_MISSIONS_PER_DAY = 3;

// Mesmas 3 missões o dia inteiro pra qualquer jogador, sem precisar de
// servidor pra sortear — hash simples da data (string "YYYY-MM-DD") vira o
// índice inicial no pool, e troca sozinho quando o dia muda.
export function dailyMissionsFor(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  const picks = [];
  for (let i = 0; i < BP_MISSIONS_PER_DAY; i++) {
    picks.push(BP_MISSION_POOL[(hash + i * 7) % BP_MISSION_POOL.length]);
  }
  return picks;
}

// ---- Missões SEMANAIS: metas maiores, mais XP, resetam por semana ----
const BP_WEEKLY_POOL = [
  { id: 'w_kill_1000', name: 'battlepass.mission.kill_300', goal: 1000, track: 'kills',     xp: 1500 },
  { id: 'w_kill_2500', name: 'battlepass.mission.kill_300', goal: 2500, track: 'kills',     xp: 3000 },
  { id: 'w_gold_50k',  name: 'battlepass.mission.gold_5000', goal: 50000, track: 'gold',    xp: 1500 },
  { id: 'w_task_10',   name: 'battlepass.mission.task_2',    goal: 10,   track: 'tasks',     xp: 2000 },
  { id: 'w_arena_15',  name: 'battlepass.mission.arena_3',   goal: 15,   track: 'arenaWins', xp: 2000 },
];
const BP_WEEKLY_PER_WEEK = 2;

// Id monotônico da semana a partir da data "YYYY-MM-DD" (semanas de 7 dias desde
// a época) — troca a cada 7 dias, sem depender de ISO week nem de servidor.
export function bpWeekId(dateStr) {
  const days = Math.floor(Date.parse(dateStr + 'T00:00:00Z') / 86400000);
  return Math.floor(days / 7);
}

// 2 missões semanais fixas pra a semana (hash do id da semana vira o índice).
export function weeklyMissionsFor(dateStr) {
  const wk = bpWeekId(dateStr) >>> 0;
  const picks = [];
  for (let i = 0; i < BP_WEEKLY_PER_WEEK; i++) picks.push(BP_WEEKLY_POOL[(wk + i * 3) % BP_WEEKLY_POOL.length]);
  return picks;
}

// Temporada do Battle Pass = mês calendário (year*12 + month) a partir da data.
// Ao virar o mês, a temporada muda e o progresso reseta (fiel a battle passes
// sazonais). O reset do lado premium reflete no servidor (ver /bp/*).
export function currentBpSeason(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return y * 12 + (m - 1);
}
