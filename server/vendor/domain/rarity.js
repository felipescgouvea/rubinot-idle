// Sistema de raridade das Relíquias — variação de item que só cai de bosses
// (ver application/huntUseCases.js: resolveMonsterKill) e reforça o stat
// principal de combate de um item de equipamento já existente no catálogo.
//
// Liberdade de design assumida deliberadamente: não existe um sistema de
// "raridade de item" no Tibia oficial nem no RubinOT. A analogia real mais
// próxima é o sistema de Imbuements do Tibia (que também adiciona bônus de
// atributo a um item já equipado) — ver .spec/90-regras-de-negocio-gerais.md,
// Regra 3, e .spec/20-itens-e-equipamento.md.
// `name` é chave de tradução (ver i18n/locales/*.js: rarity.<id>) — é uma
// escala de raridade original deste jogo (ver comentário acima), não um termo
// de Tibia, então muda de idioma como qualquer outro texto de UI. Quem exibe
// precisa chamar t(tier.name).
// `weight` é a % PADRÃO (independente, 0..100) de cada raridade — usada só
// quando o dono não tem override no Painel Admin (ver domain/adminConfig.js:
// DEFAULT_ADMIN_CONFIG.rarityWeights e rollIndependentRarityTiers() abaixo).
export const RARITY_TIERS = {
  uncommon:  { name: 'rarity.uncommon',  bonusPct: 0.08, weight: 52, color: '#4caf50' },
  rare:      { name: 'rarity.rare',      bonusPct: 0.15, weight: 28, color: '#4a90d9' },
  epic:      { name: 'rarity.epic',      bonusPct: 0.25, weight: 15, color: '#9b59b6' },
  legendary: { name: 'rarity.legendary', bonusPct: 0.40, weight: 5,  color: '#e0a020' },
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
const PRIMARY_STAT_ORDER = ['atk', 'wandDmg', 'def', 'magic', 'heal', 'dmg'];

export function primaryStatKeyForItem(item) {
  if (!item) return null;
  return PRIMARY_STAT_ORDER.find(key => item[key]) || null;
}

// Sorteio INDEPENDENTE de raridade: cada tier rola sua PRÓPRIA % (0..100),
// sem concorrer com os demais — não é "escolhe 1 dos 4", é "cada um pode
// bater ou não". Duas ou mais raridades podem bater no mesmo golpe (cada
// uma vira uma relíquia separada — ver application/huntUseCases.js), ou
// nenhuma pode bater (nenhuma relíquia extra além do drop base). Usa as %
// padrão de RARITY_TIERS, ou as vindas do Painel Admin
// (G.adminConfig.rarityWeights) quando passadas por quem chama.
export function rollIndependentRarityTiers(pctOverride) {
  return Object.keys(RARITY_TIERS).filter(id => {
    const pct = pctOverride && pctOverride[id] != null ? Math.max(0, pctOverride[id]) : RARITY_TIERS[id].weight;
    return Math.random() * 100 < pct;
  });
}
