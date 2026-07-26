// ===== RUBINOT IDLE — composition root =====
// Único ponto que conhece todas as camadas: liga os eventos da application
// aos renders da ui, expõe no window só o que o HTML (estático e gerado
// dinamicamente via innerHTML) precisa chamar via onclick/onchange, e
// dispara a sequência de inicialização do jogo.

import { G } from './application/gameStore.js?v=324';
import { VOCATIONS } from './domain/character.js?v=351';
import { emit, EVENTS } from './shared/eventBus.js?v=322';
import { getLocale, setLocale, applyStaticTranslations, t } from './i18n/i18n.js?v=340';

// application
import { saveGame, flushCloudSave } from './application/saveGameUseCase.js?v=324';
import { loadGame, confirmReset, applyCloudSave } from './application/persistenceUseCases.js?v=363';
import { confirmSwitchCharacterSlot } from './application/accountUseCases.js?v=322';
import { isLoggedIn, ensureValidToken, loadCloudSave, consumeAuthRedirect, fetchSaveEpoch } from './infrastructure/authClient.js?v=332';
import { clearState, loadSaveEpoch, saveSaveEpoch } from './infrastructure/storage.js?v=319';
import { selectVocation, graduate, checkGraduation, ensureStarterKitPending } from './application/characterUseCases.js?v=325';
import { toggleHunt, startRegen, selectTarget, checkAndResumeHuntSession, setFightMode, renderFightModeButtons, setDensity, renderDensityButtons } from './application/huntUseCases.js?v=388';
import { equipItem, unequipItem, sellItem, sellAllItem, useItem, equipRelic, sellRelic, setAutoSell, setAutoSellMax } from './application/inventoryUseCases.js?v=332';
import { startTask, cancelTask, claimTaskReward, syncTaskState } from './application/taskUseCases.js?v=327';
import { selectWorld, checkWorldUnlocks } from './application/worldUseCases.js?v=326';
import { claimBpReward, claimMissionReward, buyBpPremium, claimWeeklyMissionReward } from './application/battlePassUseCases.js?v=323';
import { buyShopItem } from './application/shopUseCases.js?v=328';
import { buyBlessing } from './application/blessingUseCases.js?v=322';
import { promoteVocation } from './application/promotionUseCases.js?v=320';
import { setRtcAttackSpellSlot, clearRtcAttackSpellSlot, setRtcSmartElement, setRtcHealSpell, setRtcHealPotion, setRtcManaPotion, clearRtcPotion, setRtcThreshold, setRtcHealTierPct, clearRtcHealTier, setRtcTargetPriority, setRtcAreaMinTargets } from './application/rtcUseCases.js?v=356';
import { registerPlayerName, submitScore } from './application/highscoresUseCases.js?v=325';
import { startOnlinePolling } from './application/onlineUseCases.js?v=94';
import { depositToMarket, withdrawFromMarket, listItemOnMarket, cancelMyListing, buyMarketListing, postBuyOffer, fillBuyOffer } from './application/marketUseCases.js?v=324';
import { setOutfitGender, selectOutfit, buyOutfit, toggleOutfitAddon, setOutfitColor } from './application/outfitUseCases.js?v=321';
import { rerollPrey, clearPrey, syncPreyState } from './application/preyUseCases.js?v=323';
import { unlockCharm, toggleCharmEquipped, syncCharmState } from './application/bestiaryUseCases.js?v=323';
import { claimDailyReward } from './application/dailyRewardUseCases.js?v=322';
import { startTraining, stopTraining, startOnlineTraining, resumeTrainingOnLoad } from './application/trainingUseCases.js?v=328';

// ui
import { closeModal, dismissModal, setLogFilter, wireSharedEvents } from './ui/shared.js?v=327';
import { renderCharPanel, renderPlayerBattleSide, wireCharacterPanelEvents, createCharacter } from './ui/characterPanel.js?v=332';
import { renderMonsterDisplay, wireHuntPanelEvents } from './ui/huntPanel.js?v=341';
import { renderEquipmentSlots, openItemModal, openRelicModal, toggleBackpack, wireInventoryAndEquipmentEvents } from './ui/inventoryAndEquipmentPanel.js?v=325';
import { wireTasksPanelEvents, setTaskRoom } from './ui/tasksPanel.js?v=329';
import { handleArenaBattleClick, handleClaimArenaDivision } from './ui/arenaPanel.js?v=322';
import { wireWorldsPanelEvents } from './ui/worldsPanel.js?v=321';
import { wireBattlePassPanelEvents } from './ui/battlePassPanel.js?v=323';
import { wireShopPanelEvents, setShopTab, setShopGroup, selectShopItem, onShopQtyInput, stepShopQty, scrollShopQty, getShopQty, confirmBuyShopItem } from './ui/shopPanel.js?v=329';
import { wireRtcPanelEvents, setRtcSubTab, handleRtcPotionDrop, openRtcPotionPicker, pickRtcPotion, openRtcAttackSpellPicker, pickRtcAttackSpell, openRtcHealTierPicker, pickRtcHealTier } from './ui/rtcPanel.js?v=356';
import { refreshHighscoresClick, wireHighscoresPanelEvents, setHighscoresCategory } from './ui/highscoresPanel.js?v=326';
import { handleMarketRegisterClick, wireMarketPanelEvents, showMarketStats, selectMarketItem, marketSearchInput } from './ui/marketPanel.js?v=325';
import { openOutfitPicker, setActiveColorChannel, wireOutfitPickerEvents } from './ui/outfitPicker.js?v=321';
import { openZonePicker, pickZone, openCity, backToCities } from './ui/zonePicker.js?v=332';
import { openBattleModal, closeBattleModal } from './ui/battleModal.js?v=320';
import { challengeBoss, stopBossRushClick, wireBossRushPanelEvents } from './ui/bossRushPanel.js?v=327';
import { openPreySelect, pickPrey, wireBestiaryPanelEvents, bestiarySearchInput } from './ui/bestiaryPanel.js?v=327';
import { wireTrainingPanelEvents, pickTrainingSpell, pickedTrainingSpellId } from './ui/trainingPanel.js?v=330';
import { setSkillsSubtab } from './ui/skillsPanel.js?v=323';
import { castConjureSpell } from './ui/spellsPanel.js?v=237';
import { openDailyReward, renderDailyBadge, wireDailyRewardEvents } from './ui/dailyRewardPanel.js?v=323';
import { renderBoostedPanel } from './ui/boostedPanel.js?v=327';
import { openAchievements, setPlayerTitle } from './ui/achievementsPanel.js?v=321';
import { openImbueModal, applyImbuementClick, selectImbueSlot } from './ui/imbuementPanel.js?v=321';
import { wireAdminPanelEvents } from './ui/adminPanel.js?v=331';
import { showAuthGate, showLoadingGate, hideAuthGate, setAuthSuccessHandler, renderAuthUser, logout } from './ui/authPanel.js?v=321';
import { openSettingsPanel } from './ui/settingsPanel.js?v=324';
import { wireGraduationEvents, pickGraduationVocation, confirmGraduation, openGraduationModal } from './ui/graduationModal.js?v=325';
import { wireDeathModal } from './ui/deathModal.js?v=42';
import { setAdminRate, setRelicDropChancePct, setRarityPercent, resetAdminConfig, setUseZoneMultipliers, setZoneMultiplier, setMarketEnabled, setStaminaEnabled, setConsumeAmmo, setZoneSpawnWeight, setZonePackRange, setLootChance, resetLootChance, initGameConfig } from './application/adminUseCases.js?v=325';
import { setAdminSpawnZone, setAdminTab, setAdminLootZone } from './ui/adminPanel.js?v=331';
import { wireTabs, applyMarketVisibility, applyAdminTabVisibility } from './ui/tabs.js?v=338';
import { applyDataIcons } from './ui/uiIcons.js?v=325';

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
wireGraduationEvents();
wireDeathModal();

// ---- superfície pública pro HTML (estático e gerado via innerHTML) ----
// É basicamente a "view" do padrão MVC exposta como funções soltas, porque o
// HTML é gerado como string e usa onclick inline — não há outra forma de ligar
// eventos a conteúdo que nem existe no DOM ainda no momento em que o módulo carrega.
Object.assign(window, {
  castConjureSpell,
  openRtcHealTierPicker, pickRtcHealTier, setRtcHealTierPct, clearRtcHealTier, setRtcTargetPriority, setRtcAreaMinTargets,
  pickGraduationVocation, confirmGraduation, openGraduationModal, graduate, checkGraduation,
  saveGame, confirmReset, selectVocation, createCharacter, toggleHunt, selectTarget, closeModal, dismissModal, setFightMode, setDensity,
  openItemModal, equipItem, unequipItem, sellItem, sellAllItem, useItem, setAutoSell, setAutoSellMax,
  openRelicModal, equipRelic, sellRelic, toggleBackpack,
  challengeBoss, stopBossRushClick,
  startTask, cancelTask, claimTaskReward, setTaskRoom,
  startArenaBattle: handleArenaBattleClick,
  handleClaimArenaDivision,
  selectWorld,
  claimBpReward, claimMissionReward, buyBpPremium, claimWeeklyMissionReward,
  buyShopItem, confirmBuyShopItem, setShopTab, setShopGroup, selectShopItem, onShopQtyInput, stepShopQty, scrollShopQty, getShopQty, buyBlessing, promoteVocation, openAchievements, setPlayerTitle, openImbueModal, applyImbuementClick, selectImbueSlot,
  setRtcAttackSpellSlot, clearRtcAttackSpellSlot, setRtcSmartElement, setRtcHealSpell, setRtcHealPotion, setRtcManaPotion, clearRtcPotion, handleRtcPotionDrop, setRtcThreshold, setRtcSubTab, openRtcPotionPicker, pickRtcPotion, openRtcAttackSpellPicker, pickRtcAttackSpell,
  registerPlayerName, refreshHighscoresClick, setHighscoresCategory,
  handleMarketRegisterClick, depositToMarket, withdrawFromMarket, listItemOnMarket, cancelMyListing, buyMarketListing, showMarketStats, postBuyOffer, fillBuyOffer, selectMarketItem, marketSearchInput,
  openOutfitPicker, setOutfitGender, selectOutfit, buyOutfit, toggleOutfitAddon, setOutfitColor, setActiveColorChannel, setSkillsSubtab,
  openZonePicker, pickZone, openCity, backToCities,
  openBattleModal, closeBattleModal,
  setLogFilter,
  openPreySelect, pickPrey, rerollPrey, clearPrey, bestiarySearchInput,
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
  ensureStarterKitPending(); // re-tenta o kit inicial se o grant da criação falhou (fica desarmado no servidor)
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
  // Avalia já no boot os flags de "tem coisa pra resgatar" que ditam o título da
  // aba do navegador (task pronta / tier de BP) — a partir do estado salvo, sem
  // depender do sync do servidor (que é async e pode falhar). O de daily sai do
  // renderDailyBadge acima; o de task é reavaliado quando syncTaskState resolver.
  emit(EVENTS.ACTIVE_TASK);
  emit(EVENTS.BATTLE_PASS_PANEL);
  resumeTrainingOnLoad(); // credita treino offline e religa o tick, se havia treino ativo
  startRegen();
  startOnlinePolling(); // "N online" no cabeçalho (prova social ao vivo)
  // Reporta presença JÁ ao abrir o jogo, sem esperar o primeiro tick do
  // setInterval de 90s em highscoresUseCases.js — sem isto, um personagem já
  // nomeado que volta a jogar (2º dispositivo, nova aba) só atualizava
  // `updated_at` até 90s depois, então a contagem de "online" ficava presa no
  // valor antigo por até ~2min e meio somando cache do servidor + poll do
  // cliente (bug reportado: "logou em 2 dispositivos e a contagem era 1").
  // Fire-and-forget: não trava o boot por causa de uma chamada de rede.
  submitScore();
  if (G.vocation) { syncCharmState(true); syncPreyState(); syncTaskState(); } // estado real de charms/prey/tasks (ver bestiaryUseCases.js/preyUseCases.js/taskUseCases.js)
  emit(EVENTS.LOG, `<span class="log-info">⚔️ ${t('log.welcome')}</span>`);

  if (G.vocation) {
    emit(EVENTS.LOG, `<span class="log-info">${t('log.gameLoaded', { voc: VOCATIONS[G.vocation].name, level: G.level })}</span>`);
  }

  // Graduação pendente: quem já bateu o nível 8 sem escolher a vocação
  // definitiva vê a tela ao entrar (ver characterUseCases: checkGraduation).
  checkGraduation();

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
  // MARCO DE RESET, antes de qualquer leitura de save. O save vive em DOIS
  // lugares (localStorage e Supabase); zerar só o banco não reseta ninguém —
  // no F5 seguinte o navegador restaura o personagem do save local e ainda o
  // reescreve na nuvem, desfazendo o reset um cliente por vez. Foi o que
  // aconteceu: apaguei o banco e o personagem voltou inteiro.
  // Quando o marco publicado pelo servidor difere do que este navegador já
  // aplicou, o save local é descartado AQUI — antes do applyCloudSave e do
  // bootGame, senão o estado velho já teria sido lido e agendado pra gravação.
  const [cloud, epochRemoto] = await Promise.all([loadCloudSave(), fetchSaveEpoch(), initGameConfig()]);
  const epochLocal = loadSaveEpoch();
  if (epochRemoto && epochRemoto !== epochLocal) {
    // O save LOCAL sempre cai: ou é anterior ao reset, ou o navegador é novo e
    // não tinha nada mesmo.
    clearState();
    saveSaveEpoch(epochRemoto);
    // Mas o save da NUVEM só cai quando este navegador JÁ conhecia um marco
    // anterior — aí sim houve um reset entre uma sessão e outra.
    //
    // Sem marco nenhum guardado não dá pra distinguir "jogador de antes do
    // reset" de "primeiro acesso neste navegador", e tratar os dois igual
    // apagaria o personagem de quem só abriu o jogo em outro dispositivo. Como
    // o reset zera a nuvem no servidor, o caso do jogador antigo já está
    // coberto: a nuvem dele vem vazia de qualquer forma.
    if (epochLocal) cloud.data = null;
  }
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
// Sinal de "o grafo de módulos carregou inteiro", lido pela auto-cura no
// index.html: só depois disto o contador de tentativas de recarga é zerado.
window.__jogoVivo = true;
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
