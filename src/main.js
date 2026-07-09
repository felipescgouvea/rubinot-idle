// ===== RUBINOT IDLE — composition root =====
// Único ponto que conhece todas as camadas: liga os eventos da application
// aos renders da ui, expõe no window só o que o HTML (estático e gerado
// dinamicamente via innerHTML) precisa chamar via onclick/onchange, e
// dispara a sequência de inicialização do jogo.

import { G } from './application/gameStore.js';
import { VOCATIONS } from './domain/character.js';
import { emit, EVENTS } from './shared/eventBus.js';

// application
import { saveGame } from './application/saveGameUseCase.js';
import { loadGame, applyOfflineProgress, confirmReset } from './application/persistenceUseCases.js';
import { selectVocation } from './application/characterUseCases.js';
import { toggleHunt, selectZone, startRegen } from './application/huntUseCases.js';
import { equipItem, unequipItem, sellItem, useItem } from './application/inventoryUseCases.js';
import { startTask, cancelTask } from './application/taskUseCases.js';
import { selectWorld, checkWorldUnlocks } from './application/worldUseCases.js';
import { claimBpReward } from './application/battlePassUseCases.js';
import { buyShopItem } from './application/shopUseCases.js';
import { setRtc } from './application/rtcUseCases.js';
import { selectSpell } from './application/spellUseCases.js';
import { registerPlayerName, submitScore } from './application/highscoresUseCases.js';
import { depositToMarket, withdrawFromMarket, listItemOnMarket, cancelMyListing, buyMarketListing } from './application/marketUseCases.js';

// ui
import { closeModal, wireSharedEvents } from './ui/shared.js';
import { renderCharPanel, renderPlayerBattleSide, wireCharacterPanelEvents } from './ui/characterPanel.js';
import { renderMonsterDisplay, wireHuntPanelEvents } from './ui/huntPanel.js';
import { renderEquipmentSlots, openItemModal, wireInventoryAndEquipmentEvents } from './ui/inventoryAndEquipmentPanel.js';
import { wireTasksPanelEvents } from './ui/tasksPanel.js';
import { handleArenaBattleClick } from './ui/arenaPanel.js';
import { wireWorldsPanelEvents } from './ui/worldsPanel.js';
import { wireBattlePassPanelEvents } from './ui/battlePassPanel.js';
import { wireShopPanelEvents } from './ui/shopPanel.js';
import { wireSpellsPanelEvents } from './ui/spellsPanel.js';
import { wireRtcPanelEvents } from './ui/rtcPanel.js';
import { refreshHighscoresClick, wireHighscoresPanelEvents } from './ui/highscoresPanel.js';
import { handleMarketRegisterClick, wireMarketPanelEvents } from './ui/marketPanel.js';
import { wireTabs } from './ui/tabs.js';

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

// ---- superfície pública pro HTML (estático e gerado via innerHTML) ----
// É basicamente a "view" do padrão MVC exposta como funções soltas, porque o
// HTML é gerado como string e usa onclick inline — não há outra forma de ligar
// eventos a conteúdo que nem existe no DOM ainda no momento em que o módulo carrega.
Object.assign(window, {
  saveGame, confirmReset, selectVocation, toggleHunt, selectZone, closeModal,
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
