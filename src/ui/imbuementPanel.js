// Modal de Imbuements — escolhe um aprimoramento pra arma equipada, mostra
// custo (gold + materiais) e o imbuement ativo com tempo restante. O efeito é
// resolvido no combate pelo servidor (ver huntEngine.js).
import { G } from '../application/gameStore.js?v=287';
import { IMBUEMENTS, isImbuementActive } from '../domain/imbuements.js?v=283';
import { ITEMS } from '../domain/items.js?v=298';
import { canImbue } from '../application/imbuementUseCases.js?v=283';
import { openModal, itemIconImg, goldIconImg } from './shared.js?v=290';
import { t } from '../i18n/i18n.js?v=303';

function fmtRemaining(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return t('imbue.expired');
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

// Fonte astral (material) como no shrine do Tibia: sprite real do item + contador
// possui/precisa, verde quando tem o bastante, vermelho quando falta.
function matSprite(itemId, qty) {
  const have = G.inventory[itemId] || 0;
  const ok = have >= qty;
  const it = ITEMS[itemId];
  return `<div class="imbue-mat ${ok ? 'ok' : 'lack'}" title="${it?.name || itemId}">
    ${itemIconImg(itemId, 'imbue-mat-img')}
    <span class="imbue-mat-count">${have}/${qty}</span>
  </div>`;
}

// Recria a janela de imbuing do Tibia: o ITEM no topo (slot), o imbuement ativo,
// e uma lista de imbuements — cada um com a gema do elemento, o efeito, as fontes
// astrais em SPRITE (não texto) e o custo em gold + duração.
function imbueHtml() {
  const wid = G.equipment && G.equipment.weapon;
  const weapon = wid ? ITEMS[wid] : null;
  const active = G.imbuements && G.imbuements.weapon;
  const activeOn = isImbuementActive(active);
  const activeDef = activeOn ? IMBUEMENTS[active.id] : null;
  const activeHtml = activeOn
    ? `<div class="imbue-active on">${activeDef.icon} <b>${activeDef.name}</b> · ⏳ ${fmtRemaining(active.expiresAt)}</div>`
    : `<div class="imbue-active muted">${t('imbue.noneActive')}</div>`;

  const rows = Object.entries(IMBUEMENTS).map(([id, def]) => {
    const pre = canImbue(id);
    const mats = def.cost.materials.map(([itemId, qty]) => matSprite(itemId, qty)).join('');
    return `<div class="imbue-row">
      <div class="imbue-row-main">
        <span class="imbue-gem">${def.icon}</span>
        <div class="imbue-row-txt"><b>${def.name}</b><small>${def.desc}</small></div>
        <span class="imbue-dur">⏳ ${def.durationH}h</span>
      </div>
      <div class="imbue-mats">${mats}</div>
      <div class="imbue-row-foot">
        <span class="imbue-gold">${goldIconImg('inline-icon')} ${def.cost.gold.toLocaleString()}</span>
        <button class="imbue-btn" ${pre.ok ? '' : 'disabled'} onclick="applyImbuementClick('${id}')" title="${pre.ok ? t('imbue.apply') : pre.reason}">${t('imbue.apply')}</button>
      </div>
    </div>`;
  }).join('');

  return `<div class="imbue-window">
    <h3 class="imbue-title">🔮 ${t('imbue.title')}</h3>
    <div class="imbue-item-slot">
      <div class="imbue-slot-box">${weapon ? itemIconImg(wid, 'imbue-slot-img') : '<span class="imbue-slot-empty">—</span>'}</div>
      <div class="imbue-slot-info">
        <div class="imbue-slot-name">${weapon ? weapon.name : t('imbue.noWeapon')}</div>
        ${activeHtml}
      </div>
    </div>
    <div class="imbue-hint muted">${t('imbue.hint')}</div>
    <div class="imbue-list">${rows}</div>
  </div>`;
}

export function openImbueModal() {
  openModal(imbueHtml());
}

// Chamado pelo botão Aplicar — importa dinamicamente pra não acoplar a UI ao
// use case de forma circular; re-renderiza o modal após aplicar.
export async function applyImbuementClick(id) {
  const { applyImbuement } = await import('../application/imbuementUseCases.js?v=283');
  await applyImbuement(id);
  openModal(imbueHtml());
}
