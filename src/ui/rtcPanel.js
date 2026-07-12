// RTC (Rubinot Custom Client) — réplica visual e funcional do RTCaster real
// do RubinOT: painel escuro com retrato do personagem, ataque automático
// (uma magia OU uma runa) e cura automática (uma magia E uma poção, cada
// uma com seu próprio limiar de % de HP). Cada vocação vê só o que faz
// sentido pra ela — ver domain/spells.js (voc por spell) e
// domain/rtcConfig.js (runas por vocação).
import { G } from '../application/gameStore.js?v=104';
import { SPELLS, defaultHealSpellId } from '../domain/spells.js?v=104';
import { ITEMS, potionReqLabel } from '../domain/items.js?v=104';
import { VOCATIONS } from '../domain/character.js?v=104';
import { VOCATION_DEFAULT_OUTFIT } from '../domain/outfits.js?v=104';
import { isRuneAvailableToVocation, normalizeAttackSpells, runeMinMl } from '../domain/rtcConfig.js?v=104';
import { getMagic } from '../application/stats.js?v=104';
import { areaName, isAreaAttack } from '../domain/attackAreas.js?v=104';
import { renderOutfitToCanvas } from '../infrastructure/outfitRenderer.js?v=104';
import { setRtcHealPotion, setRtcManaPotion, clearRtcPotion } from '../application/rtcUseCases.js?v=104';
import { on, emit, EVENTS } from '../shared/eventBus.js?v=104';
import { itemIconImg, spellIconImg, vitalIconImg, openModal, closeModal } from './shared.js?v=104';

const ALL_ATTACK_RUNES = Object.entries(ITEMS).filter(([, i]) => i.type === 'rune' && i.dmg);

// Badge de área pra magia/runa de ataque: mostra se é alvo único ou AoE (e a
// forma). Ver domain/attackAreas.js.
function areaBadge(areaId) {
  return isAreaAttack(areaId) ? `💥 ${areaName(areaId)}` : `🎯 ${areaName('single')}`;
}
const HEAL_POTIONS = Object.entries(ITEMS).filter(([, i]) => i.type === 'potion' && i.heal);
const MANA_POTIONS = Object.entries(ITEMS).filter(([, i]) => i.type === 'potion' && i.mana);

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
        ${s.type === 'attack' ? `⚔️ ${areaBadge(s.area)}` : `💚 Cura (escala nível+ML)`} · ${vitalIconImg('mana', 'inline-icon')} ${s.mana} mana · ⏱ CD ${s.cd}s · Nível ${s.level}+
      </div>
    </div>
    <button class="rtc-row-btn" onclick="${onclick}('${id}')" ${!unlocked ? 'disabled' : ''}>
      ${!unlocked ? `🔒 Nível ${s.level}` : selected ? '✅ Ativa' : 'Usar'}
    </button>
  </div>`;
}

// Linha de uma magia JÁ escolhida, com o número de prioridade e os controles
// pra subir/descer na ordem e remover (o RTC casta a primeira disponível).
function priorityRow(id, s, idx, total) {
  return `<div class="rtc-row selected rtc-prio-row">
    <span class="rtc-prio-num">${idx + 1}</span>
    <span class="rtc-row-icon">${spellIconImg(s.name, s.icon, 'rtc-row-icon-img')}</span>
    <div class="rtc-row-info">
      <div class="rtc-row-name">${s.name} <em>"${s.words}"</em></div>
      <div class="rtc-row-desc">⚔️ ${areaBadge(s.area)} · ${vitalIconImg('mana', 'inline-icon')} ${s.mana} · ⏱ ${s.cd}s</div>
    </div>
    <div class="rtc-prio-controls">
      <button class="rtc-prio-btn" onclick="moveRtcAttackSpell('${id}', -1)" ${idx === 0 ? 'disabled' : ''} title="Subir prioridade">▲</button>
      <button class="rtc-prio-btn" onclick="moveRtcAttackSpell('${id}', 1)" ${idx === total - 1 ? 'disabled' : ''} title="Descer prioridade">▼</button>
      <button class="rtc-prio-btn remove" onclick="removeRtcAttackSpell('${id}')" title="Remover">✕</button>
    </div>
  </div>`;
}

// Slot de poção do Healing: um quadrado onde o jogador escolhe a poção. No
// desktop dá pra ARRASTAR a poção da bag; no celular (sem drag) basta TOCAR o
// slot pra abrir uma janelinha de opções (openRtcPotionPicker). Vazio mostra o
// alvo; preenchido mostra a poção escolhida (tocar troca/remove pelo modal).
function potionDropSlot(kind, selectedId) {
  const item = selectedId ? ITEMS[selectedId] : null;
  const label = kind === 'life' ? 'vida' : 'mana';
  return `<div class="rtc-potion-slot ${item ? 'filled' : 'empty'}"
      ondragover="event.preventDefault(); this.classList.add('drag-over')"
      ondragleave="this.classList.remove('drag-over')"
      ondrop="this.classList.remove('drag-over'); handleRtcPotionDrop(event, '${kind}')"
      onclick="openRtcPotionPicker('${kind}')"
      title="${item ? `${item.name} — toque para trocar` : `Toque para escolher a poção de ${label}`}">
    ${item
      ? `<span class="rtc-potion-slot-icon">${itemIconImg(selectedId, 'item-icon')}</span><span class="rtc-potion-slot-name">${item.name}</span>`
      : `<span class="rtc-potion-slot-ghost">⬚</span><span class="rtc-potion-slot-hint">Toque para escolher a poção de ${label}</span>`}
  </div>`;
}

// Janelinha de opções pra escolher a poção que o RTC bebe — a alternativa ao
// drag-and-drop (essencial no celular, que não arrasta). Lista as poções do tipo
// (vida/mana), a quantidade que o jogador tem e o requisito, com um botão pra
// selecionar. Também permite remover a poção atual.
export function openRtcPotionPicker(kind) {
  const list = kind === 'life' ? HEAL_POTIONS : MANA_POTIONS;
  const label = kind === 'life' ? 'vida' : 'mana';
  const selectedId = kind === 'life' ? G.rtc.healPotion : G.rtc.manaPotion;
  const rows = list.map(([id, item]) => {
    const qty = G.inventory[id] || 0;
    const sel = selectedId === id;
    const amount = kind === 'life' ? `💚 +${item.heal} HP` : `${vitalIconImg('mana', 'inline-icon')} +${item.mana} mana`;
    return `<div class="rtc-row ${sel ? 'selected' : ''}">
      <span class="rtc-row-icon">${itemIconImg(id, 'item-icon')}</span>
      <div class="rtc-row-info">
        <div class="rtc-row-name">${item.name}</div>
        <div class="rtc-row-desc">${amount} · ${potionReqLabel(item)} · possui ${qty}</div>
      </div>
      <button class="rtc-row-btn" onclick="pickRtcPotion('${kind}','${id}')">${sel ? '✅ Ativa' : 'Usar'}</button>
    </div>`;
  }).join('');
  openModal(`
    <div class="rtc-potion-picker">
      <h3>💊 Poção de ${label}</h3>
      <p class="muted">Toque na poção que o RTC deve beber automaticamente.</p>
      <div class="rtc-rows">${rows}</div>
      <div class="rtc-potion-picker-actions">
        ${selectedId ? `<button class="btn-small danger" onclick="pickRtcPotion('${kind}','')">Remover</button>` : ''}
        <button class="btn-small" onclick="closeModal()">Fechar</button>
      </div>
    </div>
  `);
}

// Aplica a escolha do modal (id vazio = remover) e fecha a janelinha.
export function pickRtcPotion(kind, id) {
  if (id) { kind === 'life' ? setRtcHealPotion(id) : setRtcManaPotion(id); }
  else { clearRtcPotion(kind); }
  closeModal();
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
  const prioSpells = normalizeAttackSpells(G.rtc);
  const atkSummary = prioSpells.length ? prioSpells.map((id, i) => `${i + 1}. "${SPELLS[id].words}"`).join(' → ')
    : G.rtc.attackType === 'rune' && G.rtc.attackRune ? ITEMS[G.rtc.attackRune].name
    : 'nenhum (só ataque normal)';
  const healSpellName = `"${SPELLS[healSpellId].words}"${G.rtc.healSpell ? '' : ' (padrão)'}`;
  const healPotionName = G.rtc.healPotion ? ITEMS[G.rtc.healPotion].name : 'nenhuma';
  const manaPotionName = G.rtc.manaPotion ? ITEMS[G.rtc.manaPotion].name : 'nenhuma';

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
          <div><strong>🔵 Mana automática:</strong> poção ${manaPotionName} abaixo de ${G.rtc.manaPotionThreshold}% de mana</div>
        </div>

        <div class="rtc-subtabs">
          <button class="rtc-subtab-btn ${activeRtcTab === 'attack' ? 'active' : ''}" onclick="setRtcSubTab('attack')">⚔️ RTCaster</button>
          <button class="rtc-subtab-btn ${activeRtcTab === 'heal' ? 'active' : ''}" onclick="setRtcSubTab('heal')">💊 Healing</button>
        </div>

        ${activeRtcTab === 'attack' ? `
        <p class="muted">Configure VÁRIAS magias por prioridade — o RTC casta a primeira disponível (com mana e fora de cooldown) a cada golpe. As de baixo entram como fallback.</p>
        <label class="rtc-smart-toggle"><input type="checkbox" ${G.rtc.smartElement ? 'checked' : ''} onchange="setRtcSmartElement(this.checked)" /> 🎯 Prioridade inteligente — castar a magia forte contra a fraqueza da criatura</label>
        <h5>Prioridade de ataque ${prioSpells.length ? `(${prioSpells.length})` : ''}</h5>
        <div class="rtc-rows">
          ${prioSpells.map((id, i) => priorityRow(id, SPELLS[id], i, prioSpells.length)).join('') || '<p class="muted">Nenhuma magia na prioridade. Adicione abaixo (ou use uma runa).</p>'}
        </div>
        <h5>Adicionar magia de ataque</h5>
        <div class="rtc-rows">
          ${attackSpells.filter(([id]) => !prioSpells.includes(id)).map(([id, s]) => spellRow(id, s, false, 'addRtcAttackSpell')).join('') || '<p class="muted">Todas as suas magias de ataque já estão na prioridade.</p>'}
        </div>
        <h5>Runas de ataque <span class="muted">(alternativa às magias)</span></h5>
        <div class="rtc-rows">
          ${attackRunes.map(([id, item]) => { const lock = getMagic() < runeMinMl(id); return itemRow(id, item, G.inventory[id] || 0, G.rtc.attackType === 'rune' && G.rtc.attackRune === id, 'setRtcAttackRune', `⚔️ ${areaBadge(item.area)} · 🔮 ML ${runeMinMl(id)}+${lock ? ' 🔒' : ''}`); }).join('') || '<p class="muted">Sua vocação não usa runas de ataque — mana insuficiente pra fazer efeito.</p>'}
        </div>
        ` : `
        <h5>Spell de Cura <span class="muted">— casta abaixo de</span>
          <input type="number" min="5" max="95" value="${G.rtc.healSpellThreshold}" onchange="setRtcThreshold('healSpellThreshold', this.value)" class="rtc-threshold-input" />% de HP</h5>
        <div class="rtc-rows">
          ${healSpells.map(([id, s]) => spellRow(id, s, (G.rtc.healSpell || defaultHealSpellId(voc)) === id, 'setRtcHealSpell')).join('')}
        </div>
        <button class="btn-small" style="margin:2px 0 8px" onclick="toggleBackpack()">🎒 Abrir Bag</button>
        <h5>Poção de Cura <span class="muted">— bebe abaixo de</span>
          <input type="number" min="5" max="95" value="${G.rtc.healPotionThreshold}" onchange="setRtcThreshold('healPotionThreshold', this.value)" class="rtc-threshold-input" />% de HP</h5>
        <p class="muted rtc-drag-hint">Toque no quadrado para escolher (ou arraste a poção de vida da bag).</p>
        ${potionDropSlot('life', G.rtc.healPotion)}
        <h5>Poção de Mana <span class="muted">— bebe abaixo de</span>
          <input type="number" min="5" max="95" value="${G.rtc.manaPotionThreshold}" onchange="setRtcThreshold('manaPotionThreshold', this.value)" class="rtc-threshold-input" />% de mana</h5>
        <p class="muted rtc-drag-hint">Toque no quadrado para escolher (ou arraste a poção de mana da bag).</p>
        ${potionDropSlot('mana', G.rtc.manaPotion)}
        `}
      </div>
    </div>
  `;
  mountPortrait();
}

// Recebe a poção arrastada da bag (ver inventoryAndEquipmentPanel: dragstart
// grava o itemId no dataTransfer). Valida que é do tipo certo (vida no slot de
// vida, mana no slot de mana) antes de configurar.
export function handleRtcPotionDrop(ev, kind) {
  ev.preventDefault();
  const id = ev.dataTransfer.getData('application/x-item-id') || ev.dataTransfer.getData('text/plain');
  const item = ITEMS[id];
  if (!item || item.type !== 'potion') { emit(EVENTS.NOTIFY, { msg: 'Arraste uma poção da bag.', type: 'error' }); return; }
  if (kind === 'life') {
    if (!item.heal) { emit(EVENTS.NOTIFY, { msg: `${item.name} não é poção de vida.`, type: 'error' }); return; }
    setRtcHealPotion(id);
  } else {
    if (!item.mana) { emit(EVENTS.NOTIFY, { msg: `${item.name} não é poção de mana.`, type: 'error' }); return; }
    setRtcManaPotion(id);
  }
}

export function setRtcSubTab(tab) {
  if (tab !== 'attack' && tab !== 'heal') return;
  activeRtcTab = tab;
  renderRtcPanel();
}

export function wireRtcPanelEvents() {
  on(EVENTS.RTC_PANEL, renderRtcPanel);
}
