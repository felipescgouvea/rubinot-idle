// Utilitários de UI compartilhados: formatação e os 4 mecanismos genéricos de
// feedback (notificação, log de combate, modal). Point de entrada único que
// liga esses mecanismos aos eventos emitidos pela camada application.
import { on, EVENTS } from '../shared/eventBus.js';

export function formatNum(n) {
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
