// RTC (Rubinot Custom Client) — réplica visual e funcional do RTCaster real
// do RubinOT: painel escuro com retrato do personagem, ataque automático
// (uma magia OU uma runa) e cura automática (uma magia E uma poção, cada
// uma com seu próprio limiar de % de HP). Cada vocação vê só o que faz
// sentido pra ela — ver domain/spells.js (voc por spell) e
// domain/rtcConfig.js (runas por vocação).
import { G } from '../application/gameStore.js?v=135';
import { SPELLS, defaultHealSpellId, isSpellAvailable } from '../domain/spells.js?v=133';
import { ITEMS, potionReqLabel } from '../domain/items.js?v=146';
import { VOCATIONS } from '../domain/character.js?v=162';
import { VOCATION_DEFAULT_OUTFIT } from '../domain/outfits.js?v=131';
import { isRuneAvailableToVocation, normalizeAttackSpells, runeMinMl, canUseAttackRune, isRuneEntry, runeEntryId, ATTACK_SLOT_COUNT } from '../domain/rtcConfig.js?v=165';
import { getMagic } from '../application/stats.js?v=132';
import { areaName, isAreaAttack } from '../domain/attackAreas.js?v=131';
import { renderOutfitToCanvas } from '../infrastructure/outfitRenderer.js?v=131';
import { setRtcHealPotion, setRtcManaPotion, clearRtcPotion, setRtcAttackSpellSlot, clearRtcAttackSpellSlot } from '../application/rtcUseCases.js?v=167';
import { on, emit, EVENTS } from '../shared/eventBus.js?v=133';
import { itemIconImg, spellIconImg, vitalIconImg, openModal, closeModal } from './shared.js?v=138';
import { t } from '../i18n/i18n.js?v=149';

const ALL_ATTACK_RUNES = Object.entries(ITEMS).filter(([, i]) => i.type === 'rune' && i.dmg);

// Badge de área pra magia/runa de ataque: mostra se é alvo único ou AoE (e a
// forma). Ver domain/attackAreas.js.
function areaBadge(areaId) {
  return isAreaAttack(areaId) ? `💥 ${areaName(areaId, t)}` : `🎯 ${areaName('single', t)}`;
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
        ${s.type === 'attack' ? `⚔️ ${areaBadge(s.area)}` : `💚 ${t('rtc.healScaling')}`} · ${vitalIconImg('mana', 'inline-icon')} ${t('rtc.manaCost', { amount: s.mana })} · ⏱ ${t('rtc.cooldown', { sec: s.cd })} · ${t('rtc.levelReq', { level: s.level })}
      </div>
    </div>
    <button class="rtc-row-btn" onclick="${onclick}('${id}')" ${!unlocked ? 'disabled' : ''}>
      ${!unlocked ? `🔒 ${t('rtc.lockedLevel', { level: s.level })}` : selected ? `✅ ${t('rtc.active')}` : t('rtc.use')}
    </button>
  </div>`;
}

// Caixinha de prioridade de ataque (idx = posição 0..ATTACK_SLOT_COUNT-1): um
// quadrado onde o jogador escolhe a magia OU RUNA, igual ao slot de poção do
// Healing. Vazio mostra a posição; preenchido mostra o que foi escolhido
// (tocar troca/remove pelo modal) — magia e runa competem na MESMA lista de
// prioridade, como no RTCaster real (ver domain/rtcConfig.js).
function attackSpellSlot(idx, entry) {
  const isRune = isRuneEntry(entry);
  const s = entry && !isRune ? SPELLS[entry] : null;
  const item = entry && isRune ? ITEMS[runeEntryId(entry)] : null;
  const icon = s ? spellIconImg(s.name, s.icon, 'item-icon') : item ? itemIconImg(runeEntryId(entry), 'item-icon') : null;
  const name = s ? s.name : item ? item.name : null;
  return `<div class="rtc-potion-slot ${name ? 'filled' : 'empty'}"
      onclick="openRtcAttackSpellPicker(${idx})"
      title="${name ? t('rtc.attackSlotFilledTitle', { name }) : t('rtc.attackSlotEmptyTitle', { n: idx + 1 })}">
    ${name
      ? `<span class="rtc-potion-slot-icon">${icon}</span><span class="rtc-potion-slot-name">${idx + 1}. ${name}</span>`
      : `<span class="rtc-potion-slot-ghost">⬚</span><span class="rtc-potion-slot-hint">${t('rtc.attackSlotEmptyTitle', { n: idx + 1 })}</span>`}
  </div>`;
}

// Janelinha de opções pra escolher a magia OU runa da caixinha de prioridade
// idx — mesma UX do seletor de poção (openRtcPotionPicker). Lista as duas
// juntas (magias primeiro, depois runas) em vez de espalhar as runas numa
// seção própria na tela principal — ficava enorme com muitas runas.
export function openRtcAttackSpellPicker(idx) {
  const voc = G.vocation;
  const attackSpells = Object.entries(SPELLS).filter(([, s]) => s.type === 'attack' && s.voc.includes(voc));
  const attackRunes = ALL_ATTACK_RUNES.filter(([id]) => isRuneAvailableToVocation(id, voc));
  const prioSpells = normalizeAttackSpells(G.rtc);
  const currentEntry = prioSpells[idx];
  const spellRows = attackSpells.map(([id, s]) => {
    const unlocked = G.level >= s.level;
    const sel = currentEntry === id;
    return `<div class="rtc-row ${sel ? 'selected' : ''} ${!unlocked ? 'locked' : ''}">
      <span class="rtc-row-icon">${spellIconImg(s.name, s.icon, 'rtc-row-icon-img')}</span>
      <div class="rtc-row-info">
        <div class="rtc-row-name">${s.name} <em>"${s.words}"</em></div>
        <div class="rtc-row-desc">⚔️ ${areaBadge(s.area)} · ${vitalIconImg('mana', 'inline-icon')} ${t('rtc.manaCost', { amount: s.mana })} · ⏱ ${t('rtc.cooldown', { sec: s.cd })} · ${t('rtc.levelReq', { level: s.level })}</div>
      </div>
      <button class="rtc-row-btn" onclick="pickRtcAttackSpell(${idx}, '${id}', 'spell')" ${!unlocked ? 'disabled' : ''}>
        ${!unlocked ? `🔒 ${t('rtc.lockedLevel', { level: s.level })}` : sel ? `✅ ${t('rtc.active')}` : t('rtc.use')}
      </button>
    </div>`;
  }).join('');
  const runeRows = attackRunes.map(([id, item]) => {
    const unlocked = canUseAttackRune(id, voc, getMagic());
    const sel = currentEntry === `rune:${id}`;
    return `<div class="rtc-row ${sel ? 'selected' : ''} ${!unlocked ? 'locked' : ''}">
      <span class="rtc-row-icon">${itemIconImg(id, 'rtc-row-icon-img')}</span>
      <div class="rtc-row-info">
        <div class="rtc-row-name">${item.name}</div>
        <div class="rtc-row-desc">⚔️ ${areaBadge(item.area)} · 🔮 ${t('rtc.mlReq', { ml: runeMinMl(id) })} · ${t('rtc.owned', { qty: G.inventory[id] || 0 })}</div>
      </div>
      <button class="rtc-row-btn" onclick="pickRtcAttackSpell(${idx}, '${id}', 'rune')" ${!unlocked ? 'disabled' : ''}>
        ${!unlocked ? `🔒 ${t('rtc.mlReq', { ml: runeMinMl(id) })}` : sel ? `✅ ${t('rtc.active')}` : t('rtc.use')}
      </button>
    </div>`;
  }).join('');
  openModal(`
    <div class="rtc-potion-picker">
      <h3>⚔️ ${t('rtc.attackSlotPickerTitle', { n: idx + 1 })}</h3>
      <p class="muted">${t('rtc.attackSlotPickerHint')}</p>
      <div class="rtc-rows">${spellRows || `<p class="muted">${t('rtc.allAttackSpellsAdded')}</p>`}</div>
      <h5>${t('rtc.attackRunesTitle')}</h5>
      <div class="rtc-rows">${runeRows || `<p class="muted">${t('rtc.noAttackRunes')}</p>`}</div>
      ${currentEntry ? `<div class="rtc-potion-picker-actions"><button class="btn-small danger" onclick="clearRtcAttackSpellSlot(${idx}); closeModal();">${t('rtc.remove')}</button></div>` : ''}
    </div>
  `);
}

// Aplica a escolha do modal e fecha a janelinha. kind = 'spell' | 'rune'.
export function pickRtcAttackSpell(idx, id, kind = 'spell') {
  setRtcAttackSpellSlot(idx, id, kind);
  closeModal();
}

// Slot de poção do Healing: um quadrado onde o jogador escolhe a poção. No
// desktop dá pra ARRASTAR a poção da bag; no celular (sem drag) basta TOCAR o
// slot pra abrir uma janelinha de opções (openRtcPotionPicker). Vazio mostra o
// alvo; preenchido mostra a poção escolhida (tocar troca/remove pelo modal).
function potionDropSlot(kind, selectedId) {
  const item = selectedId ? ITEMS[selectedId] : null;
  const label = kind === 'life' ? t('rtc.potionLife') : t('rtc.potionMana');
  return `<div class="rtc-potion-slot ${item ? 'filled' : 'empty'}"
      ondragover="event.preventDefault(); this.classList.add('drag-over')"
      ondragleave="this.classList.remove('drag-over')"
      ondrop="this.classList.remove('drag-over'); handleRtcPotionDrop(event, '${kind}')"
      onclick="openRtcPotionPicker('${kind}')"
      title="${item ? t('rtc.potionSlotFilledTitle', { name: item.name }) : t('rtc.potionSlotEmptyTitle', { label })}">
    ${item
      ? `<span class="rtc-potion-slot-icon">${itemIconImg(selectedId, 'item-icon')}</span><span class="rtc-potion-slot-name">${item.name}</span>`
      : `<span class="rtc-potion-slot-ghost">⬚</span><span class="rtc-potion-slot-hint">${t('rtc.potionSlotEmptyTitle', { label })}</span>`}
  </div>`;
}

// Janelinha de opções pra escolher a poção que o RTC bebe — a alternativa ao
// drag-and-drop (essencial no celular, que não arrasta). Lista as poções do tipo
// (vida/mana), a quantidade que o jogador tem e o requisito, com um botão pra
// selecionar. Também permite remover a poção atual.
export function openRtcPotionPicker(kind) {
  const list = kind === 'life' ? HEAL_POTIONS : MANA_POTIONS;
  const label = kind === 'life' ? t('rtc.potionLife') : t('rtc.potionMana');
  const selectedId = kind === 'life' ? G.rtc.healPotion : G.rtc.manaPotion;
  const rows = list.map(([id, item]) => {
    const qty = G.inventory[id] || 0;
    const sel = selectedId === id;
    // Sem quantia fixa de propósito: a cura/mana real varia ±15% (ver
    // domain/combatFormulas.js: potionRestore) — mostrar "+X HP" fixo aqui
    // seria enganoso, já que o valor real nunca é exatamente esse.
    const reqLabel = potionReqLabel(item, t);
    const desc = [reqLabel, t('rtc.owned', { qty })].filter(Boolean).join(' · ');
    return `<div class="rtc-row ${sel ? 'selected' : ''}">
      <span class="rtc-row-icon">${itemIconImg(id, 'item-icon')}</span>
      <div class="rtc-row-info">
        <div class="rtc-row-name">${item.name}</div>
        <div class="rtc-row-desc">${desc}</div>
      </div>
      <button class="rtc-row-btn" onclick="pickRtcPotion('${kind}','${id}')">${sel ? `✅ ${t('rtc.active')}` : t('rtc.use')}</button>
    </div>`;
  }).join('');
  openModal(`
    <div class="rtc-potion-picker">
      <h3>💊 ${t('rtc.potionOf', { label })}</h3>
      <p class="muted">${t('rtc.potionPickerHint')}</p>
      <div class="rtc-rows">${rows}</div>
      ${selectedId ? `<div class="rtc-potion-picker-actions"><button class="btn-small danger" onclick="pickRtcPotion('${kind}','')">${t('rtc.remove')}</button></div>` : ''}
    </div>
  `);
}

// Aplica a escolha do modal (id vazio = remover) e fecha a janelinha.
export function pickRtcPotion(kind, id) {
  if (id) { kind === 'life' ? setRtcHealPotion(id) : setRtcManaPotion(id); }
  else { clearRtcPotion(kind); }
  closeModal();
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
  if (!G.vocation) { el.innerHTML = `<p class="muted">${t('rtc.chooseVocation')}</p>`; return; }

  const voc = G.vocation;
  const mySpells = Object.entries(SPELLS).filter(([, s]) => s.voc.includes(voc));
  const healSpells = mySpells.filter(([, s]) => s.type === 'heal');

  const healSpellId = G.rtc.healSpell || defaultHealSpellId(voc, G.level);
  const prioSpells = normalizeAttackSpells(G.rtc);
  const atkSummary = prioSpells.length
    ? prioSpells.map((entry, i) => `${i + 1}. "${isRuneEntry(entry) ? ITEMS[runeEntryId(entry)].name : SPELLS[entry].words}"`).join(' → ')
    : t('rtc.noAttackConfigured');
  const healSpellUnlocked = isSpellAvailable(healSpellId, voc, G.level);
  const healSpellName = `"${SPELLS[healSpellId].words}"${G.rtc.healSpell ? '' : t('rtc.defaultSuffix')}${healSpellUnlocked ? '' : ` 🔒 ${t('rtc.lockedLevel', { level: SPELLS[healSpellId].level })}`}`;
  const healPotionName = G.rtc.healPotion ? ITEMS[G.rtc.healPotion].name : t('rtc.none');
  const manaPotionName = G.rtc.manaPotion ? ITEMS[G.rtc.manaPotion].name : t('rtc.none');

  el.innerHTML = `
    <div class="rtc-console">
      <div class="rtc-sidebar">
        <div class="rtc-portrait"><canvas id="rtc-portrait-canvas" width="64" height="64"></canvas></div>
        <div class="rtc-sidebar-name">${VOCATIONS[voc].name}</div>
        <div class="rtc-sidebar-level">${t('rtc.sidebarLevel', { level: G.level })}</div>
        <div class="rtc-sidebar-status">${t('rtc.helperStatus')}</div>
      </div>
      <div class="rtc-main">
        <div class="rtc-summary">
          <div><strong>⚔️ ${t('rtc.autoAttack')}:</strong> ${atkSummary}</div>
          <div><strong>💊 ${t('rtc.autoHeal')}:</strong> ${t('rtc.healSummary', { spell: healSpellName, spellPct: G.rtc.healSpellThreshold, potion: healPotionName, potionPct: G.rtc.healPotionThreshold })}</div>
          <div><strong>🔵 ${t('rtc.autoMana')}:</strong> ${t('rtc.manaSummary', { potion: manaPotionName, pct: G.rtc.manaPotionThreshold })}</div>
          ${!healSpellUnlocked && !G.rtc.healPotion ? `<div class="rtc-heal-warning">⚠️ ${t('rtc.noHealAvailable', { level: SPELLS[healSpellId].level })}</div>` : ''}
        </div>

        <div class="rtc-subtabs">
          <button class="rtc-subtab-btn ${activeRtcTab === 'attack' ? 'active' : ''}" onclick="setRtcSubTab('attack')">⚔️ ${t('rtc.subtabAttack')}</button>
          <button class="rtc-subtab-btn ${activeRtcTab === 'heal' ? 'active' : ''}" onclick="setRtcSubTab('heal')">💊 ${t('rtc.subtabHeal')}</button>
        </div>

        ${activeRtcTab === 'attack' ? `
        <p class="muted">${t('rtc.attackPriorityHint')}</p>
        <label class="rtc-smart-toggle disabled" title="${t('rtc.smartPriorityDisabledHint')}"><input type="checkbox" disabled /> 🎯 ${t('rtc.smartPriority')} <span class="muted">(${t('rtc.smartPriorityDisabled')})</span></label>
        <h5>${t('rtc.attackPriorityTitle')} ${prioSpells.length ? `(${prioSpells.length})` : ''}</h5>
        <div class="rtc-slots-grid">
          ${Array.from({ length: ATTACK_SLOT_COUNT }, (_, idx) => attackSpellSlot(idx, prioSpells[idx])).join('')}
        </div>
        ` : `
        <h5>${t('rtc.healSpellTitle')} <span class="muted">${t('rtc.castBelow')}</span>
          <input type="number" min="5" max="95" value="${G.rtc.healSpellThreshold}" onchange="setRtcThreshold('healSpellThreshold', this.value)" class="rtc-threshold-input" />${t('rtc.ofHp')}</h5>
        <div class="rtc-rows">
          ${healSpells.map(([id, s]) => spellRow(id, s, (G.rtc.healSpell || defaultHealSpellId(voc, G.level)) === id, 'setRtcHealSpell')).join('')}
        </div>
        <button class="btn-small" style="margin:2px 0 4px" onclick="toggleBackpack()">🎒 ${t('rtc.openBag')}</button>
        <h5>${t('rtc.healPotionTitle')} <span class="muted">${t('rtc.drinksBelow')}</span>
          <input type="number" min="5" max="95" value="${G.rtc.healPotionThreshold}" onchange="setRtcThreshold('healPotionThreshold', this.value)" class="rtc-threshold-input" />${t('rtc.ofHp')}</h5>
        <p class="muted rtc-drag-hint">${t('rtc.healPotionDragHint')}</p>
        ${potionDropSlot('life', G.rtc.healPotion)}
        <h5>${t('rtc.manaPotionTitle')} <span class="muted">${t('rtc.drinksBelow')}</span>
          <input type="number" min="5" max="95" value="${G.rtc.manaPotionThreshold}" onchange="setRtcThreshold('manaPotionThreshold', this.value)" class="rtc-threshold-input" />${t('rtc.ofMana')}</h5>
        <p class="muted rtc-drag-hint">${t('rtc.manaPotionDragHint')}</p>
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
  if (!item || item.type !== 'potion') { emit(EVENTS.NOTIFY, { msg: t('rtc.dragPotionError'), type: 'error' }); return; }
  if (kind === 'life') {
    if (!item.heal) { emit(EVENTS.NOTIFY, { msg: t('rtc.notLifePotion', { name: item.name }), type: 'error' }); return; }
    setRtcHealPotion(id);
  } else {
    if (!item.mana) { emit(EVENTS.NOTIFY, { msg: t('rtc.notManaPotion', { name: item.name }), type: 'error' }); return; }
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
