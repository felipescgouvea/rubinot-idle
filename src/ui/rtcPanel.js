// RTC (Rubinot Custom Client) — réplica do RTCaster real do RubinOT:
// ataque automático (uma magia OU uma runa) e cura automática (uma magia E
// uma poção, cada uma com seu próprio limiar de % de HP). Ver
// domain/rtcConfig.js pro shape do estado e application/rtcUseCases.js
// pelas ações.
import { G } from '../application/gameStore.js?v=16';
import { SPELLS } from '../domain/spells.js?v=16';
import { ITEMS } from '../domain/items.js?v=16';
import { on, EVENTS } from '../shared/eventBus.js?v=16';
import { itemIconImg } from './shared.js?v=16';

const ATTACK_RUNES = Object.entries(ITEMS).filter(([, i]) => i.type === 'rune' && i.dmg);
const HEAL_POTIONS = Object.entries(ITEMS).filter(([, i]) => i.type === 'potion' && i.heal);

const SELECTED_STYLE = 'border: 2px solid var(--gold); background:#fdf4d7;';

function spellCard(id, s, selected, onclick) {
  const unlocked = G.level >= s.level;
  return `<div class="skill-card" style="${selected ? SELECTED_STYLE : ''} ${!unlocked ? 'opacity:0.55' : ''}">
    <div class="skill-card-header">
      <span class="skill-card-name">${s.icon} ${s.name}</span>
      <span class="skill-card-level" style="font-size:11px">"${s.words}"</span>
    </div>
    <div class="skill-card-desc">
      ${s.type === 'attack' ? `⚔️ Dano ×${s.power}` : `💚 Cura ${Math.round(s.power * 100)}% do HP`} · 🔵 ${s.mana} mana · Nível ${s.level}+
    </div>
    <button class="skill-upgrade-btn" onclick="${onclick}('${id}')" ${!unlocked ? 'disabled' : ''}>
      ${!unlocked ? `🔒 Requer nível ${s.level}` : selected ? '✅ Selecionada — clique p/ remover' : 'Usar automaticamente'}
    </button>
  </div>`;
}

function itemCard(id, item, qty, selected, onclick, extraDesc) {
  return `<div class="skill-card" style="${selected ? SELECTED_STYLE : ''}">
    <div class="skill-card-header">
      <span class="skill-card-name">${itemIconImg(id, 'item-icon')} ${item.name}</span>
    </div>
    <div class="skill-card-desc">${extraDesc} · possui ${qty}</div>
    <button class="skill-upgrade-btn" onclick="${onclick}('${id}')">
      ${selected ? '✅ Selecionada — clique p/ remover' : 'Usar automaticamente'}
    </button>
  </div>`;
}

export function renderRtcPanel() {
  const el = document.getElementById('rtc-settings');
  if (!el) return;
  if (!G.vocation) { el.innerHTML = '<p class="muted">Escolha uma vocação para configurar o RTC.</p>'; return; }

  const mySpells = Object.entries(SPELLS).filter(([, s]) => s.voc.includes(G.vocation));
  const attackSpells = mySpells.filter(([, s]) => s.type === 'attack');
  const healSpells = mySpells.filter(([, s]) => s.type === 'heal');

  const atkSummary = G.rtc.attackType === 'spell' && G.rtc.attackSpell ? `"${SPELLS[G.rtc.attackSpell].words}"`
    : G.rtc.attackType === 'rune' && G.rtc.attackRune ? ITEMS[G.rtc.attackRune].name
    : 'nenhum (só ataque normal)';
  const healSpellName = G.rtc.healSpell ? `"${SPELLS[G.rtc.healSpell].words}"` : '"exura" (padrão)';
  const healPotionName = G.rtc.healPotion ? ITEMS[G.rtc.healPotion].name : 'nenhuma';

  el.innerHTML = `
    <div id="skill-points-display" style="margin-bottom:14px">
      <strong>⚔️ Ataque automático:</strong> <span>${atkSummary}</span><br/>
      <strong>💊 Cura automática:</strong> <span>spell ${healSpellName} abaixo de ${G.rtc.healSpellThreshold}% · poção ${healPotionName} abaixo de ${G.rtc.healPotionThreshold}%</span>
    </div>

    <h4 style="margin:0 0 4px">⚔️ Ataque Automático</h4>
    <p class="muted" style="margin:0 0 10px">Escolha uma magia OU uma runa — o RTC usa automaticamente a cada golpe durante a caçada.</p>
    <h5 style="margin:0 0 6px">Magias de ataque</h5>
    <div class="skills-grid">
      ${attackSpells.map(([id, s]) => spellCard(id, s, G.rtc.attackType === 'spell' && G.rtc.attackSpell === id, 'setRtcAttackSpell')).join('') || '<p class="muted">Sua vocação não tem magias de ataque.</p>'}
    </div>
    <h5 style="margin:14px 0 6px">Runas de ataque</h5>
    <div class="skills-grid">
      ${ATTACK_RUNES.map(([id, item]) => itemCard(id, item, G.inventory[id] || 0, G.rtc.attackType === 'rune' && G.rtc.attackRune === id, 'setRtcAttackRune', `⚔️ Dano ${item.dmg}`)).join('')}
    </div>

    <hr class="outfit-picker-sep" />

    <h4 style="margin:0 0 4px">💊 Cura Automática</h4>
    <h5 style="margin:0 0 6px">Spell de Cura <span class="muted" style="font-weight:400">— casta abaixo de</span>
      <input type="number" min="5" max="95" value="${G.rtc.healSpellThreshold}" onchange="setRtcThreshold('healSpellThreshold', this.value)" style="width:48px" />% de HP</h5>
    <div class="skills-grid">
      ${healSpells.map(([id, s]) => spellCard(id, s, G.rtc.healSpell === id, 'setRtcHealSpell')).join('') || '<p class="muted">Sua vocação só tem "exura" (padrão, sempre disponível).</p>'}
    </div>
    <h5 style="margin:14px 0 6px">Poção de Cura <span class="muted" style="font-weight:400">— bebe abaixo de</span>
      <input type="number" min="5" max="95" value="${G.rtc.healPotionThreshold}" onchange="setRtcThreshold('healPotionThreshold', this.value)" style="width:48px" />% de HP</h5>
    <div class="skills-grid">
      ${HEAL_POTIONS.map(([id, item]) => itemCard(id, item, G.inventory[id] || 0, G.rtc.healPotion === id, 'setRtcHealPotion', `💚 Cura ${item.heal}`)).join('')}
    </div>
  `;
}

export function wireRtcPanelEvents() {
  on(EVENTS.RTC_PANEL, renderRtcPanel);
}
