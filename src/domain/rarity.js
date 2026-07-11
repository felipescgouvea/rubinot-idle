// Sistema de raridade das Relíquias — variação de item que só cai de bosses
// (ver application/huntUseCases.js: resolveMonsterKill) e reforça o stat
// principal de combate de um item de equipamento já existente no catálogo.
//
// Liberdade de design assumida deliberadamente: não existe um sistema de
// "raridade de item" no Tibia oficial nem no RubinOT. A analogia real mais
// próxima é o sistema de Imbuements do Tibia (que também adiciona bônus de
// atributo a um item já equipado) — ver .spec/90-regras-de-negocio-gerais.md,
// Regra 3, e .spec/20-itens-e-equipamento.md.
export const RARITY_TIERS = {
  uncommon:  { name: 'Incomum',  bonusPct: 0.08, weight: 52, color: '#4caf50' },
  rare:      { name: 'Raro',     bonusPct: 0.15, weight: 28, color: '#4a90d9' },
  epic:      { name: 'Épico',    bonusPct: 0.25, weight: 15, color: '#9b59b6' },
  legendary: { name: 'Lendário', bonusPct: 0.40, weight: 5,  color: '#e0a020' },
};

// Renomeação/expansão da escala de raridade: saves antigos guardam ids antigos
// em G.relics[].rarity (refined/exceptional). Este mapa migra pros novos ids
// (ver application/persistenceUseCases.js) pra a UI não quebrar ao procurar
// RARITY_TIERS[rarity] de uma relíquia antiga.
export const LEGACY_RARITY_MAP = {
  refined: 'uncommon',
  exceptional: 'rare',
  legendary: 'legendary',
};

// Ordem de prioridade usada para decidir qual stat de um item é o "principal"
// a receber o bônus de raridade, quando o item tem mais de um stat não-nulo
// (ex.: um elmo com def E atk, um anel com def E magic). Segue a mesma lista
// de stats já usada pela UI de detalhe de item (ver
// ui/inventoryAndEquipmentPanel.js: openItemModal) — ofensivo antes de
// defensivo, porque é o que mais define "para que serve" o item.
const PRIMARY_STAT_ORDER = ['atk', 'def', 'magic', 'heal', 'dmg'];

export function primaryStatKeyForItem(item) {
  if (!item) return null;
  return PRIMARY_STAT_ORDER.find(key => item[key]) || null;
}

// Sorteio ponderado de raridade. Usa os pesos padrão de RARITY_TIERS, ou os
// pesos vindos do Painel Admin (G.adminConfig.rarityWeights) quando passados
// por quem chama (ver application/huntUseCases.js).
export function rollRarityTier(weightsOverride) {
  const entries = Object.keys(RARITY_TIERS).map(id => [id, weightsOverride && weightsOverride[id] != null ? Math.max(0, weightsOverride[id]) : RARITY_TIERS[id].weight]);
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0) || 1;
  let roll = Math.random() * totalWeight;
  for (const [id, w] of entries) {
    if (roll < w) return id;
    roll -= w;
  }
  return entries[entries.length - 1][0]; // fallback de arredondamento de ponto flutuante
}
