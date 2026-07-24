// Catálogo das 4 lojas (Loja Premium, Rubini Store, Loja de Equipamentos,
// Loja de Artigos Mágicos) e as configurações do RTC (Rubinot Custom Client).

// shop: 'premium' (Loja Premium — dinheiro real, compra de Rubini Coins,
//         igual à Store oficial do Tibia que vende Tibia Coins por R$),
//       'rubini' (Rubini Store — boosts/supply, em RC ganho jogando ou gold),
//       'equipment' (Loja de Equipamentos — armas/armaduras, em gold),
//       'magic' (Loja de Artigos Mágicos — poções/runas, em gold).
// Outfits não ficam mais aqui — viraram uma tela de aparência própria (ver
// domain/outfits.js e ui/outfitPicker.js), igual à do Tibia de verdade.
//
// A Loja Premium é a ÚNICA que cobra dinheiro real — fica sempre separada
// das demais (que só usam gold/Rubini Coins ganhos jogando) pra não misturar
// o que é grátis-jogável com o que é pago. `priceBRL` ainda não está ligado a
// um gateway de pagamento real (Stripe/Mercado Pago/PIX) — o botão de compra
// sinaliza isso explicitamente até essa integração existir.
// `desc` (e o `name` de 'refill') são chave de tradução (ver ui/shopPanel.js
// e i18n/locales/*.js: shop.desc.*/shop.item.*) — texto de UI, não canon de
// Tibia. Os demais `name` já são o nome real do item (ver domain/items.js) ou
// texto já em inglês (XP Boost etc.), então ficam como string literal.
export const SHOP_ITEMS = [
  // Loja Premium (dinheiro real) — pacotes de Rubini Coins
  { id: 'rc_pack_s',  name: '100 Rubini Coins',  icon: '💎', currency: 'real', priceBRL: 4.90,  type: 'currency', rubiniAmount: 100,  shop: 'premium', desc: 'shop.desc.rcPackS' },
  { id: 'rc_pack_m',  name: '300 Rubini Coins',  icon: '💎', currency: 'real', priceBRL: 12.90, type: 'currency', rubiniAmount: 300,  shop: 'premium', desc: 'shop.desc.rcPackM' },
  { id: 'rc_pack_l',  name: '700 Rubini Coins',  icon: '💎', currency: 'real', priceBRL: 24.90, type: 'currency', rubiniAmount: 700,  shop: 'premium', desc: 'shop.desc.rcPackL' },
  { id: 'rc_pack_xl', name: '1500 Rubini Coins', icon: '💎', currency: 'real', priceBRL: 47.90, type: 'currency', rubiniAmount: 1500, shop: 'premium', desc: 'shop.desc.rcPackXl' },

  // Rubini Store — só Boosts temporários, só Rubini Coins (a loja fica pura:
  // nada de gold aqui, pra não misturar as duas moedas na mesma prateleira —
  // ver Loja de Artigos Mágicos abaixo pro Supply Completo, que é gold).
  { id: 'xp_boost',   name: 'XP Boost',        icon: '⭐', currency: 'rubini', price: 50,  type: 'boost', boost: 'xp',   minutes: 30, shop: 'rubini', desc: 'shop.desc.xpBoost' },
  { id: 'loot_boost', name: 'Loot Boost',      icon: '🍀', currency: 'rubini', price: 40,  type: 'boost', boost: 'loot', minutes: 30, shop: 'rubini', desc: 'shop.desc.lootBoost' },
  { id: 'gold_boost', name: 'Gold Boost',      icon: '💰', currency: 'rubini', price: 40,  type: 'boost', boost: 'gold', minutes: 30, shop: 'rubini', desc: 'shop.desc.goldBoost' },

  // Loja de Equipamentos (gold) — preço = 4x o valor de venda do item
  { id: 'buy_dagger',       name: 'Dagger',           icon: '🗡️', currency: 'gold', price: 5,     type: 'item', itemId: 'dagger', shop: 'equipment' },
  { id: 'buy_bow',          name: 'Bow',              icon: '🏹', currency: 'gold', price: 400,     type: 'item', itemId: 'bow', shop: 'equipment' },
  { id: 'buy_snakebite_rod',name: 'Snakebite Rod',    icon: '🪄', currency: 'gold', price: 500,   type: 'item', itemId: 'snakebite_rod', shop: 'equipment' },
  { id: 'buy_wooden_shield',name: 'Wooden Shield',    icon: '🛡️', currency: 'gold', price: 15,     type: 'item', itemId: 'wooden_shield', shop: 'equipment' },
  { id: 'buy_leather_armor',name: 'Leather Armor',    icon: '🥋', currency: 'gold', price: 35,     type: 'item', itemId: 'leather_armor', shop: 'equipment' },
  { id: 'buy_leather_legs', name: 'Leather Legs',     icon: '🦵', currency: 'gold', price: 10,     type: 'item', itemId: 'leather_legs', shop: 'equipment' },
  { id: 'buy_robe',         name: 'Robe',             icon: '👘', currency: 'gold', price: 60,     type: 'item', itemId: 'robe', shop: 'equipment' },
  { id: 'buy_chain_armor',  name: 'Chain Armor',      icon: '⛓️', currency: 'gold', price: 200,   type: 'item', itemId: 'chain_armor', shop: 'equipment' },
  { id: 'buy_battle_axe',       name: 'Battle Axe',        icon: '🪓', currency: 'gold', price: 235,   type: 'item', itemId: 'battle_axe', shop: 'equipment' },
  { id: 'buy_war_hammer',       name: 'War Hammer',        icon: '🔨', currency: 'gold', price: 10000,   type: 'item', itemId: 'war_hammer', shop: 'equipment' },
  { id: 'buy_crossbow',         name: 'Crossbow',          icon: '🏹', currency: 'gold', price: 500,   type: 'item', itemId: 'crossbow', shop: 'equipment' },
  { id: 'buy_simple_arrow',          name: 'Simple Arrow',        icon: '🏹', currency: 'gold', price: 2,    type: 'item', itemId: 'simple_arrow', shop: 'equipment' },
  { id: 'buy_arrow',                 name: 'Arrow',               icon: '🏹', currency: 'gold', price: 3,    type: 'item', itemId: 'arrow', shop: 'equipment' },
  { id: 'buy_bolt',                  name: 'Bolt',                icon: '🏹', currency: 'gold', price: 4,    type: 'item', itemId: 'bolt', shop: 'equipment' },
  { id: 'buy_sniper_arrow',          name: 'Sniper Arrow',        icon: '🏹', currency: 'gold', price: 5,    type: 'item', itemId: 'sniper_arrow', shop: 'equipment' },
  { id: 'buy_flash_arrow',           name: 'Flash Arrow',         icon: '🏹', currency: 'gold', price: 5,    type: 'item', itemId: 'flash_arrow', shop: 'equipment' },
  { id: 'buy_shiver_arrow',          name: 'Shiver Arrow',        icon: '🏹', currency: 'gold', price: 5,    type: 'item', itemId: 'shiver_arrow', shop: 'equipment' },
  { id: 'buy_burst_arrow',           name: 'Burst Arrow',         icon: '🏹', currency: 'gold', price: 5,    type: 'item', itemId: 'burst_arrow', shop: 'equipment' },
  { id: 'buy_flaming_arrow',         name: 'Flaming Arrow',       icon: '🏹', currency: 'gold', price: 5,    type: 'item', itemId: 'flaming_arrow', shop: 'equipment' },
  { id: 'buy_earth_arrow',           name: 'Earth Arrow',         icon: '🏹', currency: 'gold', price: 5,    type: 'item', itemId: 'earth_arrow', shop: 'equipment' },
  { id: 'buy_piercing_bolt',         name: 'Piercing Bolt',       icon: '🏹', currency: 'gold', price: 5,    type: 'item', itemId: 'piercing_bolt', shop: 'equipment' },
  { id: 'buy_tarsal_arrow',          name: 'Tarsal Arrow',        icon: '🏹', currency: 'gold', price: 6,    type: 'item', itemId: 'tarsal_arrow', shop: 'equipment' },
  { id: 'buy_vortex_bolt',           name: 'Vortex Bolt',         icon: '🏹', currency: 'gold', price: 6,    type: 'item', itemId: 'vortex_bolt', shop: 'equipment' },
  { id: 'buy_onyx_arrow',            name: 'Onyx Arrow',          icon: '🏹', currency: 'gold', price: 7,    type: 'item', itemId: 'onyx_arrow', shop: 'equipment' },
  { id: 'buy_power_bolt',            name: 'Power Bolt',          icon: '🏹', currency: 'gold', price: 7,    type: 'item', itemId: 'power_bolt', shop: 'equipment' },
  { id: 'buy_drill_bolt',            name: 'Drill Bolt',          icon: '🏹', currency: 'gold', price: 12,   type: 'item', itemId: 'drill_bolt', shop: 'equipment' },
  { id: 'buy_envenomed_arrow',       name: 'Envenomed Arrow',     icon: '🏹', currency: 'gold', price: 12,   type: 'item', itemId: 'envenomed_arrow', shop: 'equipment' },
  { id: 'buy_crystalline_arrow',     name: 'Crystalline Arrow',   icon: '🏹', currency: 'gold', price: 20,   type: 'item', itemId: 'crystalline_arrow', shop: 'equipment' },
  { id: 'buy_prismatic_bolt',        name: 'Prismatic Bolt',      icon: '🏹', currency: 'gold', price: 20,   type: 'item', itemId: 'prismatic_bolt', shop: 'equipment' },
  { id: 'buy_spectral_bolt',         name: 'Spectral Bolt',       icon: '🏹', currency: 'gold', price: 70,   type: 'item', itemId: 'spectral_bolt', shop: 'equipment' },
  { id: 'buy_diamond_arrow',         name: 'Diamond Arrow',       icon: '🏹', currency: 'gold', price: 130,  type: 'item', itemId: 'diamond_arrow', shop: 'equipment' },
  { id: 'buy_wand_cosmic',      name: 'Wand of Cosmic Energy', icon: '🪄', currency: 'gold', price: 10000, type: 'item', itemId: 'wand_of_cosmic_energy', shop: 'equipment' },
  { id: 'buy_wand_inferno',     name: 'Wand of Inferno',   icon: '🪄', currency: 'gold', price: 15000, type: 'item', itemId: 'wand_of_inferno', shop: 'equipment' },
  { id: 'buy_moonlight_rod',    name: 'Moonlight Rod',     icon: '🪄', currency: 'gold', price: 1000,  type: 'item', itemId: 'moonlight_rod', shop: 'equipment' },
  { id: 'buy_wand_vortex',      name: 'Wand of Vortex',    icon: '🪄', currency: 'gold', price: 500,  type: 'item', itemId: 'wand_of_vortex', shop: 'equipment' },
  { id: 'buy_underworld_rod',   name: 'Underworld Rod',    icon: '🪄', currency: 'gold', price: 22000, type: 'item', itemId: 'underworld_rod', shop: 'equipment' },
  { id: 'buy_wand_decay',       name: 'Wand of Decay',     icon: '🪄', currency: 'gold', price: 5000,  type: 'item', itemId: 'wand_of_decay', shop: 'equipment' },
  { id: 'buy_wand_draconia',    name: 'Wand of Draconia',  icon: '🪄', currency: 'gold', price: 7500,  type: 'item', itemId: 'wand_of_draconia', shop: 'equipment' },
  { id: 'buy_wand_starstorm',   name: 'Wand of Starstorm', icon: '🪄', currency: 'gold', price: 18000,  type: 'item', itemId: 'wand_of_starstorm', shop: 'equipment' },
  { id: 'buy_wand_voodoo',      name: 'Wand of Voodoo',    icon: '🪄', currency: 'gold', price: 22000,  type: 'item', itemId: 'wand_of_voodoo', shop: 'equipment' },
  { id: 'buy_necrotic_rod',     name: 'Necrotic Rod',      icon: '🪄', currency: 'gold', price: 5000, type: 'item', itemId: 'necrotic_rod', shop: 'equipment' },
  { id: 'buy_terra_rod',        name: 'Terra Rod',         icon: '🪄', currency: 'gold', price: 10000,  type: 'item', itemId: 'terra_rod', shop: 'equipment' },
  { id: 'buy_springsprout_rod', name: 'Springsprout Rod',  icon: '🪄', currency: 'gold', price: 18000,  type: 'item', itemId: 'springsprout_rod', shop: 'equipment' },
  { id: 'buy_hailstorm_rod',    name: 'Hailstorm Rod',     icon: '🪄', currency: 'gold', price: 15000,  type: 'item', itemId: 'hailstorm_rod', shop: 'equipment' },
  { id: 'buy_brass_armor',      name: 'Brass Armor',       icon: '🥋', currency: 'gold', price: 450,   type: 'item', itemId: 'brass_armor', shop: 'equipment' },
  { id: 'buy_scale_armor',      name: 'Scale Armor',       icon: '🥋', currency: 'gold', price: 260,   type: 'item', itemId: 'scale_armor', shop: 'equipment' },
  { id: 'buy_studded_shield',   name: 'Studded Shield',    icon: '🛡️', currency: 'gold', price: 50,   type: 'item', itemId: 'studded_shield', shop: 'equipment' },
  { id: 'buy_iron_helmet',      name: 'Iron Helmet',       icon: '⛑️', currency: 'gold', price: 390,   type: 'item', itemId: 'iron_helmet', shop: 'equipment' },
  { id: 'buy_chain_helmet',     name: 'Chain Helmet',      icon: '⛑️', currency: 'gold', price: 52,   type: 'item', itemId: 'chain_helmet', shop: 'equipment' },
  { id: 'buy_studded_legs',     name: 'Studded Legs',      icon: '🦵', currency: 'gold', price: 50,   type: 'item', itemId: 'studded_legs', shop: 'equipment' },
  // Faltavam no catálogo apesar de existirem em domain/items.js (auditoria do
  // bug "poucos itens de Paladin na loja") — armadura/escudo/anel de tier alto,
  // úteis pra QUALQUER vocação de armadura física (Knight/Paladin), não só o
  // Paladin. Preço = 4x sell, igual ao resto da lista.
  { id: 'buy_ancient_shield',   name: 'Ancient Shield',    icon: '🛡️', currency: 'gold', price: 5000,  type: 'item', itemId: 'ancient_shield', shop: 'equipment' },
  { id: 'buy_might_ring',       name: 'Might Ring',        icon: '💍', currency: 'gold', price: 25000,   type: 'item', itemId: 'might_ring', shop: 'equipment' },

  // Loja de Artigos Mágicos (gold) — Supply Completo (restaura HP/mana na
  // hora), depois poções e runas, preço = 4x o valor de venda
  { id: 'refill', name: 'shop.item.fullSupply', icon: '🧪', currency: 'gold', price: 500, type: 'refill', shop: 'magic', desc: 'shop.desc.refill' },
  { id: 'buy_health_potion',        name: 'Health Potion',          icon: '🧪', currency: 'gold', price: 50,  type: 'item', itemId: 'health_potion', shop: 'magic' },
  { id: 'buy_strong_health_potion', name: 'Strong Health Potion',   icon: '🧪', currency: 'gold', price: 115,  type: 'item', itemId: 'strong_health_potion', shop: 'magic' },
  { id: 'buy_great_health_potion',  name: 'Great Health Potion',    icon: '🧪', currency: 'gold', price: 225,  type: 'item', itemId: 'great_health_potion', shop: 'magic' },
  { id: 'buy_ultimate_health_potion',name: 'Ultimate Health Potion',icon: '🧪', currency: 'gold', price: 379, type: 'item', itemId: 'ultimate_health_potion', shop: 'magic' },
  { id: 'buy_mana_potion',          name: 'Mana Potion',            icon: '🔵', currency: 'gold', price: 56,  type: 'item', itemId: 'mana_potion', shop: 'magic' },
  { id: 'buy_strong_mana_potion',   name: 'Strong Mana Potion',     icon: '🔵', currency: 'gold', price: 108,  type: 'item', itemId: 'strong_mana_potion', shop: 'magic' },
  { id: 'buy_great_mana_potion',    name: 'Great Mana Potion',      icon: '🔵', currency: 'gold', price: 158,  type: 'item', itemId: 'great_mana_potion', shop: 'magic' },
  { id: 'buy_intense_healing_rune', name: 'Intense Healing Rune',   icon: '📜', currency: 'gold', price: 95,  type: 'item', itemId: 'intense_healing_rune', shop: 'magic' },
  { id: 'buy_ultimate_healing_rune',name: 'Ultimate Healing Rune',  icon: '📜', currency: 'gold', price: 175,  type: 'item', itemId: 'ultimate_healing_rune', shop: 'magic' },
  { id: 'buy_explosion_rune',       name: 'Explosion Rune',         icon: '📜', currency: 'gold', price: 31,  type: 'item', itemId: 'explosion_rune', shop: 'magic' },
  { id: 'buy_avalanche_rune',       name: 'Avalanche Rune',         icon: '📜', currency: 'gold', price: 64,  type: 'item', itemId: 'avalanche_rune', shop: 'magic' },
  { id: 'buy_sudden_death_rune',    name: 'Sudden Death Rune',      icon: '📜', currency: 'gold', price: 162,  type: 'item', itemId: 'sudden_death_rune', shop: 'magic' },
  { id: 'buy_fireball_rune',        name: 'Fireball Rune',          icon: '📜', currency: 'gold', price: 65,   type: 'item', itemId: 'fireball_rune', shop: 'magic' },
  { id: 'buy_great_fireball_rune',  name: 'Great Fireball Rune',    icon: '📜', currency: 'gold', price: 64,  type: 'item', itemId: 'great_fireball_rune', shop: 'magic' },
  { id: 'buy_light_magic_missile_rune',  name: 'Light Magic Missile Rune',  icon: '📜', currency: 'gold', price: 4,   type: 'item', itemId: 'light_magic_missile_rune', shop: 'magic' },
  { id: 'buy_heavy_magic_missile_rune',  name: 'Heavy Magic Missile Rune',  icon: '📜', currency: 'gold', price: 65,   type: 'item', itemId: 'heavy_magic_missile_rune', shop: 'magic' },
  { id: 'buy_holy_missile_rune',         name: 'Holy Missile Rune',         icon: '📜', currency: 'gold', price: 16,   type: 'item', itemId: 'holy_missile_rune', shop: 'magic' },
  { id: 'buy_fire_field_rune',           name: 'Fire Field Rune',           icon: '📜', currency: 'gold', price: 28,   type: 'item', itemId: 'fire_field_rune', shop: 'magic' },
  { id: 'buy_fire_wall_rune',            name: 'Fire Wall Rune',            icon: '📜', currency: 'gold', price: 61,   type: 'item', itemId: 'fire_wall_rune', shop: 'magic' },
  { id: 'buy_fire_bomb_rune',            name: 'Fire Bomb Rune',            icon: '📜', currency: 'gold', price: 147,  type: 'item', itemId: 'fire_bomb_rune', shop: 'magic' },
  { id: 'buy_poison_field_rune',         name: 'Poison Field Rune',         icon: '📜', currency: 'gold', price: 21,   type: 'item', itemId: 'poison_field_rune', shop: 'magic' },
  { id: 'buy_poison_wall_rune',          name: 'Poison Wall Rune',          icon: '📜', currency: 'gold', price: 52,   type: 'item', itemId: 'poison_wall_rune', shop: 'magic' },
  { id: 'buy_poison_bomb_rune',          name: 'Poison Bomb Rune',          icon: '📜', currency: 'gold', price: 85,  type: 'item', itemId: 'poison_bomb_rune', shop: 'magic' },
  { id: 'buy_energy_field_rune',         name: 'Energy Field Rune',         icon: '📜', currency: 'gold', price: 38,  type: 'item', itemId: 'energy_field_rune', shop: 'magic' },
  { id: 'buy_energy_wall_rune',          name: 'Energy Wall Rune',          icon: '📜', currency: 'gold', price: 85,  type: 'item', itemId: 'energy_wall_rune', shop: 'magic' },
  { id: 'buy_energy_bomb_rune',          name: 'Energy Bomb Rune',          icon: '📜', currency: 'gold', price: 203, type: 'item', itemId: 'energy_bomb_rune', shop: 'magic' },
  { id: 'buy_icicle_rune',               name: 'Icicle Rune',               icon: '📜', currency: 'gold', price: 65,  type: 'item', itemId: 'icicle_rune', shop: 'magic' },
  { id: 'buy_stalagmite_rune',           name: 'Stalagmite Rune',           icon: '📜', currency: 'gold', price: 65,  type: 'item', itemId: 'stalagmite_rune', shop: 'magic' },
  { id: 'buy_stone_shower_rune',         name: 'Stone Shower Rune',         icon: '📜', currency: 'gold', price: 41,  type: 'item', itemId: 'stone_shower_rune', shop: 'magic' },
  { id: 'buy_thunderstorm_rune',         name: 'Thunderstorm Rune',         icon: '📜', currency: 'gold', price: 52,  type: 'item', itemId: 'thunderstorm_rune', shop: 'magic' },
  { id: 'buy_soulfire_rune',             name: 'Soulfire Rune',             icon: '📜', currency: 'gold', price: 46,  type: 'item', itemId: 'soulfire_rune', shop: 'magic' },
  { id: 'buy_desintegrate_rune',         name: 'Desintegrate Rune',         icon: '📜', currency: 'gold', price: 26,  type: 'item', itemId: 'desintegrate_rune', shop: 'magic' },
  { id: 'buy_cure_poison_rune',          name: 'Cure Poison Rune',          icon: '📜', currency: 'gold', price: 65,   type: 'item', itemId: 'cure_poison_rune', shop: 'magic' },
  { id: 'buy_chameleon_rune',            name: 'Chameleon Rune',            icon: '📜', currency: 'gold', price: 210,  type: 'item', itemId: 'chameleon_rune', shop: 'magic' },
  { id: 'buy_convince_creature_rune',    name: 'Convince Creature Rune',    icon: '📜', currency: 'gold', price: 80, type: 'item', itemId: 'convince_creature_rune', shop: 'magic' },
  { id: 'buy_animate_dead_rune',         name: 'Animate Dead Rune',         icon: '📜', currency: 'gold', price: 375, type: 'item', itemId: 'animate_dead_rune', shop: 'magic' },
  { id: 'buy_magic_wall_rune',           name: 'Magic Wall Rune',           icon: '📜', currency: 'gold', price: 116,  type: 'item', itemId: 'magic_wall_rune', shop: 'magic' },
  { id: 'buy_wild_growth_rune',          name: 'Wild Growth Rune',          icon: '📜', currency: 'gold', price: 160,  type: 'item', itemId: 'wild_growth_rune', shop: 'magic' },
  { id: 'buy_paralyze_rune',             name: 'Paralyze Rune',             icon: '📜', currency: 'gold', price: 700, type: 'item', itemId: 'paralyze_rune', shop: 'magic' },
  { id: 'buy_great_spirit_potion',  name: 'Great Spirit Potion',    icon: '🧪', currency: 'gold', price: 254, type: 'item', itemId: 'great_spirit_potion', shop: 'magic' },
];

// `title`/`subtitle` são chave de tradução (ver ui/shopPanel.js e
// i18n/locales/*.js: shop.premium.*/shop.rubini.*/shop.equipment.*/shop.magic.*)
// — o emoji mora DENTRO da string traduzida (igual ao resto do jogo), então
// title/subtitle continuam sendo só chaves passadas direto pra t().
export const SHOPS = [
  { key: 'premium', title: 'shop.premium.title', subtitle: 'shop.premium.subtitle', sub: [
      { title: 'shop.premium.subRcPacks', filter: s => s.type === 'currency' },
    ]},
  { key: 'rubini', title: 'shop.rubini.title', subtitle: 'shop.rubini.subtitle', sub: [
      { title: 'shop.rubini.subBoosts', filter: s => s.type === 'boost' },
    ]},
  { key: 'equipment', trade: true, title: 'shop.equipment.title', subtitle: 'shop.equipment.subtitle', groups: [
      { key: 'melee', title: 'shop.equipment.groupMelee' },
      { key: 'ranged', title: 'shop.equipment.groupRanged' },
      { key: 'magic', title: 'shop.equipment.groupMagic' },
    ], sub: [
      { title: 'shop.equipment.subSwords', group: 'melee', filter: (s, items) => items[s.itemId]?.weaponType === 'sword' },
      { title: 'shop.equipment.subAxes', group: 'melee', filter: (s, items) => items[s.itemId]?.weaponType === 'axe' },
      { title: 'shop.equipment.subClubs', group: 'melee', filter: (s, items) => items[s.itemId]?.weaponType === 'club' },
      { title: 'shop.equipment.subArmors', group: 'melee', filter: (s, items) => items[s.itemId]?.type === 'armor' },
      { title: 'shop.equipment.subShields', group: 'melee', filter: (s, items) => items[s.itemId]?.type === 'shield' },
      { title: 'shop.equipment.subHelmets', group: 'melee', filter: (s, items) => items[s.itemId]?.type === 'helmet' },
      { title: 'shop.equipment.subLegs', group: 'melee', filter: (s, items) => items[s.itemId]?.type === 'legs' },
      { title: 'shop.equipment.subBoots', group: 'melee', filter: (s, items) => items[s.itemId]?.type === 'boots' },
      { title: 'shop.equipment.subRings', group: 'melee', filter: (s, items) => items[s.itemId]?.type === 'ring' },
      { title: 'shop.equipment.subDistance', group: 'ranged', filter: (s, items) => items[s.itemId]?.weaponType === 'distance' },
      { title: 'shop.equipment.subAmmo', group: 'ranged', filter: (s, items) => items[s.itemId]?.type === 'ammo' },
      { title: 'shop.equipment.subWands', group: 'magic', filter: (s, items) => items[s.itemId]?.weaponType === 'magic' },
    ]},
  // Separada em duas abas (poções e runas) — é assim que o jogador procura, e
  // uma lista única misturando as duas ficava longa demais pra achar qualquer
  // coisa. O Supply Completo entra junto das poções, que é o que ele repõe.
  { key: 'magic', trade: true, title: 'shop.magic.title', subtitle: 'shop.magic.subtitle', groups: [
      { key: 'potions', title: 'shop.magic.groupPotions' },
      { key: 'runes', title: 'shop.magic.groupRunes' },
    ], sub: [
      { title: 'shop.magic.subRefill', group: 'potions', filter: s => s.type === 'refill' },
      { title: 'shop.magic.subPotions', group: 'potions', filter: (s, items) => items[s.itemId]?.type === 'potion' },
      { title: 'shop.magic.subRunes', group: 'runes', filter: (s, items) => items[s.itemId]?.type === 'rune' },
    ]},
];

export function isBoostActive(boosts, kind, now) {
  return !!(boosts && boosts[kind] && boosts[kind] > now);
}
