// Formato do estado do personagem e sua fábrica de estado inicial. O estado
// em si (a instância mutável `G`) vive na composition root (main.js) e é
// passado para a camada application — o domínio só descreve o SHAPE e como
// criar um estado novo, nunca guarda a instância viva.

import { createDefaultSkills } from './character.js?v=40';
import { createDefaultRtc } from './rtcConfig.js?v=40';
import { DEFAULT_OUTFIT_COLORS } from './outfitColors.js?v=40';

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
    // Ordem de exibição dos itens do inventário (drag-and-drop na Mochila) —
    // itemIds na ordem escolhida pelo jogador. Itens novos entram no fim; ver
    // application/inventoryCore.js e ui/inventoryAndEquipmentPanel.js.
    inventoryOrder: [],
    // A Mochila é um item de verdade (o "bag" inicial do Tibia) guardado neste
    // slot próprio — não entra no cálculo de atributos; é só o container do
    // inventário (botão direito abre/fecha).
    backpack: 'bag',
    equipment: { weapon: null, armor: null, shield: null, helmet: null, ring: null, legs: null, boots: null },
    // Relíquias: itens dropados por boss com um modificador de raridade (ver
    // domain/rarity.js) — instâncias únicas, nunca empilhadas, separadas do
    // inventário normal empilhável (G.inventory). Um slot de G.equipment pode
    // guardar o id de uma relíquia (formato "relic_<n>") em vez de um itemId
    // comum — ver domain/items.js: isRelicId/resolveEquippedItem.
    relics: [],
    relicSeq: 0,
    activeZone: null,
    // ids de zona cujo boss (ZONES[id].boss) já morreu ≥1x — gate de progressão
    // (ver domain/bestiary.js: isZoneUnlocked / requiresBossOf). Migração pra
    // saves antigos em application/persistenceUseCases.js: quem já tinha nível
    // pra uma zona sob a regra antiga (só level+mundo) não pode ficar trancado
    // retroativamente.
    defeatedZoneBosses: [],
    // tier atual do Boss Rush por zona (ver domain/bestiary.js: bossTierMultiplier/
    // bossAuraClass) — começa em 1 assim que a zona é desbloqueada; vencer o tier
    // atual sobe pro próximo, mais forte e com aura diferente (nunca regride).
    bossTiers: {},
    hunting: false,
    taskKills: {},
    activeTask: null,
    taskCompletion: {},
    arenaPoints: 0,
    arenaWins: 0,
    arenaLosses: 0,
    arenaBattlesToday: 0,
    arenaLastDate: null,
    arenaStreak: 0,
    arenaDivisionsClaimed: [],
    currentWorld: 'auroria',
    bpXp: 0,
    bpTier: 0,
    bpClaimed: [],
    bpMissionDate: null,
    bpMissionProgress: { kills: 0, gold: 0, tasks: 0, arenaWins: 0 },
    bpMissionClaimed: [],
    totalKills: 0,
    totalGoldEarned: 0,
    killCounters: {},
    // Presas (Prey): 3 slots, cada um null ou { monster, bonusType, stars,
    // bonusPct, expires } — ver domain/prey.js e application/preyUseCases.js.
    prey: [null, null, null],
    // Bestiário/Charms: pontos acumulados, charms desbloqueados e equipados,
    // e o "carimbo" de quantos pontos já foram creditados por criatura (pra
    // não pagar a mesma etapa de bestiário duas vezes) — ver domain/charms.js.
    charmPoints: 0,
    charmsUnlocked: [],
    charmsEquipped: [],
    bestiaryCredited: {},
    // Recompensa diária (login streak) — ver domain/dailyReward.js.
    dailyLastClaim: null,
    dailyStreak: 0,
    // Treino offline de skill — id da skill em treino (null = caçando) e
    // instante em que o treino começou — ver domain/training.js.
    trainingSkill: null,
    trainingSince: null,
  };
}
