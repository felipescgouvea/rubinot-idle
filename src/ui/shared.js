// Utilitários de UI compartilhados: formatação e os 4 mecanismos genéricos de
// feedback (notificação, log de combate, modal). Point de entrada único que
// liga esses mecanismos aos eventos emitidos pela camada application.
import { on, EVENTS } from '../shared/eventBus.js?v=31';
import { ITEMS } from '../domain/items.js?v=31';
import { itemSpriteFile, spriteUrl, skillIconFile, spellIconFile, VITAL_ICON_FILES, RUBINI_COIN_FILE } from '../infrastructure/tibiaSprites.js?v=31';

// Ícone de item: tenta a sprite real do TibiaWiki; sem sucesso, cai no emoji
// (mesmo padrão de monsterSpriteImg em huntPanel.js). `cls` deve ser a
// classe do contexto (ex.: "item-icon", "equip-slot-icon") quando existir
// uma — ela já define o font-size usado pra dimensionar a imagem em `em`;
// passe '' quando o ícone só aparece embutido no texto de outro elemento.
export function itemIconImg(itemId, cls = '') {
  const item = ITEMS[itemId];
  if (!item) return `<span class="${cls}">❓</span>`;
  const file = itemSpriteFile(itemId);
  return `<img src="${spriteUrl(file)}" alt="${item.name}" class="${cls} tibia-icon"
    onerror="this.outerHTML='<span class=&quot;${cls}&quot;>${item.icon}</span>'" />`;
}

// Mesmo padrão gracioso de fallback, pros demais tipos de ícone "de conteúdo
// do jogo" (skill, magia, vital, moeda) — sempre sprite real primeiro, emoji
// só como contingência se a imagem falhar ao carregar.
export function skillIconImg(skillId, fallbackEmoji, cls = '') {
  const file = skillIconFile(skillId);
  if (!file) return `<span class="${cls}">${fallbackEmoji}</span>`;
  return `<img src="${spriteUrl(file)}" alt="${skillId}" class="${cls} tibia-icon"
    onerror="this.outerHTML='<span class=&quot;${cls}&quot;>${fallbackEmoji}</span>'" />`;
}

export function spellIconImg(spellName, fallbackEmoji, cls = '') {
  const file = spellIconFile(spellName);
  return `<img src="${spriteUrl(file)}" alt="${spellName}" class="${cls} tibia-icon"
    onerror="this.outerHTML='<span class=&quot;${cls}&quot;>${fallbackEmoji}</span>'" />`;
}

export function vitalIconImg(kind, cls = '') {
  const file = VITAL_ICON_FILES[kind];
  const fallback = kind === 'hp' ? '❤️' : kind === 'mana' ? '🔵' : '⭐';
  return `<img src="${spriteUrl(file)}" alt="${kind}" class="${cls} tibia-icon"
    onerror="this.outerHTML='<span class=&quot;${cls}&quot;>${fallback}</span>'" />`;
}

export function goldIconImg(cls = '') {
  return itemIconImg('gold_coin', cls);
}

export function rubiniIconImg(cls = '') {
  return `<img src="${spriteUrl(RUBINI_COIN_FILE)}" alt="Rubini Coin" class="${cls} tibia-icon"
    onerror="this.outerHTML='<span class=&quot;${cls}&quot;>💎</span>'" />`;
}

export function formatNum(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function addLog(html) {
  const log = document.getElementById('combat-log');
  if (!log) return;
  const line = document.createElement('div');
  line.innerHTML = html;
  log.appendChild(line);
  // keep last 80 lines
  while (log.children.length > 80) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
}

export function notify(msg, type = 'info') {
  const area = document.getElementById('notif-area');
  if (!area) return;
  const el = document.createElement('div');
  el.className = `notif ${type}`;
  el.textContent = msg;
  area.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').style.display = 'flex';
}

export function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

export function wireSharedEvents() {
  on(EVENTS.NOTIFY, ({ msg, type }) => notify(msg, type));
  on(EVENTS.LOG, html => addLog(html));
  on(EVENTS.MODAL_OPEN, html => openModal(html));
  on(EVENTS.MODAL_CLOSE, () => closeModal());
}
