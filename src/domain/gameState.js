// Formato do estado do personagem e sua fábrica de estado inicial. O estado
// em si (a instância mutável `G`) vive na composition root (main.js) e é
// passado para a camada application — o domínio só descreve o SHAPE e como
// criar um estado novo, nunca guarda a instância viva.

import { createDefaultSkills } from './character.js?v=204';
import { createDefaultRtc } from './rtcConfig.js?v=207';
import { DEFAULT_OUTFIT_COLORS } from './outfitColors.js?v=173';
import { DEFAULT_ADMIN_CONFIG } from './adminConfig.js?v=176';

export function createDefaultState() {
  return {
    vocation: null,
    level: 1,
    xp: 0,
    gold: 0,
    rubini: 0,
    // Task Coin: moeda paralela ao Rubini Coin, ganha só nas Linked Tasks a
    // partir da sala Morgul's Room em diante (ver domain/progression.js:
    // TASK_ROOMS) — usada aqui só como acúmulo/contador (não há loja própria
    // pra ela ainda, é fiel ao RubinOT real onde Task Coins trocam por itens
    // específicos do baú de tasks).
    taskCoins: 0,
    promoted: false, // promoção de vocação (ver domain/character.js: PROMOTION)
    title: null,     // título escolhido pelo jogador (ver domain/achievements.js)
    imbuements: {},  // eq_slot -> { id, expiresAt } (ver domain/imbuements.js) — autoritativo no servidor
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
    equipment: { weapon: null, armor: null, shield: null, helmet: null, ammo: null, ring: null, legs: null, boots: null },
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
    // ids de mundo já notificados como desbloqueados (ver worldUseCases.js) —
    // sem persistir isso, todo refresh de página reexibia o toast "World
    // unlocked" pra qualquer mundo já disponível (ex.: Auroria, liberado
    // desde o nível 1, notificava em TODO boot do jogo).
    notifiedWorlds: [],
    // tier atual do Boss Rush por zona (ver domain/bestiary.js: bossTierMultiplier/
    // bossAuraClass) — começa em 1 assim que a zona é desbloqueada; vencer o tier
    // atual sobe pro próximo, mais forte e com aura diferente (nunca regride).
    bossTiers: {},
    hunting: false,
    // Auto-vender lixo: ao dar loot, itens de tipo 'misc' com valor <= maxValue
    // são vendidos na hora (viram gold) em vez de entrar no inventário. QoL de
    // idle — ver application/huntUseCases.js e ui/inventoryAndEquipmentPanel.js.
    autoSell: { enabled: false, maxValue: 50 },
    // Stamina (minutos; 2520 = 42h). Só tem efeito se o dono ligar no Admin
    // (adminConfig.staminaEnabled): cai enquanto caça, regenera descansando, e
    // abaixo de certos limiares reduz a XP — igual ao Tibia. Ver stats/huntUseCases.
    stamina: 2520,
    // Bênçãos ativas (0..5) — reduzem a perda de XP na morte e melhoram o
    // revive; consumidas ao morrer (ver domain/blessings.js).
    blessings: 0,
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
    bpPremium: false,        // trilha premium do Battle Pass comprada (ver progression: BP_PREMIUM_*)
    bpClaimedPremium: [],    // tiers da trilha premium já resgatados
    bpSeason: null,          // temporada atual (mês) — ao virar, reseta o BP (ver currentBpSeason)
    bpWeekId: null,          // id da semana das missões semanais
    bpWeeklyProgress: { kills: 0, gold: 0, tasks: 0, arenaWins: 0 },
    bpWeeklyClaimed: [],
    totalKills: 0,
    totalGoldEarned: 0,
    killCounters: {},
    // Presas (Prey): 3 slots, cada um null ou { monster, bonusType, stars,
    // bonusPct, expires } — ver domain/prey.js e application/preyUseCases.js.
    prey: [null, null, null],
    // Cartas de presa: cada uma vale um reroll de slot SEM pagar gold. Vêm de
    // prêmio de Arena/Battle Pass (ver application/rewardGrants.js) — é assim
    // que esses modos recompensam sem injetar dinheiro na economia.
    preyCards: 0,
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
    // Treino de skill (offline OU online) — id da skill em treino (null = não
    // treinando), instante em que o treino começou, modo ('offline'/'online',
    // só o online exige o jogo aberto pra render mas rende mais rápido) e a
    // magia escolhida pra treino online de mago — ver domain/training.js.
    trainingSkill: null,
    trainingSince: null,
    trainingMode: 'offline',
    trainingSpell: null,
    // Config de balanceamento do Painel Admin (taxas + raridade) — ver
    // domain/adminConfig.js. Ausente em saves antigos (migrado no load).
    adminConfig: { ...DEFAULT_ADMIN_CONFIG, rarityWeights: { ...DEFAULT_ADMIN_CONFIG.rarityWeights } },
  };
}
