// Painel Admin: taxas/pesos que antes viviam em G.adminConfig (dentro do save
// do próprio jogador — qualquer um podia se auto-conceder xpRate:1000) agora
// vivem em public.game_config no Supabase, só gravável por quem está na
// whitelist public.admins (ver infrastructure/authClient.js: pushGameConfig/
// checkIsAdmin e supabase/functions/admin-config-set). O cliente mantém um
// cache local (configCache) populado no boot por initGameConfig() — os
// getters abaixo são síncronos de propósito (chamados no hot path da caçada),
// então NUNCA fazem fetch, só leem o cache.
import { DEFAULT_ADMIN_CONFIG, sanitizeAdminConfig, resolveZoneSpawn, resolveMonsterLoot, DEFAULT_PACK_MIN, DEFAULT_PACK_MAX } from '../domain/adminConfig.js?v=169';
import { emit, EVENTS } from '../shared/eventBus.js?v=167';
import { fetchGameConfig, pushGameConfig, checkIsAdmin } from '../infrastructure/authClient.js?v=174';

// Antes do primeiro fetch resolver (ou se ele falhar), usa o default — nunca
// trava o jogo por causa da config privilegiada ainda não ter chegado.
let configCache = sanitizeAdminConfig(DEFAULT_ADMIN_CONFIG);
let isAdminCache = false;

// Chamado uma vez no boot (main.js: startAuthedSession), antes de liberar a
// UI — busca a config real e confere se o usuário logado é admin. Retorna
// isAdmin pra quem chamou decidir se mostra a aba ⚙️ Admin.
export async function initGameConfig() {
  const [remote, admin] = await Promise.all([fetchGameConfig(), checkIsAdmin()]);
  if (remote) configCache = sanitizeAdminConfig(remote);
  isAdminCache = admin;
  return isAdminCache;
}

export function isAdminUser() { return isAdminCache; }
export function getAdminConfig() { return configCache; }

// Getters usados nas fórmulas (huntUseCases/skillUseCases/persistence) — mesma
// assinatura de antes, só a fonte dos dados mudou.
export const getXpRate = () => getAdminConfig().xpRate;
export const getSkillRate = () => getAdminConfig().skillRate;
export function getZoneSpawn(zoneId, zoneMonsters, zoneSpawn = null) {
  return resolveZoneSpawn(getAdminConfig(), zoneId, zoneMonsters, zoneSpawn);
}

export function getMonsterLoot(monsterId, baseLoot) {
  return resolveMonsterLoot(getAdminConfig(), monsterId, baseLoot);
}

// Envia a config INTEIRA pra Edge Function (só passa se o usuário for admin —
// checado no servidor, não aqui) e, se aceita, atualiza o cache local com o
// que voltou (já sanitizado pelo servidor). Toda ação de escrita do painel
// passa por aqui — nenhuma delas mexe em G/localStorage/saveGame mais.
async function pushConfig(cfg, onSuccess) {
  const { ok, config, error } = await pushGameConfig(cfg);
  if (!ok) {
    emit(EVENTS.NOTIFY, { msg: `⚠️ Não foi possível salvar a configuração: ${error}`, type: 'error' });
    return false;
  }
  configCache = config;
  emit(EVENTS.ADMIN_PANEL);
  if (onSuccess) onSuccess(configCache);
  return true;
}

export function setZoneSpawnWeight(zoneId, monsterId, value) {
  const cfg = { ...getAdminConfig(), huntSpawns: { ...getAdminConfig().huntSpawns } };
  cfg.huntSpawns[zoneId] = { ...(cfg.huntSpawns[zoneId] || {}) };
  cfg.huntSpawns[zoneId].weights = { ...(cfg.huntSpawns[zoneId].weights || {}) };
  cfg.huntSpawns[zoneId].weights[monsterId] = Math.max(0, Number(value) || 0);
  pushConfig(cfg);
}

export function setZonePackRange(zoneId, field, value) {
  const cfg = { ...getAdminConfig(), huntSpawns: { ...getAdminConfig().huntSpawns } };
  cfg.huntSpawns[zoneId] = { ...(cfg.huntSpawns[zoneId] || {}) };
  cfg.huntSpawns[zoneId][field] = Math.max(1, Math.floor(Number(value) || 1));
  pushConfig(cfg);
}

export function setLootChance(monsterId, itemId, pct) {
  const cfg = { ...getAdminConfig(), lootOverrides: { ...getAdminConfig().lootOverrides } };
  cfg.lootOverrides[monsterId] = { ...(cfg.lootOverrides[monsterId] || {}) };
  cfg.lootOverrides[monsterId][itemId] = Math.max(0, (Number(pct) || 0) / 100);
  pushConfig(cfg);
}

export function resetLootChance(monsterId, itemId) {
  const cfg = { ...getAdminConfig(), lootOverrides: { ...getAdminConfig().lootOverrides } };
  if (cfg.lootOverrides[monsterId]) {
    cfg.lootOverrides[monsterId] = { ...cfg.lootOverrides[monsterId] };
    delete cfg.lootOverrides[monsterId][itemId];
    if (!Object.keys(cfg.lootOverrides[monsterId]).length) delete cfg.lootOverrides[monsterId];
  }
  pushConfig(cfg);
}

export function setAdminRate(key, value) {
  const cfg = { ...getAdminConfig(), [key]: value };
  pushConfig(cfg, () => emit(EVENTS.NOTIFY, { msg: '⚙️ Configuração aplicada.', type: 'success' }));
}

export function setRelicDropChancePct(pct) {
  const cfg = { ...getAdminConfig(), relicDropChance: (Number(pct) || 0) / 100 };
  pushConfig(cfg, () => emit(EVENTS.NOTIFY, { msg: '⚙️ Chance de relíquia aplicada.', type: 'success' }));
}

export function setRarityPercent(tier, pct) {
  const cfg = { ...getAdminConfig(), rarityWeights: { ...getAdminConfig().rarityWeights } };
  cfg.rarityWeights[tier] = Math.max(0, Number(pct) || 0);
  pushConfig(cfg);
}

export function setUseZoneMultipliers(on) {
  const cfg = { ...getAdminConfig(), useZoneMultipliers: !!on };
  pushConfig(cfg, (c) => {
    emit(EVENTS.ZONE_PICKER);
    emit(EVENTS.NOTIFY, { msg: c.useZoneMultipliers ? '⚙️ Multiplicadores de zona ligados.' : '⚙️ Modo Tibia: XP/Gold sem multiplicador.', type: 'success' });
  });
}

export function setZoneMultiplier(zoneId, kind, value) {
  const cfg = { ...getAdminConfig(), zoneMultipliers: { ...getAdminConfig().zoneMultipliers } };
  cfg.zoneMultipliers[zoneId] = { ...(cfg.zoneMultipliers[zoneId] || {}) };
  cfg.zoneMultipliers[zoneId][kind] = Number(value) || 0;
  pushConfig(cfg, () => emit(EVENTS.ZONE_PICKER));
}

export const isMarketEnabled = () => getAdminConfig().marketEnabled;
export function setMarketEnabled(on) {
  const cfg = { ...getAdminConfig(), marketEnabled: !!on };
  pushConfig(cfg, (c) => {
    emit(EVENTS.MARKET_VISIBILITY, { enabled: c.marketEnabled });
    emit(EVENTS.NOTIFY, { msg: c.marketEnabled ? '🏪 Mercado entre jogadores ativado.' : '🏪 Mercado entre jogadores desativado.', type: 'success' });
  });
}

export const isStaminaEnabled = () => getAdminConfig().staminaEnabled;
export const isConsumeAmmo = () => getAdminConfig().consumeAmmo;
export const getProjectileSpeedMs = () => getAdminConfig().projectileSpeedMs;
export function setStaminaEnabled(on) {
  const cfg = { ...getAdminConfig(), staminaEnabled: !!on };
  pushConfig(cfg, (c) => {
    emit(EVENTS.HUNT_STATS);
    emit(EVENTS.NOTIFY, { msg: c.staminaEnabled ? '🔋 Stamina ativada.' : '🔋 Stamina desativada.', type: 'success' });
  });
}
export function setConsumeAmmo(on) {
  const cfg = { ...getAdminConfig(), consumeAmmo: !!on };
  pushConfig(cfg, (c) => emit(EVENTS.NOTIFY, { msg: c.consumeAmmo ? '🏹 Consumo de munição ativado.' : '🏹 Munição infinita.', type: 'success' }));
}

export function resetAdminConfig() {
  const cfg = { ...DEFAULT_ADMIN_CONFIG, rarityWeights: { ...DEFAULT_ADMIN_CONFIG.rarityWeights } };
  pushConfig(cfg, () => emit(EVENTS.NOTIFY, { msg: '⚙️ Configurações restauradas ao padrão.', type: 'success' }));
}
