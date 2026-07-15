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
  { id: 'buy_dagger',       name: 'Dagger',           icon: '🗡️', currency: 'gold', price: 24,     type: 'item', itemId: 'dagger', shop: 'equipment' },
  { id: 'buy_bow',          name: 'Bow',              icon: '🏹', currency: 'gold', price: 80,     type: 'item', itemId: 'bow', shop: 'equipment' },
  { id: 'buy_snakebite_rod',name: 'Snakebite Rod',    icon: '🪄', currency: 'gold', price: 1600,   type: 'item', itemId: 'snakebite_rod', shop: 'equipment' },
  { id: 'buy_wooden_shield',name: 'Wooden Shield',    icon: '🛡️', currency: 'gold', price: 32,     type: 'item', itemId: 'wooden_shield', shop: 'equipment' },
  { id: 'buy_leather_armor',name: 'Leather Armor',    icon: '🥋', currency: 'gold', price: 24,     type: 'item', itemId: 'leather_armor', shop: 'equipment' },
  { id: 'buy_leather_legs', name: 'Leather Legs',     icon: '🦵', currency: 'gold', price: 24,     type: 'item', itemId: 'leather_legs', shop: 'equipment' },
  { id: 'buy_robe',         name: 'Robe',             icon: '👘', currency: 'gold', price: 60,     type: 'item', itemId: 'robe', shop: 'equipment' },
  { id: 'buy_chain_armor',  name: 'Chain Armor',      icon: '⛓️', currency: 'gold', price: 1200,   type: 'item', itemId: 'chain_armor', shop: 'equipment' },
  { id: 'buy_knight_armor', name: 'Knight Armor',     icon: '🛡️', currency: 'gold', price: 20000,  type: 'item', itemId: 'knight_armor', shop: 'equipment' },
  { id: 'buy_plate_legs',   name: 'Plate Legs',       icon: '🦵', currency: 'gold', price: 460,    type: 'item', itemId: 'plate_legs', shop: 'equipment' },
  { id: 'buy_broadsword',       name: 'Broadsword',        icon: '⚔️', currency: 'gold', price: 360,   type: 'item', itemId: 'broadsword', shop: 'equipment' },
  { id: 'buy_fire_sword',       name: 'Fire Sword',        icon: '🔥', currency: 'gold', price: 12000, type: 'item', itemId: 'fire_sword', shop: 'equipment' },
  { id: 'buy_battle_axe',       name: 'Battle Axe',        icon: '🪓', currency: 'gold', price: 320,   type: 'item', itemId: 'battle_axe', shop: 'equipment' },
  { id: 'buy_war_hammer',       name: 'War Hammer',        icon: '🔨', currency: 'gold', price: 360,   type: 'item', itemId: 'war_hammer', shop: 'equipment' },
  { id: 'buy_crossbow',         name: 'Crossbow',          icon: '🏹', currency: 'gold', price: 280,   type: 'item', itemId: 'crossbow', shop: 'equipment' },
  { id: 'buy_composite_hornbow',name: 'Composite Hornbow', icon: '🏹', currency: 'gold', price: 48000, type: 'item', itemId: 'composite_hornbow', shop: 'equipment' },
  { id: 'buy_arrow',            name: 'Arrow',             icon: '🏹', currency: 'gold', price: 4,     type: 'item', itemId: 'arrow', shop: 'equipment' },
  { id: 'buy_bolt',             name: 'Bolt',              icon: '🏹', currency: 'gold', price: 4,     type: 'item', itemId: 'bolt', shop: 'equipment' },
  { id: 'buy_sniper_arrow',     name: 'Sniper Arrow',      icon: '🏹', currency: 'gold', price: 8,     type: 'item', itemId: 'sniper_arrow', shop: 'equipment' },
  { id: 'buy_power_bolt',       name: 'Power Bolt',        icon: '🏹', currency: 'gold', price: 20,    type: 'item', itemId: 'power_bolt', shop: 'equipment' },
  { id: 'buy_wand_cosmic',      name: 'Wand of Cosmic Energy', icon: '🪄', currency: 'gold', price: 3600, type: 'item', itemId: 'wand_of_cosmic_energy', shop: 'equipment' },
  { id: 'buy_wand_inferno',     name: 'Wand of Inferno',   icon: '🪄', currency: 'gold', price: 14000, type: 'item', itemId: 'wand_of_inferno', shop: 'equipment' },
  { id: 'buy_moonlight_rod',    name: 'Moonlight Rod',     icon: '🪄', currency: 'gold', price: 3600,  type: 'item', itemId: 'moonlight_rod', shop: 'equipment' },
  { id: 'buy_brass_armor',      name: 'Brass Armor',       icon: '🥋', currency: 'gold', price: 720,   type: 'item', itemId: 'brass_armor', shop: 'equipment' },
  { id: 'buy_scale_armor',      name: 'Scale Armor',       icon: '🥋', currency: 'gold', price: 360,   type: 'item', itemId: 'scale_armor', shop: 'equipment' },
  { id: 'buy_studded_shield',   name: 'Studded Shield',    icon: '🛡️', currency: 'gold', price: 280,   type: 'item', itemId: 'studded_shield', shop: 'equipment' },
  { id: 'buy_iron_helmet',      name: 'Iron Helmet',       icon: '⛑️', currency: 'gold', price: 120,   type: 'item', itemId: 'iron_helmet', shop: 'equipment' },
  { id: 'buy_chain_helmet',     name: 'Chain Helmet',      icon: '⛑️', currency: 'gold', price: 180,   type: 'item', itemId: 'chain_helmet', shop: 'equipment' },
  { id: 'buy_studded_legs',     name: 'Studded Legs',      icon: '🦵', currency: 'gold', price: 280,   type: 'item', itemId: 'studded_legs', shop: 'equipment' },
  { id: 'buy_steel_boots',      name: 'Steel Boots',       icon: '👢', currency: 'gold', price: 880,   type: 'item', itemId: 'steel_boots', shop: 'equipment' },

  // Loja de Artigos Mágicos (gold) — Supply Completo (restaura HP/mana na
  // hora), depois poções e runas, preço = 4x o valor de venda
  { id: 'refill', name: 'shop.item.fullSupply', icon: '🧪', currency: 'gold', price: 500, type: 'refill', shop: 'magic', desc: 'shop.desc.refill' },
  { id: 'buy_health_potion',        name: 'Health Potion',          icon: '🧪', currency: 'gold', price: 100,  type: 'item', itemId: 'health_potion', shop: 'magic' },
  { id: 'buy_strong_health_potion', name: 'Strong Health Potion',   icon: '🧪', currency: 'gold', price: 240,  type: 'item', itemId: 'strong_health_potion', shop: 'magic' },
  { id: 'buy_great_health_potion',  name: 'Great Health Potion',    icon: '🧪', currency: 'gold', price: 520,  type: 'item', itemId: 'great_health_potion', shop: 'magic' },
  { id: 'buy_ultimate_health_potion',name: 'Ultimate Health Potion',icon: '🧪', currency: 'gold', price: 1040, type: 'item', itemId: 'ultimate_health_potion', shop: 'magic' },
  { id: 'buy_mana_potion',          name: 'Mana Potion',            icon: '🔵', currency: 'gold', price: 100,  type: 'item', itemId: 'mana_potion', shop: 'magic' },
  { id: 'buy_strong_mana_potion',   name: 'Strong Mana Potion',     icon: '🔵', currency: 'gold', price: 240,  type: 'item', itemId: 'strong_mana_potion', shop: 'magic' },
  { id: 'buy_great_mana_potion',    name: 'Great Mana Potion',      icon: '🔵', currency: 'gold', price: 520,  type: 'item', itemId: 'great_mana_potion', shop: 'magic' },
  { id: 'buy_intense_healing_rune', name: 'Intense Healing Rune',   icon: '📜', currency: 'gold', price: 280,  type: 'item', itemId: 'intense_healing_rune', shop: 'magic' },
  { id: 'buy_ultimate_healing_rune',name: 'Ultimate Healing Rune',  icon: '📜', currency: 'gold', price: 720,  type: 'item', itemId: 'ultimate_healing_rune', shop: 'magic' },
  { id: 'buy_explosion_rune',       name: 'Explosion Rune',         icon: '📜', currency: 'gold', price: 240,  type: 'item', itemId: 'explosion_rune', shop: 'magic' },
  { id: 'buy_avalanche_rune',       name: 'Avalanche Rune',         icon: '📜', currency: 'gold', price: 360,  type: 'item', itemId: 'avalanche_rune', shop: 'magic' },
  { id: 'buy_sudden_death_rune',    name: 'Sudden Death Rune',      icon: '📜', currency: 'gold', price: 800,  type: 'item', itemId: 'sudden_death_rune', shop: 'magic' },
  { id: 'buy_fireball_rune',        name: 'Fireball Rune',          icon: '📜', currency: 'gold', price: 60,   type: 'item', itemId: 'fireball_rune', shop: 'magic' },
  { id: 'buy_great_fireball_rune',  name: 'Great Fireball Rune',    icon: '📜', currency: 'gold', price: 180,  type: 'item', itemId: 'great_fireball_rune', shop: 'magic' },
  { id: 'buy_great_spirit_potion',  name: 'Great Spirit Potion',    icon: '🧪', currency: 'gold', price: 1280, type: 'item', itemId: 'great_spirit_potion', shop: 'magic' },
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
  { key: 'equipment', title: 'shop.equipment.title', subtitle: 'shop.equipment.subtitle', sub: [
      { title: 'shop.equipment.subSwords', filter: (s, items) => items[s.itemId]?.weaponType === 'sword' },
      { title: 'shop.equipment.subAxes', filter: (s, items) => items[s.itemId]?.weaponType === 'axe' },
      { title: 'shop.equipment.subClubs', filter: (s, items) => items[s.itemId]?.weaponType === 'club' },
      { title: 'shop.equipment.subDistance', filter: (s, items) => items[s.itemId]?.weaponType === 'distance' },
      { title: 'shop.equipment.subAmmo', filter: (s, items) => items[s.itemId]?.type === 'ammo' },
      { title: 'shop.equipment.subWands', filter: (s, items) => items[s.itemId]?.weaponType === 'magic' },
      { title: 'shop.equipment.subArmors', filter: (s, items) => items[s.itemId]?.type === 'armor' },
      { title: 'shop.equipment.subShields', filter: (s, items) => items[s.itemId]?.type === 'shield' },
      { title: 'shop.equipment.subHelmets', filter: (s, items) => items[s.itemId]?.type === 'helmet' },
      { title: 'shop.equipment.subLegs', filter: (s, items) => items[s.itemId]?.type === 'legs' },
      { title: 'shop.equipment.subBoots', filter: (s, items) => items[s.itemId]?.type === 'boots' },
      { title: 'shop.equipment.subRings', filter: (s, items) => items[s.itemId]?.type === 'ring' },
    ]},
  { key: 'magic', title: 'shop.magic.title', subtitle: 'shop.magic.subtitle', sub: [
      { title: 'shop.magic.subRefill', filter: s => s.type === 'refill' },
      { title: 'shop.magic.subPotions', filter: (s, items) => items[s.itemId]?.type === 'potion' },
      { title: 'shop.magic.subRunes', filter: (s, items) => items[s.itemId]?.type === 'rune' },
    ]},
];

export function isBoostActive(boosts, kind, now) {
  return !!(boosts && boosts[kind] && boosts[kind] > now);
}

export function computeBoostMods(boosts, now) {
  return {
    xp: isBoostActive(boosts, 'xp', now) ? 1.5 : 1,
    loot: isBoostActive(boosts, 'loot', now) ? 0.15 : 0,
    gold: isBoostActive(boosts, 'gold', now) ? 1.3 : 1,
  };
}
