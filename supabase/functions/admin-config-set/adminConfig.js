export const DEFAULT_ADMIN_CONFIG = {
  xpRate: 1,
  skillRate: 1,
  goldRate: 1,
  lootRate: 1,
  relicDropChance: 0.10,
  spawnDelayMin: 1.2,
  spawnDelayMax: 3,
  useZoneMultipliers: false,
  zoneMultipliers: {},
  huntSpawns: {},
  rarityWeights: { uncommon: 52, rare: 28, epic: 15, legendary: 5 },
  lootOverrides: {},
  marketEnabled: false,
  staminaEnabled: false,
  consumeAmmo: false,
};

export const RARITY_TIER_ORDER = ['uncommon', 'rare', 'epic', 'legendary'];
export const DEFAULT_PACK_MIN = 1;
export const DEFAULT_PACK_MAX = 5;

const asNum = (v, def) => (Number.isFinite(+v) && +v >= 0 ? +v : def);

export function sanitizeAdminConfig(cfg) {
  const d = DEFAULT_ADMIN_CONFIG;
  const c = { ...d, ...(cfg || {}) };
  c.xpRate = asNum(c.xpRate, d.xpRate);
  c.skillRate = asNum(c.skillRate, d.skillRate);
  c.goldRate = asNum(c.goldRate, d.goldRate);
  c.lootRate = asNum(c.lootRate, d.lootRate);
  c.relicDropChance = Math.min(1, Math.max(0, asNum(c.relicDropChance, d.relicDropChance)));
  c.spawnDelayMin = asNum(c.spawnDelayMin, d.spawnDelayMin);
  c.spawnDelayMax = asNum(c.spawnDelayMax, d.spawnDelayMax);
  if (c.spawnDelayMax < c.spawnDelayMin) c.spawnDelayMax = c.spawnDelayMin;
  c.useZoneMultipliers = !!c.useZoneMultipliers;
  c.marketEnabled = !!c.marketEnabled;
  c.staminaEnabled = !!c.staminaEnabled;
  c.consumeAmmo = !!c.consumeAmmo;
  const zm = {};
  if (c.zoneMultipliers && typeof c.zoneMultipliers === 'object') {
    for (const [zid, ov] of Object.entries(c.zoneMultipliers)) {
      if (!ov || typeof ov !== 'object') continue;
      const e = {};
      if (ov.xp != null) e.xp = asNum(ov.xp, 1);
      if (ov.gold != null) e.gold = asNum(ov.gold, 1);
      if ('xp' in e || 'gold' in e) zm[zid] = e;
    }
  }
  c.zoneMultipliers = zm;
  const hs = {};
  if (c.huntSpawns && typeof c.huntSpawns === 'object') {
    for (const [zid, e] of Object.entries(c.huntSpawns)) {
      if (!e || typeof e !== 'object') continue;
      const entry = {};
      if (e.weights && typeof e.weights === 'object') {
        const w = {};
        for (const [mid, val] of Object.entries(e.weights)) { if (Number.isFinite(+val)) w[mid] = Math.max(0, +val); }
        if (Object.keys(w).length) entry.weights = w;
      }
      if (e.packMin != null) entry.packMin = Math.max(1, Math.floor(asNum(e.packMin, DEFAULT_PACK_MIN)));
      if (e.packMax != null) entry.packMax = Math.max(1, Math.floor(asNum(e.packMax, DEFAULT_PACK_MAX)));
      if (entry.packMin != null && entry.packMax != null && entry.packMax < entry.packMin) entry.packMax = entry.packMin;
      if (Object.keys(entry).length) hs[zid] = entry;
    }
  }
  c.huntSpawns = hs;
  c.rarityWeights = { ...d.rarityWeights, ...(c.rarityWeights || {}) };
  RARITY_TIER_ORDER.forEach(k => { c.rarityWeights[k] = Math.min(100, asNum(c.rarityWeights[k], d.rarityWeights[k])); });
  const lo = {};
  if (c.lootOverrides && typeof c.lootOverrides === 'object') {
    for (const [mid, itemMap] of Object.entries(c.lootOverrides)) {
      if (!itemMap || typeof itemMap !== 'object') continue;
      const im = {};
      for (const [iid, val] of Object.entries(itemMap)) { if (Number.isFinite(+val)) im[iid] = Math.max(0, +val); }
      if (Object.keys(im).length) lo[mid] = im;
    }
  }
  c.lootOverrides = lo;
  return c;
}
