// Mundos, Linked Tasks, Arena e Battle Pass — sistemas de progressão além do
// combate direto. Regras puras; nada aqui toca DOM, storage ou rede.

export const WORLDS = [
  { id: 'auroria',  name: 'Auroria',  icon: '🌅', type: 'Open PvP',    reqLevel: 1,  bonus: '+10% XP', players: 2370, unlocked: true },
  { id: 'bellum',   name: 'Bellum',   icon: '⚔️', type: 'Optional PvP', reqLevel: 25, bonus: '+20% Gold', players: 1840, unlocked: false },
  { id: 'spectrum', name: 'Spectrum', icon: '🌈', type: 'Optional PvP', reqLevel: 20, bonus: '+15% XP', players: 1320, unlocked: false },
  { id: 'elysian',  name: 'Elysian',  icon: '✨', type: 'Retro PvP',   reqLevel: 40, bonus: '+25% XP +15% Gold', players: 3400, unlocked: false },
  { id: 'solarian', name: 'Solarian', icon: '☀️', type: 'Retro PvP',   reqLevel: 35, bonus: '+20% XP', players: 2100, unlocked: false },
  { id: 'mystian',  name: 'Mystian',  icon: '🌀', type: 'Retro PvP',   reqLevel: 60, bonus: '+40% XP +30% Gold', players: 1800, unlocked: false },
];

export function worldXpMultiplier(worldId) {
  const world = WORLDS.find(w => w.id === worldId);
  if (!world) return 1;
  return world.id === 'auroria' ? 1.1 : world.id === 'elysian' ? 1.25 : world.id === 'mystian' ? 1.4 : 1.15;
}

export function worldGoldMultiplier(worldId) {
  const world = WORLDS.find(w => w.id === worldId);
  if (!world) return 1;
  return world.id === 'bellum' ? 1.2 : world.id === 'elysian' ? 1.15 : world.id === 'mystian' ? 1.3 : 1;
}

// Linked Tasks: cadeia SEQUENCIAL por sala (como no RubinOT — completar uma task
// desbloqueia a próxima). Lista da Lothlorien's Room confirmada na wiki/comunidade;
// demais salas seguem a progressão de bestiário do servidor.
export const TASK_ROOMS = [
  { id: 'lothlorien', name: "Lothlorien's Room", icon: '🌲', tasks: [
    { m: 'goblin', n: 150 }, { m: 'troll', n: 200 }, { m: 'rotworm', n: 300 },
    { m: 'minotaur', n: 300 }, { m: 'dwarf', n: 300 }, { m: 'elf', n: 300 },
    { m: 'dworc', n: 400 }, { m: 'scarab', n: 400 }, { m: 'cyclops', n: 500 },
    { m: 'mutated_human', n: 500 },
  ]},
  { id: 'executioner', name: "Executioner's Room", icon: '🪓', tasks: [
    { m: 'giant_spider', n: 500 }, { m: 'dragon', n: 500 }, { m: 'dragon_lord', n: 600 },
    { m: 'frost_dragon', n: 600 }, { m: 'warlock', n: 700 }, { m: 'hydra', n: 700 },
    { m: 'medusa', n: 800 }, { m: 'behemoth', n: 800 },
  ]},
  { id: 'morgul', name: "Morgul's Room", icon: '👻', tasks: [
    { m: 'bonebeast', n: 600 }, { m: 'banshee', n: 600 }, { m: 'vampire', n: 700 },
    { m: 'lich', n: 700 }, { m: 'grim_reaper', n: 800 }, { m: 'undead_dragon', n: 900 },
  ]},
  { id: 'corrupted', name: "Corrupted's Room", icon: '🩸', tasks: [
    { m: 'fury', n: 800 }, { m: 'hellhound', n: 800 }, { m: 'plaguesmith', n: 900 },
    { m: 'demon', n: 1000 }, { m: 'juggernaut', n: 1200 },
  ]},
  { id: 'nzoth', name: "N'Zoth's Room", icon: '🌀', tasks: [
    { m: 'lothlorien', n: 30 }, { m: 'executioner', n: 30 }, { m: 'morgul', n: 40 },
    { m: 'corrupted_one', n: 40 }, { m: 'nzoth', n: 50 },
  ]},
];

// Uma task só desbloqueia quando a anterior da cadeia foi completa ≥1x (Linked!).
// Sem trava de nível de propósito (pedido do Felipe): qualquer personagem pode
// entrar em qualquer sala a qualquer nível, mesmo que a criatura da task seja
// bem mais forte — a progressão é só a cadeia sequencial dentro da sala.
export function isTaskUnlocked(room, index, taskCompletion) {
  if (index === 0) return true;
  const prev = room.tasks[index - 1];
  return (taskCompletion[prev.m] || 0) >= 1;
}

// Nomes de divisão em inglês nos dois idiomas de propósito — são termos
// padrão de ranking competitivo (Bronze/Silver/Gold/...), universais mesmo em
// clientes de jogo em português (como em League of Legends, Valorant etc).
// Não persiste em G (G só guarda arenaPoints; a divisão é sempre recalculada
// por arenaDivisionForPoints), então renomear aqui não quebra save antigo.
export const ARENA_DIVISIONS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'];

export function arenaDivisionForPoints(points) {
  const index = Math.min(ARENA_DIVISIONS.length - 1, Math.floor(points / 100));
  return ARENA_DIVISIONS[index];
}

// Limite diário de lutas — sem isso, Arena Points é só uma torneira infinita
// de Rubini Coins; o limite é o que faz "voltar amanhã" valer a pena.
export const ARENA_DAILY_LIMIT = 15;

// Recompensa única ao alcançar cada divisão pela primeira vez (não repete,
// mesmo se cair de divisão depois) — dá um motivo extra pra subir, além dos
// pontos em si.
// Migração: os nomes de divisão eram em português (ver comentário acima de
// ARENA_DIVISIONS) — saves antigos têm essas strings em G.arenaDivisionsClaimed
// (ver application/persistenceUseCases.js). Sem isso, quem já resgatou a
// divisão antiga conseguiria resgatar de novo sob o novo nome.
export const LEGACY_ARENA_DIVISION_MAP = {
  Prata: 'Silver', Ouro: 'Gold', Platina: 'Platinum', Diamante: 'Diamond',
  Mestre: 'Master', 'Grão-Mestre': 'Grandmaster',
};

export const ARENA_DIVISION_REWARDS = {
  Bronze: { type: 'gold', amount: 300 },
  Silver: { type: 'gold', amount: 800 },
  Gold: { type: 'rubini', amount: 40 },
  Platinum: { type: 'rubini', amount: 100 },
  Diamond: { type: 'item', itemId: 'crown_helmet' },
  Master: { type: 'item', itemId: 'crown_shield' },
  Grandmaster: { type: 'rubini', amount: 500 },
};

export const BP_XP_PER_TIER = 500;

// `name` dos tiers de item é chave de tradução (ver ui/battlePassPanel.js e
// i18n/locales/*.js: battlepass.reward.*) — os de gold/rubini já são só
// número+unidade, iguais nos dois idiomas, então ficam como string literal.
export const BP_REWARDS = [
  { tier: 1,  icon: '💰', name: '500 Gold', type: 'gold', amount: 500 },
  { tier: 3,  icon: '💰', name: '1000 Gold', type: 'gold', amount: 1000 },
  { tier: 5,  icon: '💎', name: '50 Rubini Coins', type: 'rubini', amount: 50 },
  { tier: 7,  icon: '🗡️', name: 'battlepass.reward.seasonalSword', type: 'item', itemId: 'guardian_halberd' },
  { tier: 10, icon: '💰', name: '2000 Gold', type: 'gold', amount: 2000 },
  { tier: 12, icon: '💎', name: '100 Rubini Coins', type: 'rubini', amount: 100 },
  { tier: 15, icon: '💎', name: '200 Rubini Coins', type: 'rubini', amount: 200 },
  { tier: 18, icon: '🛡️', name: 'battlepass.reward.seasonalArmor', type: 'item', itemId: 'amazon_armor' },
  { tier: 20, icon: '👑', name: 'battlepass.reward.royalHelmet', type: 'item', itemId: 'royal_helmet' },
];

export function bpTierForXp(bpXp) {
  return Math.floor(bpXp / BP_XP_PER_TIER);
}

// Missões diárias do Battle Pass: XP extra além do trickle passivo de matar
// monstros, ligadas a ações que o jogador já faz no jogo (caçar, tasks,
// Arena) — não é busywork inventado à parte. `track` casa com uma chave de
// G.bpMissionProgress (ver application/battlePassUseCases.js).
// `name` é chave de tradução (ver ui/battlePassPanel.js e i18n/locales/*.js:
// battlepass.mission.<id>) — texto original deste jogo, não canon de Tibia.
export const BP_MISSION_POOL = [
  { id: 'kill_50',   name: 'battlepass.mission.kill_50',   goal: 50,   track: 'kills',     xp: 150 },
  { id: 'kill_150',  name: 'battlepass.mission.kill_150',  goal: 150,  track: 'kills',     xp: 350 },
  { id: 'kill_300',  name: 'battlepass.mission.kill_300',  goal: 300,  track: 'kills',     xp: 600 },
  { id: 'gold_1000', name: 'battlepass.mission.gold_1000', goal: 1000, track: 'gold',      xp: 150 },
  { id: 'gold_5000', name: 'battlepass.mission.gold_5000', goal: 5000, track: 'gold',      xp: 350 },
  { id: 'task_1',    name: 'battlepass.mission.task_1',    goal: 1,    track: 'tasks',     xp: 250 },
  { id: 'task_2',    name: 'battlepass.mission.task_2',    goal: 2,    track: 'tasks',     xp: 450 },
  { id: 'arena_1',   name: 'battlepass.mission.arena_1',   goal: 1,    track: 'arenaWins', xp: 200 },
  { id: 'arena_3',   name: 'battlepass.mission.arena_3',   goal: 3,    track: 'arenaWins', xp: 450 },
];

export const BP_MISSIONS_PER_DAY = 3;

// Mesmas 3 missões o dia inteiro pra qualquer jogador, sem precisar de
// servidor pra sortear — hash simples da data (string "YYYY-MM-DD") vira o
// índice inicial no pool, e troca sozinho quando o dia muda.
export function dailyMissionsFor(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  const picks = [];
  for (let i = 0; i < BP_MISSIONS_PER_DAY; i++) {
    picks.push(BP_MISSION_POOL[(hash + i * 7) % BP_MISSION_POOL.length]);
  }
  return picks;
}
