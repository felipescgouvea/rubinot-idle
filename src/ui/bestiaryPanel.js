// Aba "Bestiário" — reúne três sistemas de progressão ligados a criaturas:
//  1) Presas (Prey): bônus contra uma criatura escolhida.
//  2) Bestiário: progresso de mortes por criatura, que rende Charm Points.
//  3) Charms: bônus passivos comprados com Charm Points.
// Concentrar os três aqui (em vez de 3 abas novas) é de propósito — evita
// inchar ainda mais a barra de abas (ver o reagrupamento do header).
import { G } from '../application/gameStore.js?v=82';
import { MONSTERS } from '../domain/bestiary.js?v=82';
import {
  PREY_SLOTS, PREY_BONUS_TYPES, PREY_REROLL_COST, isPreyActive,
} from '../domain/prey.js?v=82';
import {
  CHARMS, CHARM_EQUIP_SLOTS, BESTIARY_STAGES,
  bestiaryStagesCompleted, nextBestiaryStage,
} from '../domain/charms.js?v=82';
import { monsterElementProfile, ELEMENT_ICON, ELEMENT_LABEL } from '../domain/elements.js?v=82';
import { on, EVENTS } from '../shared/eventBus.js?v=82';
import { openModal, closeModal } from './shared.js?v=82';
import { monsterSpriteImg } from './huntPanel.js?v=82';
import { activatePrey, rerollPrey, clearPrey } from '../application/preyUseCases.js?v=82';
import { unlockCharm, toggleCharmEquipped } from '../application/bestiaryUseCases.js?v=82';

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
      const t = PREY_BONUS_TYPES[slot.bonusType];
      const stars = '★'.repeat(slot.stars) + '☆'.repeat(5 - slot.stars);
      return `<div class="prey-slot active">
        <div class="prey-slot-monster">${monsterSpriteImg(slot.monster, 'prey-monster-icon')}<span>${m.name}</span></div>
        <div class="prey-bonus">${t.icon} +${Math.round(slot.bonusPct * 100)}% ${t.name}</div>
        <div class="prey-stars">${stars}</div>
        <div class="prey-timer">⏳ ${fmtRemaining(slot.expires - now)}</div>
        <div class="prey-actions">
          <button class="btn-small" onclick="rerollPrey(${i})" title="Custa ${PREY_REROLL_COST.toLocaleString()} gold">🎲 Rerolar</button>
          <button class="btn-small danger" onclick="clearPrey(${i})">✕</button>
        </div>
      </div>`;
    }
    return `<div class="prey-slot empty">
      <div class="prey-slot-empty-label">🐾 Slot ${i + 1} livre</div>
      <button class="btn-blue" onclick="openPreySelect(${i})">Escolher Presa</button>
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
    : '<p class="muted">Você ainda não enfrentou nenhuma criatura. Cace um pouco primeiro!</p>';
  openModal(`<h3>🐾 Escolher Presa — Slot ${slotIndex + 1}</h3>
    <p class="muted">O bônus (dano, XP ou loot) e a intensidade (★) são sorteados ao travar a presa, válidos por 2h.</p>
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
  if (!mons.length) { el.innerHTML = '<p class="muted">Cace criaturas para preencher seu bestiário e ganhar Charm Points.</p>'; return; }
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
          ${prof.weak.length ? `<span class="elem-tag weak">Fraco:</span>${prof.weak.map(e => chip(e, 'weak')).join('')}` : ''}
          ${prof.resist.length ? `<span class="elem-tag resist">Resiste:</span>${prof.resist.map(e => chip(e, 'resist')).join('')}` : ''}
          ${prof.immune.length ? `<span class="elem-tag immune">Imune:</span>${prof.immune.map(e => chip(e, 'immune')).join('')}` : ''}
        </div>`
      : '';
    return `<div class="bestiary-entry ${done >= BESTIARY_STAGES.length ? 'complete' : ''}">
      <div class="bestiary-monster">${monsterSpriteImg(id, 'prey-monster-icon')}<span>${MONSTERS[id].name}</span></div>
      <div class="bestiary-progress">
        <div class="bestiary-stage">Etapa ${stageLabel} · ${kills.toLocaleString()} mortes${next ? ` / ${next.kills.toLocaleString()}` : ' · ✅ completo'}</div>
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
        <div><div class="charm-name">${c.name} <small>(${c.tibia})</small></div>
        <div class="charm-desc">${c.desc}</div></div></div>
      ${isUnlocked
        ? `<button class="btn-small ${isEquipped ? 'danger' : 'btn-blue'}" onclick="toggleCharmEquipped('${id}')">${isEquipped ? 'Desequipar' : 'Equipar'}</button>`
        : `<button class="btn-small" ${affordable ? '' : 'disabled'} onclick="unlockCharm('${id}')">🔓 ${c.cost} CP</button>`}
    </div>`;
  }).join('');
}

export function renderBestiaryTab() {
  const cpEl = document.getElementById('charm-points-display');
  if (cpEl) cpEl.innerHTML = `<span class="charm-points-badge">✨ ${(G.charmPoints || 0).toLocaleString()} Charm Points</span> · ${(G.charmsEquipped || []).length}/${CHARM_EQUIP_SLOTS} charms equipados`;
  renderPreySection();
  renderBestiarySection();
  renderCharmsSection();
}

export function wireBestiaryPanelEvents() {
  on(EVENTS.PREY_PANEL, renderBestiaryTab);
  on(EVENTS.BESTIARY_PANEL, renderBestiaryTab);
}
