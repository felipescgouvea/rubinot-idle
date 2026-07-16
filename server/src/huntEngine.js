// Motor de caçada AUTORITATIVO — Marco 2 da economia server-autoritativa.
//
// LIMITAÇÃO DELIBERADA deste marco (documentada, não escondida): atk/def/spd/
// vocação/nível/mundo ainda vêm como SNAPSHOT enviado pelo cliente no
// hunt-start (travado pra sessão inteira). Isso ainda não fecha 100% o buraco
// — dá pra inflar esses números uma vez por sessão — mas fecha o principal:
// o cliente não declara mais QUANTO ganhou. Cada kill é decidido por ESTE
// processo, rodando sozinho, contra o relógio real do servidor; parar de
// mandar requisições não gera ganho (o tick não depende de nenhum request).
// Fechar o buraco do snapshot é o Marco 4 (equipamento/skills também
// autoritativos, ver plano).
//
// Player HP/morte/loot/relíquias/RTC NÃO são simulados ainda (Marcos 3/4) —
// aqui só XP e ouro, com a MESMA fórmula de src/application/huntUseCases.js:
// resolveMonsterKill (zona/mundo/admin rate), sem boosts/bônus/stamina ainda.
import { ZONES, MONSTERS, boostedZoneForDate } from '../vendor/domain/bestiary.js?v=135';
import { spawnMonsterInstance, calcDamage } from '../vendor/domain/combatFormulas.js?v=156';
import { worldXpMultiplier, worldGoldMultiplier } from '../vendor/domain/progression.js?v=128';
import { zoneMultiplier } from '../vendor/domain/adminConfig.js?v=128';
import { XP_TABLE } from '../vendor/domain/character.js?v=156';
import { getGameConfig } from './gameConfig.js';
import { selectOne, upsertRow, updateRows } from './db.js';

// sessionId -> { userId, slot, zoneId, atk, def, spd, level, world, timer, currentMonster, nextSpawnAt }
const live = new Map();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function settleKill(session, mon) {
  const cfg = await getGameConfig();
  const zoneGoldMult = zoneMultiplier(cfg, session.zoneId, 'gold', 1);
  const zoneXpMult = zoneMultiplier(cfg, session.zoneId, 'xp', 1);
  const isBoostedToday = session.zoneId === boostedZoneForDate(todayStr());
  const boostedMult = isBoostedToday ? 1.5 : 1;
  const goldGained = Math.floor((mon.gold[0] + Math.random() * (mon.gold[1] - mon.gold[0])) * zoneGoldMult * worldGoldMultiplier(session.world) * boostedMult * cfg.goldRate);
  const xpGained = Math.floor(mon.xp * zoneXpMult * worldXpMultiplier(session.world) * boostedMult * cfg.xpRate);

  // Leitura+escrita (não upsert incremental) porque só ESTE processo — um
  // tick por sessão, nunca concorrente consigo mesmo — grava nesta linha.
  const row = await selectOne('player_stats', { user_id: session.userId, slot: session.slot });
  const gold = (row ? Number(row.gold) : 0) + goldGained;
  const totalGoldEarned = (row ? Number(row.total_gold_earned) : 0) + goldGained;
  const totalKills = (row ? Number(row.total_kills) : 0) + 1;
  // Mesmo modelo do cliente (ver src/application/huntUseCases.js: gainXp): xp
  // é o progresso DENTRO do nível atual, não um total acumulado — sobe de
  // nível e reseta o contador, usando a MESMA XP_TABLE. level-up automático
  // faz parte deste marco (senão xp/level do cliente e do servidor divergem
  // de significado assim que o cliente passar a exibir estes números).
  let xp = (row ? Number(row.xp) : 0) + xpGained;
  let level = row ? row.level : session.level;
  while (level < 100 && xp >= XP_TABLE[level - 1]) {
    xp -= XP_TABLE[level - 1];
    level++;
  }

  await upsertRow('player_stats', {
    user_id: session.userId, slot: session.slot, gold, xp, level,
    total_gold_earned: totalGoldEarned, total_kills: totalKills, updated_at: new Date().toISOString(),
  }, 'user_id,slot');
  await updateRows('hunt_sessions', { id: session.id }, { last_settled_at: new Date().toISOString() });

  session.lastKill = { monster: mon.name, gold: goldGained, xp: xpGained, at: Date.now() };
}

function doTick(session) {
  const zone = ZONES[session.zoneId];
  if (!zone) return;
  if (!session.currentMonster) {
    if (Date.now() < session.nextSpawnAt) return;
    session.currentMonster = spawnMonsterInstance(zone, MONSTERS, session.level, 1, null);
    return;
  }
  const mon = session.currentMonster;
  const dmg = calcDamage(session.atk, mon.def);
  mon.hp -= dmg;
  if (mon.hp <= 0) {
    settleKill(session, mon).catch(err => console.error('settleKill falhou', session.id, err.message));
    session.currentMonster = null;
    session.nextSpawnAt = Date.now() + 1500;
  }
}

export function startSession(session) {
  session.currentMonster = null;
  session.nextSpawnAt = Date.now();
  const tickMs = Math.max(400, 2400 / Math.max(0.1, session.spd));
  session.timer = setInterval(() => doTick(session), tickMs);
  live.set(session.id, session);
}

export function stopSession(sessionId) {
  const s = live.get(sessionId);
  if (!s) return;
  clearInterval(s.timer);
  live.delete(sessionId);
}

export function getLiveSession(sessionId) {
  return live.get(sessionId);
}

// Ao subir (deploy/restart), qualquer sessão marcada "active" no banco perdeu
// seu tick loop em memória (o processo anterior morreu) — nenhuma "sessão
// fantasma" continua rodando, mas o registro dela ficaria travado como ativa
// pra sempre (o índice único hunt_sessions_one_active_per_slot impediria um
// novo hunt-start). Fecha todas no boot.
export async function reapStaleSessionsOnBoot() {
  try {
    await updateRows('hunt_sessions', { active: true }, { active: false });
  } catch (e) {
    console.error('reapStaleSessionsOnBoot falhou', e.message);
  }
}
