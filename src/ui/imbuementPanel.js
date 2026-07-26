// Página de Imbuements (a "máquina de imbuing" do Tibia): escolhe QUAL item
// equipado imbuir (arma / elmo / armadura — não só a arma), vê o custo (gold +
// materiais em sprite) e o imbuement ativo. O efeito é resolvido no combate pelo
// servidor (ver huntEngine.js). Renderiza numa ABA própria (#imbue-content) e
// também num modal (atalho do card de equipamento) — mesmo corpo.
import { G } from '../application/gameStore.js?v=354';
import { IMBUEMENTS, isImbuementActive, activeImbuementFor, IMBUEABLE_SLOTS, imbuementsForSlot, IMBUE_TIERS, IMBUE_TIER_LABEL, imbuementCost, resolveTier } from '../domain/imbuements.js?v=351';
import { ITEMS } from '../domain/items.js?v=365';
import { canImbue } from '../application/imbuementUseCases.js?v=350';
import { openModal, itemIconImg, goldIconImg } from './shared.js?v=357';
import { spriteUrl, spriteImgOrFallback, imbueIconFile } from '../infrastructure/tibiaSprites.js?v=355';
import { t } from '../i18n/i18n.js?v=370';

let selSlot = null; // slot selecionado na máquina (weapon/helmet/armor)

function fmtRemaining(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return t('imbue.expired');
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function slotLabel(slot) { return t(`imbue.slot.${slot}`); }

// Fonte astral como no shrine do Tibia: sprite do item + contador possui/precisa.
function matSprite(itemId, qty) {
  const have = G.inventory[itemId] || 0;
  const ok = have >= qty;
  const it = ITEMS[itemId];
  return `<div class="imbue-mat ${ok ? 'ok' : 'lack'}" title="${it?.name || itemId}">
    ${itemIconImg(itemId, 'imbue-mat-img')}
    <span class="imbue-mat-count">${have}/${qty}</span>
  </div>`;
}

// Seletor de item: um card por slot imbuível, com a peça equipada e o imbuement
// ativo. Clicar seleciona o slot. Slot sem item equipado fica desabilitado.
function slotPickerHtml() {
  return `<div class="imbue-slots">${IMBUEABLE_SLOTS.map(slot => {
    const itemId = G.equipment && G.equipment[slot];
    const item = itemId ? ITEMS[itemId] : null;
    const active = activeImbuementFor(G.imbuements, slot);
    const disabled = !item;
    return `<button class="imbue-slot ${slot === selSlot ? 'sel' : ''} ${disabled ? 'off' : ''}"
      ${disabled ? 'disabled' : `onclick="selectImbueSlot('${slot}')"`}>
      <span class="imbue-slot-cap">${slotLabel(slot)}</span>
      <span class="imbue-slot-box">${item ? itemIconImg(itemId, 'imbue-slot-img') : '<span class="imbue-slot-empty">—</span>'}</span>
      <span class="imbue-slot-name">${item ? item.name : t('imbue.slotEmpty')}</span>
      ${active ? `<span class="imbue-slot-on">${active.icon} ${fmtRemaining(active.expiresAt)}</span>` : ''}
    </button>`;
  }).join('')}</div>`;
}

// Lista de imbuements do slot selecionado (só os compatíveis com aquele item).
function slotDetailHtml() {
  if (!selSlot) return `<div class="imbue-detail-empty muted">${t('imbue.pickItem')}</div>`;
  const itemId = G.equipment && G.equipment[selSlot];
  if (!itemId) return `<div class="imbue-detail-empty muted">${t('imbue.equipFirst', { slot: slotLabel(selSlot) })}</div>`;
  const isProt = def => def.effect.type === 'protection';
  const pctLabel = (def, tier) => { const p = resolveTier(def, tier).pct; return isProt(def) ? `${p}%` : `${Math.round(p * 100)}%`; };
  const rows = imbuementsForSlot(selSlot).map(([id, def]) => {
    // materiais são os mesmos nos 3 tiers (o gold é que escala) — mostra 1x.
    const mats = imbuementCost(def, 'basic').materials.map(([mid, q]) => matSprite(mid, q)).join('');
    // Ícone do imbuement = o ícone REAL do Tibia (assets/sprites/imbuements/, via
    // scripts/fetch-imbue-icons.mjs). Se o arquivo ainda não existe, cai no glyph
    // do elemento (def.icon) — nunca num sprite chutado.
    const gem = spriteImgOrFallback(spriteUrl(imbueIconFile(def.name)), def.name, def.icon, 'imbue-gem-img');
    // Um botão por tier (Basic/Intricate/Powerful): efeito% + custo em gold.
    const tierBtns = IMBUE_TIERS.map(tier => {
      const pre = canImbue(id, tier);
      const cost = imbuementCost(def, tier);
      return `<button class="imbue-tier-btn imbue-tier-${tier}" ${pre.ok ? '' : 'disabled'}
        onclick="applyImbuementClick('${id}','${tier}')" title="${pre.ok ? t('imbue.apply') : pre.reason}">
        <span class="imbue-tier-name">${t(IMBUE_TIER_LABEL[tier])}</span>
        <span class="imbue-tier-pct">+${pctLabel(def, tier)}</span>
        <span class="imbue-tier-gold">${goldIconImg('inline-icon')} ${(cost.gold / 1000)}k</span>
      </button>`;
    }).join('');
    return `<div class="imbue-row">
      <div class="imbue-row-main">
        <span class="imbue-gem">${gem}</span>
        <div class="imbue-row-txt"><b>${def.name}</b><small>${t(def.desc)}</small></div>
        <span class="imbue-dur">⏳ ${def.durationH}h</span>
      </div>
      <div class="imbue-mats">${mats}</div>
      <div class="imbue-tiers">${tierBtns}</div>
    </div>`;
  }).join('');
  return `<div class="imbue-list">${rows}</div>`;
}

// Escolhe um slot default: o 1º slot imbuível com item equipado (ou o 1º slot).
function ensureSel() {
  const withItem = IMBUEABLE_SLOTS.filter(s => G.equipment && G.equipment[s]);
  if (!selSlot || !(G.equipment && G.equipment[selSlot])) selSlot = withItem[0] || IMBUEABLE_SLOTS[0] || null;
}

function imbueBodyHtml() {
  ensureSel();
  return `<div class="imbue-window">
    <div class="imbue-hint muted">${t('imbue.hintPage')}</div>
    ${slotPickerHtml()}
    <div class="imbue-detail" id="imbue-detail">${slotDetailHtml()}</div>
  </div>`;
}

// Aba dedicada.
export function renderImbuePanel() {
  const el = document.getElementById('imbue-content');
  if (!el) return;
  if (!G.vocation) { el.innerHTML = `<p class="muted">${t('imbue.noChar')}</p>`; return; }
  el.innerHTML = imbueBodyHtml();
}

// Modal (atalho do card de equipamento).
export function openImbueModal() {
  openModal(imbueBodyHtml());
}

// Re-renderiza o corpo no container ativo. IMPORTANTE: o modal pode estar aberto
// POR CIMA da aba imbue (o botão do header abre o modal em qualquer aba). Se eu
// só olhasse a visibilidade da aba, um clique no modal redesenharia a aba ATRÁS
// dele e o modal ficaria congelado. Então checo o modal PRIMEIRO: se ele está
// aberto mostrando o imbue, redesenho o modal; senão caio na aba.
function rerender() {
  const overlay = document.getElementById('modal-overlay');
  const modalShowingImbue = overlay && overlay.style.display !== 'none'
    && document.getElementById('modal-content')?.querySelector('.imbue-window');
  if (modalShowingImbue) { openModal(imbueBodyHtml()); return; }
  const tabEl = document.getElementById('imbue-content');
  if (tabEl && tabEl.offsetParent !== null) { renderImbuePanel(); return; }
  openModal(imbueBodyHtml());
}

export function selectImbueSlot(slot) {
  selSlot = slot;
  rerender();
}

// Aplica o imbuement e re-renderiza (import dinâmico pra não acoplar circular).
export async function applyImbuementClick(id, tier) {
  const { applyImbuement } = await import('../application/imbuementUseCases.js?v=350');
  await applyImbuement(id, tier);
  rerender();
}
