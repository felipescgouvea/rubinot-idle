// Tudo da aba Caçada relacionado à zona/monstro atual: sprite do monstro,
// seletor de zona, contadores de mortes, loot recente e o botão de
// iniciar/parar caçada. (O retrato do jogador mora em characterPanel.js.)
import { G } from '../application/gameStore.js?v=72';
import { ZONES, isZoneUnlocked, boostedZoneForDate } from '../domain/bestiary.js?v=72';
import { MONSTERS } from '../domain/bestiary.js?v=72';
import { cityName } from '../domain/cities.js?v=72';
import { ITEMS } from '../domain/items.js?v=72';
import { monsterSpriteFile, spriteUrl, effectSpriteFile, missileSpriteFile } from '../infrastructure/tibiaSprites.js?v=72';
import { on, EVENTS } from '../shared/eventBus.js?v=72';
import { openModal, itemIconImg, vitalIconImg, goldIconImg } from './shared.js?v=72';
import { getCurrentMonster, getCurrentPack, getRecentDead } from '../application/huntUseCases.js?v=72';

export function monsterSpriteImg(monsterId, cls = '') {
  const m = MONSTERS[monsterId];
  const file = monsterSpriteFile(monsterId, m);
  // fallback para o emoji se o sprite não carregar
  return `<img src="${spriteUrl(file)}" alt="${m.name}" class="${cls}"
    onerror="this.outerHTML='<span class=&quot;${cls}&quot;>${m.icon}</span>'" />`;
}

// Ícone da zona = sprite real do monstro principal da caçada (o primeiro do
// elenco), em vez de um emoji genérico sem lastro em Tibia/RubinOT — ver
// .spec/90-regras-de-negocio-gerais.md, Regra 4.
export function zoneIconImg(zone, cls = '') {
  return monsterSpriteImg(zone.monsters[0], cls);
}

function flashSpellEffect(wrap, spellElement) {
  if (!wrap || !spellElement) return;
  [...wrap.classList].filter(c => c.startsWith('spell-')).forEach(c => wrap.classList.remove(c));
  void wrap.offsetWidth;
  wrap.classList.add(`spell-${spellElement}`);
}

// Monstro-alvo na cena de batalha (à direita, de frente pro personagem). É só
// o sprite do alvo da frente — a vida numérica de toda a sala continua na
// Battle List. Some quando não há alvo (procurando/ocioso). Atualiza in-place
// pra não recriar o <img> a cada tick (deixaria o sprite piscar ao recarregar).
export function renderBattleTarget(hit = false) {
  const wrap = document.getElementById('battle-target-wrap');
  if (!wrap) return;
  const m = getCurrentMonster();
  if (!m) { wrap.classList.remove('active'); wrap.dataset.monsterId = ''; wrap.innerHTML = ''; return; }
  wrap.classList.add('active');
  if (wrap.dataset.monsterId !== m.defKey || !wrap.querySelector('img,span')) {
    wrap.dataset.monsterId = m.defKey;
    wrap.innerHTML = monsterSpriteImg(m.defKey, 'battle-target-sprite');
  }
  if (hit) { wrap.classList.remove('hit'); void wrap.offsetWidth; wrap.classList.add('hit'); }
}

// Toca o efeito de combate FIEL ao Tibia sobre o monstro: se o golpe tem
// projétil (missile), a flecha/míssil voa do personagem até o alvo e SÓ ao
// chegar toca o impacto; sem projétil (corpo-a-corpo/strike/área), o impacto
// aparece na hora sobre o monstro. Ver domain/combatFx.js pro mapa por magia.
function overlayImpact(stage, target, impact, area) {
  const file = effectSpriteFile(impact);
  if (!file) return;
  const img = document.createElement('img');
  img.className = 'combat-impact-sprite' + (area ? ' area' : '');
  img.src = spriteUrl(file);
  img.alt = '';
  // centraliza o impacto sobre o monstro
  img.style.left = target.cx + 'px';
  img.style.top = target.cy + 'px';
  stage.appendChild(img);
  setTimeout(() => img.remove(), 850);
}
function centerOf(el, stageRect) {
  const r = el.getBoundingClientRect();
  return { cx: r.left - stageRect.left + r.width / 2, cy: r.top - stageRect.top + r.height / 2 };
}
export function playCombatFx({ impact, missile, area } = {}) {
  const stage = document.getElementById('dungeon-stage');
  const targetWrap = document.getElementById('battle-target-wrap');
  const playerWrap = document.getElementById('player-sprite-wrap');
  if (!stage || !targetWrap || !getCurrentMonster()) return;
  const stageRect = stage.getBoundingClientRect();
  const target = centerOf(targetWrap, stageRect);
  const missileFile = missile ? missileSpriteFile(missile) : null;
  if (missileFile && playerWrap) {
    const from = centerOf(playerWrap, stageRect);
    const proj = document.createElement('img');
    proj.className = 'combat-missile-sprite';
    proj.src = spriteUrl(missileFile);
    proj.alt = '';
    // aponta o projétil na direção do voo (player -> alvo)
    const ang = Math.atan2(target.cy - from.cy, target.cx - from.cx) * 180 / Math.PI;
    proj.style.left = from.cx + 'px';
    proj.style.top = from.cy + 'px';
    proj.style.setProperty('--fx-angle', ang + 'deg');
    stage.appendChild(proj);
    // dispara a translação no próximo frame (deixa o browser aplicar o estado inicial)
    requestAnimationFrame(() => {
      proj.style.left = target.cx + 'px';
      proj.style.top = target.cy + 'px';
    });
    const FLIGHT = 260;
    setTimeout(() => { proj.remove(); overlayImpact(stage, target, impact, area); }, FLIGHT);
  } else {
    overlayImpact(stage, target, impact, area);
  }
}

export function renderMonsterDisplay(hit = false, killed = null, spellElement = null, bossAura = null) {
  const el = document.getElementById('monster-display');
  if (!el) return;
  const currentMonster = getCurrentMonster();
  // monstro recém-morto continua visível (mesmo em hit kill) até o próximo spawn
  if (!currentMonster && killed) {
    // se o morto já está na tela, só acinzenta in-place (preserva o <img> carregado)
    if (el.dataset.monsterId === killed && el.querySelector('.monster-sprite-wrap')) {
      const wrap = el.querySelector('.monster-sprite-wrap');
      if (!wrap.classList.contains('dead')) { wrap.classList.remove('dying'); void wrap.offsetWidth; wrap.classList.add('dying'); }
      wrap.classList.add('dead');
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
    flashSpellEffect(wrap, spellElement);
    return;
  }
  el.dataset.monsterId = currentMonster.defKey;
  el.innerHTML = `
    <div class="monster-sprite-wrap${hit ? ' hit' : ''}${bossAura ? ` ${bossAura}` : ''}">${monsterSpriteImg(currentMonster.defKey, 'monster-sprite')}</div>
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
  const stillValid = G.activeZone && isZoneUnlocked(G.activeZone, G.level, G.currentWorld, G.defeatedZoneBosses);
  if (stillValid) return;
  const valid = Object.keys(ZONES).find(id => isZoneUnlocked(id, G.level, G.currentWorld, G.defeatedZoneBosses));
  G.activeZone = valid || null;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function renderZonePicker() {
  pickDefaultZoneIfNeeded();

  const zone = ZONES[G.activeZone];
  const isBoostedToday = G.activeZone && G.activeZone === boostedZoneForDate(todayStr());
  const boostedBadge = isBoostedToday ? ' <span class="zone-boosted-badge" title="Zona Bônus do Dia: +50% XP/Gold">🔥 Bônus do Dia</span>' : '';
  const iconEl = document.getElementById('zone-current-icon');
  const nameEl = document.getElementById('zone-current-name');
  const titleEl = document.getElementById('battle-card-title');
  if (iconEl && nameEl) {
    iconEl.innerHTML = zone ? zoneIconImg(zone, 'zone-current-icon-img') : '🗺️';
    const cityPrefix = zone && zone.city ? `<span class="zone-current-city">${cityName(zone.city)}</span> · ` : '';
    nameEl.innerHTML = (zone ? cityPrefix + zone.name : 'Escolher cidade de caça…') + boostedBadge;
  }
  if (titleEl) {
    titleEl.innerHTML = zone ? `⚔️ Batalha — ${zoneIconImg(zone, 'zone-current-icon-img')} ${zone.name}${boostedBadge}` : '⚔️ Batalha';
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
    return `<div class="kill-pill">${m ? monsterSpriteImg(id, 'kill-pill-icon') : ''} ${m?.name || id}: <span>${n}</span></div>`;
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

function renderOfflineProgressModal({ zoneName, zoneMainMonster, hours, minutes, kills, xpGained, goldGained }) {
  const zoneIcon = zoneMainMonster ? monsterSpriteImg(zoneMainMonster, 'zone-current-icon-img') : '🗺️';
  openModal(`
    <h3>🌙 Enquanto você esteve fora…</h3>
    <p>Seu personagem continuou caçando em <strong>${zoneIcon} ${zoneName}</strong> por <strong>${hours}h ${minutes}min</strong>.</p>
    <div class="item-detail-stats">
      💀 Criaturas abatidas: <span>${kills.toLocaleString()}</span><br/>
      ${vitalIconImg('xp', 'inline-icon')} Experiência ganha: <span>${xpGained.toLocaleString()}</span><br/>
      ${goldIconImg('inline-icon')} Gold coletado: <span>${goldGained.toLocaleString()}</span>
    </div>
  `);
}

// Battle List (como a do Tibia): lista todos os monstros da "sala" atual com a
// vida de cada um, destacando o alvo da frente. Some quando não há ninguém.
function battleListEntry({ defKey, name, pct, hp, maxHp, target, dead }) {
  return `<div class="battle-list-entry ${target ? 'target' : ''} ${dead ? 'dead' : ''}">
    <div class="battle-list-icon">${monsterSpriteImg(defKey, 'battle-list-sprite')}</div>
    <div class="battle-list-info">
      <div class="battle-list-name">${name}</div>
      <div class="battle-list-hp-track">
        <div class="battle-list-hp-fill" style="width:${pct}%"></div>
        <div class="battle-list-hp-label">${hp}/${maxHp}</div>
      </div>
    </div>
  </div>`;
}

export function renderBattleList() {
  const el = document.getElementById('battle-list');
  if (!el) return;
  const pack = getCurrentPack() || [];
  const dead = getRecentDead() || [];
  if (!pack.length && !dead.length) { el.innerHTML = '<div class="battle-list-empty">Sem criaturas.</div>'; return; }
  const rows = pack.map((m, i) => battleListEntry({
    defKey: m.defKey, name: `${i === 0 ? '⚔️ ' : ''}${m.name}`,
    pct: Math.max(0, Math.round((m.hp / m.maxHp) * 100)), hp: Math.max(0, m.hp), maxHp: m.maxHp, target: i === 0,
  }));
  // Mortos recentes (vida zerada) ficam ao fim da lista por 1s antes de sumir.
  dead.forEach(d => rows.push(battleListEntry({ defKey: d.defKey, name: `☠️ ${d.name}`, pct: 0, hp: 0, maxHp: d.maxHp, dead: true })));
  el.innerHTML = rows.join('');
}

// Alterna o modo da cena: "searching" (boneco andando pra baixo procurando)
// quando está caçando E não há monstro na frente; parado nos demais casos
// (ocioso ou lutando). O CSS (#dungeon-stage.searching) liga o piso rolando e
// o bob de passo; o timer de caminhada (ver ui/characterPanel.js) lê essa
// classe pra ciclar os quadros ou congelar no idle.
export function updateSceneMode() {
  const stage = document.getElementById('dungeon-stage');
  if (!stage) return;
  stage.classList.toggle('searching', G.hunting && !getCurrentMonster());
}

export function wireHuntPanelEvents() {
  on(EVENTS.MONSTER_DISPLAY, ({ hit, killed, spellElement, bossAura } = {}) => { renderMonsterDisplay(hit, killed, spellElement, bossAura); renderBattleTarget(hit); renderBattleList(); updateSceneMode(); });
  on(EVENTS.COMBAT_FX, (fx) => playCombatFx(fx));
  on(EVENTS.BATTLE_LIST, () => { renderBattleTarget(); renderBattleList(); updateSceneMode(); });
  on(EVENTS.ZONE_PICKER, renderZonePicker);
  on(EVENTS.KILL_COUNTERS, renderKillCounters);
  on(EVENTS.LOOT, renderLoot);
  on(EVENTS.HUNT_BUTTON, ({ hunting } = {}) => { renderHuntButton({ hunting }); updateSceneMode(); });
  on(EVENTS.OFFLINE_PROGRESS, renderOfflineProgressModal);
}
