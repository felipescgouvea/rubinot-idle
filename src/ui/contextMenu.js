// Menu de clique-direito CUSTOM (tema Tibia), no lugar do menu nativo do
// navegador, para os alvos do jogo: criaturas da Battle List e itens da mochila.
// Delegado (um listener no document) — não precisa re-wire a cada re-render dos
// painéis. Fora desses alvos, o menu nativo do navegador continua normal.
import { ITEMS } from '../domain/items.js?v=368';
import { t } from '../i18n/i18n.js?v=373';

let menuEl = null;
function ensureMenu() {
  if (menuEl) return menuEl;
  menuEl = document.createElement('div');
  menuEl.className = 'ctx-menu';
  menuEl.hidden = true;
  menuEl.addEventListener('contextmenu', e => e.preventDefault()); // 2º clique-direito não reabre o nativo
  document.body.appendChild(menuEl);
  return menuEl;
}
function closeMenu() { if (menuEl && !menuEl.hidden) { menuEl.hidden = true; menuEl.innerHTML = ''; } }

function openMenu(x, y, items) {
  const el = ensureMenu();
  el.innerHTML = items.map((it, i) =>
    `<button type="button" class="ctx-item" data-i="${i}"><span class="ctx-ico">${it.icon || ''}</span>${it.label}</button>`
  ).join('');
  el.querySelectorAll('.ctx-item').forEach(b => {
    b.addEventListener('click', () => { const it = items[+b.dataset.i]; closeMenu(); try { it.onClick(); } catch (e) {} });
  });
  el.hidden = false;
  // mantém dentro da viewport (position: fixed → coords de cliente)
  const mw = el.offsetWidth, mh = el.offsetHeight;
  el.style.left = Math.max(4, Math.min(x, window.innerWidth - mw - 6)) + 'px';
  el.style.top = Math.max(4, Math.min(y, window.innerHeight - mh - 6)) + 'px';
}

export function wireContextMenu() {
  document.addEventListener('contextmenu', (e) => {
    // criatura: tanto a da Battle List quanto a que está no palco (stage-monster)
    const creature = e.target.closest('.battle-list-entry:not(.dead), .stage-monster:not(.leaving):not(.dead)');
    const cuid = creature && [creature.dataset.rawUid, creature.dataset.uid].find(v => v && v !== 'undefined');
    if (creature && cuid) {
      e.preventDefault();
      const uid = cuid;
      openMenu(e.clientX, e.clientY, [
        { icon: '⚔️', label: t('ctx.attack'), onClick: () => window.selectTarget && window.selectTarget(uid) },
        { icon: '📖', label: t('ctx.bestiary'), onClick: () => document.querySelector('.tab[data-tab="bestiary"]')?.click() },
      ]);
      return;
    }
    const item = e.target.closest('.inv-item');
    if (item && item.dataset.itemId) {
      e.preventDefault();
      const id = item.dataset.itemId;
      const def = ITEMS[id] || {};
      const list = [{ icon: '🔍', label: t('ctx.look'), onClick: () => window.openItemModal && window.openItemModal(id, true) }];
      if (def.sell) list.push({ icon: '💰', label: t('ctx.sell'), onClick: () => window.sellItem && window.sellItem(id) });
      openMenu(e.clientX, e.clientY, list);
      return;
    }
    // fora dos alvos do jogo: deixa o menu nativo do navegador
  });
  // fecha em clique, rolagem, Escape ou perda de foco
  document.addEventListener('click', closeMenu);
  document.addEventListener('scroll', closeMenu, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('blur', closeMenu);
}
