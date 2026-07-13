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
  // Spawn por hunt: peso (%) de cada monstro na zona e faixa do tamanho do grupo
  // (min..max). Vazio => uniforme (todos com peso igual) + faixa padrão. Só afeta
  // a caçada comum — o Boss Rush é sempre 1 boss. Ver resolveZoneSpawn() abaixo e
  // application/huntUseCases.js.
  huntSpawns: {}, // { [zoneId]: { weights: { [monsterId]: number }, packMin: number, packMax: number } }
  // % (0..100) de cada raridade de Relíquia — editada DIRETO no Painel Admin
  // (não é mais peso relativo arbitrário). Alimenta rollRarityTier() como peso,
  // que normaliza pela soma — então funciona mesmo que a soma não feche em 100,
  // mas o valor só corresponde exatamente à chance real quando soma = 100 (ver
  // domain/rarity.js: rollRarityTier / ui/adminPanel.js: mostra a soma ao vivo).
  rarityWeights: { uncommon: 52, rare: 28, epic: 15, legendary: 5 },
  // Override do dono por monstro+item da chance de loot normal (0..1, mesma
  // unidade de bestiary.js: MONSTERS[id].loot). Ausente = usa o valor padrão do
  // bestiário. Não há teto em 1 de propósito: alguns itens do bestiário já
  // passam de 100% (ex.: gold_coin garantido + chance extra), então um override
  // também pode. Ver resolveMonsterLoot() abaixo e application/huntUseCases.js.
  lootOverrides: {}, // { [monsterId]: { [itemId]: number (0..1+) } }
  // Mercado entre jogadores (aba 🏪). DESLIGADO por enquanto — o dono liga
  // quando quiser reabrir a economia player-to-player. Enquanto desligado, a
  // aba fica escondida e o painel mostra aviso. Ver application/adminUseCases.js.
  marketEnabled: false,
  // Stamina (fidelidade opcional ao Tibia): quando ligado, a stamina cai
  // caçando, regenera descansando e reduz a XP abaixo dos limiares. Padrão OFF
  // (não penaliza quem não quer). Ver application/staminaUseCases.js.
  staminaEnabled: false,
  // Consumo de munição do paladino (realismo opcional): quando ligado, cada
  // ataque à distância gasta 1 flecha/dardo do inventário; sem munição, o
  // paladino só soca. Padrão OFF (munição infinita, mais amigável ao idle).
  consumeAmmo: false,
};

// Campos de taxa simples (numéricos) exibidos no painel, na ordem.
export const ADMIN_RATE_FIELDS = [
  { key: 'xpRate',    label: 'Taxa de XP',     hint: 'Multiplica a experiência ganha por criatura (e offline).' },
  { key: 'skillRate', label: 'Taxa de Skills', hint: 'Multiplica a velocidade de treino de todas as skills.' },
  { key: 'goldRate',  label: 'Taxa de Gold',   hint: 'Multiplica o gold dropado pelas criaturas.' },
  { key: 'lootRate',  label: 'Taxa de Loot',   hint: 'Multiplica a chance de cair cada item no loot.' },
];

export const RARITY_TIER_ORDER = ['uncommon', 'rare', 'epic', 'legendary'];

// Faixa padrão do tamanho do grupo (quando a zona não tem override no Admin).
export const DEFAULT_PACK_MIN = 1;
export const DEFAULT_PACK_MAX = 5;

// Resolve a config EFETIVA de spawn de uma zona a partir do adminConfig: pesos
// por monstro (default = uniforme, todos com peso igual) e a faixa do grupo
// (min..max). `zoneMonsters` é a lista de ids válidos da zona — pesos de ids que
// não estão mais na zona são ignorados.
export function resolveZoneSpawn(cfg, zoneId, zoneMonsters) {
  const hs = (cfg && cfg.huntSpawns && cfg.huntSpawns[zoneId]) || {};
  const weights = {};
  zoneMonsters.forEach(id => {
    const w = hs.weights && Number.isFinite(+hs.weights[id]) ? Math.max(0, +hs.weights[id]) : 1;
    weights[id] = w;
  });
  const sum = zoneMonsters.reduce((s, id) => s + weights[id], 0);
  if (sum <= 0) zoneMonsters.forEach(id => { weights[id] = 1; }); // tudo zerado => uniforme
  let packMin = Number.isFinite(+hs.packMin) ? Math.max(1, Math.floor(+hs.packMin)) : DEFAULT_PACK_MIN;
  let packMax = Number.isFinite(+hs.packMax) ? Math.max(1, Math.floor(+hs.packMax)) : DEFAULT_PACK_MAX;
  if (packMax < packMin) packMax = packMin;
  return { weights, packMin, packMax };
}

// Percentuais de spawn (relativos à soma dos pesos) — só pra exibir no painel.
export function zoneSpawnPercents(weights, zoneMonsters) {
  const sum = zoneMonsters.reduce((s, id) => s + Math.max(0, weights[id] || 0), 0) || 1;
  const out = {};
  zoneMonsters.forEach(id => { out[id] = +(100 * Math.max(0, weights[id] || 0) / sum).toFixed(1); });
  return out;
}

// Sorteia um monstro da zona pelos pesos (soma qualquer — não precisa ser 100).
export function pickWeightedMonster(zoneMonsters, weights) {
  const sum = zoneMonsters.reduce((s, id) => s + Math.max(0, (weights && weights[id]) || 0), 0);
  if (sum <= 0) return zoneMonsters[Math.floor(Math.random() * zoneMonsters.length)];
  let r = Math.random() * sum;
  for (const id of zoneMonsters) { r -= Math.max(0, (weights && weights[id]) || 0); if (r <= 0) return id; }
  return zoneMonsters[zoneMonsters.length - 1];
}

// Loot EFETIVO de um monstro: a chance override do dono (Painel Admin), item a
// item, por cima da chance padrão do bestiário — sem override, usa a do
// bestiário direto. `baseLoot` é o array estático de MONSTERS[id].loot
// ([itemId, chance][]), nunca mutado (é compartilhado por todo mundo).
export function resolveMonsterLoot(cfg, monsterId, baseLoot) {
  const overrides = (cfg && cfg.lootOverrides && cfg.lootOverrides[monsterId]) || {};
  return baseLoot.map(([itemId, chance]) => [itemId, Number.isFinite(overrides[itemId]) ? overrides[itemId] : chance]);
}

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
  // huntSpawns: só guarda entradas com pesos/faixa válidos por zona.
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
  // % direta (0..100) — teto em 100 porque agora é editada como porcentagem,
  // não peso arbitrário (ver comentário no DEFAULT_ADMIN_CONFIG acima).
  RARITY_TIER_ORDER.forEach(k => { c.rarityWeights[k] = Math.min(100, asNum(c.rarityWeights[k], d.rarityWeights[k])); });
  // lootOverrides: só guarda entradas com chance válida (>= 0) por monstro+item
  // — mesma disciplina de "podar vazio" do huntSpawns acima.
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
