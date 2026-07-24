// Tudo da aba Caçada relacionado à zona/monstro atual: sprite do monstro,
// seletor de zona, contadores de mortes, loot recente e o botão de
// iniciar/parar caçada. (O retrato do jogador mora em characterPanel.js.)
import { G } from '../application/gameStore.js?v=251';
import { ZONES, isZoneUnlocked, boostedZoneForDate } from '../domain/bestiary.js?v=269';
import { MONSTERS } from '../domain/bestiary.js?v=269';
import { XP_TABLE } from '../domain/character.js?v=278';
import { cityName } from '../domain/cities.js?v=254';
import { ITEMS } from '../domain/items.js?v=262';
import { monsterSpriteFile, spriteUrl, effectSpriteFile, missileSpriteFile, spriteImgOrFallback } from '../infrastructure/tibiaSprites.js?v=252';
import { areaMaxTargets } from '../domain/attackAreas.js?v=247';
import { on, emit, EVENTS } from '../shared/eventBus.js?v=249';
import { openModal, itemIconImg, vitalIconImg, goldIconImg, formatNum, applyHpState, hpStateClass } from './shared.js?v=254';
import { uiIcon, huntToggleIcon } from './uiIcons.js?v=252';
import { getCurrentMonster, getCurrentPack, getRecentDead, getHuntStats, isBossOnlyHunt } from '../application/huntUseCases.js?v=315';
import { MAX_BLESSINGS, blessingCost, deathXpLossPct, reviveHpPct } from '../domain/blessings.js?v=247';
import { getProjectileSpeedMs } from '../application/adminUseCases.js?v=252';
import { t } from '../i18n/i18n.js?v=265';
import { setStageWalking } from './stageWalk.js?v=88';

// O tamanho PADRONIZADO de cada monstro (52px na cena, 34px na Battle List)
// já vem do próprio sprite agora — os WebP em assets/sprites/monsters/ foram
// reprocessados (recorte do transparente + recentralização + reescala pra
// preencher ~82% do canvas), então object-fit:contain sozinho já basta. Ver
// infrastructure/tibiaSprites.js: MONSTER_SPRITE_VER pro histórico disso.
export function monsterSpriteImg(monsterId, cls = '') {
  const m = MONSTERS[monsterId];
  const file = monsterSpriteFile(monsterId, m);
  // fallback para o emoji se o sprite não carregar (cache de falha — ver
  // tibiaSprites.js: spriteImgOrFallback — evita retry/pisca-pisca a cada re-render)
  return spriteImgOrFallback(spriteUrl(file), m.name, m.icon, cls);
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
// tile do personagem — replica o padrão real do Tibia (ver domain/attackAreas.js
// e .spec/15-areas-de-ataque.md):
//  - ball: losango GIGANTE ao redor do caster (Groundshaker, Divine Caldera,
//    Hell's Core, Eternal Winter, Rage of the Skies, Wrath of Nature, Avalanche/GFB)
//  - square: 3x3 completo ao redor do caster (Berserk, Fierce Berserk)
//  - explosion: cruz compacta ao redor do alvo (Explosion Rune)
//  - wave: cone que abre à frente (pra cima)
//  - beam: linha reta à frente (pra cima)
//  - single: um tile à frente
const TILE_PX = 28;
function areaOffsets(shape) {
  const out = [];
  if (shape === 'ball') {
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) if (Math.abs(dx) + Math.abs(dy) <= 3) out.push([dx, dy]);
  } else if (shape === 'square') {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) out.push([dx, dy]);
  } else if (shape === 'explosion') {
    out.push([0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]); // cruz: centro + 4 vizinhos ortogonais
  } else if (shape === 'beam') {
    // feixe reto que sai PRA CIMA, largura 1 — o boneco fica embaixo encarando
    // os monstros (que ficam no topo), então o feixe (Ethereal Spear, Energy
    // Beam) sai reto na direção do inimigo, sem abrir como a onda.
    for (let r = 1; r <= 5; r++) out.push([0, -r]);
  } else if (shape === 'wave') {
    // cone que abre PRA CIMA — a onda de mago (Fire/Energy/Ice/Terra Wave)
    // sai pra cima, na direção do inimigo, alargando conforme avança.
    for (let r = 1; r <= 4; r++) { const w = Math.min(r - 1, 2); for (let dx = -w; dx <= w; dx++) out.push([dx, -r]); }
  } else {
    out.push([0, -1]); // single: um tile À FRENTE (pra cima, direção do inimigo)
  }
  return out;
}

// Toca o efeito REAL da magia/runa (fogo/gelo/groundshaker/…) sobre as
// criaturas atingidas. Ver o comentário dentro da função para o porquê de
// seguir as criaturas em vez de desenhar a forma da área em tiles.
export function playAreaEffect({ effect, shape, targetUid, onTarget } = {}) {
  const file = effect ? effectSpriteFile(effect) : null;
  const stage = document.getElementById('dungeon-stage');
  const playerWrap = document.getElementById('player-sprite-wrap');
  if (!file || !stage || !playerWrap) return;
  const sr = stage.getBoundingClientRect();
  const url = spriteUrl(file);
  const cont = document.getElementById('stage-pack');

  const solta = (x, y, lado) => {
    const img = document.createElement('img');
    img.className = 'combat-area-tile';
    img.src = url;
    img.alt = '';
    img.style.width = lado + 'px';
    img.style.height = lado + 'px';
    img.style.marginLeft = (-lado / 2) + 'px';
    img.style.marginTop = (-lado / 2) + 'px';
    img.style.left = x + 'px';
    img.style.top = y + 'px';
    stage.appendChild(img);
    setTimeout(() => img.remove(), 720);
  };

  // Alvo único: o efeito vai EM CIMA da criatura, ancorado no SPRITE dela.
  // `.stage-monster` é sprite + barra de vida empilhados, então centralizar na
  // caixa inteira jogava o efeito pra baixo, entre os dois.
  if (shape === 'single' || !shape) {
    const alvoEl = (targetUid && cont && cont.querySelector(`[data-uid="${CSS.escape(String(targetUid))}"]`)) || (cont && cont.querySelector('.stage-monster:not(.leaving)'));
    const base = alvoEl ? (alvoEl.querySelector('.monster-sprite-wrap') || alvoEl) : playerWrap;
    const r = base.getBoundingClientRect();
    solta(r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2, Math.max(34, Math.max(r.width, r.height) * 1.15));
    return;
  }

  // ÁREA: a MESMA forma de sempre (areaOffsets), desenhada em tiles ao redor do
  // conjurador. Duas FAMÍLIAS de forma, escaladas de jeitos diferentes:
  //
  //  - DIRECIONAL (wave, beam): sai do boneco PRA FRENTE (só dy<0) rumo à
  //    fileira de criaturas. O tile é escalado pra que a PONTA da forma (o tile
  //    mais distante à frente) caia sobre as criaturas — é o que faz a onda
  //    "chegar" no inimigo. Sem isto o desenho terminava no vazio. Esta é a
  //    wave que já estava certa; nada aqui muda pra ela.
  //
  //  - CENTRADA (ball, square, explosion): o efeito se espalha em TODAS as
  //    direções ao redor do conjurador. Escalar pela "ponta da frente" era o
  //    erro: como a frente é só 1 tile (square) o tile virava a DISTÂNCIA
  //    INTEIRA até as criaturas (~234px), e a forma toda estourava o palco — a
  //    fileira de trás caía embaixo do boneco, fora da tela (medido no exori do
  //    knight e no divine caldera do paladin, nível 100). Aqui o tile é do
  //    tamanho de UMA CRIATURA: um aglomerado justo ao redor do boneco, como no
  //    Tibia, que cabe no palco em vez de vazar.
  // CENTRO da forma: normalmente o conjurador (Berserk do knight explode ao redor
  // DELE). Mas munição/runa de estouro (onTarget) explode em cima do ALVO — é
  // arremessada até lá, como no Tibia. Sem isto o 3x3 do Burst Arrow aparecia em
  // volta do boneco, no meio do palco, em vez de na criatura no topo (bug do Felipe).
  let cx, cy;
  if (onTarget) {
    const alvoEl = (targetUid && cont && cont.querySelector(`[data-uid="${CSS.escape(String(targetUid))}"]`)) || (cont && cont.querySelector('.stage-monster:not(.leaving)'));
    const base = alvoEl ? (alvoEl.querySelector('.monster-sprite-wrap') || alvoEl) : playerWrap;
    const r = base.getBoundingClientRect();
    cx = r.left - sr.left + r.width / 2;
    cy = r.top - sr.top + r.height / 2;
  } else {
    const pr = playerWrap.getBoundingClientRect();
    cx = pr.left - sr.left + pr.width / 2;
    cy = pr.top - sr.top + pr.height / 2;
  }

  const offsets = areaOffsets(shape);
  const direcional = shape === 'wave' || shape === 'beam';

  let tile;
  if (direcional) {
    const alcance = Math.max(1, ...offsets.map(([, dy]) => Math.abs(dy)));
    let vao = 0;
    if (cont && cont.children.length) {
      const alvos = [...cont.children].map(el => (el.querySelector('.monster-sprite-wrap') || el).getBoundingClientRect());
      vao = cy - Math.min(...alvos.map(r => r.top - sr.top + r.height / 2));
    }
    // Sem criatura na tela, mantém o tamanho histórico em vez de sumir.
    tile = vao > 30 ? vao / alcance : TILE_PX;
  } else {
    // Tamanho de uma criatura no palco (as sprites são padronizadas em 52px);
    // fallback pro histórico se não houver nenhuma na tela.
    const amostra = cont && cont.querySelector('.monster-sprite-wrap');
    const r = amostra && amostra.getBoundingClientRect();
    tile = r && r.width ? Math.max(r.width, r.height) : TILE_PX * 1.85;
  }
  // A SPRITE é desenhada MAIOR que o espaçamento (1,6x) de propósito. Com
  // lado ≈ espaçamento os tiles só se encostam, e criatura que cai ENTRE duas
  // colunas ficava metade de fora — medido: 27% a 59% de cobertura mesmo com o
  // desenho chegando na fileira certa. Com a sobreposição, a faixa fica
  // contínua e o bicho é coberto de fato, que era o pedido original ("sprite
  // redimensionada para o tamanho onde os bichos realmente sejam atingidos").
  // Só o TAMANHO muda; as posições dos tiles seguem as de areaOffsets.
  const lado = Math.min(tile * 1.6, 96);

  offsets.forEach(([dx, dy]) => solta(cx + dx * tile, cy + dy * tile, lado));
}

export function renderMonsterDisplay(hit = false, killed = null, spellElement = null, bossAura = null) {
  const el = document.getElementById('monster-display');
  if (!el) return;
  const currentMonster = getCurrentMonster();
  // Monstro recém-morto fica visível um instante (mesmo quando a sala NÃO
  // esvaziou — antes só mostrava a "morte" quando currentMonster ficava null,
  // então matar um alvo com outros na fila pulava DIRETO pro próximo já com
  // vida cheia, sem confirmar a morte do que você realmente atacou — parecia
  // uma troca bagunçada pro monstro errado). O próximo tick natural do
  // currentMonster (hit/render normal) substitui esse ghost sozinho.
  if (killed) {
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
      ? `<div class="monster-empty">${t('hunt.searchingNext')}</div>`
      : `<div class="monster-empty">${t('hunt.noCreatureStart')}</div>`;
    return;
  }
  const pct = Math.max(0, Math.round((currentMonster.hp / currentMonster.maxHp) * 100));
  // atualiza in-place quando é o mesmo monstro — recriar o <img> a cada tick
  // impedia o sprite de terminar de carregar
  if (el.dataset.monsterId === currentMonster.defKey && el.querySelector('.monster-hp-fill')) {
    applyHpState(el.querySelector('.monster-hp-fill'), pct);
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
      <div class="monster-hp-fill ${hpStateClass(pct)}" style="width:${pct}%"></div>
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
  const boostedBadge = isBoostedToday ? ` <span class="zone-boosted-badge" title="${t('zonePicker.bonusZoneTooltipFull')}">🔥 ${t('zonePicker.bonusZoneBadge')}</span>` : '';
  const iconEl = document.getElementById('zone-current-icon');
  const nameEl = document.getElementById('zone-current-name');
  const titleEl = document.getElementById('battle-card-title');
  if (iconEl && nameEl) {
    iconEl.innerHTML = zone ? zoneIconImg(zone, 'zone-current-icon-img') : '🗺️';
    const cityPrefix = zone && zone.city ? `<span class="zone-current-city">${cityName(zone.city)}</span> · ` : '';
    nameEl.innerHTML = (zone ? cityPrefix + t(zone.name) : t('hunt.chooseZone')) + boostedBadge;
  }
  if (titleEl) {
    titleEl.innerHTML = zone ? `⚔️ ${t('battle.title')} — ${zoneIconImg(zone, 'zone-current-icon-img')} ${t(zone.name)}${boostedBadge}` : `⚔️ ${t('battle.title')}`;
  }
  renderZoneTheme();
  renderHuntStatusButton();
}

// Dois botões lado a lado (embaixo da barra de zona atual): "Ver Hunt" (abre
// a cena de combate — sempre disponível, mesmo parado, mostra o estado ocioso
// da cena) e "Trocar de Hunt" (abre o seletor de zona, sempre disponível).
function renderHuntStatusButton() {
  const viewBtn = document.getElementById('hunt-status-view-btn');
  const switchBtn = document.getElementById('hunt-status-switch-btn');
  if (!viewBtn || !switchBtn) return;
  viewBtn.innerHTML = `${uiIcon('battle', 'inline-icon')} ${t('hunt.viewBattle')}`;
  switchBtn.innerHTML = `${uiIcon('hunt', 'inline-icon')} ${t('hunt.switchHunt')}`;
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
  // Cenário de batalha por bioma: o CSS por [data-biome] troca piso/paredes/
  // vinheta do palco (ver style.css). Sem bioma, cai no gradiente por cor.
  const stage = document.getElementById('dungeon-stage');
  if (stage) stage.dataset.biome = (zone && zone.biome) || '';
}

function renderLoot() {
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
export function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (h ? `${h}h ` : '') + `${m}m ${sec}s`;
}
function renderHuntAnalyzer() {
  const el = document.getElementById('hunt-analyzer-body');
  if (!el) return;
  const st = getHuntStats();
  const gi = goldIconImg('inline-icon');
  const xi = vitalIconImg('xp', 'inline-icon');
  const profitColor = st.profit >= 0 ? 'var(--positive, #2ecc71)' : '#e05a5a';
  el.innerHTML = `
    <div class="hunt-analyzer-grid">
      <div class="ha-cell"><span class="ha-label">${uiIcon('kills', 'inline-icon')} ${t('hunt.analyzerKills')}</span><span class="ha-val">${formatNum(st.kills)}</span></div>
      <div class="ha-cell"><span class="ha-label">${xi} XP</span><span class="ha-val">${formatNum(st.xp)}</span><span class="ha-rate">${formatNum(st.xpH)}/h</span></div>
      <div class="ha-cell"><span class="ha-label">${gi} ${t('hunt.analyzerGold')}</span><span class="ha-val">${formatNum(st.gold)}</span><span class="ha-rate">${formatNum(st.goldH)}/h</span></div>
      <div class="ha-cell"><span class="ha-label">${uiIcon('log_loot', 'inline-icon')} ${t('hunt.analyzerLoot')}</span><span class="ha-val">${formatNum(st.loot)}</span></div>
      <div class="ha-cell"><span class="ha-label">${uiIcon('log_supplies', 'inline-icon')} ${t('hunt.analyzerSupplies')}</span><span class="ha-val">-${formatNum(st.supplies)}</span></div>
      <div class="ha-cell"><span class="ha-label">${gi} ${t('hunt.analyzerProfit')}</span><span class="ha-val" style="color:${profitColor}">${formatNum(st.profit)}</span><span class="ha-rate">${formatNum(st.profitH)}/h</span></div>
    </div>
    <div class="ha-note muted">${t('hunt.analyzerNote')}</div>`;
}

// Bênçãos: mostra quantas estão ativas (X/5), o que reduzem na morte e o botão
// de comprar (custo escala com o nível). Ver domain/blessings.js.
function renderBlessings() {
  const el = document.getElementById('blessings-body');
  if (!el) return;
  const b = G.blessings || 0;
  const cost = blessingCost(G.level);
  // perda de XP na morte: fórmula real do CS (escala com nível + total de XP)
  const nivel = G.level || 1;
  const curXp = G.xp || 0;
  const totalXp = curXp + XP_TABLE.slice(0, nivel - 1).reduce((a, c) => a + c, 0);
  const levelPct = nivel < 100 && XP_TABLE[nivel - 1] ? (curXp / XP_TABLE[nivel - 1]) * 100 : 0;
  const lossPct = Math.round(deathXpLossPct(nivel, b, G.promoted, levelPct, totalXp) * 1000) / 10;
  const hpPct = Math.round(reviveHpPct(b) * 100);
  const full = b >= MAX_BLESSINGS;
  const pips = Array.from({ length: MAX_BLESSINGS }, (_, i) => `<span class="bless-pip ${i < b ? 'on' : ''}">🛡️</span>`).join('');
  el.innerHTML = `
    <div class="bless-pips">${pips} <strong>${b}/${MAX_BLESSINGS}</strong></div>
    <div class="muted bless-info">${t('hunt.blessingsInfo', { lossPct: `<strong>${lossPct}%</strong>`, hpPct: `<strong>${hpPct}%</strong>` })}</div>
    <button class="skill-upgrade-btn" onclick="buyBlessing()" ${full || G.gold < cost ? 'disabled' : ''}>
      ${full ? `✅ ${t('hunt.allBlessings')}` : `${t('hunt.buyBlessing')} — ${formatNum(cost)} ${goldIconImg('inline-icon')}`}
    </button>`;
}

function renderHuntButton({ hunting }) {
  const btn = document.getElementById('hunt-toggle');
  if (!btn) return;
  // No Boss Rush, cada tier vencido pausa: o botão vira "💀 Batalhar Tier X" pra
  // o jogador desafiar o próximo tier explicitamente (não sobe automático).
  if (isBossOnlyHunt()) {
    const tier = (G.bossTiers && G.bossTiers[G.activeZone]) || 1;
    btn.innerHTML = hunting ? `${huntToggleIcon('stop')} ${t('hunt.stopTier', { tier })}` : `${uiIcon('bossrush', 'inline-icon')} ${t('bossrush.challengeTier', { tier })}`;
  } else {
    btn.innerHTML = hunting ? `${huntToggleIcon('stop')} ${t('battle.stopHunt')}` : `${huntToggleIcon('play')} ${t('battle.startHunt')}`;
  }
  btn.classList.toggle('stop', hunting);
}

function renderOfflineProgressModal({ zoneName, zoneMainMonster, hours, minutes, kills, xpGained, goldGained }) {
  const zoneIcon = zoneMainMonster ? monsterSpriteImg(zoneMainMonster, 'zone-current-icon-img') : '🗺️';
  openModal(`
    <h3>🌙 ${t('hunt.whileAwayTitle')}</h3>
    <p>${t('hunt.whileAwayBody', { zone: `<strong>${zoneIcon} ${zoneName}</strong>`, duration: `<strong>${hours}h ${minutes}min</strong>` })}</p>
    <div class="item-detail-stats">
      💀 ${t('hunt.creaturesSlain')}: <span>${kills.toLocaleString()}</span><br/>
      ${vitalIconImg('xp', 'inline-icon')} ${t('hunt.xpGained')}: <span>${xpGained.toLocaleString()}</span><br/>
      ${goldIconImg('inline-icon')} ${t('hunt.goldCollected')}: <span>${goldGained.toLocaleString()}</span>
    </div>
  `);
}

// Battle List (como a do Tibia): lista todos os monstros da "sala" atual com a
// vida de cada um, destacando o alvo da frente. Some quando não há ninguém.
// Clicar numa criatura viva troca o alvo (ver application/huntUseCases.js:
// selectTarget) — igual ao Tibia real.
function battleListEntry({ uid, defKey, name, pct, hp, maxHp, target, dead, hit }) {
  return `<div class="battle-list-entry ${target ? 'target' : ''} ${dead ? 'dead' : ''} ${hit ? 'hit-flash' : ''}" ${!dead ? `onclick="selectTarget('${uid}')"` : ''}>
    <div class="battle-list-icon">${monsterSpriteImg(defKey, 'battle-list-sprite')}</div>
    <div class="battle-list-info">
      <div class="battle-list-name">${name}</div>
      <div class="battle-list-hp-track">
        <div class="battle-list-hp-fill ${dead ? '' : hpStateClass(pct)}" style="width:${pct}%"></div>
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
  if (!pack.length && !dead.length) { el.innerHTML = `<div class="battle-list-empty">${t('battle.noCreatures')}</div>`; return; }
  const now = Date.now();
  const targetUid = (getCurrentMonster() || {}).uid;
  const rows = pack.map((m) => {
    const isTarget = m.uid === targetUid;
    return battleListEntry({
      uid: m.uid, defKey: m.defKey, name: `${isTarget ? '⚔️ ' : ''}${m.name}`,
      pct: Math.max(0, Math.round((m.hp / m.maxHp) * 100)), hp: Math.max(0, m.hp), maxHp: m.maxHp, target: isTarget,
      hit: (now - (m._hitAt || 0)) < 350, // flash de dano (inclui os atingidos em área)
    });
  });
  // Mortos recentes (vida zerada) ficam ao fim da lista por 1s antes de sumir.
  dead.forEach(d => rows.push(battleListEntry({ defKey: d.defKey, name: `☠️ ${d.name}`, pct: 0, hp: 0, maxHp: d.maxHp, dead: true })));
  el.innerHTML = rows.join('');
}

// Alterna o modo da cena: "searching" (boneco andando pra baixo procurando)
// quando está caçando E não há monstro na frente; parado nos demais casos
// (ocioso ou lutando).
//
// A rolagem em si NÃO é mais uma animação CSS ligada pela classe — quem manda é
// ui/stageWalk.js, que acumula a distância percorrida e fecha a passada antes de
// congelar. Assim a cena não salta quando o monstro brota (ela só para onde
// estava) e o boneco não fica com a perna no ar. A classe .searching continua
// existindo só pro piso simples das zonas sem bioma.
function updateSceneMode() {
  const stage = document.getElementById('dungeon-stage');
  if (!stage) return;
  const searching = G.hunting && !getCurrentMonster();
  stage.classList.toggle('searching', searching);
  setStageWalking(searching);
  renderStagePack(stage);
}

// Materializa TODA a sala no TOPO do palco, uma criatura ao lado da outra,
// encarando o boneco (que fica embaixo). O sprite nativo do Tibia já olha pro
// sul (pra baixo), então SEM flip elas encaram naturalmente o personagem lá em
// baixo. Cada instância nova (uid) surge de baixo pra cima; as que morrem somem.
// Reaproveita os elementos já na tela pra não re-materializar quem já estava.
function renderStagePack(stage) {
  const pack = getCurrentPack() || [];
  const cont = document.getElementById('stage-pack');
  const wantUids = pack.map(m => String(m.uid || m.defKey));
  // Criaturas que saíram da sala (morreram): não somem na hora — ficam um
  // instante acinzentadas/tombando (animação de morte) antes de serem removidas,
  // pra dar um respiro visual à morte em vez de piscar pra fora. Isso vale também
  // pro ÚLTIMO inimigo: antes, com o pack vazio, o container era removido na hora
  // e matava a animação de morte da última criatura.
  if (cont) {
    [...cont.children].forEach(ch => {
      if (!wantUids.includes(ch.dataset.uid) && !ch.classList.contains('leaving')) {
        ch.classList.add('leaving');
        const wrap = ch.querySelector('.monster-sprite-wrap');
        if (wrap) { wrap.classList.add('dead'); void wrap.offsetWidth; wrap.classList.add('dying'); }
        setTimeout(() => { ch.remove(); const c = document.getElementById('stage-pack'); if (c && !c.children.length) c.remove(); }, 650);
      }
    });
  }
  if (!pack.length) return; // sala vazia: deixa os que morreram tombarem e sumirem
  const box = cont || (() => { const c = document.createElement('div'); c.id = 'stage-pack'; c.className = 'stage-pack'; stage.appendChild(c); return c; })();
  const targetUid = (getCurrentMonster() || {}).uid;
  // adiciona os novos (materializando) e mantém a ordem de SPAWN (nunca muda
  // por causa de clique/seleção de alvo — só o destaque ".is-target" muda,
  // ver ui/huntUseCases.js: selectTarget). O anchor de posição ignora
  // elementos "leaving" (corpo ainda tombando/sumindo) — indexar direto em
  // box.children (que ainda contém o corpo por ~650ms) fazia os
  // SOBREVIVENTES pularem de posição na tela assim que um deles morria, como
  // se tivessem sido "teleportados" (bug reportado pelo Felipe).
  pack.forEach((m, i) => {
    const uid = String(m.uid || m.defKey);
    let el = box.querySelector(`[data-uid="${CSS.escape(uid)}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'stage-monster spawning';
      el.dataset.uid = uid;
      el.dataset.rawUid = String(m.uid);
      el.style.pointerEvents = 'auto'; // .stage-pack tem pointer-events:none; sem isso o clique não chega no monstro
      el.setAttribute('onclick', `selectTarget('${m.uid}')`);
      el.innerHTML = `<div class="monster-sprite-wrap">${monsterSpriteImg(m.defKey, 'monster-sprite')}</div>
        <div class="stage-monster-hp"><div class="stage-monster-hp-fill hp-state-high" style="width:100%"></div></div>`;
    }
    // vida atualizada a cada tick, inclusive nos que já estavam na tela.
    const fill = el.querySelector('.stage-monster-hp-fill');
    if (fill) {
      const pct = Math.max(0, Math.round((m.hp / m.maxHp) * 100));
      fill.style.width = pct + '%';
      applyHpState(fill, pct);
    }
    // Tremida vermelha ao apanhar. A animação (monster-hit) e o dado (_hitAt)
    // já existiam, mas só o #monster-display — o card de UMA criatura que o
    // palco substituiu — chegava a ligar os dois. No palco, a criatura perdia
    // vida sem reagir: quem olha pro palco (e não pra Battle List, a única que
    // piscava) via o número mudar sem golpe nenhum.
    //
    // Re-disparo pelo mesmo caminho do #monster-display: tirar a classe, forçar
    // reflow e recolocar. Sem o reflow, dois golpes seguidos não reiniciam a
    // animação e o segundo passa despercebido.
    const wrap = el.querySelector('.monster-sprite-wrap');
    if (wrap) {
      const bateuAgora = (Date.now() - (m._hitAt || 0)) < 350;
      if (bateuAgora && wrap.dataset.hitAt !== String(m._hitAt)) {
        wrap.dataset.hitAt = String(m._hitAt);
        wrap.classList.remove('hit');
        void wrap.offsetWidth;
        wrap.classList.add('hit');
      } else if (!bateuAgora && wrap.classList.contains('hit')) {
        wrap.classList.remove('hit');
      }
    }
    el.classList.toggle('is-target', m.uid === targetUid);
    const livingSiblings = [...box.children].filter(c => c !== el && !c.classList.contains('leaving'));
    const anchor = livingSiblings[i] || null;
    // Elemento recém-criado (spawn) ainda não está no DOM: nextSibling dá
    // `null`, que empatava com `anchor === null` (sala com 1 monstro, ou o
    // 1º de um grupo maior) e o insertBefore era pulado — o monstro NUNCA
    // entrava na tela, só existia no objeto (Battle List funcionava porque
    // ela não depende do DOM anterior). Precisa checar se `el` já está
    // anexado a `box` antes de comparar posição.
    if (el.parentNode !== box || el.nextSibling !== anchor) box.insertBefore(el, anchor);
  });
}

// Dispara o projétil do golpe básico à distância/mágico: cria o sprite do
// missile (flecha/virote/raio elemental) no centro do boneco e o anima voando
// até a criatura-alvo no topo do palco, girando na direção do voo. Removido ao
// chegar. Reaproveita o mesmo palco/coordenadas do playAreaEffect.
// hitId: correlaciona ESTE voo específico com o golpe real que o disparou
// (ver application/huntUseCases.js: applyServerPack) — quando o projétil
// termina de voar de verdade (transitionend, não um timeout chutado), emite
// COMBAT_PROJECTILE_LANDED com o mesmo hitId, e é SÓ NESSE MOMENTO que a
// barra de vida daquele golpe específico cai. Isso fecha o problema de
// "não importa quanto eu ajuste o delay, ainda sai dessincronizado": antes
// o drop da vida usava um timeout próprio contando a partir de quando o
// reconcile percebeu o dano, sem nenhuma relação causal com o instante em
// que o doCosmeticTick (rodando no SEU próprio timer local) decidia disparar
// o projétil cosmético — dois relógios independentes só coincidindo por
// sorte de tuning. Agora há causalidade real entre uma coisa e a outra.
export function playProjectile({ missile, targetUid, hitId } = {}) {
  const file = missile ? missileSpriteFile(missile) : null;
  const stage = document.getElementById('dungeon-stage');
  const playerWrap = document.getElementById('player-sprite-wrap');
  if (!file || !stage || !playerWrap) {
    if (hitId) emit(EVENTS.COMBAT_PROJECTILE_LANDED, { hitId });
    return;
  }
  // Blindagem: nunca mais de UM projétil em voo por vez — se algo disparar
  // doCosmeticTick() mais de uma vez por ciclo (ex.: um huntInterval antigo
  // vazado, ver beginLocalLoop), cada chamada criava seu PRÓPRIO <img>, todos
  // animando ao mesmo tempo (bug reportado: "às vezes sai 2, 3, 5 flechas").
  // Remove qualquer projétil ainda visível antes de criar o novo.
  stage.querySelectorAll('.combat-projectile').forEach(el => el.remove());
  // alvo: a criatura pedida (por uid) ou a primeira da fila
  const cont = document.getElementById('stage-pack');
  const targetEl = (targetUid && cont && cont.querySelector(`[data-uid="${CSS.escape(String(targetUid))}"]`)) || (cont && cont.querySelector('.stage-monster:not(.leaving)'));
  if (!targetEl) {
    if (hitId) emit(EVENTS.COMBAT_PROJECTILE_LANDED, { hitId });
    return;
  }
  const sr = stage.getBoundingClientRect();
  const pr = playerWrap.getBoundingClientRect();
  const tr = targetEl.getBoundingClientRect();
  const x0 = pr.left - sr.left + pr.width / 2;
  const y0 = pr.top - sr.top + pr.height / 2;
  const x1 = tr.left - sr.left + tr.width / 2;
  const y1 = tr.top - sr.top + tr.height / 2;
  const ang = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
  const img = document.createElement('img');
  img.className = 'combat-projectile';
  img.src = spriteUrl(file);
  img.alt = '';
  // Velocidade configurável no Painel Admin (ver adminUseCases.js:
  // getProjectileSpeedMs) — sobrescreve a duração da transição em CSS (só o
  // valor padrão/fallback) via inline style, sem mexer no timing-function.
  const flightMs = getProjectileSpeedMs();
  img.style.transitionDuration = flightMs + 'ms';
  // o sprite do Tibia aponta pra cima (norte); +90° alinha o "nariz" ao vetor de voo
  img.style.left = x0 + 'px';
  img.style.top = y0 + 'px';
  img.style.transform = `translate(-50%, -50%) rotate(${ang + 90}deg)`;
  stage.appendChild(img);
  let landed = false;
  const land = () => {
    if (landed) return;
    landed = true;
    img.remove();
    if (hitId) emit(EVENTS.COMBAT_PROJECTILE_LANDED, { hitId });
  };
  img.addEventListener('transitionend', land, { once: true });
  // salvaguarda: se o transitionend não disparar por algum motivo (aba em
  // background throttlando rAF/transições, elemento removido no meio do voo),
  // não deixa o golpe pendente pra sempre — folga de 150ms sobre a duração
  // configurada cobre o voo real com sobra.
  setTimeout(land, flightMs + 150);
  // força reflow e anima até o alvo
  void img.offsetWidth;
  img.style.transform = `translate(-50%, -50%) translate(${x1 - x0}px, ${y1 - y0}px) rotate(${ang + 90}deg)`;
}

// Número de dano flutuante sobre a criatura atingida (ver COMBAT_DAMAGE em
// application/huntUseCases.js: applyServerPack). Sobe e desvanece; a cor vem do
// elemento do golpe e o tamanho escala (leve) com a magnitude do dano. É só
// juice — pointer-events:none, nunca bloqueia o clique de alvo. Auto-remove no
// fim da animação (com fallback por timeout se o animationend não disparar).
function floatDamage({ uid, amount, element } = {}) {
  if (amount == null || amount <= 0) return;
  const cont = document.getElementById('stage-pack');
  if (!cont) return;
  const targetEl = (uid != null && cont.querySelector(`[data-uid="${CSS.escape(String(uid))}"]`))
    || cont.querySelector('.stage-monster:not(.leaving)');
  if (!targetEl) return;
  const span = document.createElement('span');
  span.className = 'dmg-float';
  if (element && element !== 'physical') span.dataset.el = element;
  // escala suave: golpe pequeno ~1.0, golpe grande até ~1.7 (satura pra não virar cartaz)
  span.style.setProperty('--dmg-scale', String(Math.min(1.7, 1 + amount / 1400)));
  // leve jitter horizontal pra dois números seguidos não saírem exatamente sobrepostos
  span.style.left = `calc(50% + ${Math.round((Math.random() - 0.5) * 22)}px)`;
  span.textContent = '−' + Math.round(amount).toLocaleString();
  targetEl.appendChild(span);
  const done = () => span.remove();
  span.addEventListener('animationend', done, { once: true });
  setTimeout(done, 1000);
}

export function wireHuntPanelEvents() {
  on(EVENTS.MONSTER_DISPLAY, ({ hit, killed, spellElement, bossAura } = {}) => { renderMonsterDisplay(hit, killed, spellElement, bossAura); renderBattleList(); updateSceneMode(); });
  on(EVENTS.COMBAT_FX, (fx) => playAreaEffect(fx));
  on(EVENTS.COMBAT_PROJECTILE, (p) => playProjectile(p));
  on(EVENTS.COMBAT_DAMAGE, (d) => floatDamage(d));
  on(EVENTS.HUNT_STATS, renderHuntAnalyzer);
  on(EVENTS.BLESSINGS, renderBlessings);
  on(EVENTS.HEADER_STATS, renderBlessings); // atualiza o botão quando o gold muda
  on(EVENTS.BATTLE_LIST, () => { renderBattleList(); updateSceneMode(); });
  on(EVENTS.ZONE_PICKER, renderZonePicker);
  on(EVENTS.LOOT, renderLoot);
  on(EVENTS.HUNT_BUTTON, ({ hunting } = {}) => { renderHuntButton({ hunting }); renderHuntStatusButton(); updateSceneMode(); });
  on(EVENTS.OFFLINE_PROGRESS, renderOfflineProgressModal);
}
