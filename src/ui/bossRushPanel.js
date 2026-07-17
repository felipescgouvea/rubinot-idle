// Aba Boss Rush: desafiar diretamente o boss de qualquer zona já
// desbloqueada, sem os monstros comuns dela. Reaproveita o card de zona (ver
// ui/zonePicker.js: zoneCard) pro visual, e o mesmo modal de batalha da
// caçada normal pra mostrar o combate (ver ui/battleModal.js) — é o mesmo
// motor por baixo (ver application/bossRushUseCases.js).
import { G } from '../application/gameStore.js?v=129';
import { MONSTERS, bossTierMultiplier, bossAuraClass } from '../domain/bestiary.js?v=140';
import { unlockedBossZones, startBossRush, stopBossRush, isBossRushActive } from '../application/bossRushUseCases.js?v=128';
import { on, EVENTS } from '../shared/eventBus.js?v=127';
import { monsterSpriteImg } from './huntPanel.js?v=140';
import { openBattleModal } from './battleModal.js?v=125';
import { t, getLocale } from '../i18n/i18n.js?v=142';

function bossCard(zoneId, zone) {
  const boss = MONSTERS[zone.boss];
  if (!boss) return '';
  const active = isBossRushActive() && G.activeZone === zoneId;
  const tier = (G.bossTiers && G.bossTiers[zoneId]) || 1;
  const mult = bossTierMultiplier(tier);
  const auraClass = bossAuraClass(tier);
  const hp = Math.floor(boss.hp * mult);
  return `<div class="zone-card ${auraClass} ${active ? 'active' : ''}" title="${t('bossrush.tierTitle', { name: boss.name, zone: t(zone.name), tier })}">
    <div class="zone-card-icon">${monsterSpriteImg(zone.boss, 'zone-card-icon-img')}</div>
    <div class="zone-card-name">${boss.name}</div>
    <div class="zone-card-mults">${t(zone.name)}</div>
    <div class="zone-card-mults">${hp.toLocaleString(getLocale() === 'pt' ? 'pt-BR' : 'en-US')} HP</div>
    <div class="zone-card-mults" style="font-weight:700">🔥 ${t('bossrush.tierLabel', { tier })}</div>
    <button class="skill-upgrade-btn" onclick="challengeBoss('${zoneId}')">${active ? `⚔️ ${t('bossrush.challenging')}` : `💀 ${t('bossrush.challengeTier', { tier })}`}</button>
  </div>`;
}

export function renderBossRushPanel() {
  const grid = document.getElementById('bossrush-grid');
  const stopArea = document.getElementById('bossrush-stop-area');
  if (!grid) return;

  if (stopArea) {
    stopArea.innerHTML = isBossRushActive()
      ? `<button class="btn-small danger" onclick="stopBossRushClick()">⏹ ${t('bossrush.exit')}</button>`
      : '';
  }

  if (!G.vocation) { grid.innerHTML = `<p class="muted">${t('bossrush.chooseVocationFirst')}</p>`; return; }

  const bosses = unlockedBossZones();
  if (bosses.length === 0) {
    grid.innerHTML = `<p class="muted">${t('bossrush.noBossesUnlocked')}</p>`;
    return;
  }
  grid.innerHTML = `<div class="zone-picker-gallery">${bosses.map(({ zoneId, zone }) => bossCard(zoneId, zone)).join('')}</div>`;
}

export function challengeBoss(zoneId) {
  startBossRush(zoneId);
  renderBossRushPanel();
  openBattleModal();
}

export function stopBossRushClick() {
  stopBossRush();
  renderBossRushPanel();
}

export function wireBossRushPanelEvents() {
  // o botão de iniciar/parar caçada do modal de batalha (compartilhado com a
  // caçada normal) também pausa/retoma o Boss Rush — mantém o card "Desafiando"
  // em sincronia se o jogador estiver com a aba aberta.
  on(EVENTS.HUNT_BUTTON, () => { if (document.body.dataset.tab === 'bossrush') renderBossRushPanel(); });
  // Tier subiu (boss derrotado no Boss Rush, ver huntUseCases.js) — sem isso,
  // o card só mostraria o tier novo depois de trocar de aba e voltar, mesmo
  // já tendo subido de verdade no estado (G.bossTiers já correto, só a tela
  // que ficava parada na última renderização antes do combate).
  on(EVENTS.BOSS_RUSH_PANEL, () => { if (document.body.dataset.tab === 'bossrush') renderBossRushPanel(); });
}
