// Formato do estado do personagem e sua fábrica de estado inicial. O estado
// em si (a instância mutável `G`) vive na composition root (main.js) e é
// passado para a camada application — o domínio só descreve o SHAPE e como
// criar um estado novo, nunca guarda a instância viva.

import { createDefaultSkills } from './character.js';
import { createDefaultRtc } from './shopCatalog.js';

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
    spells: { attack: null, heal: null },
    boosts: {},
    outfit: null,
    outfitsOwned: [],
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
