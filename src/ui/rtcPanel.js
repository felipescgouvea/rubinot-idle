// RTC (Rubinot Custom Client) — réplica visual e funcional do RTCaster real
// do RubinOT: painel escuro com retrato do personagem, ataque automático
// (uma magia OU uma runa) e cura automática (uma magia E uma poção, cada
// uma com seu próprio limiar de % de HP). Cada vocação vê só o que faz
// sentido pra ela — ver domain/spells.js (voc por spell) e
// domain/rtcConfig.js (runas por vocação).
import { G } from '../application/gameStore.js?v=53';
import { SPELLS, defaultHealSpellId } from '../domain/spells.js?v=53';
import { ITEMS } from '../domain/items.js?v=53';
import { VOCATIONS } from '../domain/character.js?v=53';
import { VOCATION_DEFAULT_OUTFIT } from '../domain/outfits.js?v=53';
import { isRuneAvailableToVocation } from '../domain/rtcConfig.js?v=53';
import { areaName, isAreaAttack } from '../domain/attackAreas.js?v=53';
import { renderOutfitToCanvas } from '../infrastructure/outfitRenderer.js?v=53';
import { on, EVENTS } from '../shared/eventBus.js?v=53';
import { itemIconImg, spellIconImg, vitalIconImg } from './shared.js?v=53';

const ALL_ATTACK_RUNES = Object.entries(ITEMS).filter(([, i]) => i.type === 'rune' && i.dmg);

// Badge de área pra magia/runa de ataque: mostra se é alvo único ou AoE (e a
// forma). Ver domain/attackAreas.js.
function areaBadge(areaId) {
  return isAreaAttack(areaId) ? `💥 ${areaName(areaId)}` : `🎯 ${areaName('single')}`;
}
const HEAL_POTIONS = Object.entries(ITEMS).filter(([, i]) => i.type === 'potion' && i.heal);

// Qual sub-aba do RTC está aberta — estado só de UI (igual ao RTCaster real,
// que tem uma aba "RTCaster" pro ataque e outra "Healing" separada).
let activeRtcTab = 'attack';

function spellRow(id, s, selected, onclick) {
  const unlocked = G.level >= s.level;
  return `<div class="rtc-row ${selected ? 'selected' : ''} ${!unlocked ? 'locked' : ''}">
    <span class="rtc-row-icon">${spellIconImg(s.name, s.icon, 'rtc-row-icon-img')}</span>
    <div class="rtc-row-info">
      <div class="rtc-row-name">${s.name} <em>"${s.words}"</em></div>
      <div class="rtc-row-desc">
        ${s.type === 'attack' ? `⚔️ Dano ×${s.power} · ${areaBadge(s.area)}` : `💚 Cura ${Math.round(s.power * 100)}% do HP`} · ${vitalIconImg('mana', 'inline-icon')} ${s.mana} mana · Nível ${s.level}+
      </div>
    </div>
    <button class="rtc-row-btn" onclick="${onclick}('${id}')" ${!unlocked ? 'disabled' : ''}>
      ${!unlocked ? `🔒 Nível ${s.level}` : selected ? '✅ Ativa' : 'Usar'}
    </button>
  </div>`;
}

function itemRow(id, item, qty, selected, onclick, extraDesc) {
  return `<div class="rtc-row ${selected ? 'selected' : ''}">
    <span class="rtc-row-icon">${itemIconImg(id, 'item-icon')}</span>
    <div class="rtc-row-info">
      <div class="rtc-row-name">${item.name}</div>
      <div class="rtc-row-desc">${extraDesc} · possui ${qty}</div>
    </div>
    <button class="rtc-row-btn" onclick="${onclick}('${id}')">${selected ? '✅ Ativa' : 'Usar'}</button>
  </div>`;
}

function mountPortrait() {
  const canvas = document.getElementById('rtc-portrait-canvas');
  if (!canvas || !G.vocation) return;
  const outfitId = G.outfit || VOCATION_DEFAULT_OUTFIT[G.vocation];
  if (!outfitId) return;
  renderOutfitToCanvas(canvas, {
    outfitId,
    gender: G.outfitGender || 'male',
    addon1: G.outfitAddon1,
    addon2: G.outfitAddon2,
    colors: G.outfitColors,
  }).catch(() => {});
}

export function renderRtcPanel() {
  const el = document.getElementById('rtc-settings');
  if (!el) return;
  if (!G.vocation) { el.innerHTML = '<p class="muted">Escolha uma vocação para configurar o RTC.</p>'; return; }

  const voc = G.vocation;
  const mySpells = Object.entries(SPELLS).filter(([, s]) => s.voc.includes(voc));
  const attackSpells = mySpells.filter(([, s]) => s.type === 'attack');
  const healSpells = mySpells.filter(([, s]) => s.type === 'heal');
  const attackRunes = ALL_ATTACK_RUNES.filter(([id]) => isRuneAvailableToVocation(id, voc));

  const healSpellId = G.rtc.healSpell || defaultHealSpellId(voc);
  const atkSummary = G.rtc.attackType === 'spell' && G.rtc.attackSpell ? `"${SPELLS[G.rtc.attackSpell].words}"`
    : G.rtc.attackType === 'rune' && G.rtc.attackRune ? ITEMS[G.rtc.attackRune].name
    : 'nenhum (só ataque normal)';
  const healSpellName = `"${SPELLS[healSpellId].words}"${G.rtc.healSpell ? '' : ' (padrão)'}`;
  const healPotionName = G.rtc.healPotion ? ITEMS[G.rtc.healPotion].name : 'nenhuma';

  el.innerHTML = `
    <div class="rtc-console">
      <div class="rtc-sidebar">
        <div class="rtc-portrait"><canvas id="rtc-portrait-canvas" width="64" height="64"></canvas></div>
        <div class="rtc-sidebar-name">${VOCATIONS[voc].name}</div>
        <div class="rtc-sidebar-level">Level ${G.level}</div>
        <div class="rtc-sidebar-status">Helper Status: Ativo ✔</div>
      </div>
      <div class="rtc-main">
        <div class="rtc-summary">
          <div><strong>⚔️ Ataque automático:</strong> ${atkSummary}</div>
          <div><strong>💊 Cura automática:</strong> spell ${healSpellName} abaixo de ${G.rtc.healSpellThreshold}% · poção ${healPotionName} abaixo de ${G.rtc.healPotionThreshold}%</div>
        </div>

        <div class="rtc-subtabs">
          <button class="rtc-subtab-btn ${activeRtcTab === 'attack' ? 'active' : ''}" onclick="setRtcSubTab('attack')">⚔️ RTCaster</button>
          <button class="rtc-subtab-btn ${activeRtcTab === 'heal' ? 'active' : ''}" onclick="setRtcSubTab('heal')">💊 Healing</button>
        </div>

        ${activeRtcTab === 'attack' ? `
        <p class="muted">Escolha uma magia OU uma runa — o RTC usa automaticamente a cada golpe durante a caçada.</p>
        <h5>Magias de ataque</h5>
        <div class="rtc-rows">
          ${attackSpells.map(([id, s]) => spellRow(id, s, G.rtc.attackType === 'spell' && G.rtc.attackSpell === id, 'setRtcAttackSpell')).join('') || '<p class="muted">Sua vocação não tem magias de ataque.</p>'}
        </div>
        <h5>Runas de ataque</h5>
        <div class="rtc-rows">
          ${attackRunes.map(([id, item]) => itemRow(id, item, G.inventory[id] || 0, G.rtc.attackType === 'rune' && G.rtc.attackRune === id, 'setRtcAttackRune', `⚔️ Dano ${item.dmg} · ${areaBadge(item.area)}`)).join('') || '<p class="muted">Sua vocação não usa runas de ataque — mana insuficiente pra fazer efeito.</p>'}
        </div>
        ` : `
        <h5>Spell de Cura <span class="muted">— casta abaixo de</span>
          <input type="number" min="5" max="95" value="${G.rtc.healSpellThreshold}" onchange="setRtcThreshold('healSpellThreshold', this.value)" class="rtc-threshold-input" />% de HP</h5>
        <div class="rtc-rows">
          ${healSpells.map(([id, s]) => spellRow(id, s, (G.rtc.healSpell || defaultHealSpellId(voc)) === id, 'setRtcHealSpell')).join('')}
        </div>
        <h5>Poção de Cura <span class="muted">— bebe abaixo de</span>
          <input type="number" min="5" max="95" value="${G.rtc.healPotionThreshold}" onchange="setRtcThreshold('healPotionThreshold', this.value)" class="rtc-threshold-input" />% de HP</h5>
        <div class="rtc-rows">
          ${HEAL_POTIONS.map(([id, item]) => itemRow(id, item, G.inventory[id] || 0, G.rtc.healPotion === id, 'setRtcHealPotion', `💚 Cura ${item.heal}`)).join('')}
        </div>
        `}
      </div>
    </div>
  `;
  mountPortrait();
}

export function setRtcSubTab(tab) {
  if (tab !== 'attack' && tab !== 'heal') return;
  activeRtcTab = tab;
  renderRtcPanel();
}

export function wireRtcPanelEvents() {
  on(EVENTS.RTC_PANEL, renderRtcPanel);
}
