// Regras de compatibilidade "tipo de item -> atributos de raridade permitidos".
// Ver .spec/20-itens-e-equipamento.md ("Atributos por tipo de item") pra regra
// de negócio e a nota de fidelidade (liberdade de design análoga aos
// Imbuements/Tier reais do Tibia, simplificada).
//
// Este módulo só VALIDA (tipo -> atributos permitidos); não gera, não rola e
// não aplica nada a um item — isso fica pra quem consumir esta regra depois
// (ex.: uma futura evolução da geração de Relíquias em application/huntUseCases.js).

const MELEE_WEAPON_TYPES = ['sword', 'axe', 'club'];

// `legendaryOnly: true` marca os 3 atributos que só podem aparecer em item de
// raridade Lendária (ver domain/rarity.js: RARITY_TIERS), com um nível de 1 a 3.
export const ATTRIBUTES = {
  attack:              { label: 'Ataque' },
  skill:               { label: 'Skill' },
  critical:            { label: 'Crítico' },
  lifeLeech:           { label: 'Roubo de Vida' },
  manaLeech:           { label: 'Roubo de Mana' },
  wandDamage:          { label: 'Dano da Wand/Rod' },
  magicLevel:          { label: 'Magic Level' },
  fatal:               { label: 'Fatal', legendaryOnly: true },
  defense:             { label: 'Defesa' },
  elementalProtection: { label: 'Proteção Elemental' },
  dodge:               { label: 'Dodge', legendaryOnly: true },
  momentum:            { label: 'Momentum', legendaryOnly: true },
};

// Níveis possíveis dos atributos exclusivos de Lendário.
export const LEGENDARY_ATTRIBUTE_TIER_LEVELS = [1, 2, 3];

// Categoria de item usada por esta regra — deriva de item.type (+
// item.weaponType quando for arma). Cada categoria mapeia pra sua lista de
// atributos permitidos em ALLOWED_BY_CATEGORY.
function itemCategory(item) {
  if (!item) return null;
  if (item.type === 'weapon' && MELEE_WEAPON_TYPES.includes(item.weaponType)) return 'meleeWeapon';
  if (item.type === 'weapon' && item.weaponType === 'magic') return 'magicWeapon'; // wand ou rod
  if (item.type === 'armor') return 'armor';
  if (item.type === 'helmet') return 'helmet';
  return null; // demais tipos (escudo, calças, botas, anel, munição, etc.) sem regra definida ainda
}

const ALLOWED_BY_CATEGORY = {
  meleeWeapon: ['attack', 'skill', 'critical', 'lifeLeech', 'manaLeech'],
  magicWeapon: ['wandDamage', 'magicLevel', 'fatal'],
  armor:       ['defense', 'elementalProtection', 'dodge'],
  helmet:      ['skill', 'magicLevel', 'momentum'],
};

// Lista de atributos permitidos pro item, ou [] se o tipo do item ainda não
// tem regra definida (ver itemCategory).
export function allowedAttributesForItem(item) {
  const cat = itemCategory(item);
  return cat ? ALLOWED_BY_CATEGORY[cat] : [];
}

// O item pode receber este atributo, independente de raridade?
export function canItemHaveAttribute(item, attributeKey) {
  return allowedAttributesForItem(item).includes(attributeKey);
}

// O item pode receber este atributo NESTA raridade? (fatal/dodge/momentum só em
// Lendário — ver ATTRIBUTES[key].legendaryOnly.)
export function canItemHaveAttributeAtRarity(item, attributeKey, rarityId) {
  if (!canItemHaveAttribute(item, attributeKey)) return false;
  return !isLegendaryOnlyAttribute(attributeKey) || rarityId === 'legendary';
}

export function isLegendaryOnlyAttribute(attributeKey) {
  return !!(ATTRIBUTES[attributeKey] && ATTRIBUTES[attributeKey].legendaryOnly);
}
