// ===== RUBINOT IDLE — composition root =====
// Único ponto que conhece todas as camadas: liga os eventos da application
// aos renders da ui, expõe no window só o que o HTML (estático e gerado
// dinamicamente via innerHTML) precisa chamar via onclick/onchange, e
// dispara a sequência de inicialização do jogo.

import { G } from './application/gameStore.js?v=15';
import { VOCATIONS } from './domain/character.js?v=15';
import { emit, EVENTS } from './shared/eventBus.js?v=15';

// application
import { saveGame } from './application/saveGameUseCase.js?v=15';
import { loadGame, applyOfflineProgress, confirmReset } from './application/persistenceUseCases.js?v=15';
import { selectVocation } from './application/characterUseCases.js?v=15';
import { toggleHunt, startRegen } from './application/huntUseCases.js?v=15';
import { equipItem, unequipItem, sellItem, useItem } from './application/inventoryUseCases.js?v=15';
import { startTask, cancelTask } from './application/taskUseCases.js?v=15';
import { selectWorld, checkWorldUnlocks } from './application/worldUseCases.js?v=15';
import { claimBpReward } from './application/battlePassUseCases.js?v=15';
import { buyShopItem } from './application/shopUseCases.js?v=15';
import { setRtc } from './application/rtcUseCases.js?v=15';
import { selectSpell } from './application/spellUseCases.js?v=15';
import { registerPlayerName, submitScore } from './application/highscoresUseCases.js?v=15';
import { depositToMarket, withdrawFromMarket, listItemOnMarket, cancelMyListing, buyMarketListing } from './application/marketUseCases.js?v=15';
import { setOutfitGender, selectOutfit, buyOutfit, toggleOutfitAddon, setOutfitColor } from './application/outfitUseCases.js?v=15';

// ui
import { closeModal, wireSharedEvents } from './ui/shared.js?v=15';
import { renderCharPanel, renderPlayerBattleSide, wireCharacterPanelEvents } from './ui/characterPanel.js?v=15';
import { renderMonsterDisplay, wireHuntPanelEvents } from './ui/huntPanel.js?v=15';
import { renderEquipmentSlots, openItemModal, wireInventoryAndEquipmentEvents } from './ui/inventoryAndEquipmentPanel.js?v=15';
import { wireTasksPanelEvents } from './ui/tasksPanel.js?v=15';
import { handleArenaBattleClick } from './ui/arenaPanel.js?v=15';
import { wireWorldsPanelEvents } from './ui/worldsPanel.js?v=15';
import { wireBattlePassPanelEvents } from './ui/battlePassPanel.js?v=15';
import { wireShopPanelEvents } from './ui/shopPanel.js?v=15';
import { wireSpellsPanelEvents } from './ui/spellsPanel.js?v=15';
import { wireRtcPanelEvents } from './ui/rtcPanel.js?v=15';
import { refreshHighscoresClick, wireHighscoresPanelEvents } from './ui/highscoresPanel.js?v=15';
import { handleMarketRegisterClick, wireMarketPanelEvents } from './ui/marketPanel.js?v=15';
import { openOutfitPicker, setActiveColorChannel, wireOutfitPickerEvents } from './ui/outfitPicker.js?v=15';
import { openZonePicker, pickZone } from './ui/zonePicker.js?v=15';
import { openBattleModal, closeBattleModal } from './ui/battleModal.js?v=15';
import { wireTabs } from './ui/tabs.js?v=15';

// ---- liga application -> ui via barramento de eventos (ver src/shared/eventBus.js) ----
wireSharedEvents();
wireCharacterPanelEvents();
wireHuntPanelEvents();
wireInventoryAndEquipmentEvents();
wireTasksPanelEvents();
wireWorldsPanelEvents();
wireBattlePassPanelEvents();
wireShopPanelEvents();
wireSpellsPanelEvents();
wireRtcPanelEvents();
wireHighscoresPanelEvents();
wireMarketPanelEvents();
wireOutfitPickerEvents();

// ---- superfície pública pro HTML (estático e gerado via innerHTML) ----
// É basicamente a "view" do padrão MVC exposta como funções soltas, porque o
// HTML é gerado como string e usa onclick inline — não há outra forma de ligar
// eventos a conteúdo que nem existe no DOM ainda no momento em que o módulo carrega.
Object.assign(window, {
  saveGame, confirmReset, selectVocation, toggleHunt, closeModal,
  openItemModal, equipItem, unequipItem, sellItem, useItem,
  startTask, cancelTask,
  startArenaBattle: handleArenaBattleClick,
  selectWorld,
  claimBpReward,
  buyShopItem,
  selectSpell,
  setRtc,
  registerPlayerName, refreshHighscoresClick,
  handleMarketRegisterClick, depositToMarket, withdrawFromMarket, listItemOnMarket, cancelMyListing, buyMarketListing,
  openOutfitPicker, setOutfitGender, selectOutfit, buyOutfit, toggleOutfitAddon, setOutfitColor, setActiveColorChannel,
  openZonePicker, pickZone,
  openBattleModal, closeBattleModal,
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
startRegen();
emit(EVENTS.LOG, '<span class="log-info">⚔️ Bem-vindo ao Rubinot Idle! Escolha sua vocação para começar.</span>');

if (G.vocation) {
  emit(EVENTS.LOG, `<span class="log-info">Partida carregada — ${VOCATIONS[G.vocation].name} Nível ${G.level}</span>`);
}

// ---- auto-save ----
setInterval(saveGame, 30000);
