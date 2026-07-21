// ===== RUBINOT IDLE — composition root =====
// Único ponto que conhece todas as camadas: liga os eventos da application
// aos renders da ui, expõe no window só o que o HTML (estático e gerado
// dinamicamente via innerHTML) precisa chamar via onclick/onchange, e
// dispara a sequência de inicialização do jogo.

import { G } from './application/gameStore.js?v=170';
import { VOCATIONS } from './domain/character.js?v=197';
import { emit, EVENTS } from './shared/eventBus.js?v=168';
import { getLocale, setLocale, applyStaticTranslations } from './i18n/i18n.js?v=184';

// application
import { saveGame, flushCloudSave } from './application/saveGameUseCase.js?v=170';
import { loadGame, confirmReset, applyCloudSave } from './application/persistenceUseCases.js?v=209';
import { confirmSwitchCharacterSlot } from './application/accountUseCases.js?v=168';
import { isLoggedIn, ensureValidToken, loadCloudSave, consumeAuthRedirect } from './infrastructure/authClient.js?v=175';
import { selectVocation } from './application/characterUseCases.js?v=171';
import { toggleHunt, startRegen, selectTarget, checkAndResumeHuntSession, setFightMode, renderFightModeButtons, setDensity, renderDensityButtons } from './application/huntUseCases.js?v=234';
import { equipItem, unequipItem, sellItem, sellAllItem, useItem, equipRelic, sellRelic, setAutoSell, setAutoSellMax } from './application/inventoryUseCases.js?v=178';
import { startTask, cancelTask } from './application/taskUseCases.js?v=172';
import { selectWorld, checkWorldUnlocks } from './application/worldUseCases.js?v=172';
import { claimBpReward, claimMissionReward, buyBpPremium, claimWeeklyMissionReward } from './application/battlePassUseCases.js?v=169';
import { buyShopItem } from './application/shopUseCases.js?v=174';
import { buyBlessing } from './application/blessingUseCases.js?v=168';
import { promoteVocation } from './application/promotionUseCases.js?v=166';
import { setRtcAttackSpellSlot, clearRtcAttackSpellSlot, setRtcSmartElement, setRtcHealSpell, setRtcHealPotion, setRtcManaPotion, clearRtcPotion, setRtcThreshold } from './application/rtcUseCases.js?v=202';
import { registerPlayerName, submitScore } from './application/highscoresUseCases.js?v=170';
import { depositToMarket, withdrawFromMarket, listItemOnMarket, cancelMyListing, buyMarketListing, postBuyOffer, fillBuyOffer } from './application/marketUseCases.js?v=170';
import { setOutfitGender, selectOutfit, buyOutfit, toggleOutfitAddon, setOutfitColor } from './application/outfitUseCases.js?v=167';
import { rerollPrey, clearPrey } from './application/preyUseCases.js?v=168';
import { unlockCharm, toggleCharmEquipped } from './application/bestiaryUseCases.js?v=168';
import { claimDailyReward } from './application/dailyRewardUseCases.js?v=168';
import { startTraining, stopTraining, startOnlineTraining, resumeTrainingOnLoad } from './application/trainingUseCases.js?v=174';

// ui
import { closeModal, setLogFilter, wireSharedEvents } from './ui/shared.js?v=173';
import { renderCharPanel, renderPlayerBattleSide, wireCharacterPanelEvents, createCharacter } from './ui/characterPanel.js?v=178';
import { renderMonsterDisplay, wireHuntPanelEvents } from './ui/huntPanel.js?v=187';
import { renderEquipmentSlots, openItemModal, openRelicModal, toggleBackpack, wireInventoryAndEquipmentEvents } from './ui/inventoryAndEquipmentPanel.js?v=171';
import { wireTasksPanelEvents, setTaskRoom } from './ui/tasksPanel.js?v=175';
import { handleArenaBattleClick, handleClaimArenaDivision } from './ui/arenaPanel.js?v=168';
import { wireWorldsPanelEvents } from './ui/worldsPanel.js?v=167';
import { wireBattlePassPanelEvents } from './ui/battlePassPanel.js?v=169';
import { wireShopPanelEvents, setShopTab, setShopGroup, selectShopItem, onShopQtyInput, stepShopQty, scrollShopQty, getShopQty, confirmBuyShopItem } from './ui/shopPanel.js?v=175';
import { wireRtcPanelEvents, setRtcSubTab, handleRtcPotionDrop, openRtcPotionPicker, pickRtcPotion, openRtcAttackSpellPicker, pickRtcAttackSpell } from './ui/rtcPanel.js?v=202';
import { refreshHighscoresClick, wireHighscoresPanelEvents, setHighscoresCategory } from './ui/highscoresPanel.js?v=172';
import { handleMarketRegisterClick, wireMarketPanelEvents, showMarketStats } from './ui/marketPanel.js?v=171';
import { openOutfitPicker, setActiveColorChannel, wireOutfitPickerEvents } from './ui/outfitPicker.js?v=167';
import { openZonePicker, pickZone, openCity, backToCities } from './ui/zonePicker.js?v=178';
import { openBattleModal, closeBattleModal } from './ui/battleModal.js?v=166';
import { challengeBoss, stopBossRushClick, wireBossRushPanelEvents } from './ui/bossRushPanel.js?v=173';
import { openPreySelect, pickPrey, wireBestiaryPanelEvents } from './ui/bestiaryPanel.js?v=173';
import { wireTrainingPanelEvents, pickTrainingSpell, pickedTrainingSpellId } from './ui/trainingPanel.js?v=176';
import { setSkillsSubtab } from './ui/skillsPanel.js?v=169';
import { openDailyReward, renderDailyBadge, wireDailyRewardEvents } from './ui/dailyRewardPanel.js?v=169';
import { renderBoostedPanel } from './ui/boostedPanel.js?v=173';
import { openAchievements, setPlayerTitle } from './ui/achievementsPanel.js?v=166';
import { openImbueModal, applyImbuementClick } from './ui/imbuementPanel.js?v=166';
import { wireAdminPanelEvents } from './ui/adminPanel.js?v=177';
import { showAuthGate, showLoadingGate, hideAuthGate, setAuthSuccessHandler, renderAuthUser, logout } from './ui/authPanel.js?v=167';
import { openSettingsPanel } from './ui/settingsPanel.js?v=170';
import { setAdminRate, setRelicDropChancePct, setRarityPercent, resetAdminConfig, setUseZoneMultipliers, setZoneMultiplier, setMarketEnabled, setStaminaEnabled, setConsumeAmmo, setZoneSpawnWeight, setZonePackRange, setLootChance, resetLootChance, initGameConfig } from './application/adminUseCases.js?v=171';
import { setAdminSpawnZone, setAdminTab, setAdminLootZone } from './ui/adminPanel.js?v=177';
import { wireTabs, applyMarketVisibility, applyAdminTabVisibility } from './ui/tabs.js?v=184';
import { applyDataIcons } from './ui/uiIcons.js?v=171';

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
  saveGame, confirmReset, selectVocation, createCharacter, toggleHunt, selectTarget, closeModal, setFightMode, setDensity,
  openItemModal, equipItem, unequipItem, sellItem, sellAllItem, useItem, setAutoSell, setAutoSellMax,
  openRelicModal, equipRelic, sellRelic, toggleBackpack,
  challengeBoss, stopBossRushClick,
  startTask, cancelTask, setTaskRoom,
  startArenaBattle: handleArenaBattleClick,
  handleClaimArenaDivision,
  selectWorld,
  claimBpReward, claimMissionReward, buyBpPremium, claimWeeklyMissionReward,
  buyShopItem, confirmBuyShopItem, setShopTab, setShopGroup, selectShopItem, onShopQtyInput, stepShopQty, scrollShopQty, getShopQty, buyBlessing, promoteVocation, openAchievements, setPlayerTitle, openImbueModal, applyImbuementClick,
  setRtcAttackSpellSlot, clearRtcAttackSpellSlot, setRtcSmartElement, setRtcHealSpell, setRtcHealPotion, setRtcManaPotion, clearRtcPotion, handleRtcPotionDrop, setRtcThreshold, setRtcSubTab, openRtcPotionPicker, pickRtcPotion, openRtcAttackSpellPicker, pickRtcAttackSpell,
  registerPlayerName, refreshHighscoresClick, setHighscoresCategory,
  handleMarketRegisterClick, depositToMarket, withdrawFromMarket, listItemOnMarket, cancelMyListing, buyMarketListing, showMarketStats, postBuyOffer, fillBuyOffer,
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
  // G.hunting só volta a true se o servidor confirmar sessão viva — a reset
  // pra false acontece DENTRO de checkAndResumeHuntSession (que precisa ler o
  // valor salvo ANTES de resetar, pra saber se o personagem estava caçando
  // quando a aba fechou e talvez tenha morrido nesse meio-tempo). O servidor
  // de caçada (Railway) continua tickando sozinho mesmo com a aba fechada —
  // se a sessão ainda está ativa lá, aquele tempo JÁ foi contado de verdade e
  // checkAndResumeHuntSession() já traz o ganho real (ver reconcileWithServer
  // em huntUseCases.js). Não há mais estimativa aproximada de progresso
  // offline (ver persistenceUseCases.js: applyOfflineProgress) — se o
  // servidor caiu enquanto o jogador estava fora, essa janela específica
  // simplesmente não rende nada, de propósito (ver comentário lá).
  // Renderiza o personagem JÁ (G tem vocação/level/etc. do loadGame), ANTES do
  // await abaixo — checkAndResumeHuntSession faz idas ao servidor que podem
  // levar segundos (conexão lenta / servidor frio). Sem isto, a tela ficava em
  // "criar personagem" durante esse await mesmo o char já carregado (bug pego
  // pelo auditor de browser: G=druid mas a UI só reagia ~5s depois). O
  // resume/reconcile re-renderiza depois com hp/mana/level já reconciliados.
  renderCharPanel();
  emit(EVENTS.HEADER_STATS);
  renderFightModeButtons(); // destaca o estilo de luta ativo na janela de batalha
  renderDensityButtons();
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
applyDataIcons(); // troca o emoji das abas pela sprite pixel-art real (ver ui/uiIcons.js)

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
