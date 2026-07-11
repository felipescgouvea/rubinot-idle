// Aba Boss Rush: desafiar diretamente o boss de qualquer zona já
// desbloqueada, sem os monstros comuns dela. Reaproveita o card de zona (ver
// ui/zonePicker.js: zoneCard) pro visual, e o mesmo modal de batalha da
// caçada normal pra mostrar o combate (ver ui/battleModal.js) — é o mesmo
// motor por baixo (ver application/bossRushUseCases.js).
import { G } from '../application/gameStore.js?v=31';
import { MONSTERS } from '../domain/bestiary.js?v=31';
import { unlockedBossZones, startBossRush, stopBossRush, isBossRushActive } from '../application/bossRushUseCases.js?v=31';
import { on, EVENTS } from '../shared/eventBus.js?v=31';
import { monsterSpriteImg } from './huntPanel.js?v=31';
import { openBattleModal } from './battleModal.js?v=31';

function bossCard(zoneId, zone) {
  const boss = MONSTERS[zone.boss];
  if (!boss) return '';
  const active = isBossRushActive() && G.activeZone === zoneId;
  return `<div class="zone-card ${active ? 'active' : ''}" title="${boss.name} — ${zone.name}">
    <div class="zone-card-icon">${monsterSpriteImg(zone.boss, 'zone-card-icon-img')}</div>
    <div class="zone-card-name">${boss.name}</div>
    <div class="zone-card-mults">${zone.name}</div>
    <div class="zone-card-mults">Lv ${zone.minLevel}+ · ${boss.hp.toLocaleString('pt-BR')} HP</div>
    <button class="skill-upgrade-btn" onclick="challengeBoss('${zoneId}')">${active ? '⚔️ Desafiando…' : '💀 Desafiar'}</button>
  </div>`;
}

export function renderBossRushPanel() {
  const grid = document.getElementById('bossrush-grid');
  const stopArea = document.getElementById('bossrush-stop-area');
  if (!grid) return;

  if (stopArea) {
    stopArea.innerHTML = isBossRushActive()
      ? `<button class="btn-small danger" onclick="stopBossRushClick()">⏹ Sair do Boss Rush</button>`
      : '';
  }

  if (!G.vocation) { grid.innerHTML = '<p class="muted">Escolha uma vocação primeiro.</p>'; return; }

  const bosses = unlockedBossZones();
  if (bosses.length === 0) {
    grid.innerHTML = '<p class="muted">Nenhum boss desbloqueado ainda — avance nas zonas de caça normais para desbloquear o primeiro.</p>';
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
}
