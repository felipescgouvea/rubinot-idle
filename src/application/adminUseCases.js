// Painel Admin: lê/escreve G.adminConfig e expõe getters que o resto do jogo
// consome (XP/skill/gold/loot/relíquia/raridade). Ver domain/adminConfig.js.
import { G } from './gameStore.js?v=119';
import { DEFAULT_ADMIN_CONFIG, sanitizeAdminConfig, zoneMultiplier, resolveZoneSpawn, DEFAULT_PACK_MIN, DEFAULT_PACK_MAX } from '../domain/adminConfig.js?v=119';
import { emit, EVENTS } from '../shared/eventBus.js?v=119';
import { saveGame } from './saveGameUseCase.js?v=119';

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

// Multiplicador efetivo de XP/Gold de uma zona (kind = 'xp' | 'gold'). O
// `builtIn` é o valor de progressão embutido na zona (ZONES[id].xpMult/goldMult),
// usado só quando os multiplicadores estão ligados e sem override. Padrão: 1.
export const isUsingZoneMultipliers = () => getAdminConfig().useZoneMultipliers;
export function getZoneMultiplier(zoneId, kind, builtIn) {
  return zoneMultiplier(getAdminConfig(), zoneId, kind, builtIn);
}

// Config efetiva de spawn de uma zona (pesos por monstro + faixa do grupo),
// consumida pelo motor de caçada (huntUseCases) e pelo painel Admin.
export function getZoneSpawn(zoneId, zoneMonsters) {
  return resolveZoneSpawn(getAdminConfig(), zoneId, zoneMonsters);
}

// Define o peso (%) de UM monstro numa zona. O peso é relativo (a % exibida é
// peso/soma). Zerar tira o monstro do sorteio daquela zona.
export function setZoneSpawnWeight(zoneId, monsterId, value) {
  const cfg = getAdminConfig();
  cfg.huntSpawns = cfg.huntSpawns || {};
  cfg.huntSpawns[zoneId] = cfg.huntSpawns[zoneId] || {};
  cfg.huntSpawns[zoneId].weights = cfg.huntSpawns[zoneId].weights || {};
  cfg.huntSpawns[zoneId].weights[monsterId] = Math.max(0, Number(value) || 0);
  G.adminConfig = sanitizeAdminConfig(cfg);
  emit(EVENTS.ADMIN_PANEL);
  saveGame();
}

// Define a faixa do tamanho do grupo de uma zona (field = 'packMin' | 'packMax').
export function setZonePackRange(zoneId, field, value) {
  const cfg = getAdminConfig();
  cfg.huntSpawns = cfg.huntSpawns || {};
  cfg.huntSpawns[zoneId] = cfg.huntSpawns[zoneId] || {};
  cfg.huntSpawns[zoneId][field] = Math.max(1, Math.floor(Number(value) || 1));
  G.adminConfig = sanitizeAdminConfig(cfg);
  emit(EVENTS.ADMIN_PANEL);
  saveGame();
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

// Liga/desliga o uso dos multiplicadores de XP/Gold por zona. Desligado (padrão)
// deixa XP e gold iguais ao Tibia (multiplicador 1 em todas as zonas).
export function setUseZoneMultipliers(on) {
  const cfg = getAdminConfig();
  cfg.useZoneMultipliers = !!on;
  G.adminConfig = sanitizeAdminConfig(cfg);
  emit(EVENTS.ADMIN_PANEL);
  emit(EVENTS.ZONE_PICKER); // os cards de zona mostram o multiplicador efetivo
  emit(EVENTS.NOTIFY, { msg: cfg.useZoneMultipliers ? '⚙️ Multiplicadores de zona ligados.' : '⚙️ Modo Tibia: XP/Gold sem multiplicador.', type: 'success' });
  saveGame();
}

// Define o override de XP ou Gold (kind = 'xp' | 'gold') de UMA zona.
export function setZoneMultiplier(zoneId, kind, value) {
  const cfg = getAdminConfig();
  cfg.zoneMultipliers = cfg.zoneMultipliers || {};
  cfg.zoneMultipliers[zoneId] = cfg.zoneMultipliers[zoneId] || {};
  cfg.zoneMultipliers[zoneId][kind] = Number(value) || 0;
  G.adminConfig = sanitizeAdminConfig(cfg);
  emit(EVENTS.ADMIN_PANEL);
  emit(EVENTS.ZONE_PICKER);
  saveGame();
}

// Mercado entre jogadores ligado/desligado (padrão: desligado). Enquanto
// desligado, a aba 🏪 fica escondida e o painel mostra aviso (ver ui/tabs.js:
// applyMarketVisibility e ui/marketPanel.js).
export const isMarketEnabled = () => getAdminConfig().marketEnabled;
export function setMarketEnabled(on) {
  const cfg = getAdminConfig();
  cfg.marketEnabled = !!on;
  G.adminConfig = sanitizeAdminConfig(cfg);
  emit(EVENTS.ADMIN_PANEL);
  emit(EVENTS.MARKET_VISIBILITY, { enabled: cfg.marketEnabled });
  emit(EVENTS.NOTIFY, { msg: cfg.marketEnabled ? '🏪 Mercado entre jogadores ativado.' : '🏪 Mercado entre jogadores desativado.', type: 'success' });
  saveGame();
}

// Stamina e consumo de munição — fidelidades opcionais ligadas pelo dono.
export const isStaminaEnabled = () => getAdminConfig().staminaEnabled;
export const isConsumeAmmo = () => getAdminConfig().consumeAmmo;
export function setStaminaEnabled(on) {
  const cfg = getAdminConfig();
  cfg.staminaEnabled = !!on;
  G.adminConfig = sanitizeAdminConfig(cfg);
  emit(EVENTS.ADMIN_PANEL);
  emit(EVENTS.HUNT_STATS);
  emit(EVENTS.NOTIFY, { msg: cfg.staminaEnabled ? '🔋 Stamina ativada.' : '🔋 Stamina desativada.', type: 'success' });
  saveGame();
}
export function setConsumeAmmo(on) {
  const cfg = getAdminConfig();
  cfg.consumeAmmo = !!on;
  G.adminConfig = sanitizeAdminConfig(cfg);
  emit(EVENTS.ADMIN_PANEL);
  emit(EVENTS.NOTIFY, { msg: cfg.consumeAmmo ? '🏹 Consumo de munição ativado.' : '🏹 Munição infinita.', type: 'success' });
  saveGame();
}

export function resetAdminConfig() {
  G.adminConfig = sanitizeAdminConfig({ ...DEFAULT_ADMIN_CONFIG, rarityWeights: { ...DEFAULT_ADMIN_CONFIG.rarityWeights } });
  emit(EVENTS.ADMIN_PANEL);
  emit(EVENTS.NOTIFY, { msg: '⚙️ Configurações restauradas ao padrão.', type: 'success' });
  saveGame();
}
