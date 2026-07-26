// Simula uma batalha da Prestige Arena e retorna o resultado (nome/level do
// oponente e as linhas de log da luta) pra ui renderizar. Não emite um evento
// genérico de "re-renderize o painel inteiro" de propósito: o card de VS e o
// log da luta pertencem só a esta ação — um re-render cego do shell do painel
// apagaria o log antes do jogador ver (era exatamente isso que acontecia na
// versão anterior do jogo, e é o que este desenho corrige).
import { G, ACCOUNT } from './gameStore.js?v=340';
import { emit, EVENTS } from '../shared/eventBus.js?v=338';
import { getMagic, getMaxHp } from './stats.js?v=337';
import { rollPlayerAttack, reducePhysical, computePlayerArmor, computePlayerDefense, computeAtk, normalRandom } from '../domain/combatFormulas.js?v=369';
import { selectRequest } from '../infrastructure/supabaseClient.js?v=337';
import { ARENA_DAILY_LIMIT, ARENA_DIVISIONS, ARENA_DIVISION_REWARDS, arenaDivisionForPoints } from '../domain/progression.js?v=339';
import { grantReward } from './rewardGrants.js?v=177';
import { grantCharmBonus } from './bestiaryUseCases.js?v=338';
import { grantBoostOnServer } from '../infrastructure/authClient.js?v=348';
import { bumpMissionProgress } from './battlePassUseCases.js?v=337';
import { addItemToInventory } from './inventoryCore.js?v=338';
import { ITEMS } from '../domain/items.js?v=351';
import { saveGame } from './saveGameUseCase.js?v=340';
import { t } from '../i18n/i18n.js?v=356';

const NPC_NAMES = ['Zothrak', 'Sylvara', 'Drakonis', 'Morghul', 'Velindra', 'Thordak', 'Nyxara'];

// Busca um oponente real do ranking global (rubinot_idle_scores) pra Arena —
// FORA do escopo desta migração (arena_points ainda não é autoritativo no
// servidor de caçada, ver server/src/index.js: /highscores/submit). Antes
// vivia em infrastructure/highscoresApi.js (deletado — Market/Highscores
// migraram pro servidor, mas a Arena continua lendo o Supabase direto por
// enquanto, mesmo modelo de sempre).
async function fetchArenaOpponentRequest(level, excludeName) {
  const lo = Math.max(1, level - 15), hi = level + 15;
  const rows = await selectRequest(
    `rubinot_idle_scores?select=name,vocation,level,arena_points&level=gte.${lo}&level=lte.${hi}&name=neq.${encodeURIComponent(excludeName || '~')}&limit=20`
  );
  if (!rows || !rows.length) return null;
  return rows[Math.floor(Math.random() * rows.length)];
}

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
    emit(EVENTS.NOTIFY, { msg: t('arena.dailyLimitReached', { limit: ARENA_DAILY_LIMIT }), type: 'error' });
    return { noAttemptsLeft: true };
  }
  // tenta um oponente REAL do ranking global; sem ninguém por perto, cai num bot
  let enemyName, enemyLevel, enemyPts, isReal = false;
  const real = await fetchArenaOpponentRequest(G.level, G.playerName);
  if (real) {
    enemyName = real.name;
    enemyLevel = real.level;
    enemyPts = real.arena_points;
    isReal = true;
  } else {
    enemyName = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)] + ` ${t('arena.npcTag')}`;
    enemyLevel = G.level + Math.floor(Math.random() * 5) - 2;
    enemyPts = Math.max(0, G.arenaPoints + Math.floor(Math.random() * 30) - 15);
  }
  // Só consome a tentativa DEPOIS de ter um oponente resolvido: se o fetch do
  // oponente real lançar (rede), o jogador não perde a tentativa do dia.
  G.arenaBattlesToday++;
  // Combate FIEL ao Crystal Server (mesma maquinaria da caçada: rollPlayerAttack +
  // reducePhysical). O oponente é um fantasma escalado pelo level dele — dano
  // máximo, armadura e defesa derivam do que o JOGADOR tem, ajustados pelo
  // levelRatio (um "espelho" de força equivalente ao nível do rival).
  const levelRatio = Math.max(0.5, Math.min(1.6, enemyLevel / Math.max(1, G.level)));
  const loadout = { vocation: G.vocation, level: G.level, skills: G.sk, equipment: G.equipment, relics: G.relics };
  const pArmor = computePlayerArmor(G.equipment, G.relics);
  const pDef = computePlayerDefense({ skills: G.sk, equipment: G.equipment, relics: G.relics });
  const enemyMaxHit = Math.max(1, Math.round(computeAtk(loadout) * (0.8 + Math.random() * 0.3) * levelRatio));
  const enemyArmor = Math.round(pArmor * levelRatio);
  const enemyDef = Math.round(pDef * levelRatio);
  const enemyHp = getMaxHp() * (0.85 + Math.random() * 0.3) * levelRatio;
  const isMage = G.vocation === 'sorcerer' || G.vocation === 'druid';

  const realTag = isReal ? ` <strong>(${t('arena.realPlayerTag')})</strong>` : '';
  // enemyName vem do ranking global (nome de OUTRO jogador) e entra num innerHTML
  // (ver ui/arenaPanel.js). Escapa aqui como defesa em profundidade — o nome já
  // é restringido a charset seguro na entrada (highscoresUseCases/servidor), mas
  // escapar no sink fecha o buraco pra qualquer nome antigo ou vindo de API crua.
  const escNome = String(enemyName).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const log = [`<span style="color:var(--arcane)">⚔️ ${t('arena.logVs', { enemy: escNome })}${realTag}</span>`];

  // Melhor de 3: quem levar 2 rounds ganha a série (para assim que alguém
  // "fecha" em 2, então vai de 2 a 3 rounds). Um round que estoura os 30 ticks
  // sem KO é decidido por quem sobrou com maior % de vida — assim NENHUM round
  // fica empatado e o resultado da série é sempre decisivo (2-0/2-1 vitória,
  // 0-2/1-2 derrota). Antes era "melhor de 2" com um bug: vencer o round 2
  // depois de perder o 1 dava 1-1 e caía como derrota (round 2 não valia nada).
  let wins = 0, losses = 0;
  for (let round = 1; round <= 3 && wins < 2 && losses < 2; round++) {
    let playerHp = getMaxHp(), eHp = enemyHp;
    log.push(`<span style="color:var(--muted)">${t('arena.roundHeader', { round })}</span>`);
    let resolved = false;
    for (let tick = 0; tick < 30; tick++) {
      // jogador bate: golpe real de arma (+ magia elemental se mago); físico
      // reduzido pela armadura/defesa do oponente, elemental (mago) passa direto.
      const atkRoll = rollPlayerAttack(loadout);
      let pRaw = atkRoll.damage;
      if (isMage) pRaw += Math.floor(getMagic() * (2.5 + Math.random() * 2));
      const pd = Math.max(1, Math.floor(atkRoll.physical ? reducePhysical(pRaw, enemyArmor, enemyDef) : pRaw));
      // oponente bate: normal_random(0, maxHit) reduzido pela armadura+defesa do jogador.
      const ed = Math.max(1, Math.floor(reducePhysical(normalRandom(0, enemyMaxHit), pArmor, pDef)));
      eHp -= pd; playerHp -= ed;
      if (eHp <= 0) { log.push(`<span class="log-heal">✅ ${t('arena.roundWon', { round })}</span>`); wins++; resolved = true; break; }
      if (playerHp <= 0) { log.push(`<span class="log-dmg">❌ ${t('arena.roundLost', { round })}</span>`); losses++; resolved = true; break; }
    }
    // Sem KO em 30 ticks: decide pelo maior % de vida restante (sem empate).
    if (!resolved) {
      if (playerHp / getMaxHp() >= eHp / enemyHp) { log.push(`<span class="log-heal">✅ ${t('arena.roundWon', { round })}</span>`); wins++; }
      else { log.push(`<span class="log-dmg">❌ ${t('arena.roundLost', { round })}</span>`); losses++; }
    }
  }
  log.push(`<span style="color:var(--muted)">${t('arena.roundsEnd')}</span>`);

  const won = wins > losses;
  const ptsDelta = won ? Math.floor(15 + Math.random() * 10) : -Math.floor(8 + Math.random() * 7);
  G.arenaPoints = Math.max(0, G.arenaPoints + ptsDelta);
  if (won) {
    G.arenaWins++;
    G.arenaStreak = (G.arenaStreak || 0) + 1;
    // Vitória paga em CHARM POINTS, não em Rubini Coin: a Arena não pode ser
    // torneira de moeda premium (nem de gold) — ver domain/progression.js.
    // Bônus de sequência: +3 por vitória seguida, até um teto de +30.
    const streakBonus = Math.min(30, (G.arenaStreak - 1) * 3);
    const rcGained = 25 + streakBonus;
    await grantCharmBonus(rcGained); // #R4: charm de prêmio é server-authoritative (antes era local e o sync descartava)
    bumpMissionProgress('arenaWins', 1);
    const streakSuffix = streakBonus ? ` (${t('arena.streakLabel', { streak: G.arenaStreak })})` : '';
    log.push(`<span class="log-kill">🏆 ${t('arena.victoryLog', { pts: ptsDelta, rc: rcGained })}${streakSuffix}</span>`);
    emit(EVENTS.NOTIFY, { msg: `${t('arena.victoryNotify', { rc: rcGained })}${streakSuffix}`, type: 'success' });
  } else {
    G.arenaLosses++;
    G.arenaStreak = 0;
    log.push(`<span class="log-dmg">💔 ${t('arena.defeatLog', { pts: ptsDelta })}</span>`);
    emit(EVENTS.NOTIFY, { msg: t('arena.defeatNotify'), type: 'error' });
  }
  G.arenaPoints = Math.max(0, G.arenaPoints);

  emit(EVENTS.HEADER_STATS);
  saveGame();

  return { enemyName, enemyLevel, enemyPts, isReal, logLines: log, attemptsLeft: ARENA_DAILY_LIMIT - G.arenaBattlesToday };
}

// Recompensa única por alcançar uma divisão — só pode reivindicar a divisão
// atual ou uma já ultrapassada (nunca uma acima do que os pontos permitem),
// e nunca duas vezes a mesma.
export async function claimArenaDivisionReward(division) {
  const current = arenaDivisionForPoints(G.arenaPoints);
  const reached = ARENA_DIVISIONS.indexOf(division) <= ARENA_DIVISIONS.indexOf(current);
  if (!reached || G.arenaDivisionsClaimed.includes(division)) return;
  const reward = ARENA_DIVISION_REWARDS[division];
  if (!reward) return;
  if (!grantReward(reward)) return;   // tipo desconhecido: não marca como resgatado
  if (reward.type === 'charm') await grantCharmBonus(reward.amount); // #R4: server-authoritative
  // #3: boost/varinha de treino são server-authoritative — concede no servidor e
  // aplica o mapa autoritativo (o /hunt/start só lê player_stats.boosts agora).
  else if (reward.type === 'boost' || reward.type === 'trainWand') {
    const res = await grantBoostOnServer(ACCOUNT.activeSlot, reward.type === 'trainWand' ? 'training' : reward.boost, reward.minutes);
    if (res.ok && res.boosts) G.boosts = res.boosts;
  }
  G.arenaDivisionsClaimed.push(division);
  emit(EVENTS.HEADER_STATS);
  saveGame();
}
