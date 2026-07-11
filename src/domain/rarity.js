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
  refined:     { name: 'Refinado',    bonusPct: 0.10, weight: 60, color: '#7cb85c' },
  exceptional: { name: 'Excepcional', bonusPct: 0.20, weight: 30, color: '#4a90d9' },
  legendary:   { name: 'Lendário',    bonusPct: 0.35, weight: 10, color: '#d4a017' },
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

// Sorteio ponderado de raridade pelos pesos de RARITY_TIERS (60/30/10 —
// refinado é o mais comum, lendário o mais raro).
export function rollRarityTier() {
  const entries = Object.entries(RARITY_TIERS);
  const totalWeight = entries.reduce((sum, [, tier]) => sum + tier.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const [id, tier] of entries) {
    if (roll < tier.weight) return id;
    roll -= tier.weight;
  }
  return entries[entries.length - 1][0]; // fallback de arredondamento de ponto flutuante
}
