// ===== RUBINOT IDLE — composition root =====
// Único ponto que conhece todas as camadas: liga os eventos da application
// aos renders da ui, expõe no window só o que o HTML (estático e gerado
// dinamicamente via innerHTML) precisa chamar via onclick/onchange, e
// dispara a sequência de inicialização do jogo.

import { G } from './application/gameStore.js?v=43';
import { VOCATIONS } from './domain/character.js?v=43';
import { emit, EVENTS } from './shared/eventBus.js?v=43';

// application
import { saveGame } from './application/saveGameUseCase.js?v=43';
import { loadGame, applyOfflineProgress, confirmReset } from './application/persistenceUseCases.js?v=43';
import { selectVocation } from './application/characterUseCases.js?v=43';
import { toggleHunt, startRegen } from './application/huntUseCases.js?v=43';
import { equipItem, unequipItem, sellItem, sellAllItem, useItem, equipRelic, sellRelic } from './application/inventoryUseCases.js?v=43';
import { startTask, cancelTask } from './application/taskUseCases.js?v=43';
import { selectWorld, checkWorldUnlocks } from './application/worldUseCases.js?v=43';
import { claimBpReward, claimMissionReward } from './application/battlePassUseCases.js?v=43';
import { buyShopItem } from './application/shopUseCases.js?v=43';
import { setRtcAttackSpell, setRtcAttackRune, setRtcHealSpell, setRtcHealPotion, setRtcThreshold } from './application/rtcUseCases.js?v=43';
import { registerPlayerName, submitScore } from './application/highscoresUseCases.js?v=43';
import { depositToMarket, withdrawFromMarket, listItemOnMarket, cancelMyListing, buyMarketListing } from './application/marketUseCases.js?v=43';
import { setOutfitGender, selectOutfit, buyOutfit, toggleOutfitAddon, setOutfitColor } from './application/outfitUseCases.js?v=43';
import { rerollPrey, clearPrey } from './application/preyUseCases.js?v=43';
import { unlockCharm, toggleCharmEquipped } from './application/bestiaryUseCases.js?v=43';
import { claimDailyReward } from './application/dailyRewardUseCases.js?v=43';
import { startTraining, stopTraining, resumeTrainingOnLoad } from './application/trainingUseCases.js?v=43';

// ui
import { closeModal, setLogFilter, wireSharedEvents } from './ui/shared.js?v=43';
import { renderCharPanel, renderPlayerBattleSide, wireCharacterPanelEvents } from './ui/characterPanel.js?v=43';
import { renderMonsterDisplay, wireHuntPanelEvents } from './ui/huntPanel.js?v=43';
import { renderEquipmentSlots, openItemModal, openRelicModal, toggleBackpack, wireInventoryAndEquipmentEvents } from './ui/inventoryAndEquipmentPanel.js?v=43';
import { wireTasksPanelEvents } from './ui/tasksPanel.js?v=43';
import { handleArenaBattleClick, handleClaimArenaDivision } from './ui/arenaPanel.js?v=43';
import { wireWorldsPanelEvents } from './ui/worldsPanel.js?v=43';
import { wireBattlePassPanelEvents } from './ui/battlePassPanel.js?v=43';
import { wireShopPanelEvents } from './ui/shopPanel.js?v=43';
import { wireRtcPanelEvents, setRtcSubTab } from './ui/rtcPanel.js?v=43';
import { refreshHighscoresClick, wireHighscoresPanelEvents } from './ui/highscoresPanel.js?v=43';
import { handleMarketRegisterClick, wireMarketPanelEvents } from './ui/marketPanel.js?v=43';
import { openOutfitPicker, setActiveColorChannel, wireOutfitPickerEvents } from './ui/outfitPicker.js?v=43';
import { openZonePicker, pickZone } from './ui/zonePicker.js?v=43';
import { openBattleModal, closeBattleModal } from './ui/battleModal.js?v=43';
import { challengeBoss, stopBossRushClick, wireBossRushPanelEvents } from './ui/bossRushPanel.js?v=43';
import { openPreySelect, pickPrey, wireBestiaryPanelEvents } from './ui/bestiaryPanel.js?v=43';
import { wireTrainingPanelEvents } from './ui/trainingPanel.js?v=43';
import { openDailyReward, renderDailyBadge, wireDailyRewardEvents } from './ui/dailyRewardPanel.js?v=43';
import { renderBoostedPanel } from './ui/boostedPanel.js?v=43';
import { wireTabs } from './ui/tabs.js?v=43';

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
  setRtcAttackSpell, setRtcAttackRune, setRtcHealSpell, setRtcHealPotion, setRtcThreshold, setRtcSubTab,
  registerPlayerName, refreshHighscoresClick,
  handleMarketRegisterClick, depositToMarket, withdrawFromMarket, listItemOnMarket, cancelMyListing, buyMarketListing,
  openOutfitPicker, setOutfitGender, selectOutfit, buyOutfit, toggleOutfitAddon, setOutfitColor, setActiveColorChannel,
  openZonePicker, pickZone,
  openBattleModal, closeBattleModal,
  setLogFilter,
  openPreySelect, pickPrey, rerollPrey, clearPrey,
  unlockCharm, toggleCharmEquipped,
  openDailyReward, claimDailyReward,
  startTraining, stopTraining,
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

// ---- init ----
wireTabs();

loadGame();
G.hunting = false; // caçada nunca retoma sozinha — o ganho offline cobre o intervalo
applyOfflineProgress();
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

// ---- auto-save ----
setInterval(saveGame, 30000);
