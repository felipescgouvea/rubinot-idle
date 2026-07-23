// Imbuements (Tibia): aprimoramento TEMPORÁRIO de equipamento, pago em gold +
// materiais, que expira com o tempo. Aplicado a um slot equipado; o efeito é
// resolvido no combate SERVER-side (ver server/src/huntEngine.js). v1: 3 tipos
// impactantes na arma (life leech, mana leech, dano de fogo). Fiel ao Tibia:
// Vampirism/Void/Scorch. `pct` é fração do dano causado.
export const IMBUEMENTS = {
  life_leech: { name: 'Vampirism', icon: '🩸', slot: 'weapon', durationH: 12,
    effect: { type: 'lifeleech', pct: 0.05 }, desc: 'Cura 5% do dano causado',
    cost: { gold: 5000, materials: [['vampire_dust', 25], ['blood_preservation', 5]] } },
  mana_leech: { name: 'Void', icon: '💧', slot: 'weapon', durationH: 12,
    effect: { type: 'manaleech', pct: 0.03 }, desc: 'Recupera 3% do dano causado como mana',
    cost: { gold: 5000, materials: [['demon_dust', 25], ['rope_belt', 5]] } },
  scorch: { name: 'Scorch', icon: '🔥', slot: 'weapon', durationH: 12,
    effect: { type: 'elemental', element: 'fire', pct: 0.10 }, desc: '+10% de dano de fogo no ataque',
    cost: { gold: 5000, materials: [['fire_mushroom', 20], ['demon_horn', 5]] } },
};

export const IMBUEMENT_IDS = Object.keys(IMBUEMENTS);

// true se o imbuement gravado ({ id, expiresAt }) ainda vale (não expirou).
export function isImbuementActive(imb, now = Date.now()) {
  return !!(imb && imb.id && IMBUEMENTS[imb.id] && imb.expiresAt && new Date(imb.expiresAt).getTime() > now);
}

// Imbuement efetivo (def + expiresAt) de um slot, ou null se vazio/expirado.
export function activeImbuementFor(imbMap, eqSlot, now = Date.now()) {
  const imb = imbMap && imbMap[eqSlot];
  if (!isImbuementActive(imb, now)) return null;
  return { id: imb.id, expiresAt: imb.expiresAt, ...IMBUEMENTS[imb.id] };
}
