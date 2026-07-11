// Painel Admin: lê/escreve G.adminConfig e expõe getters que o resto do jogo
// consome (XP/skill/gold/loot/relíquia/raridade). Ver domain/adminConfig.js.
import { G } from './gameStore.js?v=51';
import { DEFAULT_ADMIN_CONFIG, sanitizeAdminConfig } from '../domain/adminConfig.js?v=51';
import { emit, EVENTS } from '../shared/eventBus.js?v=51';
import { saveGame } from './saveGameUseCase.js?v=51';

export function getAdminConfig() {
  G.adminConfig = sanitizeAdminConfig(G.adminConfig);
  return G.adminConfig;
}

// Getters usados nas fórmulas (huntUseCases/skillUseCases/persistence).
export const getXpRate = () => getAdminConfig().xpRate;
export const getSkillRate = () => getAdminConfig().skillRate;
export const getGoldRate = () => getAdminConfig().goldRate;
export const getLootRate = () => getAdminConfig().lootRate;
export const getRelicDropChance = () => getAdminConfig().relicDropChance;
export const getRarityWeights = () => getAdminConfig().rarityWeights;
// Range de tempo de aparição, em MILISSEGUNDOS (config guarda em segundos).
export function getSpawnDelayRange() {
  const c = getAdminConfig();
  return { min: c.spawnDelayMin * 1000, max: c.spawnDelayMax * 1000 };
}

export function setAdminRate(key, value) {
  const cfg = getAdminConfig();
  cfg[key] = value;
  G.adminConfig = sanitizeAdminConfig(cfg);
  emit(EVENTS.ADMIN_PANEL);
  emit(EVENTS.NOTIFY, { msg: '⚙️ Configuração aplicada.', type: 'success' });
  saveGame();
}

// Chance de relíquia recebida em PORCENTAGEM (0..100) pela UI.
export function setRelicDropChancePct(pct) {
  const cfg = getAdminConfig();
  cfg.relicDropChance = (Number(pct) || 0) / 100;
  G.adminConfig = sanitizeAdminConfig(cfg);
  emit(EVENTS.ADMIN_PANEL);
  emit(EVENTS.NOTIFY, { msg: '⚙️ Chance de relíquia aplicada.', type: 'success' });
  saveGame();
}

export function setRarityWeight(tier, value) {
  const cfg = getAdminConfig();
  cfg.rarityWeights[tier] = value;
  G.adminConfig = sanitizeAdminConfig(cfg);
  emit(EVENTS.ADMIN_PANEL);
  saveGame();
}

export function resetAdminConfig() {
  G.adminConfig = sanitizeAdminConfig({ ...DEFAULT_ADMIN_CONFIG, rarityWeights: { ...DEFAULT_ADMIN_CONFIG.rarityWeights } });
  emit(EVENTS.ADMIN_PANEL);
  emit(EVENTS.NOTIFY, { msg: '⚙️ Configurações restauradas ao padrão.', type: 'success' });
  saveGame();
}
