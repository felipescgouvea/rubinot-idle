// Imbuements (Tibia): aprimoramento TEMPORÁRIO de equipamento, pago em gold +
// materiais, que expira com o tempo. Aplicado a um slot equipado; o efeito é
// resolvido no combate SERVER-side (ver server/src/huntEngine.js).
//
// Fiel ao Tibia, por TIPO de item (não só arma — pedido do Felipe: escolher QUAL
// item imbuir):
//  • Arma: dano/roubo (Vampirism=life leech, Void=mana leech, Scorch=dano fogo).
//  • Elmo/Armadura: PROTEÇÃO elemental (reduz o dano daquele elemento recebido —
//    entra em computePlayerAbsorb, o mesmo sistema de resistência do equipamento).
//
// `desc` é uma CHAVE de i18n (t(def.desc)) — antes era texto PT fixo, que vazava
// em inglês. `slot` é o eq_slot alvo. `effect.pct`: para arma é FRAÇÃO do dano
// (0.05); para proteção é PONTOS de resistência (%) somados ao absorb.
export const IMBUEMENTS = {
  // ---- ARMA ----
  life_leech: { name: 'Vampirism', icon: '🩸', slot: 'weapon', durationH: 12,
    effect: { type: 'lifeleech', pct: 0.05 }, desc: 'imbue.desc.vampirism',
    cost: { gold: 5000, materials: [['vampire_dust', 25], ['blood_preservation', 5]] } },
  mana_leech: { name: 'Void', icon: '💧', slot: 'weapon', durationH: 12,
    effect: { type: 'manaleech', pct: 0.03 }, desc: 'imbue.desc.void',
    cost: { gold: 5000, materials: [['demon_dust', 25], ['rope_belt', 5]] } },
  scorch: { name: 'Scorch', icon: '🔥', slot: 'weapon', durationH: 12,
    effect: { type: 'elemental', element: 'fire', pct: 0.10 }, desc: 'imbue.desc.scorch',
    cost: { gold: 5000, materials: [['fire_mushroom', 20], ['demon_horn', 5]] } },

  // ---- ELMO (proteção) ----
  cloud_fabric: { name: 'Cloud Fabric', icon: '⚡', slot: 'helmet', durationH: 12,
    effect: { type: 'protection', element: 'energy', pct: 15 }, desc: 'imbue.desc.cloudFabric',
    cost: { gold: 5000, materials: [['peacock_feather_fan', 20], ['spider_silk', 10]] } },
  lich_shroud: { name: 'Lich Shroud', icon: '💀', slot: 'helmet', durationH: 12,
    effect: { type: 'protection', element: 'death', pct: 15 }, desc: 'imbue.desc.lichShroud',
    cost: { gold: 5000, materials: [['demon_dust', 20], ['rope_belt', 10]] } },

  // ---- ARMADURA (proteção) ----
  dragon_hide: { name: 'Dragon Hide', icon: '🔥', slot: 'armor', durationH: 12,
    effect: { type: 'protection', element: 'fire', pct: 15 }, desc: 'imbue.desc.dragonHide',
    cost: { gold: 5000, materials: [['green_dragon_leather', 20], ['draken_sulphur', 10]] } },
  quara_scale: { name: 'Quara Scale', icon: '❄️', slot: 'armor', durationH: 12,
    effect: { type: 'protection', element: 'ice', pct: 15 }, desc: 'imbue.desc.quaraScale',
    cost: { gold: 5000, materials: [['winter_wolf_fur', 20], ['spider_silk', 10]] } },
  snake_skin: { name: 'Snake Skin', icon: '🌿', slot: 'armor', durationH: 12,
    effect: { type: 'protection', element: 'earth', pct: 15 }, desc: 'imbue.desc.snakeSkin',
    cost: { gold: 5000, materials: [['spider_silk', 25], ['peacock_feather_fan', 5]] } },
};

export const IMBUEMENT_IDS = Object.keys(IMBUEMENTS);

// Slots que aceitam imbuement (têm ao menos 1 imbuement), na ordem de exibição.
export const IMBUEABLE_SLOTS = [...new Set(Object.values(IMBUEMENTS).map(i => i.slot))];

// Imbuements disponíveis pra um slot (eq_slot) — a página lista só o que cabe no
// item selecionado.
export function imbuementsForSlot(slot) {
  return Object.entries(IMBUEMENTS).filter(([, def]) => def.slot === slot);
}

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
