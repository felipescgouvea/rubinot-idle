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
  { id: 'lothlorien', name: "Lothlorien's Room", icon: '🌲', minLevel: 8, tasks: [
    { m: 'goblin', n: 150 }, { m: 'troll', n: 200 }, { m: 'rotworm', n: 300 },
    { m: 'minotaur', n: 300 }, { m: 'dwarf', n: 300 }, { m: 'elf', n: 300 },
    { m: 'dworc', n: 400 }, { m: 'scarab', n: 400 }, { m: 'cyclops', n: 500 },
    { m: 'mutated_human', n: 500 },
  ]},
  { id: 'executioner', name: "Executioner's Room", icon: '🪓', minLevel: 50, tasks: [
    { m: 'giant_spider', n: 500 }, { m: 'dragon', n: 500 }, { m: 'dragon_lord', n: 600 },
    { m: 'frost_dragon', n: 600 }, { m: 'warlock', n: 700 }, { m: 'hydra', n: 700 },
    { m: 'medusa', n: 800 }, { m: 'behemoth', n: 800 },
  ]},
  { id: 'morgul', name: "Morgul's Room", icon: '👻', minLevel: 100, tasks: [
    { m: 'bonebeast', n: 600 }, { m: 'banshee', n: 600 }, { m: 'vampire', n: 700 },
    { m: 'lich', n: 700 }, { m: 'grim_reaper', n: 800 }, { m: 'undead_dragon', n: 900 },
  ]},
  { id: 'corrupted', name: "Corrupted's Room", icon: '🩸', minLevel: 150, tasks: [
    { m: 'fury', n: 800 }, { m: 'hellhound', n: 800 }, { m: 'plaguesmith', n: 900 },
    { m: 'demon', n: 1000 }, { m: 'juggernaut', n: 1200 },
  ]},
  { id: 'nzoth', name: "N'Zoth's Room", icon: '🌀', minLevel: 250, tasks: [
    { m: 'lothlorien', n: 30 }, { m: 'executioner', n: 30 }, { m: 'morgul', n: 40 },
    { m: 'corrupted_one', n: 40 }, { m: 'nzoth', n: 50 },
  ]},
];

// Uma task só desbloqueia quando a anterior da cadeia foi completa ≥1x (Linked!).
export function isTaskUnlocked(room, index, level, taskCompletion) {
  if (level < room.minLevel) return false;
  if (index === 0) return true;
  const prev = room.tasks[index - 1];
  return (taskCompletion[prev.m] || 0) >= 1;
}

export const ARENA_DIVISIONS = ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Mestre', 'Grão-Mestre'];

export function arenaDivisionForPoints(points) {
  const index = Math.min(ARENA_DIVISIONS.length - 1, Math.floor(points / 100));
  return ARENA_DIVISIONS[index];
}

export const BP_XP_PER_TIER = 500;

export const BP_REWARDS = [
  { tier: 1,  icon: '💰', name: '500 Gold', type: 'gold', amount: 500 },
  { tier: 3,  icon: '💰', name: '1000 Gold', type: 'gold', amount: 1000 },
  { tier: 5,  icon: '💎', name: '50 Rubini Coins', type: 'rubini', amount: 50 },
  { tier: 7,  icon: '🗡️', name: 'Espada Sazonal', type: 'item', itemId: 'guardian_halberd' },
  { tier: 10, icon: '💰', name: '2000 Gold', type: 'gold', amount: 2000 },
  { tier: 12, icon: '💎', name: '100 Rubini Coins', type: 'rubini', amount: 100 },
  { tier: 15, icon: '💎', name: '200 Rubini Coins', type: 'rubini', amount: 200 },
  { tier: 18, icon: '🛡️', name: 'Armadura Sazonal', type: 'item', itemId: 'amazon_armor' },
  { tier: 20, icon: '👑', name: 'Elmo Real', type: 'item', itemId: 'royal_helmet' },
];

export function bpTierForXp(bpXp) {
  return Math.floor(bpXp / BP_XP_PER_TIER);
}
