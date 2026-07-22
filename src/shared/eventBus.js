// Barramento de eventos minúsculo: é o que permite a camada application
// notificar a camada ui ("algo mudou, re-renderize") sem importar a ui
// diretamente — application nunca deveria depender de UI/DOM. Sem isso,
// teríamos um import circular real (ui chama application; application
// precisaria chamar de volta render* da ui).
const listeners = new Map();

export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => listeners.get(event)?.delete(handler);
}

export function emit(event, payload) {
  listeners.get(event)?.forEach(handler => handler(payload));
}

// Nomes de evento centralizados: application só emite os nomes daqui, ui só
// escuta os nomes daqui — um erro de digitação vira erro de import, não um
// bug silencioso de "a tela não atualizou".
export const EVENTS = {
  NOTIFY: 'notify',
  LOG: 'log',
  MODAL_OPEN: 'modalOpen',
  MODAL_CLOSE: 'modalClose',
  ITEM_MODAL_DONE: 'itemModalDone',
  CHAR_PANEL: 'charPanel',
  CHAR_INFO: 'charInfo',
  BARS: 'bars',
  HEADER_STATS: 'headerStats',
  PLAYER_BATTLE_SIDE: 'playerBattleSide',
  MONSTER_DISPLAY: 'monsterDisplay',
  BATTLE_LIST: 'battleList',
  EQUIPMENT_SLOTS: 'equipmentSlots',
  INVENTORY: 'inventory',
  LOOT: 'loot',
  KILL_COUNTERS: 'killCounters',
  ZONE_PICKER: 'zonePicker',
  HUNT_BUTTON: 'huntButton',
  TASKS_PANEL: 'tasksPanel',
  ACTIVE_TASK: 'activeTask',
  ARENA_PANEL: 'arenaPanel',
  BOSS_RUSH_PANEL: 'bossRushPanel',
  WORLDS_PANEL: 'worldsPanel',
  BATTLE_PASS_PANEL: 'battlePassPanel',
  SHOP_PANEL: 'shopPanel',
  RTC_PANEL: 'rtcPanel',
  MARKET_PANEL: 'marketPanel',
  MARKET_VISIBILITY: 'marketVisibility',
  COMBAT_FX: 'combatFx',
  COMBAT_PROJECTILE: 'combatProjectile',
  COMBAT_PROJECTILE_LANDED: 'combatProjectileLanded',
  HUNT_STATS: 'huntStats',
  BLESSINGS: 'blessings',
  HIGHSCORES_PANEL: 'highscoresPanel',
  OFFLINE_PROGRESS: 'offlineProgress',
  OUTFIT_PICKER: 'outfitPicker',
  ADMIN_PANEL: 'adminPanel',
  PREY_PANEL: 'preyPanel',
  BESTIARY_PANEL: 'bestiaryPanel',
  DAILY_REWARD_PANEL: 'dailyRewardPanel',
  TRAINING_PANEL: 'trainingPanel',
  // eventos "de domínio" internos à application, usados para evitar imports
  // circulares entre casos de uso de áreas diferentes (ex.: caçada não
  // precisa saber que tasks existem, só anuncia "matei uma criatura X")
  MONSTER_KILLED: 'monsterKilled',
  LEVEL_UP: 'levelUp',
  // Graduação: o personagem atingiu o nível de sair da ilha inicial e ainda não
  // escolheu a vocação definitiva (ver application/characterUseCases.js:
  // graduate / ui/graduationModal.js).
  GRADUATION: 'graduation',
};
