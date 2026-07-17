// ===== RUBINOT IDLE — composition root =====
// Único ponto que conhece todas as camadas: liga os eventos da application
// aos renders da ui, expõe no window só o que o HTML (estático e gerado
// dinamicamente via innerHTML) precisa chamar via onclick/onchange, e
// dispara a sequência de inicialização do jogo.

import { G } from './application/gameStore.js?v=129';
import { VOCATIONS } from './domain/character.js?v=156';
import { emit, EVENTS } from './shared/eventBus.js?v=126';
import { getLocale, setLocale, applyStaticTranslations } from './i18n/i18n.js?v=139';

// application
import { saveGame, flushCloudSave } from './application/saveGameUseCase.js?v=129';
import { loadGame, confirmReset, applyCloudSave } from './application/persistenceUseCases.js?v=161';
import { confirmSwitchCharacterSlot } from './application/accountUseCases.js?v=127';
import { isLoggedIn, ensureValidToken, loadCloudSave, consumeAuthRedirect } from './infrastructure/authClient.js?v=131';
import { selectVocation } from './application/characterUseCases.js?v=128';
import { toggleHunt, startRegen, selectTarget, checkAndResumeHuntSession } from './application/huntUseCases.js?v=171';
import { equipItem, unequipItem, sellItem, sellAllItem, useItem, equipRelic, sellRelic, setAutoSell, setAutoSellMax } from './application/inventoryUseCases.js?v=132';
import { startTask, cancelTask } from './application/taskUseCases.js?v=129';
import { selectWorld, checkWorldUnlocks } from './application/worldUseCases.js?v=129';
import { claimBpReward, claimMissionReward } from './application/battlePassUseCases.js?v=126';
import { buyShopItem } from './application/shopUseCases.js?v=131';
import { buyBlessing } from './application/blessingUseCases.js?v=127';
import { setRtcAttackSpellSlot, clearRtcAttackSpellSlot, setRtcSmartElement, setRtcHealSpell, setRtcHealPotion, setRtcManaPotion, clearRtcPotion, setRtcThreshold } from './application/rtcUseCases.js?v=159';
import { registerPlayerName, submitScore } from './application/highscoresUseCases.js?v=129';
import { depositToMarket, withdrawFromMarket, listItemOnMarket, cancelMyListing, buyMarketListing } from './application/marketUseCases.js?v=127';
import { setOutfitGender, selectOutfit, buyOutfit, toggleOutfitAddon, setOutfitColor } from './application/outfitUseCases.js?v=126';
import { rerollPrey, clearPrey } from './application/preyUseCases.js?v=127';
import { unlockCharm, toggleCharmEquipped } from './application/bestiaryUseCases.js?v=127';
import { claimDailyReward } from './application/dailyRewardUseCases.js?v=126';
import { startTraining, stopTraining, startOnlineTraining, resumeTrainingOnLoad } from './application/trainingUseCases.js?v=130';

// ui
import { closeModal, setLogFilter, wireSharedEvents } from './ui/shared.js?v=131';
import { renderCharPanel, renderPlayerBattleSide, wireCharacterPanelEvents, createCharacter } from './ui/characterPanel.js?v=129';
import { renderMonsterDisplay, wireHuntPanelEvents } from './ui/huntPanel.js?v=136';
import { renderEquipmentSlots, openItemModal, openRelicModal, toggleBackpack, wireInventoryAndEquipmentEvents } from './ui/inventoryAndEquipmentPanel.js?v=129';
import { wireTasksPanelEvents, setTaskRoom } from './ui/tasksPanel.js?v=130';
import { handleArenaBattleClick, handleClaimArenaDivision } from './ui/arenaPanel.js?v=126';
import { wireWorldsPanelEvents } from './ui/worldsPanel.js?v=126';
import { wireBattlePassPanelEvents } from './ui/battlePassPanel.js?v=126';
import { wireShopPanelEvents, setShopTab, setShopGroup, onShopQtyInput, stepShopQty, scrollShopQty, getShopQty, confirmBuyShopItem } from './ui/shopPanel.js?v=133';
import { wireRtcPanelEvents, setRtcSubTab, handleRtcPotionDrop, openRtcPotionPicker, pickRtcPotion, openRtcAttackSpellPicker, pickRtcAttackSpell } from './ui/rtcPanel.js?v=160';
import { refreshHighscoresClick, wireHighscoresPanelEvents, setHighscoresCategory } from './ui/highscoresPanel.js?v=130';
import { handleMarketRegisterClick, wireMarketPanelEvents } from './ui/marketPanel.js?v=127';
import { openOutfitPicker, setActiveColorChannel, wireOutfitPickerEvents } from './ui/outfitPicker.js?v=126';
import { openZonePicker, pickZone, openCity, backToCities } from './ui/zonePicker.js?v=133';
import { openBattleModal, closeBattleModal } from './ui/battleModal.js?v=125';
import { challengeBoss, stopBossRushClick, wireBossRushPanelEvents } from './ui/bossRushPanel.js?v=127';
import { openPreySelect, pickPrey, wireBestiaryPanelEvents } from './ui/bestiaryPanel.js?v=128';
import { wireTrainingPanelEvents, pickTrainingSpell, pickedTrainingSpellId } from './ui/trainingPanel.js?v=132';
import { setSkillsSubtab } from './ui/skillsPanel.js?v=128';
import { openDailyReward, renderDailyBadge, wireDailyRewardEvents } from './ui/dailyRewardPanel.js?v=127';
import { renderBoostedPanel } from './ui/boostedPanel.js?v=127';
import { wireAdminPanelEvents } from './ui/adminPanel.js?v=131';
import { showAuthGate, showLoadingGate, hideAuthGate, setAuthSuccessHandler, renderAuthUser, logout } from './ui/authPanel.js?v=126';
import { openSettingsPanel } from './ui/settingsPanel.js?v=129';
import { setAdminRate, setRelicDropChancePct, setRarityPercent, resetAdminConfig, setUseZoneMultipliers, setZoneMultiplier, setMarketEnabled, setStaminaEnabled, setConsumeAmmo, setZoneSpawnWeight, setZonePackRange, setLootChance, resetLootChance, initGameConfig } from './application/adminUseCases.js?v=129';
import { setAdminSpawnZone, setAdminTab, setAdminLootZone } from './ui/adminPanel.js?v=131';
import { wireTabs, applyMarketVisibility, applyAdminTabVisibility } from './ui/tabs.js?v=131';

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
  saveGame, confirmReset, selectVocation, createCharacter, toggleHunt, selectTarget, closeModal,
  openItemModal, equipItem, unequipItem, sellItem, sellAllItem, useItem, setAutoSell, setAutoSellMax,
  openRelicModal, equipRelic, sellRelic, toggleBackpack,
  challengeBoss, stopBossRushClick,
  startTask, cancelTask, setTaskRoom,
  startArenaBattle: handleArenaBattleClick,
  handleClaimArenaDivision,
  selectWorld,
  claimBpReward, claimMissionReward,
  buyShopItem, confirmBuyShopItem, setShopTab, setShopGroup, onShopQtyInput, stepShopQty, scrollShopQty, getShopQty, buyBlessing,
  setRtcAttackSpellSlot, clearRtcAttackSpellSlot, setRtcSmartElement, setRtcHealSpell, setRtcHealPotion, setRtcManaPotion, clearRtcPotion, handleRtcPotionDrop, setRtcThreshold, setRtcSubTab, openRtcPotionPicker, pickRtcPotion, openRtcAttackSpellPicker, pickRtcAttackSpell,
  registerPlayerName, refreshHighscoresClick, setHighscoresCategory,
  handleMarketRegisterClick, depositToMarket, withdrawFromMarket, listItemOnMarket, cancelMyListing, buyMarketListing,
  openOutfitPicker, setOutfitGender, selectOutfit, buyOutfit, toggleOutfitAddon, setOutfitColor, setActiveColorChannel, setSkillsSubtab,
  openZonePicker, pickZone, openCity, backToCities,
  openBattleModal, closeBattleModal,
  setLogFilter,
  openPreySelect, pickPrey, rerollPrey, clearPrey,
  unlockCharm, toggleCharmEquipped,
  openDailyReward, claimDailyReward,
  startTraining, stopTraining, startOnlineTraining, pickTrainingSpell, pickedTrainingSpellId,
  setAdminRate, setRelicDropChancePct, setRarityPercent, resetAdminConfig, setUseZoneMultipliers, setZoneMultiplier, setMarketEnabled, setStaminaEnabled, setConsumeAmmo, setZoneSpawnWeight, setZonePackRange, setAdminSpawnZone, setAdminTab, setAdminLootZone, setLootChance, resetLootChance,
  openSettingsPanel, logout, setLocale, confirmSwitchCharacterSlot,
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
async function bootGame() {
  if (gameBooted) return; // idempotente — nunca inicia o jogo duas vezes
  gameBooted = true;

  loadGame();
  G.hunting = false; // só fica true de novo se o servidor confirmar sessão viva (ver abaixo)
  // O servidor de caçada (Railway) continua tickando sozinho mesmo com a aba
  // fechada — se a sessão ainda está ativa lá, aquele tempo JÁ foi contado de
  // verdade e checkAndResumeHuntSession() já traz o ganho real (ver
  // reconcileWithServer em huntUseCases.js). Não há mais estimativa aproximada
  // de progresso offline (ver persistenceUseCases.js: applyOfflineProgress) —
  // se o servidor caiu enquanto o jogador estava fora, essa janela específica
  // simplesmente não rende nada, de propósito (ver comentário lá).
  await checkAndResumeHuntSession();
  renderAuthUser();
  renderCharPanel();
  emit(EVENTS.HEADER_STATS);
  renderMonsterDisplay();
  renderPlayerBattleSide();
  renderEquipmentSlots();
  emit(EVENTS.HUNT_STATS); // render inicial do Hunt Analyzer
  emit(EVENTS.BLESSINGS); // render inicial das Bênçãos
  document.body.dataset.tab = 'hunt';
  applyMarketVisibility(); // esconde a aba 🏪 se o mercado estiver desligado no admin
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
  // Config privilegiada (taxas de XP/gold/loot etc.) e checagem de admin vêm
  // do servidor (public.game_config/public.admins) — nunca mais do save do
  // próprio jogador. Roda em paralelo com o load da nuvem e precisa terminar
  // ANTES do bootGame(), porque loadGame()/applyOfflineProgress() já chamam
  // getXpRate() etc. (ver application/adminUseCases.js).
  const [cloud] = await Promise.all([loadCloudSave(), initGameConfig()]); // { ok, data }
  if (cloud.ok) {
    // Leitura OK: se há save na nuvem, ele vira a fonte de verdade; se não há
    // (conta nova), mantém o local (importa progresso de quem jogava sem conta).
    applyCloudSave(cloud.data);
  } else {
    // Leitura FALHOU (rede/servidor/token): NÃO sobrescreve nada e a gravação na
    // nuvem já fica bloqueada nesta sessão (ver authClient: cloudReadFailed) —
    // assim o save bom na nuvem não corre risco de ser apagado por um estado
    // vazio. Avisa o jogador pra recarregar.
    emit(EVENTS.NOTIFY, { msg: '⚠️ Não consegui carregar seu save da nuvem agora. Seu progresso na nuvem está preservado — recarregue a página. O envio pra nuvem está pausado nesta sessão por segurança.', type: 'error' });
  }
  applyAdminTabVisibility();
  // hideAuthGate() só DEPOIS do bootGame() terminar — escondê-lo antes revela
  // o #app ainda com o HTML estático padrão (tela de "criar personagem", 0
  // gold, sem equipamento) por um instante, mesmo pra quem já tem personagem,
  // até os renders do boot rodarem. Parece (e assusta) como se o personagem
  // tivesse sumido.
  await bootGame();
  hideAuthGate();
}

// ---- idioma: aplica ANTES de qualquer render, senão a UI pisca em inglês e
// troca pro idioma certo um instante depois ----
document.documentElement.lang = getLocale();
applyStaticTranslations();

// ---- init ----
wireTabs();
setAuthSuccessHandler(startAuthedSession);

(async () => {
  // Se o usuário acabou de voltar pelo link de confirmação do e-mail, os tokens
  // vêm no fragmento da URL — captura e já entra logado.
  consumeAuthRedirect();
  // Login obrigatório: sem sessão válida, mostra o gate e NÃO inicia o jogo.
  if (isLoggedIn()) {
    showLoadingGate(); // cobre o #app até o boot terminar (ver ui/authPanel.js)
    const token = await ensureValidToken();
    if (token) { await startAuthedSession(); return; }
  }
  showAuthGate();
})();
