// Configuração do RTC (Rubinot Custom Client) — automação de combate, baseada
// no RTCaster real do RubinOT: UMA lista de prioridade de ataque que mistura
// magias E runas livremente (igual ao client real — lá dá pra colocar uma
// magia na caixinha 1 e uma runa na caixinha 2; o RTC usa a primeira PRONTA
// da lista, seja ela qual for) e cura automática por spell E por poção, cada
// uma com seu próprio gatilho de % de HP (ver .spec/14-spells-e-rtc.md).
// Runas de ataque por vocação — sem entrada aqui = livre pra todo mundo.
// Knight fica de fora de todas: sem investimento em magia, runa de ataque
// não rende dano nenhum (igual ao Tibia real, onde o dano da runa escala
// com Magic Level).
import { ITEMS } from './items.js?v=319';

// Exceções por runa. No Crystal Server a maioria das runas de ataque não tem restrição de
// vocação nenhuma; as que têm estão aqui (Holy Missile é marcada
// <vocation name="Paladin"> em data/spells/spells.xml).
const ATTACK_RUNE_VOCATIONS = {
  holy_missile_rune: ['paladin'],
};

// Knight nunca usa runa de ataque: o dano de runa escala com Magic Level e o
// knight não treina magia, então a runa sairia por 1 de dano — o jogador
// gastaria carga achando que ataca. Antes essa regra só valia pras 5 runas
// listadas à mão aqui, e um knight conseguia configurar as demais (Light Stone
// Shower, Magic Missile...) — inconsistência achada na auditoria de runas.
export function isRuneAvailableToVocation(itemId, vocation) {
  if (vocation === 'knight') return false;
  const vocs = ATTACK_RUNE_VOCATIONS[itemId];
  return !vocs || vocs.includes(vocation);
}

// Magic Level mínimo pra usar a runa (fiel ao Tibia — runa forte exige mais ML).
export function runeMinMl(itemId) {
  return (ITEMS[itemId] && ITEMS[itemId].reqMl) || 0;
}
// Pode usar a runa de ataque? Precisa ser da vocação E ter o Magic Level mínimo.
export function canUseAttackRune(itemId, vocation, magicLevel) {
  return isRuneAvailableToVocation(itemId, vocation) && (magicLevel || 0) >= runeMinMl(itemId);
}

// Quantidade de "caixinhas" de prioridade de ataque na UI (ver ui/rtcPanel.js:
// attackSpellSlot) — cada uma é um slot fixo (1ª a Nª prioridade), em vez de
// listar todas as magias disponíveis (ficava enorme com muitas magias).
export const ATTACK_SLOT_COUNT = 4;

// Cada caixinha da lista de prioridade guarda uma MAGIA (id puro, ex.:
// "exori") ou uma RUNA (id prefixado, ex.: "rune:fireball_rune") — o prefixo
// evita precisar de um objeto {type,id} só pra diferenciar, e mantém saves
// antigos (que só guardavam ids de magia) válidos sem migração.
const RUNE_PREFIX = 'rune:';
export function isRuneEntry(entry) {
  return typeof entry === 'string' && entry.startsWith(RUNE_PREFIX);
}
export function runeEntryId(entry) {
  return entry.slice(RUNE_PREFIX.length);
}
export function runeEntry(itemId) {
  return RUNE_PREFIX + itemId;
}

// Lista de magias/runas de ataque em ordem de PRIORIDADE (como o RTCaster
// real, que deixa configurar várias e usa a primeira PRONTA). Migra saves
// antigos: uma única `attackSpell`, ou uma runa configurada no antigo modo
// exclusivo `attackType: 'rune'` + `attackRune`. Filtra slots vazios (null)
// do modelo de caixinhas fixas — a ordem dos não-nulos é a prioridade real.
export function normalizeAttackSpells(rtc) {
  if (!rtc) return [];
  if (Array.isArray(rtc.attackSpells) && rtc.attackSpells.some(Boolean)) return rtc.attackSpells.filter(Boolean);
  if (rtc.attackSpell) return [rtc.attackSpell];
  if (rtc.attackType === 'rune' && rtc.attackRune) return [runeEntry(rtc.attackRune)];
  return [];
}

// --- NÍVEIS DE CURA -------------------------------------------------------
// Um gatilho só não dá conta: com "exura vita abaixo de 40%" o personagem
// desperdiça mana curando arranhão, e com "exura abaixo de 40%" ele morre num
// pico de dano. O RTCaster real deixa escalonar, então aqui também: uma lista
// de degraus { spell, pct }, e o motor usa o degrau MAIS GRAVE que o HP
// cruzou — HP em 25% com degraus 70/45/25 casta o de 25%, a cura mais forte.
export const HEAL_TIER_COUNT = 3;

// Migra a configuração antiga (healSpell + healSpellThreshold, um só) pra
// lista de degraus. Saves antigos continuam valendo sem migração no banco.
export function normalizeHealTiers(rtc) {
  if (!rtc) return [];
  if (Array.isArray(rtc.healTiers) && rtc.healTiers.some(t => t && t.spell)) {
    return rtc.healTiers.filter(t => t && t.spell)
      .map(t => ({ spell: t.spell, pct: Math.max(1, Math.min(99, Math.round(Number(t.pct)) || 0)) }))
      // do MAIS GRAVE pro menos grave: o motor pega o primeiro que casar
      .sort((a, b) => a.pct - b.pct);
  }
  if (rtc.healSpell) return [{ spell: rtc.healSpell, pct: rtc.healSpellThreshold || 40 }];
  return [];
}

// Escolhe o degrau a usar pro HP% atual (null quando nenhum foi cruzado).
//
// Sem NENHUM degrau configurado, cai no comportamento de sempre: a cura padrão
// da vocação (spell null → resolveHealSpell escolhe) no limiar antigo. Sem esta
// volta, quem nunca abriu o painel de RTC simplesmente pararia de se curar ao
// subir a versão — regressão silenciosa e fatal.
export function pickHealTier(rtc, hpPct) {
  const degraus = normalizeHealTiers(rtc);
  if (!degraus.length) {
    const pct = (rtc && rtc.healSpellThreshold) || 40;
    return hpPct < pct ? { spell: null, pct } : null;
  }
  return degraus.find(t => hpPct < t.pct) || null;
}

// --- PRIORIDADE DE ALVO ---------------------------------------------------
// Em quem bater primeiro quando a sala tem mais de uma criatura. `first` é o
// comportamento antigo (o da frente da fila).
export const TARGET_PRIORITIES = {
  first:     { name: 'rtc.targetFirst' },      // o da frente, como sempre foi
  lowestHp:  { name: 'rtc.targetLowestHp' },   // finaliza quem está quase morto
  highestHp: { name: 'rtc.targetHighestHp' },  // derruba o mais durão primeiro
  weakest:   { name: 'rtc.targetWeakest' },    // limpa os fracos (menos XP) antes
  strongest: { name: 'rtc.targetStrongest' },  // encara o mais perigoso primeiro
};

// Aplica a prioridade sobre a sala VIVA. Puro: recebe e devolve criatura.
export function pickTarget(pack, prioridade) {
  const vivos = pack.filter(m => m.hp > 0);
  if (!vivos.length) return null;
  switch (prioridade) {
    case 'lowestHp':  return vivos.reduce((a, b) => (b.hp < a.hp ? b : a));
    case 'highestHp': return vivos.reduce((a, b) => (b.hp > a.hp ? b : a));
    case 'weakest':   return vivos.reduce((a, b) => ((b.xp || 0) < (a.xp || 0) ? b : a));
    case 'strongest': return vivos.reduce((a, b) => ((b.xp || 0) > (a.xp || 0) ? b : a));
    default:          return vivos[0];
  }
}

// --- ÁREA vs ALVO ÚNICO ---------------------------------------------------
// Gastar Avalanche num bicho só é jogar mana e carga fora; e bater single
// target numa sala cheia é perder dano. `areaMinTargets` é a partir de quantas
// criaturas VIVAS o RTC prefere a magia/runa de área. 0 desliga a regra (usa
// sempre a ordem de prioridade crua, como era antes).
export const AREA_MIN_TARGETS_DEFAULT = 2;

// Reordena os candidatos PRONTOS conforme o tamanho da sala, sem descartar
// nenhum: se não houver candidato do tipo preferido, o outro tipo continua
// valendo — melhor atacar de forma subótima do que não atacar.
export function orderByPackSize(candidatos, vivos, areaMinTargets, ehArea) {
  const min = Number(areaMinTargets);
  if (!min || min <= 0) return candidatos;
  const preferirArea = vivos >= min;
  const preferidos = candidatos.filter(c => ehArea(c) === preferirArea);
  const resto = candidatos.filter(c => ehArea(c) !== preferirArea);
  return preferidos.concat(resto);
}

export function createDefaultRtc() {
  return {
    attackSpells: [],        // ids das magias/runas de ataque, em ordem de prioridade
    smartElement: false,     // casta a magia/runa forte contra a fraqueza da criatura
    // Degraus de cura (ver normalizeHealTiers). healSpell/healSpellThreshold
    // continuam existindo só pra saves antigos serem lidos sem migração.
    healTiers: [],
    healSpell: null,         // legado: null = usa exura (cura básica) como padrão
    healSpellThreshold: 40,  // legado: % de HP pra castar a spell de cura
    targetPriority: 'first',     // em quem bater primeiro (ver TARGET_PRIORITIES)
    areaMinTargets: AREA_MIN_TARGETS_DEFAULT, // a partir de quantos bichos prefere área
    healPotion: null,
    healPotionThreshold: 25, // % de HP pra beber a poção (mais tardia, de emergência)
    manaPotion: null,
    manaPotionThreshold: 30, // % de mana pra beber a poção de mana (repor pra castar)
  };
}
