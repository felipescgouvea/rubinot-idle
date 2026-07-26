// Imbuements (Tibia): aprimoramento TEMPORÁRIO de equipamento, pago em gold +
// materiais, que expira com o tempo. Aplicado a um slot equipado; o efeito é
// resolvido no combate SERVER-side (ver server/src/huntEngine.js).
//
// TIERS (Basic / Intricate / Powerful) — fiéis ao imbuements.xml do Crystal
// Server. Cada imbuement tem 3 níveis de poder; o jogador escolhe o tier ao
// aplicar (mais poder = mais gold). Valores canônicos (percentuais reais do XML):
//   Vampirism (lifeleech) 5/10/25% · Void (manaleech) 3/5/8% · Scorch (fogo) 10/25/50%
//   Proteções (Cloud Fabric/Dragon Hide/Quara Scale/Snake Skin) 3/8/15% · Lich Shroud (morte) 2/5/10%
//
// RETROCOMPAT: imbuement salvo antes dos tiers não tem campo `tier` — cai no
// `defaultTier` do imbuement, escolhido pra REPRODUZIR o valor que valia antes
// (arma=basic, proteção=powerful), então nenhum imbuement existente muda de força.
// (Exceção: Lich Shroud valia 15% fora da tabela canônica; agora fica em powerful
// = 10%, o teto canônico real — pequena correção pra fidelidade.)
//
// `desc` é CHAVE de i18n. `slot` é o eq_slot alvo. `effect.pct` (resolvido por
// tier) é FRAÇÃO do dano pra arma (0.05) e PONTOS de resistência (%) pra proteção.
export const IMBUE_TIERS = ['basic', 'intricate', 'powerful'];
export const IMBUE_TIER_LABEL = { basic: 'imbue.tier.basic', intricate: 'imbue.tier.intricate', powerful: 'imbue.tier.powerful' };

// Materiais-base (já existentes no jogo) por imbuement; o gold escala por tier
// (basic 5k / intricate 25k / powerful 100k, na proporção do XML 7.5k/60k/250k).
const T = (basic, intricate, powerful, materials) => ({
  basic:     { pct: basic,     cost: { gold: 5000,   materials } },
  intricate: { pct: intricate, cost: { gold: 25000,  materials } },
  powerful:  { pct: powerful,  cost: { gold: 100000, materials } },
});

export const IMBUEMENTS = {
  // ---- ARMA ----
  life_leech: { name: 'Vampirism', icon: '🩸', slot: 'weapon', durationH: 12, desc: 'imbue.desc.vampirism',
    effect: { type: 'lifeleech' }, defaultTier: 'basic',
    tiers: T(0.05, 0.10, 0.25, [['vampire_dust', 25], ['blood_preservation', 5]]) },
  mana_leech: { name: 'Void', icon: '💧', slot: 'weapon', durationH: 12, desc: 'imbue.desc.void',
    effect: { type: 'manaleech' }, defaultTier: 'basic',
    tiers: T(0.03, 0.05, 0.08, [['demon_dust', 25], ['rope_belt', 5]]) },
  scorch: { name: 'Scorch', icon: '🔥', slot: 'weapon', durationH: 12, desc: 'imbue.desc.scorch',
    effect: { type: 'elemental', element: 'fire' }, defaultTier: 'basic',
    tiers: T(0.10, 0.25, 0.50, [['fire_mushroom', 20], ['demon_horn', 5]]) },

  // ---- ELMO (proteção) ----
  cloud_fabric: { name: 'Cloud Fabric', icon: '⚡', slot: 'helmet', durationH: 12, desc: 'imbue.desc.cloudFabric',
    effect: { type: 'protection', element: 'energy' }, defaultTier: 'powerful',
    tiers: T(3, 8, 15, [['peacock_feather_fan', 20], ['spider_silk', 10]]) },
  lich_shroud: { name: 'Lich Shroud', icon: '💀', slot: 'helmet', durationH: 12, desc: 'imbue.desc.lichShroud',
    effect: { type: 'protection', element: 'death' }, defaultTier: 'powerful',
    tiers: T(2, 5, 10, [['demon_dust', 20], ['rope_belt', 10]]) },

  // ---- ARMADURA (proteção) ----
  dragon_hide: { name: 'Dragon Hide', icon: '🔥', slot: 'armor', durationH: 12, desc: 'imbue.desc.dragonHide',
    effect: { type: 'protection', element: 'fire' }, defaultTier: 'powerful',
    tiers: T(3, 8, 15, [['green_dragon_leather', 20], ['draken_sulphur', 10]]) },
  quara_scale: { name: 'Quara Scale', icon: '❄️', slot: 'armor', durationH: 12, desc: 'imbue.desc.quaraScale',
    effect: { type: 'protection', element: 'ice' }, defaultTier: 'powerful',
    tiers: T(3, 8, 15, [['winter_wolf_fur', 20], ['spider_silk', 10]]) },
  snake_skin: { name: 'Snake Skin', icon: '🌿', slot: 'armor', durationH: 12, desc: 'imbue.desc.snakeSkin',
    effect: { type: 'protection', element: 'earth' }, defaultTier: 'powerful',
    tiers: T(3, 8, 15, [['spider_silk', 25], ['peacock_feather_fan', 5]]) },
};

export const IMBUEMENT_IDS = Object.keys(IMBUEMENTS);
export const IMBUEABLE_SLOTS = [...new Set(Object.values(IMBUEMENTS).map(i => i.slot))];

// Tier efetivo de um imbuement gravado (retrocompat: sem `tier` → defaultTier).
export function resolveTier(def, tier) {
  const id = (tier && def.tiers[tier]) ? tier : def.defaultTier;
  return { id, ...def.tiers[id] };
}

// pct do efeito no tier dado (usado no combate/absorb).
export function imbuementPct(def, tier) {
  return resolveTier(def, tier).pct;
}

// Custo (gold + materiais) de aplicar um imbuement num tier.
export function imbuementCost(def, tier) {
  return resolveTier(def, tier).cost;
}

export function imbuementsForSlot(slot) {
  return Object.entries(IMBUEMENTS).filter(([, def]) => def.slot === slot);
}

// true se o imbuement gravado ({ id, expiresAt, tier? }) ainda vale (não expirou).
export function isImbuementActive(imb, now = Date.now()) {
  return !!(imb && imb.id && IMBUEMENTS[imb.id] && imb.expiresAt && new Date(imb.expiresAt).getTime() > now);
}

// Imbuement efetivo (def + expiresAt + tier + effect.pct JÁ RESOLVIDO pelo tier)
// de um slot, ou null se vazio/expirado. Como o `effect.pct` já vem resolvido, o
// servidor (huntEngine) e a UI leem o valor certo sem saber do sistema de tiers.
export function activeImbuementFor(imbMap, eqSlot, now = Date.now()) {
  const imb = imbMap && imbMap[eqSlot];
  if (!isImbuementActive(imb, now)) return null;
  const def = IMBUEMENTS[imb.id];
  const tier = (imb.tier && def.tiers[imb.tier]) ? imb.tier : def.defaultTier;
  return { id: imb.id, expiresAt: imb.expiresAt, tier, ...def, effect: { ...def.effect, pct: def.tiers[tier].pct } };
}
