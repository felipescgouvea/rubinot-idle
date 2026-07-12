// Tudo da aba Caçada relacionado à zona/monstro atual: sprite do monstro,
// seletor de zona, contadores de mortes, loot recente e o botão de
// iniciar/parar caçada. (O retrato do jogador mora em characterPanel.js.)
import { G } from '../application/gameStore.js?v=94';
import { ZONES, isZoneUnlocked, boostedZoneForDate } from '../domain/bestiary.js?v=94';
import { MONSTERS } from '../domain/bestiary.js?v=94';
import { cityName } from '../domain/cities.js?v=94';
import { ITEMS } from '../domain/items.js?v=94';
import { monsterSpriteFile, spriteUrl, effectSpriteFile } from '../infrastructure/tibiaSprites.js?v=94';
import { on, EVENTS } from '../shared/eventBus.js?v=94';
import { openModal, itemIconImg, vitalIconImg, goldIconImg, formatNum } from './shared.js?v=94';
import { getCurrentMonster, getCurrentPack, getRecentDead, getHuntStats, isBossOnlyHunt } from '../application/huntUseCases.js?v=94';
import { isStaminaEnabled } from '../application/adminUseCases.js?v=94';
import { formatStamina, staminaXpMult, staminaTier } from '../domain/stamina.js?v=94';
import { MAX_BLESSINGS, blessingCost, deathXpLossPct, reviveHpPct } from '../domain/blessings.js?v=94';

export function monsterSpriteImg(monsterId, cls = '') {
  const m = MONSTERS[monsterId];
  const file = monsterSpriteFile(monsterId, m);
  // fallback para o emoji se o sprite não carregar
  return `<img src="${spriteUrl(file)}" alt="${m.name}" class="${cls}"
    onerror="this.outerHTML='<span class=&quot;${cls}&quot;>${m.icon}</span>'" />`;
}

// Ícone da zona = sprite real do monstro principal da caçada (o primeiro do
// elenco), em vez de um emoji genérico sem lastro em Tibia/RubinOT — ver
// .spec/90-regras-de-negocio-gerais.md, Regra 4.
export function zoneIconImg(zone, cls = '') {
  return monsterSpriteImg(zone.monsters[0], cls);
}

function flashSpellEffect(wrap, spellElement) {
  if (!wrap || !spellElement) return;
  [...wrap.classList].filter(c => c.startsWith('spell-')).forEach(c => wrap.classList.remove(c));
  void wrap.offsetWidth;
  wrap.classList.add(`spell-${spellElement}`);
}

// Tiles cobertos pela forma da área da magia, em offsets (dx, dy) relativos ao
// tile do personagem — replica o padrão real do Tibia:
//  - ball: losango preenchido ao redor do caster (Groundshaker, Berserk, waves
//    de área ampla, Hell's Core, Eternal Winter, Avalanche/GFB)
//  - explosion: 3x3 ao redor
//  - wave: cone que abre à frente (pra cima)
//  - single: um tile à frente
const TILE_PX = 28;
function areaOffsets(shape) {
  const out = [];
  if (shape === 'ball') {
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) if (Math.abs(dx) + Math.abs(dy) <= 3) out.push([dx, dy]);
  } else if (shape === 'explosion') {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) out.push([dx, dy]);
  } else if (shape === 'wave' || shape === 'beam') {
    // cone/feixe que abre PRA BAIXO — o boneco olha pro sul (frente), então a
    // onda de mago (Fire/Energy/Ice/Terra Wave) sai na direção que ele encara.
    for (let r = 1; r <= 4; r++) { const w = Math.min(r - 1, 2); for (let dx = -w; dx <= w; dx++) out.push([dx, r]); }
  } else {
    out.push([0, 1]); // single: um tile À FRENTE (pra baixo, direção do boneco)
  }
  return out;
}

// Toca o efeito REAL da magia/runa: espalha o sprite de efeito (fogo/gelo/
// groundshaker/…) nos tiles ao redor do boneco conforme a forma da área — igual
// ao Tibia, onde a animação cobre cada tile atingido. Não há monstro na cena.
export function playAreaEffect({ effect, shape } = {}) {
  const file = effect ? effectSpriteFile(effect) : null;
  const stage = document.getElementById('dungeon-stage');
  const playerWrap = document.getElementById('player-sprite-wrap');
  if (!file || !stage || !playerWrap) return;
  const sr = stage.getBoundingClientRect();
  const pr = playerWrap.getBoundingClientRect();
  const cx = pr.left - sr.left + pr.width / 2;
  const cy = pr.top - sr.top + pr.height / 2;
  const url = spriteUrl(file);
  areaOffsets(shape).forEach(([dx, dy]) => {
    const img = document.createElement('img');
    img.className = 'combat-area-tile';
    img.src = url;
    img.alt = '';
    img.style.left = (cx + dx * TILE_PX) + 'px';
    img.style.top = (cy + dy * TILE_PX) + 'px';
    stage.appendChild(img);
    setTimeout(() => img.remove(), 720);
  });
}

export function renderMonsterDisplay(hit = false, killed = null, spellElement = null, bossAura = null) {
  const el = document.getElementById('monster-display');
  if (!el) return;
  const currentMonster = getCurrentMonster();
  // monstro recém-morto continua visível (mesmo em hit kill) até o próximo spawn
  if (!currentMonster && killed) {
    // se o morto já está na tela, só acinzenta in-place (preserva o <img> carregado)
    if (el.dataset.monsterId === killed && el.querySelector('.monster-sprite-wrap')) {
      const wrap = el.querySelector('.monster-sprite-wrap');
      if (!wrap.classList.contains('dead')) { wrap.classList.remove('dying'); void wrap.offsetWidth; wrap.classList.add('dying'); }
      wrap.classList.add('dead');
      el.querySelector('.monster-hp-fill').style.width = '0%';
      el.querySelector('.monster-hp-label').textContent = `0 / ${el.querySelector('.monster-hp-label').textContent.split('/')[1].trim()}`;
      el.querySelector('.monster-name').textContent = `☠️ ${MONSTERS[killed].name}`;
      return;
    }
    el.dataset.monsterId = killed;
    el.innerHTML = `
      <div class="monster-sprite-wrap dead">${monsterSpriteImg(killed, 'monster-sprite')}</div>
      <div class="monster-name">☠️ ${MONSTERS[killed].name}</div>
      <div class="monster-hp-track">
        <div class="monster-hp-fill" style="width:0%"></div>
        <div class="monster-hp-label">0 / ${MONSTERS[killed].hp}</div>
      </div>
    `;
    return;
  }
  if (!currentMonster) {
    el.innerHTML = G.hunting
      ? '<div class="monster-empty">Procurando próxima criatura…</div>'
      : '<div class="monster-empty">Nenhuma criatura. Inicie uma caçada!</div>';
    return;
  }
  const pct = Math.max(0, Math.round((currentMonster.hp / currentMonster.maxHp) * 100));
  // atualiza in-place quando é o mesmo monstro — recriar o <img> a cada tick
  // impedia o sprite de terminar de carregar
  if (el.dataset.monsterId === currentMonster.defKey && el.querySelector('.monster-hp-fill')) {
    el.querySelector('.monster-hp-fill').style.width = pct + '%';
    el.querySelector('.monster-hp-label').textContent = `${Math.max(0, currentMonster.hp)} / ${currentMonster.maxHp}`;
    el.querySelector('.monster-name').textContent = currentMonster.name;
    const wrap = el.querySelector('.monster-sprite-wrap');
    wrap.classList.remove('dead');
    if (hit) { wrap.classList.remove('hit'); void wrap.offsetWidth; wrap.classList.add('hit'); }
    flashSpellEffect(wrap, spellElement);
    return;
  }
  el.dataset.monsterId = currentMonster.defKey;
  el.innerHTML = `
    <div class="monster-sprite-wrap${hit ? ' hit' : ''}${bossAura ? ` ${bossAura}` : ''}">${monsterSpriteImg(currentMonster.defKey, 'monster-sprite')}</div>
    <div class="monster-name">${currentMonster.name}</div>
    <div class="monster-hp-track">
      <div class="monster-hp-fill" style="width:${pct}%"></div>
      <div class="monster-hp-label">${Math.max(0, currentMonster.hp)} / ${currentMonster.maxHp}</div>
    </div>
  `;
}

// Só escolhe uma zona padrão quando a atual deixou de ser válida (troca de
// mundo, save antigo, primeira vez) — preserva a escolha manual do jogador
// entre level-ups (a versão anterior resetava pra 1ª zona toda vez).
function pickDefaultZoneIfNeeded() {
  const stillValid = G.activeZone && isZoneUnlocked(G.activeZone, G.level, G.currentWorld, G.defeatedZoneBosses);
  if (stillValid) return;
  const valid = Object.keys(ZONES).find(id => isZoneUnlocked(id, G.level, G.currentWorld, G.defeatedZoneBosses));
  G.activeZone = valid || null;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function renderZonePicker() {
  pickDefaultZoneIfNeeded();

  const zone = ZONES[G.activeZone];
  const isBoostedToday = G.activeZone && G.activeZone === boostedZoneForDate(todayStr());
  const boostedBadge = isBoostedToday ? ' <span class="zone-boosted-badge" title="Zona Bônus do Dia: +50% XP/Gold">🔥 Bônus do Dia</span>' : '';
  const iconEl = document.getElementById('zone-current-icon');
  const nameEl = document.getElementById('zone-current-name');
  const titleEl = document.getElementById('battle-card-title');
  if (iconEl && nameEl) {
    iconEl.innerHTML = zone ? zoneIconImg(zone, 'zone-current-icon-img') : '🗺️';
    const cityPrefix = zone && zone.city ? `<span class="zone-current-city">${cityName(zone.city)}</span> · ` : '';
    nameEl.innerHTML = (zone ? cityPrefix + zone.name : 'Escolher cidade de caça…') + boostedBadge;
  }
  if (titleEl) {
    titleEl.innerHTML = zone ? `⚔️ Batalha — ${zoneIconImg(zone, 'zone-current-icon-img')} ${zone.name}${boostedBadge}` : '⚔️ Batalha';
  }
  renderZoneTheme();
}

// Cada dungeon tinge o fundo da cena de batalha com sua própria paleta (ver
// ZONES[id].theme) — sem zona ativa, cai no tom pergaminho padrão via as
// variáveis-fallback já definidas em style.css. Chamada direto por
// renderZonePicker() acima; não precisa de evento próprio.
function renderZoneTheme() {
  const scene = document.getElementById('battle-scene');
  if (!scene) return;
  const zone = ZONES[G.activeZone];
  if (zone && zone.theme) {
    scene.style.setProperty('--zone-color-1', zone.theme[0]);
    scene.style.setProperty('--zone-color-2', zone.theme[1]);
  } else {
    scene.style.removeProperty('--zone-color-1');
    scene.style.removeProperty('--zone-color-2');
  }
}

export function renderKillCounters() {
  const area = document.getElementById('kill-counters');
  if (!area) return;
  const counters = G.killCounters || {};
  area.innerHTML = Object.entries(counters).map(([id, n]) => {
    const m = MONSTERS[id];
    return `<div class="kill-pill">${m ? monsterSpriteImg(id, 'kill-pill-icon') : ''} ${m?.name || id}: <span>${n}</span></div>`;
  }).join('');
}

export function renderLoot() {
  const area = document.getElementById('loot-display');
  const card = document.getElementById('loot-card');
  if (!area || !card) return;
  card.style.display = 'block';
  // show last 12 unique items
  const items = Object.entries(G.inventory).slice(-12);
  area.innerHTML = items.map(([id, qty]) => {
    const item = ITEMS[id];
    return `<div class="loot-item ${item?.rare ? 'rare' : ''}" title="${item?.name}">${item ? itemIconImg(id) : '?'} x${qty}</div>`;
  }).join('');
}

// Hunt Analyzer (Analisador de Caçada): estatísticas da sessão atual — tempo,
// kills, XP total e por hora, gold, valor do loot, suprimentos e lucro/hora.
// Ver application/huntUseCases.js: getHuntStats.
function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (h ? `${h}h ` : '') + `${m}m ${sec}s`;
}
export function renderHuntAnalyzer() {
  const el = document.getElementById('hunt-analyzer-body');
  if (!el) return;
  const st = getHuntStats();
  const gi = goldIconImg('inline-icon');
  const xi = vitalIconImg('xp', 'inline-icon');
  const profitColor = st.profit >= 0 ? 'var(--positive, #2ecc71)' : '#e05a5a';
  const staminaLine = isStaminaEnabled()
    ? `<div class="hunt-analyzer-stamina tier-${staminaTier(G.stamina)}">🔋 Stamina ${formatStamina(G.stamina)} · XP ×${staminaXpMult(G.stamina)}</div>`
    : '';
  el.innerHTML = `
    <div class="hunt-analyzer-status ${st.hunting ? 'on' : 'off'}">${st.hunting ? '🟢 Caçando' : '⏸ Parado'} · ${fmtDuration(st.elapsedMs)}</div>
    ${staminaLine}
    <div class="hunt-analyzer-grid">
      <div class="ha-cell"><span class="ha-label">💀 Kills</span><span class="ha-val">${formatNum(st.kills)}</span></div>
      <div class="ha-cell"><span class="ha-label">${xi} XP</span><span class="ha-val">${formatNum(st.xp)}</span><span class="ha-rate">${formatNum(st.xpH)}/h</span></div>
      <div class="ha-cell"><span class="ha-label">${gi} Gold</span><span class="ha-val">${formatNum(st.gold)}</span><span class="ha-rate">${formatNum(st.goldH)}/h</span></div>
      <div class="ha-cell"><span class="ha-label">📦 Loot</span><span class="ha-val">${formatNum(st.loot)}</span></div>
      <div class="ha-cell"><span class="ha-label">🧪 Suprimentos</span><span class="ha-val">-${formatNum(st.supplies)}</span></div>
      <div class="ha-cell"><span class="ha-label">💰 Lucro</span><span class="ha-val" style="color:${profitColor}">${formatNum(st.profit)}</span><span class="ha-rate">${formatNum(st.profitH)}/h</span></div>
    </div>
    <div class="ha-note muted">Loot/suprimentos pelo valor de venda. Zera ao iniciar uma caçada.</div>`;
}

// Bênçãos: mostra quantas estão ativas (X/5), o que reduzem na morte e o botão
// de comprar (custo escala com o nível). Ver domain/blessings.js.
export function renderBlessings() {
  const el = document.getElementById('blessings-body');
  if (!el) return;
  const b = G.blessings || 0;
  const cost = blessingCost(G.level);
  const lossPct = Math.round(deathXpLossPct(b) * 1000) / 10;
  const hpPct = Math.round(reviveHpPct(b) * 100);
  const full = b >= MAX_BLESSINGS;
  const pips = Array.from({ length: MAX_BLESSINGS }, (_, i) => `<span class="bless-pip ${i < b ? 'on' : ''}">🛡️</span>`).join('');
  el.innerHTML = `
    <div class="bless-pips">${pips} <strong>${b}/${MAX_BLESSINGS}</strong></div>
    <div class="muted bless-info">Na morte: perde <strong>${lossPct}%</strong> do XP · revive com <strong>${hpPct}%</strong> HP.
      As bênçãos são consumidas ao morrer.</div>
    <button class="skill-upgrade-btn" onclick="buyBlessing()" ${full || G.gold < cost ? 'disabled' : ''}>
      ${full ? '✅ Todas as bênçãos' : `Comprar bênção — ${formatNum(cost)} ${goldIconImg('inline-icon')}`}
    </button>`;
}

function renderHuntButton({ hunting }) {
  const btn = document.getElementById('hunt-toggle');
  if (!btn) return;
  // No Boss Rush, cada tier vencido pausa: o botão vira "💀 Batalhar Tier X" pra
  // o jogador desafiar o próximo tier explicitamente (não sobe automático).
  if (isBossOnlyHunt()) {
    const tier = (G.bossTiers && G.bossTiers[G.activeZone]) || 1;
    btn.textContent = hunting ? `⏹ Parar (Tier ${tier})` : `💀 Batalhar Tier ${tier}`;
  } else {
    btn.textContent = hunting ? '⏹ Parar Caçada' : '▶ Iniciar Caçada';
  }
  btn.classList.toggle('stop', hunting);
}

function renderOfflineProgressModal({ zoneName, zoneMainMonster, hours, minutes, kills, xpGained, goldGained }) {
  const zoneIcon = zoneMainMonster ? monsterSpriteImg(zoneMainMonster, 'zone-current-icon-img') : '🗺️';
  openModal(`
    <h3>🌙 Enquanto você esteve fora…</h3>
    <p>Seu personagem continuou caçando em <strong>${zoneIcon} ${zoneName}</strong> por <strong>${hours}h ${minutes}min</strong>.</p>
    <div class="item-detail-stats">
      💀 Criaturas abatidas: <span>${kills.toLocaleString()}</span><br/>
      ${vitalIconImg('xp', 'inline-icon')} Experiência ganha: <span>${xpGained.toLocaleString()}</span><br/>
      ${goldIconImg('inline-icon')} Gold coletado: <span>${goldGained.toLocaleString()}</span>
    </div>
  `);
}

// Battle List (como a do Tibia): lista todos os monstros da "sala" atual com a
// vida de cada um, destacando o alvo da frente. Some quando não há ninguém.
function battleListEntry({ defKey, name, pct, hp, maxHp, target, dead, hit }) {
  return `<div class="battle-list-entry ${target ? 'target' : ''} ${dead ? 'dead' : ''} ${hit ? 'hit-flash' : ''}">
    <div class="battle-list-icon">${monsterSpriteImg(defKey, 'battle-list-sprite')}</div>
    <div class="battle-list-info">
      <div class="battle-list-name">${name}</div>
      <div class="battle-list-hp-track">
        <div class="battle-list-hp-fill" style="width:${pct}%"></div>
        <div class="battle-list-hp-label">${hp}/${maxHp}</div>
      </div>
    </div>
  </div>`;
}

export function renderBattleList() {
  const el = document.getElementById('battle-list');
  if (!el) return;
  const pack = getCurrentPack() || [];
  const dead = getRecentDead() || [];
  if (!pack.length && !dead.length) { el.innerHTML = '<div class="battle-list-empty">Sem criaturas.</div>'; return; }
  const now = Date.now();
  const rows = pack.map((m, i) => battleListEntry({
    defKey: m.defKey, name: `${i === 0 ? '⚔️ ' : ''}${m.name}`,
    pct: Math.max(0, Math.round((m.hp / m.maxHp) * 100)), hp: Math.max(0, m.hp), maxHp: m.maxHp, target: i === 0,
    hit: (now - (m._hitAt || 0)) < 350, // flash de dano (inclui os atingidos em área)
  }));
  // Mortos recentes (vida zerada) ficam ao fim da lista por 1s antes de sumir.
  dead.forEach(d => rows.push(battleListEntry({ defKey: d.defKey, name: `☠️ ${d.name}`, pct: 0, hp: 0, maxHp: d.maxHp, dead: true })));
  el.innerHTML = rows.join('');
}

// Alterna o modo da cena: "searching" (boneco andando pra baixo procurando)
// quando está caçando E não há monstro na frente; parado nos demais casos
// (ocioso ou lutando). O CSS (#dungeon-stage.searching) liga o piso rolando e
// o bob de passo; o timer de caminhada (ver ui/characterPanel.js) lê essa
// classe pra ciclar os quadros ou congelar no idle.
export function updateSceneMode() {
  const stage = document.getElementById('dungeon-stage');
  if (!stage) return;
  stage.classList.toggle('searching', G.hunting && !getCurrentMonster());
  renderStagePack(stage);
}

// Materializa TODA a sala no palco principal, uma criatura ao lado da outra, À
// FRENTE do boneco (metade de baixo, o boneco olha pro sul) e VIRADAS PRA CIMA
// (encarando o personagem, que está acima). Cada instância nova (uid) surge de
// baixo pra cima; as que morrem somem. Reaproveita os elementos já na tela pra
// não re-materializar quem já estava (evita "piscar" a cada tick).
function renderStagePack(stage) {
  const pack = getCurrentPack() || [];
  let cont = document.getElementById('stage-pack');
  if (!pack.length) { if (cont) cont.remove(); return; }
  if (!cont) { cont = document.createElement('div'); cont.id = 'stage-pack'; cont.className = 'stage-pack'; stage.appendChild(cont); }
  const wantUids = pack.map(m => String(m.uid || m.defKey));
  // remove os que saíram da sala (mortos)
  [...cont.children].forEach(ch => { if (!wantUids.includes(ch.dataset.uid)) ch.remove(); });
  // adiciona os novos (materializando) e mantém a ordem (alvo = primeiro à esquerda)
  pack.forEach((m, i) => {
    const uid = String(m.uid || m.defKey);
    let el = cont.querySelector(`[data-uid="${CSS.escape(uid)}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'stage-monster spawning';
      el.dataset.uid = uid;
      el.innerHTML = `<div class="monster-sprite-wrap face-up">${monsterSpriteImg(m.defKey, 'monster-sprite')}</div>`;
    }
    el.classList.toggle('is-target', i === 0);
    if (cont.children[i] !== el) cont.insertBefore(el, cont.children[i] || null);
  });
}

export function wireHuntPanelEvents() {
  on(EVENTS.MONSTER_DISPLAY, ({ hit, killed, spellElement, bossAura } = {}) => { renderMonsterDisplay(hit, killed, spellElement, bossAura); renderBattleList(); updateSceneMode(); });
  on(EVENTS.COMBAT_FX, (fx) => playAreaEffect(fx));
  on(EVENTS.HUNT_STATS, renderHuntAnalyzer);
  on(EVENTS.BLESSINGS, renderBlessings);
  on(EVENTS.HEADER_STATS, renderBlessings); // atualiza o botão quando o gold muda
  on(EVENTS.BATTLE_LIST, () => { renderBattleList(); updateSceneMode(); });
  on(EVENTS.ZONE_PICKER, renderZonePicker);
  on(EVENTS.KILL_COUNTERS, renderKillCounters);
  on(EVENTS.LOOT, renderLoot);
  on(EVENTS.HUNT_BUTTON, ({ hunting } = {}) => { renderHuntButton({ hunting }); updateSceneMode(); });
  on(EVENTS.OFFLINE_PROGRESS, renderOfflineProgressModal);
}
