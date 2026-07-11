// Formato do estado do personagem e sua fábrica de estado inicial. O estado
// em si (a instância mutável `G`) vive na composition root (main.js) e é
// passado para a camada application — o domínio só descreve o SHAPE e como
// criar um estado novo, nunca guarda a instância viva.

import { createDefaultSkills } from './character.js?v=19';
import { createDefaultRtc } from './rtcConfig.js?v=19';
import { DEFAULT_OUTFIT_COLORS } from './outfitColors.js?v=19';

export function createDefaultState() {
  return {
    vocation: null,
    level: 1,
    xp: 0,
    gold: 0,
    rubini: 0,
    hp: 0,
    mana: 0,
    sk: createDefaultSkills(),
    rtc: createDefaultRtc(),
    boosts: {},
    outfit: null,
    outfitGender: 'male',
    outfitsOwned: [],
    outfitAddon1: false,
    outfitAddon2: false,
    outfitColors: { ...DEFAULT_OUTFIT_COLORS },
    inventory: {},
    equipment: { weapon: null, armor: null, shield: null, helmet: null, ring: null, legs: null, boots: null },
    activeZone: null,
    hunting: false,
    taskKills: {},
    activeTask: null,
    taskCompletion: {},
    arenaPoints: 0,
    arenaWins: 0,
    arenaLosses: 0,
    arenaBattlesToday: 0,
    currentWorld: 'auroria',
    bpXp: 0,
    bpTier: 0,
    bpClaimed: [],
    totalKills: 0,
    totalGoldEarned: 0,
    killCounters: {},
  };
}
