// Vocações, skills e a curva de experiência: regras de personagem puras,
// sem qualquer acesso a DOM, storage ou rede.

export const VOCATIONS = {
  knight: {
    name: 'Knight', icon: '🛡️',
    baseHp: 200, baseMana: 60, baseAtk: 18, baseDef: 12, baseMgc: 0, baseSpd: 1.2,
    hpPerLevel: 15, manaPerLevel: 5, atkPerLevel: 3, defPerLevel: 2,
    hpRegen: 3, manaRegen: 3,
    style: 'melee',
    color: '#e74c3c',
  },
  paladin: {
    name: 'Paladin', icon: '🏹',
    baseHp: 150, baseMana: 120, baseAtk: 15, baseDef: 8, baseMgc: 8, baseSpd: 1.4,
    hpPerLevel: 10, manaPerLevel: 15, atkPerLevel: 2, defPerLevel: 1,
    hpRegen: 2, manaRegen: 4,
    style: 'range',
    color: '#3a7bd5',
  },
  sorcerer: {
    name: 'Sorcerer', icon: '🔮',
    baseHp: 80, baseMana: 250, baseAtk: 8, baseDef: 3, baseMgc: 22, baseSpd: 1.1,
    hpPerLevel: 5, manaPerLevel: 30, atkPerLevel: 1, defPerLevel: 0.5,
    hpRegen: 1, manaRegen: 6,
    style: 'magic',
    color: '#9b59b6',
  },
  druid: {
    name: 'Druid', icon: '🌿',
    baseHp: 100, baseMana: 200, baseAtk: 6, baseDef: 4, baseMgc: 18, baseSpd: 1.0,
    hpRegen: 1, manaRegen: 6,
    hpPerLevel: 5, manaPerLevel: 30, atkPerLevel: 1, defPerLevel: 1,
    style: 'magic',
    color: '#2ecc71',
  },
};

// Promoção de vocação (fiel ao Tibia): a partir do nível 20, pagando um custo em
// ouro, a vocação vira a versão promovida (Elite Knight / Royal Paladin / Master
// Sorcerer / Elder Druid) com REGENERAÇÃO de HP/mana dobrada — o principal
// benefício mecânico da promoção no Tibia (regenera o dobro descansando).
export const PROMOTION = {
  level: 20,
  cost: 20000,      // ouro (fiel ao custo clássico de promoção do Tibia)
  regenMult: 2,     // regeneração ociosa de HP/mana dobrada quando promovido
  names: { knight: 'Elite Knight', paladin: 'Royal Paladin', sorcerer: 'Master Sorcerer', druid: 'Elder Druid' },
};
// Nome exibido da vocação: promovido usa o título de elite, senão o nome base.
export function vocationDisplayName(vocation, promoted) {
  if (!vocation || !VOCATIONS[vocation]) return '';
  return promoted && PROMOTION.names[vocation] ? PROMOTION.names[vocation] : VOCATIONS[vocation].name;
}

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

// Skill treinada por golpe/defesa e a fonte de dano da vocação — não muda
// (fiel ao Tibia: quem escala Magic Level nunca escala melee ao mesmo tempo).
export const VOC_TRAINING = {
  knight:   { attackSkill: 'sword' },
  paladin:  { attackSkill: 'distance' },
  sorcerer: { attackSkill: 'magic' },
  druid:    { attackSkill: 'magic' },
};

// Multiplicadores REAIS de skill do Tibia global, por vocação — fonte:
// forgottenserver (TFS), data/XML/vocations.xml, tag <skill id multiplier>.
// É isso (não um único "multiplicador de treino" genérico) que faz o Knight
// treinar Sword/Axe/Club rápido (1.1) mas Distance devagar (1.4), o Paladin o
// oposto (1.2 melee, 1.1 distance), e mago treinar QUALQUER combate devagar
// (1.5–2.0) — cada skill tem seu próprio número, por vocação, igual ao Tibia.
const SKILL_MULTIPLIERS = {
  knight:   { fist: 1.1, club: 1.1, sword: 1.1, axe: 1.1, distance: 1.4, shielding: 1.1 },
  paladin:  { fist: 1.2, club: 1.2, sword: 1.2, axe: 1.2, distance: 1.1, shielding: 1.1 },
  sorcerer: { fist: 1.5, club: 2.0, sword: 2.0, axe: 2.0, distance: 2.0, shielding: 1.5 },
  druid:    { fist: 1.5, club: 1.8, sword: 1.8, axe: 1.8, distance: 1.8, shielding: 1.5 },
};
// manaMultiplier do Tibia (mesma fonte acima) — rege a velocidade de Magic
// Level: mago sobe rápido (1.1), knight quase não sobe (3.0), paladin no meio (1.4).
export const MANA_MULTIPLIER = { knight: 3.0, paladin: 1.4, sorcerer: 1.1, druid: 1.1 };

// skillBase do Tibia (TFS: Vocation::skillBase) — o "custo inicial" de cada
// skill antes do multiplicador de vocação entrar na conta. Shielding é o mais
// caro (100); Distance o mais barato (30); os 4 melee ficam no meio (50).
const SKILL_BASE = { fist: 50, club: 50, sword: 50, axe: 50, distance: 30, shielding: 100 };

// Nível mínimo de toda skill corpo-a-corpo/shielding no Tibia (todo personagem
// começa em 10) — usado no expoente da fórmula de tentativas abaixo.
const MINIMUM_SKILL_LEVEL = 10;

export function createDefaultSkills() {
  const sk = {};
  Object.entries(TIBIA_SKILLS).forEach(([id, s]) => { sk[id] = { lv: s.base, tries: 0 }; });
  return sk;
}

// Tentativas necessárias pra passar do nível `lv` pro `lv+1` — fórmula REAL do
// Tibia global (TFS: Vocation::getReqSkillTries / getReqMana):
//   melee/shielding: skillBase[skill] · multiplicador[voc][skill] ^ (lv − 10)
//   magic level:      1600 · manaMultiplier[voc] ^ lv
// Sem vocação (personagem ainda não criado), cai no multiplicador mais lento
// (2.0/3.0) só pra nunca dividir por algo indefinido.
export function triesForNext(vocation, skillId, lv) {
  if (skillId === 'magic') {
    const manaMult = MANA_MULTIPLIER[vocation] || 3.0;
    return Math.floor(1600 * Math.pow(manaMult, lv));
  }
  const mult = (SKILL_MULTIPLIERS[vocation] && SKILL_MULTIPLIERS[vocation][skillId]) || 2.0;
  return Math.floor(SKILL_BASE[skillId] * Math.pow(mult, lv - MINIMUM_SKILL_LEVEL));
}

// Aplica o ganho de tentativas a uma skill e retorna se ela subiu de nível —
// função pura: não muta nada fora do objeto retornado, quem chama decide o
// que fazer com o resultado (log, notificação, etc.). Sobe MAIS de um nível
// de uma vez se o ganho for grande o bastante (fiel ao Tibia: addSkillAdvance
// usa um while, não um if — um cast caro pode virar 2+ níveis de Magic de uma vez).
export function applySkillGain(skillState, skillId, amount, vocation) {
  const sk = skillState[skillId];
  if (!sk) return { sk: skillState, leveledUp: false };
  const next = { ...sk, tries: sk.tries + amount };
  let leveledUp = false;
  let needed = triesForNext(vocation, skillId, next.lv);
  while (next.tries >= needed) {
    next.tries -= needed;
    next.lv += 1;
    leveledUp = true;
    needed = triesForNext(vocation, skillId, next.lv);
  }
  return { sk: { ...skillState, [skillId]: next }, leveledUp, newLevel: next.lv };
}

// Experiência TOTAL acumulada para alcançar um nível, pela fórmula oficial do
// Tibia global: T(x) = (50/3)x³ − 100x² + (850/3)x − 200 (o /3 sempre resulta
// inteiro). T(1)=0, T(2)=100, T(3)=200, T(8)=4200… idêntico ao Tibia real.
export function tibiaTotalExp(level) {
  return Math.round((50 * level ** 3 - 300 * level ** 2 + 850 * level - 600) / 3);
}

// XP_TABLE[i] = XP necessária para ir do nível (i+1) para (i+2), ou seja a
// diferença de experiência total entre dois níveis consecutivos do Tibia.
// Usado por gainXp() (ver application/huntUseCases.js) e pela barra de XP.
export const XP_TABLE = Array.from({ length: 100 }, (_, i) => tibiaTotalExp(i + 2) - tibiaTotalExp(i + 1));
