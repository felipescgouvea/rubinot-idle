// Tudo da aba Caçada relacionado à zona/monstro atual: sprite do monstro,
// seletor de zona, contadores de mortes, loot recente e o botão de
// iniciar/parar caçada. (O retrato do jogador mora em characterPanel.js.)
import { G } from '../application/gameStore.js?v=17';
import { ZONES } from '../domain/bestiary.js?v=17';
import { MONSTERS } from '../domain/bestiary.js?v=17';
import { ITEMS } from '../domain/items.js?v=17';
import { monsterSpriteFile, spriteUrl } from '../infrastructure/tibiaSprites.js?v=17';
import { on, EVENTS } from '../shared/eventBus.js?v=17';
import { openModal, itemIconImg } from './shared.js?v=17';
import { getCurrentMonster } from '../application/huntUseCases.js?v=17';

function monsterSpriteImg(monsterId, cls = '') {
  const m = MONSTERS[monsterId];
  const file = monsterSpriteFile(monsterId, m);
  // fallback para o emoji se o sprite não carregar
  return `<img src="${spriteUrl(file)}" alt="${m.name}" class="${cls}"
    onerror="this.outerHTML='<span class=&quot;${cls}&quot;>${m.icon}</span>'" />`;
}

export function renderMonsterDisplay(hit = false, killed = null) {
  const el = document.getElementById('monster-display');
  if (!el) return;
  const currentMonster = getCurrentMonster();
  // monstro recém-morto continua visível (mesmo em hit kill) até o próximo spawn
  if (!currentMonster && killed) {
    // se o morto já está na tela, só acinzenta in-place (preserva o <img> carregado)
    if (el.dataset.monsterId === killed && el.querySelector('.monster-sprite-wrap')) {
      el.querySelector('.monster-sprite-wrap').classList.add('dead');
      el.querySelector('.monster-hp-fill').style.width = '0%';
      el.querySelector('.monster-hp-label').textContent = `0 / ${el.querySelector('.monster-hp-label').textContent.split('/')[1].trim()}`;
      el.querySelector('.monster-name').textContent = `☠️ ${MONSTERS[killed].name}`;
      return;
    }
    el.dataset.monsterId = killed;
    el.innerHTML = `
      <div class="monster-sprite-wrap dead">${monsterSpriteImg(killed, 'monster-sprite')}</div>
      <div class="monster-name">☠️ ${MONSTERS[killed].name}</div>
      <div class="monster-hp-track">
        <div class="monster-hp-fill" style="width:0%"></div>
        <div class="monster-hp-label">0 / ${MONSTERS[killed].hp}</div>
      </div>
    `;
    return;
  }
  if (!currentMonster) {
    el.innerHTML = G.hunting
      ? '<div class="monster-empty">Procurando próxima criatura…</div>'
      : '<div class="monster-empty">Nenhuma criatura. Inicie uma caçada!</div>';
    return;
  }
  const pct = Math.max(0, Math.round((currentMonster.hp / currentMonster.maxHp) * 100));
  // atualiza in-place quando é o mesmo monstro — recriar o <img> a cada tick
  // impedia o sprite de terminar de carregar
  if (el.dataset.monsterId === currentMonster.defKey && el.querySelector('.monster-hp-fill')) {
    el.querySelector('.monster-hp-fill').style.width = pct + '%';
    el.querySelector('.monster-hp-label').textContent = `${Math.max(0, currentMonster.hp)} / ${currentMonster.maxHp}`;
    el.querySelector('.monster-name').textContent = currentMonster.name;
    const wrap = el.querySelector('.monster-sprite-wrap');
    wrap.classList.remove('dead');
    if (hit) { wrap.classList.remove('hit'); void wrap.offsetWidth; wrap.classList.add('hit'); }
    return;
  }
  el.dataset.monsterId = currentMonster.defKey;
  el.innerHTML = `
    <div class="monster-sprite-wrap${hit ? ' hit' : ''}">${monsterSpriteImg(currentMonster.defKey, 'monster-sprite')}</div>
    <div class="monster-name">${currentMonster.name}</div>
    <div class="monster-hp-track">
      <div class="monster-hp-fill" style="width:${pct}%"></div>
      <div class="monster-hp-label">${Math.max(0, currentMonster.hp)} / ${currentMonster.maxHp}</div>
    </div>
  `;
}

// Só escolhe uma zona padrão quando a atual deixou de ser válida (troca de
// mundo, save antigo, primeira vez) — preserva a escolha manual do jogador
// entre level-ups (a versão anterior resetava pra 1ª zona toda vez).
function pickDefaultZoneIfNeeded() {
  const current = ZONES[G.activeZone];
  const stillValid = current && current.worldReq === G.currentWorld && G.level >= current.minLevel;
  if (stillValid) return;
  const valid = Object.entries(ZONES).find(([, z]) => z.worldReq === G.currentWorld && G.level >= z.minLevel);
  G.activeZone = valid ? valid[0] : null;
}

export function renderZonePicker() {
  pickDefaultZoneIfNeeded();

  const zone = ZONES[G.activeZone];
  const iconEl = document.getElementById('zone-current-icon');
  const nameEl = document.getElementById('zone-current-name');
  const titleEl = document.getElementById('battle-card-title');
  if (iconEl && nameEl) {
    iconEl.textContent = zone ? zone.icon : '🗺️';
    nameEl.textContent = zone ? zone.name : 'Escolher zona de caça…';
  }
  if (titleEl) {
    titleEl.textContent = zone ? `⚔️ Batalha — ${zone.icon} ${zone.name}` : '⚔️ Batalha';
  }
  renderZoneTheme();
}

// Cada dungeon tinge o fundo da cena de batalha com sua própria paleta (ver
// ZONES[id].theme) — sem zona ativa, cai no tom pergaminho padrão via as
// variáveis-fallback já definidas em style.css. Chamada direto por
// renderZonePicker() acima; não precisa de evento próprio.
function renderZoneTheme() {
  const scene = document.getElementById('battle-scene');
  if (!scene) return;
  const zone = ZONES[G.activeZone];
  if (zone && zone.theme) {
    scene.style.setProperty('--zone-color-1', zone.theme[0]);
    scene.style.setProperty('--zone-color-2', zone.theme[1]);
  } else {
    scene.style.removeProperty('--zone-color-1');
    scene.style.removeProperty('--zone-color-2');
  }
}

export function renderKillCounters() {
  const area = document.getElementById('kill-counters');
  if (!area) return;
  const counters = G.killCounters || {};
  area.innerHTML = Object.entries(counters).map(([id, n]) => {
    const m = MONSTERS[id];
    return `<div class="kill-pill">${m?.icon || ''} ${m?.name || id}: <span>${n}</span></div>`;
  }).join('');
}

export function renderLoot() {
  const area = document.getElementById('loot-display');
  const card = document.getElementById('loot-card');
  if (!area || !card) return;
  card.style.display = 'block';
  // show last 12 unique items
  const items = Object.entries(G.inventory).slice(-12);
  area.innerHTML = items.map(([id, qty]) => {
    const item = ITEMS[id];
    return `<div class="loot-item ${item?.rare ? 'rare' : ''}" title="${item?.name}">${item ? itemIconImg(id) : '?'} x${qty}</div>`;
  }).join('');
}

function renderHuntButton({ hunting }) {
  const btn = document.getElementById('hunt-toggle');
  if (!btn) return;
  btn.textContent = hunting ? '⏹ Parar Caçada' : '▶ Iniciar Caçada';
  btn.classList.toggle('stop', hunting);
}

function renderOfflineProgressModal({ zoneName, zoneIcon, hours, minutes, kills, xpGained, goldGained }) {
  openModal(`
    <h3>🌙 Enquanto você esteve fora…</h3>
    <p>Seu personagem continuou caçando em <strong>${zoneIcon} ${zoneName}</strong> por <strong>${hours}h ${minutes}min</strong>.</p>
    <div class="item-detail-stats">
      💀 Criaturas abatidas: <span>${kills.toLocaleString()}</span><br/>
      ⭐ Experiência ganha: <span>${xpGained.toLocaleString()}</span><br/>
      💰 Gold coletado: <span>${goldGained.toLocaleString()}</span>
    </div>
  `);
}

export function wireHuntPanelEvents() {
  on(EVENTS.MONSTER_DISPLAY, ({ hit, killed } = {}) => renderMonsterDisplay(hit, killed));
  on(EVENTS.ZONE_PICKER, renderZonePicker);
  on(EVENTS.KILL_COUNTERS, renderKillCounters);
  on(EVENTS.LOOT, renderLoot);
  on(EVENTS.HUNT_BUTTON, renderHuntButton);
  on(EVENTS.OFFLINE_PROGRESS, renderOfflineProgressModal);
}
