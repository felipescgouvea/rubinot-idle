// ===== RUBINOT IDLE — composition root =====
// Único ponto que conhece todas as camadas: liga os eventos da application
// aos renders da ui, expõe no window só o que o HTML (estático e gerado
// dinamicamente via innerHTML) precisa chamar via onclick/onchange, e
// dispara a sequência de inicialização do jogo.

import { G } from './application/gameStore.js?v=60';
import { VOCATIONS } from './domain/character.js?v=60';
import { emit, EVENTS } from './shared/eventBus.js?v=60';

// application
import { saveGame, flushCloudSave } from './application/saveGameUseCase.js?v=60';
import { loadGame, applyOfflineProgress, confirmReset, applyCloudSave } from './application/persistenceUseCases.js?v=60';
import { isLoggedIn, ensureValidToken, loadCloudSave, consumeAuthRedirect } from './infrastructure/authClient.js?v=60';
import { selectVocation } from './application/characterUseCases.js?v=60';
import { toggleHunt, startRegen } from './application/huntUseCases.js?v=60';
import { equipItem, unequipItem, sellItem, sellAllItem, useItem, equipRelic, sellRelic } from './application/inventoryUseCases.js?v=60';
import { startTask, cancelTask } from './application/taskUseCases.js?v=60';
import { selectWorld, checkWorldUnlocks } from './application/worldUseCases.js?v=60';
import { claimBpReward, claimMissionReward } from './application/battlePassUseCases.js?v=60';
import { buyShopItem } from './application/shopUseCases.js?v=60';
import { setRtcAttackSpell, setRtcAttackRune, setRtcHealSpell, setRtcHealPotion, setRtcManaPotion, setRtcThreshold } from './application/rtcUseCases.js?v=60';
import { registerPlayerName, submitScore } from './application/highscoresUseCases.js?v=60';
import { depositToMarket, withdrawFromMarket, listItemOnMarket, cancelMyListing, buyMarketListing } from './application/marketUseCases.js?v=60';
import { setOutfitGender, selectOutfit, buyOutfit, toggleOutfitAddon, setOutfitColor } from './application/outfitUseCases.js?v=60';
import { rerollPrey, clearPrey } from './application/preyUseCases.js?v=60';
import { unlockCharm, toggleCharmEquipped } from './application/bestiaryUseCases.js?v=60';
import { claimDailyReward } from './application/dailyRewardUseCases.js?v=60';
import { startTraining, stopTraining, resumeTrainingOnLoad } from './application/trainingUseCases.js?v=60';

// ui
import { closeModal, setLogFilter, wireSharedEvents } from './ui/shared.js?v=60';
import { renderCharPanel, renderPlayerBattleSide, wireCharacterPanelEvents } from './ui/characterPanel.js?v=60';
import { renderMonsterDisplay, wireHuntPanelEvents } from './ui/huntPanel.js?v=60';
import { renderEquipmentSlots, openItemModal, openRelicModal, toggleBackpack, wireInventoryAndEquipmentEvents } from './ui/inventoryAndEquipmentPanel.js?v=60';
import { wireTasksPanelEvents } from './ui/tasksPanel.js?v=60';
import { handleArenaBattleClick, handleClaimArenaDivision } from './ui/arenaPanel.js?v=60';
import { wireWorldsPanelEvents } from './ui/worldsPanel.js?v=60';
import { wireBattlePassPanelEvents } from './ui/battlePassPanel.js?v=60';
import { wireShopPanelEvents } from './ui/shopPanel.js?v=60';
import { wireRtcPanelEvents, setRtcSubTab } from './ui/rtcPanel.js?v=60';
import { refreshHighscoresClick, wireHighscoresPanelEvents } from './ui/highscoresPanel.js?v=60';
import { handleMarketRegisterClick, wireMarketPanelEvents } from './ui/marketPanel.js?v=60';
import { openOutfitPicker, setActiveColorChannel, wireOutfitPickerEvents } from './ui/outfitPicker.js?v=60';
import { openZonePicker, pickZone, openCity, backToCities } from './ui/zonePicker.js?v=60';
import { openBattleModal, closeBattleModal } from './ui/battleModal.js?v=60';
import { challengeBoss, stopBossRushClick, wireBossRushPanelEvents } from './ui/bossRushPanel.js?v=60';
import { openPreySelect, pickPrey, wireBestiaryPanelEvents } from './ui/bestiaryPanel.js?v=60';
import { wireTrainingPanelEvents } from './ui/trainingPanel.js?v=60';
import { openDailyReward, renderDailyBadge, wireDailyRewardEvents } from './ui/dailyRewardPanel.js?v=60';
import { renderBoostedPanel } from './ui/boostedPanel.js?v=60';
import { wireAdminPanelEvents } from './ui/adminPanel.js?v=60';
import { showAuthGate, hideAuthGate, setAuthSuccessHandler, renderAuthUser } from './ui/authPanel.js?v=60';
import { setAdminRate, setRelicDropChancePct, setRarityWeight, resetAdminConfig, setUseZoneMultipliers, setZoneMultiplier } from './application/adminUseCases.js?v=60';
import { wireTabs } from './ui/tabs.js?v=60';

// ---- liga application -> ui via barramento de eventos (ver src/shared/eventBus.js) ----
wireSharedEvents();
wireCharacterPanelEvents();
wireHuntPanelEvents();
wireInventoryAndEquipmentEvents();
wireTasksPanelEvents();
wireWorldsPanelEvents();
wireBattlePassPanelEvents();
wireShopPanelEvents();
wireRtcPanelEvents();
wireHighscoresPanelEvents();
wireMarketPanelEvents();
wireOutfitPickerEvents();
wireBossRushPanelEvents();
wireBestiaryPanelEvents();
wireTrainingPanelEvents();
wireDailyRewardEvents();
wireAdminPanelEvents();

// ---- superfície pública pro HTML (estático e gerado via innerHTML) ----
// É basicamente a "view" do padrão MVC exposta como funções soltas, porque o
// HTML é gerado como string e usa onclick inline — não há outra forma de ligar
// eventos a conteúdo que nem existe no DOM ainda no momento em que o módulo carrega.
Object.assign(window, {
  saveGame, confirmReset, selectVocation, toggleHunt, closeModal,
  openItemModal, equipItem, unequipItem, sellItem, sellAllItem, useItem,
  openRelicModal, equipRelic, sellRelic, toggleBackpack,
  challengeBoss, stopBossRushClick,
  startTask, cancelTask,
  startArenaBattle: handleArenaBattleClick,
  handleClaimArenaDivision,
  selectWorld,
  claimBpReward, claimMissionReward,
  buyShopItem,
  setRtcAttackSpell, setRtcAttackRune, setRtcHealSpell, setRtcHealPotion, setRtcManaPotion, setRtcThreshold, setRtcSubTab,
  registerPlayerName, refreshHighscoresClick,
  handleMarketRegisterClick, depositToMarket, withdrawFromMarket, listItemOnMarket, cancelMyListing, buyMarketListing,
  openOutfitPicker, setOutfitGender, selectOutfit, buyOutfit, toggleOutfitAddon, setOutfitColor, setActiveColorChannel,
  openZonePicker, pickZone, openCity, backToCities,
  openBattleModal, closeBattleModal,
  setLogFilter,
  openPreySelect, pickPrey, rerollPrey, clearPrey,
  unlockCharm, toggleCharmEquipped,
  openDailyReward, claimDailyReward,
  startTraining, stopTraining,
  setAdminRate, setRelicDropChancePct, setRarityWeight, resetAdminConfig, setUseZoneMultipliers, setZoneMultiplier,
  // utilitário de console pro dono do jogo ajustar o próprio save manualmente
  // (ex.: addGold(1000000000)) — não há UI pra isso de propósito
  addGold: (amount) => {
    G.gold += Math.floor(Number(amount) || 0);
    emit(EVENTS.HEADER_STATS);
    saveGame();
  },
});

// ---- ESC fecha qualquer modal aberto (genérico ou o de batalha) ----
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const battle = document.getElementById('battle-modal-overlay');
  const generic = document.getElementById('modal-overlay');
  if (battle && battle.style.display !== 'none') { closeBattleModal(); return; }
  if (generic && generic.style.display !== 'none') closeModal();
});

// ---- boot do jogo (só roda depois de autenticado) ----
// Sobe o estado da sessão do usuário e liga tudo. Chamado uma única vez, após
// o login puxar o save da nuvem (ver bootGame no fluxo de auth abaixo).
let gameBooted = false;
function bootGame() {
  if (gameBooted) return; // idempotente — nunca inicia o jogo duas vezes
  gameBooted = true;

  loadGame();
  G.hunting = false; // caçada nunca retoma sozinha — o ganho offline cobre o intervalo
  applyOfflineProgress();
  renderAuthUser();
  renderCharPanel();
  emit(EVENTS.HEADER_STATS);
  renderMonsterDisplay();
  renderPlayerBattleSide();
  renderEquipmentSlots();
  document.body.dataset.tab = 'hunt';
  checkWorldUnlocks();
  renderBoostedPanel();
  renderDailyBadge();
  resumeTrainingOnLoad(); // credita treino offline e religa o tick, se havia treino ativo
  startRegen();
  emit(EVENTS.LOG, '<span class="log-info">⚔️ Bem-vindo ao Rubinot Idle! Escolha sua vocação para começar.</span>');

  if (G.vocation) {
    emit(EVENTS.LOG, `<span class="log-info">Partida carregada — ${VOCATIONS[G.vocation].name} Nível ${G.level}</span>`);
  }

  // ---- auto-save (local imediato + push debounced pra nuvem, ver saveGameUseCase) ----
  setInterval(saveGame, 30000);
  // Empurra o save pra nuvem ao sair/minimizar, pra não perder os últimos ganhos.
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushCloudSave(); });
  window.addEventListener('pagehide', () => { flushCloudSave(); });
}

// Puxa o save da nuvem do usuário logado e inicia o jogo. Usado tanto no load
// (sessão já existente) quanto logo após um login/cadastro bem-sucedido.
async function startAuthedSession() {
  let cloud = null;
  try { cloud = await loadCloudSave(); } catch { /* offline: cai no save local */ }
  applyCloudSave(cloud);
  hideAuthGate();
  bootGame();
}

// ---- init ----
wireTabs();
setAuthSuccessHandler(startAuthedSession);

(async () => {
  // Se o usuário acabou de voltar pelo link de confirmação do e-mail, os tokens
  // vêm no fragmento da URL — captura e já entra logado.
  consumeAuthRedirect();
  // Login obrigatório: sem sessão válida, mostra o gate e NÃO inicia o jogo.
  if (isLoggedIn()) {
    const token = await ensureValidToken();
    if (token) { await startAuthedSession(); return; }
  }
  showAuthGate();
})();
