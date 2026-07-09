// Vocações, skills e a curva de experiência: regras de personagem puras,
// sem qualquer acesso a DOM, storage ou rede.

export const VOCATIONS = {
  knight: {
    name: 'Knight', icon: '🛡️',
    baseHp: 200, baseMana: 60, baseAtk: 18, baseDef: 12, baseMgc: 0, baseSpd: 1.2,
    hpPerLevel: 25, manaPerLevel: 5, atkPerLevel: 3, defPerLevel: 2,
    hpRegen: 3, manaRegen: 1,
    style: 'melee',
    color: '#e74c3c',
  },
  paladin: {
    name: 'Paladin', icon: '🏹',
    baseHp: 150, baseMana: 120, baseAtk: 15, baseDef: 8, baseMgc: 8, baseSpd: 1.4,
    hpPerLevel: 18, manaPerLevel: 12, atkPerLevel: 2, defPerLevel: 1,
    hpRegen: 2, manaRegen: 3,
    style: 'range',
    color: '#3a7bd5',
  },
  sorcerer: {
    name: 'Sorcerer', icon: '🔮',
    baseHp: 80, baseMana: 250, baseAtk: 8, baseDef: 3, baseMgc: 22, baseSpd: 1.1,
    hpPerLevel: 8, manaPerLevel: 25, atkPerLevel: 1, defPerLevel: 0.5,
    hpRegen: 1, manaRegen: 8,
    style: 'magic',
    color: '#9b59b6',
  },
  druid: {
    name: 'Druid', icon: '🌿',
    baseHp: 100, baseMana: 200, baseAtk: 6, baseDef: 4, baseMgc: 18, baseSpd: 1.0,
    hpPerLevel: 10, manaPerLevel: 22, atkPerLevel: 1, defPerLevel: 1,
    hpRegen: 2, manaRegen: 7,
    style: 'magic',
    color: '#2ecc71',
  },
};

// Skills no estilo Tibia: sobem POR USO, não por pontos.
// Cada vocação treina sua skill primária ao atacar; Shielding treina ao ser atingido;
// Magic Level sobe conforme mana gasta. Multiplicadores por vocação seguem o Tibia
// (knight treina melee rápido e magia devagar; mage o oposto).
export const TIBIA_SKILLS = {
  magic:     { name: 'Magic Level',      icon: '🔮', base: 0 },
  fist:      { name: 'Fist Fighting',    icon: '👊', base: 10 },
  club:      { name: 'Club Fighting',    icon: '🏏', base: 10 },
  sword:     { name: 'Sword Fighting',   icon: '⚔️', base: 10 },
  axe:       { name: 'Axe Fighting',     icon: '🪓', base: 10 },
  distance:  { name: 'Distance Fighting',icon: '🏹', base: 10 },
  shielding: { name: 'Shielding',        icon: '🛡️', base: 10 },
};

// [skill primária de ataque, multiplicador de treino melee/dist, mult. de treino mágico]
export const VOC_TRAINING = {
  knight:   { attackSkill: 'sword',    weaponMult: 1.0, magicMult: 0.1, shieldMult: 1.0 },
  paladin:  { attackSkill: 'distance', weaponMult: 0.9, magicMult: 0.35, shieldMult: 0.9 },
  sorcerer: { attackSkill: 'magic',    weaponMult: 0.3, magicMult: 1.0, shieldMult: 0.6 },
  druid:    { attackSkill: 'magic',    weaponMult: 0.3, magicMult: 1.0, shieldMult: 0.6 },
};

export function createDefaultSkills() {
  const sk = {};
  Object.entries(TIBIA_SKILLS).forEach(([id, s]) => { sk[id] = { lv: s.base, tries: 0 }; });
  return sk;
}

// tentativas necessárias para subir a skill (curva exponencial à la Tibia, encurtada pra idle)
export function triesForNext(skillId, lv) {
  if (skillId === 'magic') return Math.floor(60 * Math.pow(1.35, lv));       // mana gasta
  return Math.floor(35 * Math.pow(1.22, lv - 10));                            // golpes/defesas
}

// Aplica o ganho de tentativas a uma skill e retorna se ela subiu de nível —
// função pura: não muta nada fora do objeto retornado, quem chama decide o
// que fazer com o resultado (log, notificação, etc.).
export function applySkillGain(skillState, skillId, amount) {
  const sk = skillState[skillId];
  if (!sk) return { sk: skillState, leveledUp: false };
  const next = { ...sk, tries: sk.tries + amount };
  const needed = triesForNext(skillId, next.lv);
  let leveledUp = false;
  if (next.tries >= needed) {
    next.tries -= needed;
    next.lv += 1;
    leveledUp = true;
  }
  return { sk: { ...skillState, [skillId]: next }, leveledUp, newLevel: next.lv };
}

export const XP_TABLE = Array.from({ length: 100 }, (_, i) => Math.floor(100 * Math.pow(i + 1, 1.8)));
