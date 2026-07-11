// Configurações de balanceamento ajustáveis pelo dono no Painel Admin (taxas
// de XP/skills/gold/loot, chance de relíquia e pesos de raridade). Regras
// puras: defaults, metadados pra UI e helpers de sanitização/cálculo. O valor
// vivo mora em G.adminConfig; a aplicação lê via application/adminUseCases.js.

export const DEFAULT_ADMIN_CONFIG = {
  xpRate: 1,          // multiplica a XP ganha
  skillRate: 1,       // multiplica o treino de skills
  goldRate: 1,        // multiplica o gold dropado
  lootRate: 1,        // multiplica a chance de loot
  relicDropChance: 0.10, // chance de cair uma relíquia por boss (0..1)
  // Tempo (em SEGUNDOS) que o personagem fica "procurando" até o próximo grupo
  // de criaturas aparecer — sorteado aleatoriamente entre min e max a cada
  // spawn (ver application/huntUseCases.js: searchDelay).
  spawnDelayMin: 1.2,
  spawnDelayMax: 3,
  // Multiplicadores de XP/Gold por zona de caça. Por padrão DESLIGADO: a XP e o
  // gold ficam iguais ao valor-base de cada criatura (fiel ao Tibia global). Ao
  // ligar, as zonas usam sua progressão embutida (ZONES[id].xpMult/goldMult) —
  // ou, se houver override aqui, o valor definido pelo dono. Ver
  // zoneMultiplier() abaixo e application/huntUseCases.js: resolveMonsterKill.
  useZoneMultipliers: false,
  zoneMultipliers: {}, // { [zoneId]: { xp?: number, gold?: number } } — overrides opcionais
  rarityWeights: { uncommon: 52, rare: 28, epic: 15, legendary: 5 },
};

// Campos de taxa simples (numéricos) exibidos no painel, na ordem.
export const ADMIN_RATE_FIELDS = [
  { key: 'xpRate',    label: 'Taxa de XP',     hint: 'Multiplica a experiência ganha por criatura (e offline).' },
  { key: 'skillRate', label: 'Taxa de Skills', hint: 'Multiplica a velocidade de treino de todas as skills.' },
  { key: 'goldRate',  label: 'Taxa de Gold',   hint: 'Multiplica o gold dropado pelas criaturas.' },
  { key: 'lootRate',  label: 'Taxa de Loot',   hint: 'Multiplica a chance de cair cada item no loot.' },
];

export const RARITY_TIER_ORDER = ['uncommon', 'rare', 'epic', 'legendary'];

// Converte os pesos de raridade em porcentagens (relativas à soma).
export function rarityChancePercents(weights) {
  const total = RARITY_TIER_ORDER.reduce((s, k) => s + Math.max(0, weights[k] || 0), 0) || 1;
  const out = {};
  RARITY_TIER_ORDER.forEach(k => { out[k] = +(100 * Math.max(0, weights[k] || 0) / total).toFixed(1); });
  return out;
}

const asNum = (v, def) => (Number.isFinite(+v) && +v >= 0 ? +v : def);

// Multiplicador efetivo de XP ou Gold de uma zona (kind = 'xp' | 'gold').
// Desligado (padrão) => 1 (fiel ao Tibia). Ligado => override do dono, se
// houver; senão o valor de progressão embutido na zona (builtIn).
export function zoneMultiplier(cfg, zoneId, kind, builtIn) {
  if (!cfg || !cfg.useZoneMultipliers) return 1;
  const ov = cfg.zoneMultipliers && cfg.zoneMultipliers[zoneId];
  if (ov && Number.isFinite(+ov[kind])) return +ov[kind];
  return builtIn;
}

// Garante que G.adminConfig tem todos os campos válidos (>= 0, chance 0..1),
// mesclando com os defaults — chamado em toda leitura/escrita.
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
  if (c.spawnDelayMax < c.spawnDelayMin) c.spawnDelayMax = c.spawnDelayMin; // max nunca menor que min
  c.useZoneMultipliers = !!c.useZoneMultipliers;
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
  c.rarityWeights = { ...d.rarityWeights, ...(c.rarityWeights || {}) };
  RARITY_TIER_ORDER.forEach(k => { c.rarityWeights[k] = asNum(c.rarityWeights[k], d.rarityWeights[k]); });
  return c;
}
