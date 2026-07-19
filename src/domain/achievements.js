// Achievements (conquistas) e Títulos — marcos derivados dos stats do
// personagem, que já são autoritativos do servidor (level/totalKills/
// totalGoldEarned/promoted/etc. vêm do reconcile). Puro: cada conquista é uma
// condição sobre o estado G; nada é gravado no servidor (a conquista é sempre
// recomputada a partir dos stats reais). Um subconjunto concede TÍTULOS que o
// jogador pode exibir ao lado do nome (fiel ao Tibia, onde achievements dão
// títulos selecionáveis).

// Cada conquista: { id, name, desc, icon, check(G) -> bool, title? }
export const ACHIEVEMENTS = [
  // — Progressão de nível —
  { id: 'lvl10', name: 'Getting Started', desc: 'Reach level 10', icon: '🌱', check: g => g.level >= 10 },
  { id: 'lvl25', name: 'Adventurer', desc: 'Reach level 25', icon: '🗺️', check: g => g.level >= 25 },
  { id: 'lvl50', name: 'Seasoned', desc: 'Reach level 50', icon: '⭐', check: g => g.level >= 50, title: 'the Experienced' },
  { id: 'lvl100', name: 'Legend', desc: 'Reach level 100', icon: '👑', check: g => g.level >= 100, title: 'the Legend' },
  // — Abates —
  { id: 'kill100', name: 'Monster Hunter', desc: 'Defeat 100 monsters', icon: '⚔️', check: g => (g.totalKills || 0) >= 100 },
  { id: 'kill1k', name: 'Slayer', desc: 'Defeat 1,000 monsters', icon: '🗡️', check: g => (g.totalKills || 0) >= 1000, title: 'the Slayer' },
  { id: 'kill10k', name: 'Exterminator', desc: 'Defeat 10,000 monsters', icon: '💀', check: g => (g.totalKills || 0) >= 10000, title: 'the Exterminator' },
  // — Riqueza —
  { id: 'gold100k', name: 'Well Off', desc: 'Earn 100,000 gold total', icon: '💰', check: g => (g.totalGoldEarned || 0) >= 100000 },
  { id: 'gold1m', name: 'Wealthy', desc: 'Earn 1,000,000 gold total', icon: '💎', check: g => (g.totalGoldEarned || 0) >= 1000000, title: 'the Wealthy' },
  // — Bosses —
  { id: 'boss1', name: 'Boss Slayer', desc: 'Defeat a zone boss', icon: '🔥', check: g => (g.defeatedZoneBosses || []).length >= 1 },
  { id: 'boss5', name: 'Bane of Bosses', desc: 'Defeat 5 different zone bosses', icon: '🐉', check: g => (g.defeatedZoneBosses || []).length >= 5, title: 'the Bossbane' },
  // — Arena —
  { id: 'arena10', name: 'Contender', desc: 'Win 10 arena battles', icon: '🏟️', check: g => (g.arenaWins || 0) >= 10 },
  { id: 'arena100', name: 'Gladiator', desc: 'Win 100 arena battles', icon: '🛡️', check: g => (g.arenaWins || 0) >= 100, title: 'the Gladiator' },
  // — Dedicação —
  { id: 'promoted', name: 'Promoted', desc: 'Promote your vocation', icon: '✨', check: g => !!g.promoted, title: 'the Elite' },
  { id: 'charm500', name: 'Charmed', desc: 'Accumulate 500 charm points', icon: '🔮', check: g => (g.charmPoints || 0) >= 500 },
  { id: 'bless5', name: 'Blessed', desc: 'Hold all 5 blessings at once', icon: '🙏', check: g => (g.blessings || 0) >= 5, title: 'the Blessed' },
];

export function isAchievementUnlocked(a, g) {
  try { return !!a.check(g); } catch { return false; }
}

export function unlockedAchievements(g) {
  return ACHIEVEMENTS.filter(a => isAchievementUnlocked(a, g));
}

// Títulos disponíveis = os concedidos por conquistas já desbloqueadas. Sempre
// inclui o "sem título" (null) pra o jogador voltar ao nome puro.
export function availableTitles(g) {
  return unlockedAchievements(g).filter(a => a.title).map(a => a.title);
}
