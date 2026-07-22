// Utilitários de UI compartilhados: formatação e os 4 mecanismos genéricos de
// feedback (notificação, log de combate, modal). Point de entrada único que
// liga esses mecanismos aos eventos emitidos pela camada application.
import { on, EVENTS } from '../shared/eventBus.js?v=189';
import { ITEMS } from '../domain/items.js?v=202';
import { itemSpriteFile, spriteUrl, skillIconFile, spellIconFile, VITAL_ICON_FILES, RUBINI_COIN_FILE, CHARM_POINTS_ICON_FILE, TRAINING_DUMMY_FILE, TASK_COIN_FILE, spriteImgOrFallback } from '../infrastructure/tibiaSprites.js?v=192';

// Ícone de item: tenta a sprite real do TibiaWiki; sem sucesso, cai no emoji
// (mesmo padrão de monsterSpriteImg em huntPanel.js). `cls` deve ser a
// classe do contexto (ex.: "item-icon", "equip-slot-icon") quando existir
// uma — ela já define o font-size usado pra dimensionar a imagem em `em`;
// passe '' quando o ícone só aparece embutido no texto de outro elemento.
// Sprites que já falharam antes ficam em cache (ver tibiaSprites.js:
// spriteImgOrFallback) — nem tenta a imagem de novo, vai direto pro emoji,
// evitando o "pisca-pisca" de re-render tentando a mesma URL quebrada.
export function itemIconImg(itemId, cls = '') {
  const item = ITEMS[itemId];
  if (!item) return `<span class="${cls}">❓</span>`;
  return spriteImgOrFallback(spriteUrl(itemSpriteFile(itemId)), item.name, item.icon, cls);
}

// Mesmo padrão gracioso de fallback, pros demais tipos de ícone "de conteúdo
// do jogo" (skill, magia, vital, moeda) — sempre sprite real primeiro, emoji
// só como contingência se a imagem falhar ao carregar.
export function skillIconImg(skillId, fallbackEmoji, cls = '') {
  const file = skillIconFile(skillId);
  if (!file) return `<span class="${cls}">${fallbackEmoji}</span>`;
  return spriteImgOrFallback(spriteUrl(file), skillId, fallbackEmoji, cls);
}

export function spellIconImg(spellName, fallbackEmoji, cls = '') {
  const file = spellIconFile(spellName);
  if (!file) return `<span class="${cls}">${fallbackEmoji}</span>`;
  return spriteImgOrFallback(spriteUrl(file), spellName, fallbackEmoji, cls);
}

export function vitalIconImg(kind, cls = '') {
  const file = VITAL_ICON_FILES[kind];
  const fallback = kind === 'hp' ? '❤️' : kind === 'mana' ? '🔵' : '⭐';
  return spriteImgOrFallback(spriteUrl(file), kind, fallback, cls);
}

export function goldIconImg(cls = '') {
  return itemIconImg('gold_coin', cls);
}

export function rubiniIconImg(cls = '') {
  return spriteImgOrFallback(spriteUrl(RUBINI_COIN_FILE), 'Rubini Coin', '💎', cls);
}

// Task Coin: moeda das Linked Tasks (ver domain/gameState.js: G.taskCoins).
export function taskCoinIconImg(cls = '') {
  return spriteImgOrFallback(spriteUrl(TASK_COIN_FILE), 'Task Coin', '🟡', cls);
}

// Charm Points: símbolo roxo real do Tibia, em vez da sigla genérica "CP".
export function charmPointsIconImg(cls = '') {
  return spriteImgOrFallback(spriteUrl(CHARM_POINTS_ICON_FILE), 'Charm Points', '✨', cls);
}

// Boneco/estátua real de treino do Tibia (Training Dummy), mostrado na
// escolha de skill do Treino Offline — ver infrastructure/tibiaSprites.js.
export function trainingDummyImg(cls = '') {
  return spriteImgOrFallback(spriteUrl(TRAINING_DUMMY_FILE), 'Training Dummy', '🏋️', cls);
}

// Cor da barra de vida por faixa (fiel ao Tibia): verde cheia, laranja pela
// metade, vermelha quando cai muito — mesmas 3 faixas usadas em todo lugar
// que mostra vida (jogador E monstro, ver ui/characterPanel.js e
// ui/huntPanel.js: as barras de monstro usavam sempre a mesma cor fixa,
// então uma criatura com 1/30 de vida parecia igual a uma com vida cheia).
export function hpStateClass(pct) {
  return pct > 50 ? 'hp-state-high' : pct > 25 ? 'hp-state-mid' : 'hp-state-low';
}

export function applyHpState(el, pct) {
  if (!el) return;
  el.classList.remove('hp-state-high', 'hp-state-mid', 'hp-state-low');
  el.classList.add(hpStateClass(pct));
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

// Cada linha do log carrega uma categoria (data-cat) pra a filtragem por aba:
// 'combate' (padrão), 'magia' (spells) e 'suprimento' (poções/runas). As
// spells/poções são marcadas explicitamente por quem emite o log (ver
// huntUseCases/inventoryUseCases) — o resto cai em 'combate'.
// Horário atual (HH:MM:SS) pra carimbar cada linha do log.
function logTimestamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function addLog(html, cat = 'combate') {
  const log = document.getElementById('combat-log');
  if (!log) return;
  const line = document.createElement('div');
  line.className = 'log-line';
  line.dataset.cat = cat;
  line.innerHTML = `<span class="log-time">${logTimestamp()}</span> ${html}`;
  log.appendChild(line);
  // keep last 120 lines
  while (log.children.length > 120) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
}

// Troca a aba ativa do log (filtro via CSS por data-cat — ver style.css).
export function setLogFilter(cat) {
  const log = document.getElementById('combat-log');
  if (log) { log.dataset.filter = cat; log.scrollTop = log.scrollHeight; }
  document.querySelectorAll('.log-tab').forEach(t => t.classList.toggle('active', t.dataset.cat === cat));
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
  on(EVENTS.LOG, p => (typeof p === 'string' ? addLog(p) : addLog(p.html, p.cat)));
  on(EVENTS.MODAL_OPEN, html => openModal(html));
  on(EVENTS.MODAL_CLOSE, () => closeModal());
}
