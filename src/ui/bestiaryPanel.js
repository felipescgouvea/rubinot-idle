// Aba "Bestiário" — reúne três sistemas de progressão ligados a criaturas:
//  1) Presas (Prey): bônus contra uma criatura escolhida.
//  2) Bestiário: progresso de mortes por criatura, que rende Charm Points.
//  3) Charms: bônus passivos comprados com Charm Points.
// Concentrar os três aqui (em vez de 3 abas novas) é de propósito — evita
// inchar ainda mais a barra de abas (ver o reagrupamento do header).
import { G } from '../application/gameStore.js?v=129';
import { MONSTERS } from '../domain/bestiary.js?v=140';
import {
  PREY_SLOTS, PREY_BONUS_TYPES, PREY_REROLL_COST, isPreyActive,
} from '../domain/prey.js?v=125';
import {
  CHARMS, CHARM_EQUIP_SLOTS, BESTIARY_STAGES,
  bestiaryStagesCompleted, nextBestiaryStage,
} from '../domain/charms.js?v=126';
import { monsterElementProfile, ELEMENT_ICON, ELEMENT_LABEL } from '../domain/elements.js?v=125';
import { on, EVENTS } from '../shared/eventBus.js?v=127';
import { openModal, closeModal, charmPointsIconImg } from './shared.js?v=132';
import { monsterSpriteImg } from './huntPanel.js?v=141';
import { activatePrey, rerollPrey, clearPrey } from '../application/preyUseCases.js?v=127';
import { unlockCharm, toggleCharmEquipped } from '../application/bestiaryUseCases.js?v=127';
import { t } from '../i18n/i18n.js?v=142';

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
function renderPreySection() {
  const el = document.getElementById('prey-slots');
  if (!el) return;
  const now = Date.now();
  const slots = Array.from({ length: PREY_SLOTS }, (_, i) => (G.prey || [])[i] || null);
  el.innerHTML = slots.map((slot, i) => {
    if (isPreyActive(slot, now)) {
      const m = MONSTERS[slot.monster];
      const bt = PREY_BONUS_TYPES[slot.bonusType];
      const stars = '★'.repeat(slot.stars) + '☆'.repeat(5 - slot.stars);
      return `<div class="prey-slot active">
        <div class="prey-slot-monster">${monsterSpriteImg(slot.monster, 'prey-monster-icon')}<span>${m.name}</span></div>
        <div class="prey-bonus">${bt.icon} +${Math.round(slot.bonusPct * 100)}% ${t(bt.name)}</div>
        <div class="prey-stars">${stars}</div>
        <div class="prey-timer">⏳ ${fmtRemaining(slot.expires - now)}</div>
        <div class="prey-actions">
          <button class="btn-small" onclick="rerollPrey(${i})" title="${t('bestiary.rerollTooltip', { cost: PREY_REROLL_COST.toLocaleString() })}">🎲 ${t('bestiary.reroll')}</button>
          <button class="btn-small danger" onclick="clearPrey(${i})">✕</button>
        </div>
      </div>`;
    }
    return `<div class="prey-slot empty">
      <div class="prey-slot-empty-label">🐾 ${t('bestiary.slotFree', { n: i + 1 })}</div>
      <button class="btn-blue" onclick="openPreySelect(${i})">${t('bestiary.choosePrey')}</button>
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
function renderBestiarySection() {
  const el = document.getElementById('bestiary-list');
  if (!el) return;
  const mons = encounteredMonsters().sort((a, b) => (G.killCounters[b] || 0) - (G.killCounters[a] || 0));
  if (!mons.length) { el.innerHTML = `<p class="muted">${t('bestiary.huntToFill')}</p>`; return; }
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
function renderCharmsSection() {
  const el = document.getElementById('charms-list');
  if (!el) return;
  const unlocked = G.charmsUnlocked || [];
  const equipped = G.charmsEquipped || [];
  el.innerHTML = Object.entries(CHARMS).map(([id, c]) => {
    const isUnlocked = unlocked.includes(id);
    const isEquipped = equipped.includes(id);
    const affordable = (G.charmPoints || 0) >= c.cost;
    return `<div class="charm-card ${isEquipped ? 'equipped' : ''}">
      <div class="charm-head"><span class="charm-icon">${c.icon}</span>
        <div><div class="charm-name">${c.name}</div>
        <div class="charm-desc">${t(c.desc)}</div></div></div>
      ${isUnlocked
        ? `<button class="btn-small ${isEquipped ? 'danger' : 'btn-blue'}" onclick="toggleCharmEquipped('${id}')">${isEquipped ? t('bestiary.unequip') : t('bestiary.equip')}</button>`
        : `<button class="btn-small" ${affordable ? '' : 'disabled'} onclick="unlockCharm('${id}')">🔓 ${t('bestiary.unlockCost', { cost: c.cost })} ${charmPointsIconImg('inline-icon')}</button>`}
    </div>`;
  }).join('');
}

export function renderBestiaryTab() {
  const cpEl = document.getElementById('charm-points-display');
  if (cpEl) cpEl.innerHTML = `<span class="charm-points-badge">${charmPointsIconImg('inline-icon')} ${t('bestiary.charmPointsBadge', { n: (G.charmPoints || 0).toLocaleString() })}</span> · ${t('bestiary.charmsEquippedCount', { equipped: (G.charmsEquipped || []).length, total: CHARM_EQUIP_SLOTS })}`;
  renderPreySection();
  renderBestiarySection();
  renderCharmsSection();
}

export function wireBestiaryPanelEvents() {
  on(EVENTS.PREY_PANEL, renderBestiaryTab);
  on(EVENTS.BESTIARY_PANEL, renderBestiaryTab);
}
