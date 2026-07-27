// Aba "Bestiário" — reúne três sistemas de progressão ligados a criaturas:
//  1) Presas (Prey): bônus contra uma criatura escolhida.
//  2) Bestiário: progresso de mortes por criatura, que rende Charm Points.
//  3) Charms: bônus passivos comprados com Charm Points.
// Concentrar os três aqui (em vez de 3 abas novas) é de propósito — evita
// inchar ainda mais a barra de abas (ver o reagrupamento do header).
import { G } from '../application/gameStore.js?v=362';
import { MONSTERS } from '../domain/bestiary.js?v=381';
import {
  PREY_SLOTS, PREY_BONUS_TYPES, PREY_DURATION_MS, PREY_MAX_RARITY, preyRerollCost, isPreyActive,
} from '../domain/prey.js?v=358';
import {
  CHARMS, CHARM_EQUIP_SLOTS, BESTIARY_STAGES,
  bestiaryStagesCompleted, nextBestiaryStage,
} from '../domain/charms.js?v=359';
import { monsterElementProfile, ELEMENT_ICON, ELEMENT_LABEL } from '../domain/elements.js?v=358';
import { on, EVENTS } from '../shared/eventBus.js?v=360';
import { openModal, closeModal, charmPointsIconImg } from './shared.js?v=365';
import { setTabBadge } from './notifyTitle.js?v=360';
import { monsterSpriteImg } from './huntPanel.js?v=379';
import { uiIcon } from './uiIcons.js?v=363';
import { activatePrey, rerollPrey, clearPrey } from '../application/preyUseCases.js?v=361';
import { unlockCharm, toggleCharmEquipped } from '../application/bestiaryUseCases.js?v=361';
import { t } from '../i18n/i18n.js?v=378';

// Criaturas que o jogador já enfrentou (têm entrada em killCounters) — a base
// tanto pra escolher presa quanto pra listar o bestiário.
function encounteredMonsters() {
  return Object.keys(G.killCounters || {}).filter(id => MONSTERS[id]);
}

function fmtRemaining(ms) {
  const min = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(min / 60);
  return h > 0 ? `${h}h ${min % 60}min` : `${min}min`;
}

// ---------- Presas ----------
// Card de presa no estilo do Prey Dialog do Tibia: moldura escura com o retrato
// da criatura em cima, o bônus em destaque, a barra de valor (estrelas) e a
// barra de tempo verde descendo, com as ações embaixo.
function renderPreySection() {
  const el = document.getElementById('prey-slots');
  if (!el) return;
  const now = Date.now();
  const slots = Array.from({ length: PREY_SLOTS }, (_, i) => (G.prey || [])[i] || null);
  el.innerHTML = slots.map((slot, i) => {
    if (isPreyActive(slot, now)) {
      const m = MONSTERS[slot.monster];
      const bt = PREY_BONUS_TYPES[slot.bonusType];
      const remain = slot.expires - now;
      const timePct = Math.max(0, Math.min(100, (remain / PREY_DURATION_MS) * 100));
      // A barra de raridade do Tibia vai ate 10, nao 5. Saves antigos guardavam
      // `stars` (1..5); ler os dois mantem a presa ja travada mostrando certo.
      const rarity = slot.rarity != null ? slot.rarity : (slot.stars || 0);
      const stars = Array.from({ length: PREY_MAX_RARITY }, (_, s) =>
        `<span class="prey-star ${s < rarity ? 'on' : ''}">★</span>`).join('');
      return `<div class="prey-card active bonus-${slot.bonusType}">
        <div class="prey-card-top">
          <span class="prey-slot-no">${i + 1}</span>
          <div class="prey-portrait">${monsterSpriteImg(slot.monster, 'prey-portrait-img')}</div>
        </div>
        <div class="prey-creature-name">${m.name}</div>
        <div class="prey-bonus-box">
          ${uiIcon('prey_' + slot.bonusType, 'prey-bonus-icon')}
          <span class="prey-bonus-val">+${Math.round(slot.bonusPct * 100)}%</span>
          <span class="prey-bonus-label">${t(bt.name)}</span>
        </div>
        <div class="prey-stars" title="${t('bestiary.preyValueTitle')}">${stars}</div>
        <div class="prey-timer-track"><div class="prey-timer-fill" style="width:${timePct}%"></div><span class="prey-timer-label">${fmtRemaining(remain)}</span></div>
        <div class="prey-card-actions">
          <button class="prey-btn reroll" onclick="rerollPrey(${i})" title="${t('bestiary.rerollTooltip', { cost: preyRerollCost(G.level).toLocaleString() })}">🎲 ${t('bestiary.reroll')}</button>
          <button class="prey-btn cancel" onclick="clearPrey(${i})" title="${t('bestiary.unequip')}">✕</button>
        </div>
      </div>`;
    }
    return `<div class="prey-card empty">
      <div class="prey-card-top">
        <span class="prey-slot-no">${i + 1}</span>
        <div class="prey-portrait empty"><span class="prey-portrait-q">?</span></div>
      </div>
      <div class="prey-empty-text">${t('bestiary.slotFree', { n: i + 1 })}</div>
      <button class="prey-btn choose" onclick="openPreySelect(${i})">${t('bestiary.choosePrey')}</button>
    </div>`;
  }).join('');
}

// Exposto no window (onclick): modal pra escolher a criatura da presa.
export function openPreySelect(slotIndex) {
  const mons = encounteredMonsters();
  const list = mons.length
    ? mons.map(id => `<button class="prey-pick" onclick="pickPrey(${slotIndex},'${id}')">
        ${monsterSpriteImg(id, 'prey-monster-icon')}<span>${MONSTERS[id].name}</span>
      </button>`).join('')
    : `<p class="muted">${t('bestiary.noCreaturesYet')}</p>`;
  openModal(`<h3>🐾 ${t('bestiary.choosePreySlot', { n: slotIndex + 1 })}</h3>
    <p class="muted">${t('bestiary.preyPickHint')}</p>
    <div class="prey-pick-grid">${list}</div>`);
}

export function pickPrey(slotIndex, monsterId) {
  activatePrey(slotIndex, monsterId);
  closeModal();
}

// ---------- Bestiário ----------
let bestiarySearch = ''; // filtro por nome (input estático no index.html, não perde foco)

// Chamado pelo oninput do #bestiary-search — re-renderiza só a lista.
export function bestiarySearchInput(v) {
  bestiarySearch = v;
  renderBestiarySection();
}

function renderBestiarySection() {
  const el = document.getElementById('bestiary-list');
  if (!el) return;
  let mons = encounteredMonsters().sort((a, b) => (G.killCounters[b] || 0) - (G.killCounters[a] || 0));
  const q = bestiarySearch.trim().toLowerCase();
  if (q) mons = mons.filter(id => (MONSTERS[id] && MONSTERS[id].name || '').toLowerCase().includes(q));
  if (!mons.length) { el.innerHTML = `<p class="muted">${q ? t('bestiary.noMatch') : t('bestiary.huntToFill')}</p>`; return; }
  el.innerHTML = mons.map(id => {
    const kills = G.killCounters[id] || 0;
    const done = bestiaryStagesCompleted(kills);
    const next = nextBestiaryStage(kills);
    const pct = next ? Math.round((kills / next.kills) * 100) : 100;
    const stageLabel = done > 0 ? BESTIARY_STAGES[done - 1].label : '—';
    const prof = monsterElementProfile(id);
    const chip = (e, cls) => `<span class="elem-chip ${cls}" title="${ELEMENT_LABEL[e]}">${ELEMENT_ICON[e]}</span>`;
    const elemLine = (prof.weak.length || prof.resist.length || prof.immune.length)
      ? `<div class="bestiary-elems">
          ${prof.weak.length ? `<span class="elem-tag weak">${t('bestiary.weak')}</span>${prof.weak.map(e => chip(e, 'weak')).join('')}` : ''}
          ${prof.resist.length ? `<span class="elem-tag resist">${t('bestiary.resist')}</span>${prof.resist.map(e => chip(e, 'resist')).join('')}` : ''}
          ${prof.immune.length ? `<span class="elem-tag immune">${t('bestiary.immune')}</span>${prof.immune.map(e => chip(e, 'immune')).join('')}` : ''}
        </div>`
      : '';
    const progressText = next
      ? t('bestiary.stageProgressWithNext', { stage: stageLabel, kills: kills.toLocaleString(), nextKills: next.kills.toLocaleString() })
      : t('bestiary.stageProgressComplete', { stage: stageLabel, kills: kills.toLocaleString() });
    return `<div class="bestiary-entry ${done >= BESTIARY_STAGES.length ? 'complete' : ''}">
      <div class="bestiary-monster">${monsterSpriteImg(id, 'prey-monster-icon')}<span>${MONSTERS[id].name}</span></div>
      <div class="bestiary-progress">
        <div class="bestiary-stage">${progressText}</div>
        <div class="task-progress-bar-track"><div class="task-progress-bar" style="width:${pct}%"></div></div>
        ${elemLine}
      </div>
    </div>`;
  }).join('');
}

// ---------- Charms ----------
// Tipo do charm no estilo do Cyclopedia do Tibia (Offensive/Defensive/etc.),
// derivado do efeito — só rótulo visual, não muda mecânica.
const CHARM_TYPE = {
  damage:    { label: 'bestiary.charmTypeOffensive', cls: 'off' },
  loot:      { label: 'bestiary.charmTypeUtility',   cls: 'util' },
  gold:      { label: 'bestiary.charmTypeUtility',   cls: 'util' },
  xp:        { label: 'bestiary.charmTypePassive',   cls: 'pass' },
  lifeleech: { label: 'bestiary.charmTypeDefensive', cls: 'def' },
};
function renderCharmsSection() {
  const el = document.getElementById('charms-list');
  if (!el) return;
  const unlocked = G.charmsUnlocked || [];
  const equipped = G.charmsEquipped || [];
  el.innerHTML = Object.entries(CHARMS).map(([id, c]) => {
    const isUnlocked = unlocked.includes(id);
    const isEquipped = equipped.includes(id);
    const affordable = (G.charmPoints || 0) >= c.cost;
    const ty = CHARM_TYPE[c.effect] || { label: 'bestiary.charmTypePassive', cls: 'pass' };
    const state = isEquipped ? 'equipped' : isUnlocked ? 'unlocked' : (affordable ? 'buyable' : 'locked');
    return `<div class="charm-row ${state}">
      <div class="charm-icon-frame">${uiIcon('charm_' + id, 'charm-icon-img')}</div>
      <div class="charm-info">
        <div class="charm-title-row"><span class="charm-name">${c.name}</span><span class="charm-type ${ty.cls}">${t(ty.label)}</span></div>
        <div class="charm-desc">${t(c.desc)}</div>
      </div>
      <div class="charm-action">${isUnlocked
        ? `<button class="charm-btn ${isEquipped ? 'on' : ''}" onclick="toggleCharmEquipped('${id}')">${isEquipped ? t('bestiary.unequip') : t('bestiary.equip')}</button>`
        : `<button class="charm-btn buy" ${affordable ? '' : 'disabled'} onclick="unlockCharm('${id}')"><span class="charm-cost">${c.cost.toLocaleString()} ${charmPointsIconImg('inline-icon')}</span></button>`}
      </div>
    </div>`;
  }).join('');
}

// Selo de "resgatável" na aba Bestiário: há charm point sobrando pra desbloquear
// pelo menos um charm ainda não desbloqueado (marco a celebrar). Atualiza mesmo
// com a aba fechada — é o sinal de que tem coisa pra pegar.
function anyCharmBuyable() {
  const unlocked = G.charmsUnlocked || [];
  const pts = G.charmPoints || 0;
  return Object.entries(CHARMS).some(([id, c]) => !unlocked.includes(id) && pts >= c.cost);
}
export function updateCharmBadge() { setTabBadge('bestiary', anyCharmBuyable()); }

export function renderBestiaryTab() {
  updateCharmBadge();
  const cpEl = document.getElementById('charm-points-display');
  if (cpEl) cpEl.innerHTML = `<span class="charm-points-badge">${charmPointsIconImg('inline-icon')} ${t('bestiary.charmPointsBadge', { n: (G.charmPoints || 0).toLocaleString() })}</span> · ${t('bestiary.charmsEquippedCount', { equipped: (G.charmsEquipped || []).length, total: CHARM_EQUIP_SLOTS })}`;
  renderPreySection();
  renderBestiarySection();
  renderCharmsSection();
}

export function wireBestiaryPanelEvents() {
  on(EVENTS.PREY_PANEL, renderBestiaryTab);
  on(EVENTS.BESTIARY_PANEL, renderBestiaryTab);
  // Charm points mudam (kill/sync) → atualiza o selo mesmo com a aba fechada.
  on(EVENTS.HEADER_STATS, updateCharmBadge);
  // Progresso de bestiário/charm ao vivo durante a caçada: KILL_COUNTERS dispara
  // a cada kill (huntUseCases). Re-render só com a aba ABERTA (senão é à toa),
  // mas o SELO é atualizado sempre — é o sinal de que tem charm pra pegar.
  on(EVENTS.KILL_COUNTERS, () => {
    updateCharmBadge();
    if (document.body.dataset.tab === 'bestiary') renderBestiaryTab();
  });
  updateCharmBadge();
}
