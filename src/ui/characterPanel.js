// Painel do personagem: seleção de vocação, barras de HP/MP/XP, atributos e
// o retrato do jogador no card de Batalha (com sprite real + fallback).
import { G } from '../application/gameStore.js?v=13';
import { VOCATIONS, XP_TABLE } from '../domain/character.js?v=13';
import { VOCATION_DEFAULT_OUTFIT } from '../domain/outfits.js?v=13';
import { SPRITE_BASE, outfitSpriteFile } from '../infrastructure/tibiaSprites.js?v=13';
import { getAtk, getDef, getSpd, getMagic, getMaxHp, getMaxMana } from '../application/stats.js?v=13';
import { on, EVENTS } from '../shared/eventBus.js?v=13';
import { formatNum } from './shared.js?v=13';
import { renderZonePicker } from './huntPanel.js?v=13';

// Outfit escolhido pelo jogador, ou a aparência padrão da vocação enquanto
// ele não escolhe nenhum (ver domain/outfits.js e ui/outfitPicker.js).
function currentOutfitId() {
  return G.outfit || (G.vocation ? VOCATION_DEFAULT_OUTFIT[G.vocation] : null);
}

function playerSpriteFile() {
  const outfitId = currentOutfitId();
  return outfitId ? outfitSpriteFile(outfitId, G.outfitGender || 'male') : null;
}

function playerFallbackIcon() {
  return G.vocation ? VOCATIONS[G.vocation].icon : '🧑';
}

function playerPortraitImg(cls = '') {
  const file = playerSpriteFile();
  const icon = playerFallbackIcon();
  if (!file) return `<span class="${cls}">${icon}</span>`;
  return `<img src="${SPRITE_BASE + file}" alt="Você" class="${cls}"
    onerror="this.outerHTML='<span class=&quot;${cls}&quot;>${icon}</span>'" />`;
}

export function renderCharPanel() {
  const vocSel = document.getElementById('vocation-select');
  const charInfo = document.getElementById('char-info');
  if (G.vocation) {
    vocSel.style.display = 'none';
    charInfo.style.display = 'block';
    renderCharInfo();
    renderZonePicker();
  } else {
    vocSel.style.display = 'grid';
    charInfo.style.display = 'none';
  }
}

export function renderCharInfo() {
  if (!G.vocation) return;
  const v = VOCATIONS[G.vocation];
  document.getElementById('char-voc-icon').innerHTML = playerPortraitImg('char-voc-big');
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

  document.getElementById('hp-bar').style.width = hpPct + '%';
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

  const wantFile = playerSpriteFile() || 'none:' + playerFallbackIcon();
  if (wrap.dataset.sprite !== wantFile) {
    wrap.dataset.sprite = wantFile;
    wrap.innerHTML = playerPortraitImg('player-sprite');
  }
  if (hit) { wrap.classList.remove('hit'); void wrap.offsetWidth; wrap.classList.add('hit'); }
  wrap.classList.toggle('dead', G.hp <= 0);

  const maxHp = getMaxHp();
  const pct = Math.max(0, Math.round((G.hp / maxHp) * 100));
  document.getElementById('player-battle-name').textContent = `${VOCATIONS[G.vocation].name} — Lv ${G.level}`;
  document.getElementById('player-hp-fill').style.width = pct + '%';
  document.getElementById('player-hp-label').textContent = `${Math.max(0, G.hp)}/${maxHp}`;
}

export function wireCharacterPanelEvents() {
  on(EVENTS.CHAR_PANEL, renderCharPanel);
  on(EVENTS.CHAR_INFO, renderCharInfo);
  on(EVENTS.BARS, renderBars);
  on(EVENTS.HEADER_STATS, renderHeaderStats);
  on(EVENTS.PLAYER_BATTLE_SIDE, ({ hit } = {}) => renderPlayerBattleSide(hit));
}
