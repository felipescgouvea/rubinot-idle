// Painel do personagem: seleção de vocação, barras de HP/MP/XP, atributos e
// o retrato do jogador no card de Batalha (com sprite real + fallback).
import { G } from '../application/gameStore.js?v=28';
import { VOCATIONS, XP_TABLE } from '../domain/character.js?v=28';
import { VOCATION_DEFAULT_OUTFIT } from '../domain/outfits.js?v=28';
import { renderOutfitToCanvas } from '../infrastructure/outfitRenderer.js?v=28';
import { getAtk, getDef, getSpd, getMagic, getMaxHp, getMaxMana } from '../application/stats.js?v=28';
import { on, EVENTS } from '../shared/eventBus.js?v=28';
import { formatNum } from './shared.js?v=28';
import { renderZonePicker } from './huntPanel.js?v=28';

// Outfit escolhido pelo jogador, ou a aparência padrão da vocação enquanto
// ele não escolhe nenhum (ver domain/outfits.js e ui/outfitPicker.js).
function currentOutfitId() {
  return G.outfit || (G.vocation ? VOCATION_DEFAULT_OUTFIT[G.vocation] : null);
}

function playerFallbackIcon() {
  return G.vocation ? VOCATIONS[G.vocation].icon : '🧑';
}

// Cor da barra de vida por faixa: verde cheia, laranja pela metade, vermelha
// quando cai muito — mesmas 3 faixas usadas nos dois lugares que mostram a
// vida do jogador (card de personagem e cena de batalha).
function applyHpState(el, pct) {
  if (!el) return;
  el.classList.remove('hp-state-high', 'hp-state-mid', 'hp-state-low');
  el.classList.add(pct > 50 ? 'hp-state-high' : pct > 25 ? 'hp-state-mid' : 'hp-state-low');
}

// Assinatura do visual atual — muda só quando outfit/gênero/addons/cores
// mudam. Usada pra não re-renderizar o canvas (recolorir é async) a cada
// tick de combate, só quando a aparência de fato muda.
function playerOutfitSignature() {
  const outfitId = currentOutfitId();
  if (!outfitId) return null;
  const c = G.outfitColors;
  return [outfitId, G.outfitGender || 'male', G.outfitAddon1 ? 1 : 0, G.outfitAddon2 ? 1 : 0, c.head, c.body, c.legs, c.feet].join('|');
}

// Monta (ou reaproveita) o <canvas> recolorido do personagem dentro de
// `container`. `cls` estiliza tanto o canvas quanto o fallback de emoji.
function mountPlayerPortrait(container, cls) {
  if (!container) return;
  const outfitId = currentOutfitId();
  const icon = playerFallbackIcon();
  if (!outfitId) {
    container.innerHTML = `<span class="${cls}">${icon}</span>`;
    delete container.dataset.sprite;
    return;
  }
  const sig = playerOutfitSignature();
  if (container.dataset.sprite === sig) return;
  container.dataset.sprite = sig;
  container.innerHTML = `<canvas class="${cls}"></canvas>`;
  const canvas = container.querySelector('canvas');
  renderOutfitToCanvas(canvas, {
    outfitId,
    gender: G.outfitGender || 'male',
    addon1: G.outfitAddon1,
    addon2: G.outfitAddon2,
    colors: G.outfitColors,
  }).then(ok => {
    if (!ok && container.dataset.sprite === sig) {
      container.innerHTML = `<span class="${cls}">${icon}</span>`;
    }
  });
}

export function renderCharPanel() {
  const vocSel = document.getElementById('vocation-select');
  const charCard = document.getElementById('char-card');
  const charInfo = document.getElementById('char-info');
  if (G.vocation) {
    charCard.style.display = 'none';
    charInfo.style.display = 'flex';
    renderCharInfo();
    renderZonePicker();
  } else {
    charCard.style.display = 'block';
    vocSel.style.display = 'grid';
    charInfo.style.display = 'none';
  }
}

export function renderCharInfo() {
  if (!G.vocation) return;
  const v = VOCATIONS[G.vocation];
  mountPlayerPortrait(document.getElementById('char-voc-icon'), 'char-voc-big');
  document.getElementById('char-voc-name').textContent = v.name;
  document.getElementById('char-level').textContent = G.level;
  document.getElementById('char-xp').textContent = G.xp;
  document.getElementById('char-xp-next').textContent = XP_TABLE[G.level - 1] || '---';
  document.getElementById('stat-atk').textContent = getAtk();
  document.getElementById('stat-def').textContent = getDef();
  document.getElementById('stat-spd').textContent = getSpd().toFixed(1);
  document.getElementById('stat-magic').textContent = getMagic();
  renderBars();
}

export function renderBars() {
  if (!G.vocation) return;
  const maxHp = getMaxHp(), maxMana = getMaxMana();
  const hpPct = Math.round((G.hp / maxHp) * 100);
  const manaPct = Math.round((G.mana / maxMana) * 100);
  const xpPct = G.level < 100 ? Math.round((G.xp / XP_TABLE[G.level - 1]) * 100) : 100;

  const hpBar = document.getElementById('hp-bar');
  hpBar.style.width = hpPct + '%';
  applyHpState(hpBar, hpPct);
  document.getElementById('mana-bar').style.width = manaPct + '%';
  document.getElementById('xp-bar').style.width = xpPct + '%';
  document.getElementById('hp-text').textContent = `${G.hp}/${maxHp}`;
  document.getElementById('mana-text').textContent = `${G.mana}/${maxMana}`;
  document.getElementById('xp-text').textContent = xpPct + '%';
  renderPlayerBattleSide();
}

export function renderHeaderStats() {
  document.getElementById('hdr-level').textContent = G.level;
  document.getElementById('hdr-gold').textContent = formatNum(G.gold);
  document.getElementById('hdr-rubini').textContent = formatNum(G.rubini);
  if (G.vocation) {
    document.getElementById('hdr-hp').textContent = `${G.hp}/${getMaxHp()}`;
    document.getElementById('hdr-mana').textContent = `${G.mana}/${getMaxMana()}`;
  }
}

// Espelha o lado do monstro (huntPanel.renderMonsterDisplay): mesmo tratamento
// de troca de sprite só quando muda, hit-flash e estado "morto" — sem recriar
// a <img> a cada tick (senão o sprite nunca termina de carregar).
export function renderPlayerBattleSide(hit = false) {
  const wrap = document.getElementById('player-sprite-wrap');
  if (!wrap) return;

  if (!G.vocation) {
    wrap.innerHTML = '<span class="player-sprite-fallback">🧑</span>';
    wrap.classList.remove('dead', 'hit');
    document.getElementById('player-battle-name').textContent = '—';
    document.getElementById('player-hp-fill').style.width = '0%';
    document.getElementById('player-hp-label').textContent = '--/--';
    return;
  }

  mountPlayerPortrait(wrap, 'player-sprite');
  if (hit) { wrap.classList.remove('hit'); void wrap.offsetWidth; wrap.classList.add('hit'); }
  wrap.classList.toggle('dead', G.hp <= 0);

  const maxHp = getMaxHp();
  const pct = Math.max(0, Math.round((G.hp / maxHp) * 100));
  document.getElementById('player-battle-name').textContent = `${VOCATIONS[G.vocation].name} — Lv ${G.level}`;
  const hpFill = document.getElementById('player-hp-fill');
  hpFill.style.width = pct + '%';
  applyHpState(hpFill, pct);
  document.getElementById('player-hp-label').textContent = `${Math.max(0, G.hp)}/${maxHp}`;
}

export function wireCharacterPanelEvents() {
  on(EVENTS.CHAR_PANEL, renderCharPanel);
  on(EVENTS.CHAR_INFO, renderCharInfo);
  on(EVENTS.BARS, renderBars);
  on(EVENTS.HEADER_STATS, renderHeaderStats);
  on(EVENTS.PLAYER_BATTLE_SIDE, ({ hit } = {}) => renderPlayerBattleSide(hit));
}
