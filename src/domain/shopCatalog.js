// Catálogo das 3 lojas (Rubini Store, Loja de Equipamentos, Loja de Artigos
// Mágicos) e as configurações do RTC (Rubinot Custom Client).

// shop: 'rubini' (Rubini Store — boosts/supply, em RC ou gold),
//       'equipment' (Loja de Equipamentos — armas/armaduras, em gold),
//       'magic' (Loja de Artigos Mágicos — poções/runas, em gold).
// Outfits não ficam mais aqui — viraram uma tela de aparência própria (ver
// domain/outfits.js e ui/outfitPicker.js), igual à do Tibia de verdade.
export const SHOP_ITEMS = [
  // Rubini Store — Boosts temporários (Rubini Coins)
  { id: 'xp_boost',   name: 'XP Boost',        icon: '⭐', currency: 'rubini', price: 50,  type: 'boost', boost: 'xp',   minutes: 30, shop: 'rubini', desc: '+50% de XP por 30 minutos de caçada.' },
  { id: 'loot_boost', name: 'Loot Boost',      icon: '🍀', currency: 'rubini', price: 40,  type: 'boost', boost: 'loot', minutes: 30, shop: 'rubini', desc: '+15% de chance de loot por 30 minutos.' },
  { id: 'gold_boost', name: 'Gold Boost',      icon: '💰', currency: 'rubini', price: 40,  type: 'boost', boost: 'gold', minutes: 30, shop: 'rubini', desc: '+30% de gold por 30 minutos.' },
  // Rubini Store — Suprimentos (gold)
  { id: 'refill',     name: 'Supply Completo', icon: '🧪', currency: 'gold',   price: 500, type: 'refill', shop: 'rubini', desc: 'Restaura HP e mana instantaneamente.' },

  // Loja de Equipamentos (gold) — preço = 4x o valor de venda do item
  { id: 'buy_dagger',       name: 'Dagger',           icon: '🗡️', currency: 'gold', price: 24,     type: 'item', itemId: 'dagger', shop: 'equipment' },
  { id: 'buy_bow',          name: 'Bow',              icon: '🏹', currency: 'gold', price: 80,     type: 'item', itemId: 'bow', shop: 'equipment' },
  { id: 'buy_wand_vortex',  name: 'Wand of Vortex',   icon: '🪄', currency: 'gold', price: 1600,   type: 'item', itemId: 'wand_of_vortex', shop: 'equipment' },
  { id: 'buy_snakebite_rod',name: 'Snakebite Rod',    icon: '🪄', currency: 'gold', price: 1600,   type: 'item', itemId: 'snakebite_rod', shop: 'equipment' },
  { id: 'buy_wooden_shield',name: 'Wooden Shield',    icon: '🛡️', currency: 'gold', price: 32,     type: 'item', itemId: 'wooden_shield', shop: 'equipment' },
  { id: 'buy_leather_armor',name: 'Leather Armor',    icon: '🥋', currency: 'gold', price: 24,     type: 'item', itemId: 'leather_armor', shop: 'equipment' },
  { id: 'buy_leather_legs', name: 'Leather Legs',     icon: '🦵', currency: 'gold', price: 24,     type: 'item', itemId: 'leather_legs', shop: 'equipment' },
  { id: 'buy_robe',         name: 'Robe',             icon: '👘', currency: 'gold', price: 60,     type: 'item', itemId: 'robe', shop: 'equipment' },
  { id: 'buy_halberd',      name: 'Halberd',          icon: '🗡️', currency: 'gold', price: 1600,   type: 'item', itemId: 'halberd', shop: 'equipment' },
  { id: 'buy_chain_armor',  name: 'Chain Armor',      icon: '⛓️', currency: 'gold', price: 1200,   type: 'item', itemId: 'chain_armor', shop: 'equipment' },
  { id: 'buy_knight_armor', name: 'Knight Armor',     icon: '🛡️', currency: 'gold', price: 20000,  type: 'item', itemId: 'knight_armor', shop: 'equipment' },
  { id: 'buy_giant_sword',  name: 'Giant Sword',      icon: '⚔️', currency: 'gold', price: 68000,  type: 'item', itemId: 'giant_sword', shop: 'equipment' },
  { id: 'buy_royal_helmet', name: 'Royal Helmet',     icon: '👑', currency: 'gold', price: 32000,  type: 'item', itemId: 'royal_helmet', shop: 'equipment' },
  { id: 'buy_demon_shield', name: 'Demon Shield',     icon: '😈', currency: 'gold', price: 60000,  type: 'item', itemId: 'demon_shield', shop: 'equipment' },
  { id: 'buy_mpa',          name: 'Magic Plate Armor',icon: '✨', currency: 'gold', price: 180000, type: 'item', itemId: 'magic_plate_armor', shop: 'equipment' },
  { id: 'buy_plate_legs',   name: 'Plate Legs',       icon: '🦵', currency: 'gold', price: 460,    type: 'item', itemId: 'plate_legs', shop: 'equipment' },
  { id: 'buy_boh',          name: 'Boots of Haste',   icon: '👢', currency: 'gold', price: 120000, type: 'item', itemId: 'boots_of_haste', shop: 'equipment' },

  // Loja de Artigos Mágicos (gold) — poções e runas, preço = 4x o valor de venda
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
];

// As três "lojas/NPCs" e como cada uma agrupa seus itens na tela.
export const SHOPS = [
  { key: 'rubini', title: '💎 Rubini Store', subtitle: 'Boosts e supply — como o Ctrl+S do RubinOT. Outfits agora ficam na tela de Aparência (botão 👕 no card do personagem).', sub: [
      { title: '⚡ Boosts & Suprimentos', filter: s => s.type === 'boost' || s.type === 'refill' },
    ]},
  { key: 'equipment', title: '⚔️ Loja de Equipamentos', subtitle: 'Armas e armaduras clássicas de Tibia, pagas em gold.', sub: [
      { title: '', filter: () => true },
    ]},
  { key: 'magic', title: '🧪 Loja de Artigos Mágicos', subtitle: 'Poções e runas, pagas em gold.', sub: [
      { title: '🧪 Poções', filter: (s, items) => items[s.itemId]?.type === 'potion' },
      { title: '📜 Runas', filter: (s, items) => items[s.itemId]?.type === 'rune' },
    ]},
];

// ---- RTC (Rubinot Custom Client) ----
// Configurações do client custom. Cada uma tem prós e contras reais —
// dá pra melhorar OU piorar o desempenho do personagem conforme o ajuste.
export const RTC_SETTINGS = [
  { id: 'autoLoot', name: 'Auto Loot', icon: '🎒', type: 'toggle', default: true,
    desc: 'Coleta automática de loot. LIGADO: +12% de chance de loot, mas taxa de 5% sobre o gold coletado. DESLIGADO: sem taxa, loot manual normal.' },
  { id: 'smartHeal', name: 'Smart Healing', icon: '💊', type: 'toggle', default: true,
    desc: 'Cura automática abaixo de 40% de HP gastando 30 de mana. Evita mortes, mas consome mana que seria usada em dano (mages sentem mais).' },
  { id: 'graphics', name: 'Modo Gráfico', icon: '🖥️', type: 'select', default: 'equilibrado',
    options: ['performance', 'equilibrado', 'qualidade'],
    desc: 'PERFORMANCE: +10% velocidade de ataque, -10% XP (efeitos desligados). QUALIDADE: -10% velocidade, +10% XP. EQUILIBRADO: neutro.' },
  { id: 'latency', name: 'Latência (Ping)', icon: '📡', type: 'select', default: 'baixa',
    options: ['baixa', 'media', 'alta'],
    desc: 'Simula sua conexão. BAIXA: +5% de dano. MÉDIA: neutro. ALTA: -15% de dano (ataques atrasam).' },
  { id: 'analyzer', name: 'Hunt Analyzer', icon: '📊', type: 'toggle', default: false,
    desc: 'Overlay de análise de caçada. LIGADO: +8% XP (você otimiza a rota), mas -8% gold (foco em XP, não em loot).' },
];

export function createDefaultRtc() {
  const rtc = {};
  RTC_SETTINGS.forEach(s => { rtc[s.id] = s.default; });
  return rtc;
}

export function computeRtcMods(rtc) {
  const r = rtc || createDefaultRtc();
  return {
    lootBonus: r.autoLoot ? 0.12 : 0,
    goldTax: r.autoLoot ? 0.05 : 0,
    smartHeal: !!r.smartHeal,
    spdMult: r.graphics === 'performance' ? 1.10 : r.graphics === 'qualidade' ? 0.90 : 1,
    xpMult: (r.graphics === 'performance' ? 0.90 : r.graphics === 'qualidade' ? 1.10 : 1) * (r.analyzer ? 1.08 : 1),
    dmgMult: r.latency === 'baixa' ? 1.05 : r.latency === 'alta' ? 0.85 : 1,
    goldMult: r.analyzer ? 0.92 : 1,
  };
}

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
