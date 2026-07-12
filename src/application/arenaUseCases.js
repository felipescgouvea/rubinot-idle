// Simula uma batalha da Prestige Arena e retorna o resultado (nome/level do
// oponente e as linhas de log da luta) pra ui renderizar. Não emite um evento
// genérico de "re-renderize o painel inteiro" de propósito: o card de VS e o
// log da luta pertencem só a esta ação — um re-render cego do shell do painel
// apagaria o log antes do jogador ver (era exatamente isso que acontecia na
// versão anterior do jogo, e é o que este desenho corrige).
import { G } from './gameStore.js?v=67';
import { emit, EVENTS } from '../shared/eventBus.js?v=67';
import { getAtk, getDef, getMagic, getMaxHp } from './stats.js?v=67';
import { fetchArenaOpponentRequest } from '../infrastructure/highscoresApi.js?v=67';
import { ARENA_DAILY_LIMIT, ARENA_DIVISIONS, ARENA_DIVISION_REWARDS, arenaDivisionForPoints } from '../domain/progression.js?v=67';
import { bumpMissionProgress } from './battlePassUseCases.js?v=67';
import { addItemToInventory } from './inventoryCore.js?v=67';
import { ITEMS } from '../domain/items.js?v=67';
import { saveGame } from './saveGameUseCase.js?v=67';

const NPC_NAMES = ['Zothrak', 'Sylvara', 'Drakonis', 'Morghul', 'Velindra', 'Thordak', 'Nyxara'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Zera as batalhas de hoje quando o dia muda — o limite diário só faz
// sentido se resetar sozinho, sem precisar o jogador fazer nada.
function ensureArenaDay() {
  const today = todayStr();
  if (G.arenaLastDate !== today) {
    G.arenaLastDate = today;
    G.arenaBattlesToday = 0;
  }
}

export function arenaAttemptsLeft() {
  ensureArenaDay();
  return Math.max(0, ARENA_DAILY_LIMIT - G.arenaBattlesToday);
}

export async function startArenaBattle() {
  ensureArenaDay();
  if (G.arenaBattlesToday >= ARENA_DAILY_LIMIT) {
    emit(EVENTS.NOTIFY, { msg: `Você já lutou ${ARENA_DAILY_LIMIT}x na Arena hoje. Volte amanhã!`, type: 'error' });
    return { noAttemptsLeft: true };
  }
  G.arenaBattlesToday++;

  // tenta um oponente REAL do ranking global; sem ninguém por perto, cai num bot
  let enemyName, enemyLevel, enemyPts, isReal = false;
  const real = await fetchArenaOpponentRequest(G.level, G.playerName);
  if (real) {
    enemyName = real.name;
    enemyLevel = real.level;
    enemyPts = real.arena_points;
    isReal = true;
  } else {
    enemyName = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)] + ' (NPC)';
    enemyLevel = G.level + Math.floor(Math.random() * 5) - 2;
    enemyPts = Math.max(0, G.arenaPoints + Math.floor(Math.random() * 30) - 15);
  }
  // stats do oponente derivados do level dele (real ou NPC)
  const levelRatio = Math.max(0.5, Math.min(1.6, enemyLevel / Math.max(1, G.level)));
  const enemyAtk = getAtk() * (0.75 + Math.random() * 0.3) * levelRatio;
  const enemyHp = getMaxHp() * (0.85 + Math.random() * 0.3) * levelRatio;

  const log = [`<span style="color:var(--arcane)">⚔️ Arena: Você vs ${enemyName}${isReal ? ' <strong>(jogador real!)</strong>' : ''}</span>`];

  // Simulate best-of-2
  let wins = 0, losses = 0;
  for (let round = 1; round <= 2; round++) {
    let playerHp = getMaxHp(), eHp = enemyHp;
    log.push(`<span style="color:var(--muted)">— Round ${round} —</span>`);
    for (let t = 0; t < 30; t++) {
      const pd = Math.max(1, Math.floor((getAtk() + getMagic()) * (0.8 + Math.random() * 0.4) - getDef() * 0.3));
      const ed = Math.max(1, Math.floor(enemyAtk * (0.8 + Math.random() * 0.4) - getDef() * 0.5));
      eHp -= pd; playerHp -= ed;
      if (eHp <= 0) { log.push(`<span class="log-heal">✅ Round ${round}: Você venceu!</span>`); wins++; break; }
      if (playerHp <= 0) { log.push(`<span class="log-dmg">❌ Round ${round}: Você foi derrotado.</span>`); losses++; break; }
    }
    if (wins > losses && round === 1) { log.push('<span style="color:var(--muted)">— Fim dos rounds —</span>'); break; }
  }

  const won = wins > losses;
  const ptsDelta = won ? Math.floor(15 + Math.random() * 10) : -Math.floor(8 + Math.random() * 7);
  G.arenaPoints = Math.max(0, G.arenaPoints + ptsDelta);
  if (won) {
    G.arenaWins++;
    G.arenaStreak = (G.arenaStreak || 0) + 1;
    // bônus de sequência: +3 RC por vitória seguida, até um teto de +30 —
    // recompensa manter o streak sem virar a fonte principal de RC do modo.
    const streakBonus = Math.min(30, (G.arenaStreak - 1) * 3);
    const rcGained = 25 + streakBonus;
    G.rubini += rcGained;
    bumpMissionProgress('arenaWins', 1);
    log.push(`<span class="log-kill">🏆 Vitória! +${ptsDelta} pts, +${rcGained} Rubini Coins${streakBonus ? ` (streak x${G.arenaStreak})` : ''}</span>`);
    emit(EVENTS.NOTIFY, { msg: `Vitória na Arena! +${rcGained} RC${streakBonus ? ` (streak x${G.arenaStreak})` : ''}`, type: 'success' });
  } else {
    G.arenaLosses++;
    G.arenaStreak = 0;
    log.push(`<span class="log-dmg">💔 Derrota. ${ptsDelta} pts</span>`);
    emit(EVENTS.NOTIFY, { msg: 'Derrota na Arena.', type: 'error' });
  }
  G.arenaPoints = Math.max(0, G.arenaPoints);

  emit(EVENTS.HEADER_STATS);
  saveGame();

  return { enemyName, enemyLevel, enemyPts, isReal, logLines: log, attemptsLeft: ARENA_DAILY_LIMIT - G.arenaBattlesToday };
}

// Recompensa única por alcançar uma divisão — só pode reivindicar a divisão
// atual ou uma já ultrapassada (nunca uma acima do que os pontos permitem),
// e nunca duas vezes a mesma.
export function claimArenaDivisionReward(division) {
  const current = arenaDivisionForPoints(G.arenaPoints);
  const reached = ARENA_DIVISIONS.indexOf(division) <= ARENA_DIVISIONS.indexOf(current);
  if (!reached || G.arenaDivisionsClaimed.includes(division)) return;
  const reward = ARENA_DIVISION_REWARDS[division];
  if (!reward) return;
  G.arenaDivisionsClaimed.push(division);
  if (reward.type === 'gold') { G.gold += reward.amount; emit(EVENTS.NOTIFY, { msg: `+${reward.amount} 💰 (divisão ${division})!`, type: 'success' }); }
  if (reward.type === 'rubini') { G.rubini += reward.amount; emit(EVENTS.NOTIFY, { msg: `+${reward.amount} Rubini Coins (divisão ${division})!`, type: 'success' }); }
  if (reward.type === 'item') { addItemToInventory(reward.itemId); emit(EVENTS.NOTIFY, { msg: `Item recebido: ${ITEMS[reward.itemId]?.name} (divisão ${division})!`, type: 'success' }); }
  emit(EVENTS.HEADER_STATS);
  saveGame();
}
