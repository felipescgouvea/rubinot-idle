// Painel do personagem: seleção de vocação, barras de HP/MP/XP, atributos e
// o retrato do jogador no card de Batalha (com sprite real + fallback).
import { G } from '../application/gameStore.js?v=122';
import { VOCATIONS, XP_TABLE, TIBIA_SKILLS, VOC_TRAINING, triesForNext } from '../domain/character.js?v=122';
import { getEquippedWeaponSkillId } from '../application/stats.js?v=122';
import { skillIconImg } from './shared.js?v=122';
import { VOCATION_DEFAULT_OUTFIT } from '../domain/outfits.js?v=122';
import { renderOutfitToCanvas } from '../infrastructure/outfitRenderer.js?v=122';
import { outfitWalkAtlasPath } from '../infrastructure/outfitAssets.js?v=122';
import { buildWalkFrames } from '../infrastructure/outfitWalkRenderer.js?v=122';
import { getAtk, getDef, getSpd, getMagic, getMaxHp, getMaxMana } from '../application/stats.js?v=122';
import { on, emit, EVENTS } from '../shared/eventBus.js?v=122';
import { formatNum } from './shared.js?v=122';
import { renderZonePicker, fmtDuration } from './huntPanel.js?v=122';
import { getCurrentMonster, getHuntStats } from '../application/huntUseCases.js?v=122';
import { isStaminaEnabled } from '../application/adminUseCases.js?v=122';
import { formatStamina, staminaXpMult, staminaTier } from '../domain/stamina.js?v=122';
import { selectVocation } from '../application/characterUseCases.js?v=122';
import { registerPlayerName } from '../application/highscoresUseCases.js?v=122';

// Outfit escolhido pelo jogador, ou a aparência padrão da vocação enquanto
// ele não escolhe nenhum (ver domain/outfits.js e ui/outfitPicker.js).
function currentOutfitId() {
  return G.outfit || (G.vocation ? VOCATION_DEFAULT_OUTFIT[G.vocation] : null);
}

// Cria o personagem: nome (mesmo cadastro do ranking, ver highscoresUseCases)
// + vocação, na MESMA tela — antes o nome só era pedido depois, na aba
// Highscores, e o personagem podia jogar a partida inteira sem nunca ter um.
// Escolhe a vocação primeiro (currentOutfitId/kit dependem dela) e só então
// registra o nome — submitScore() exige G.vocation setado pra aceitar o envio.
export async function createCharacter(voc) {
  if (G.vocation) return;
  const input = document.getElementById('char-name-input');
  const name = (input?.value || '').trim();
  if (name.length < 3 || name.length > 20) {
    emit(EVENTS.NOTIFY, { msg: 'Escolha um nome de personagem (3 a 20 caracteres).', type: 'error' });
    input?.focus();
    return;
  }
  selectVocation(voc);
  await registerPlayerName(name);
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

// Anima a caminhada do boneco na cena de batalha COM as cores do jogador:
// recolore os 8 quadros do atlas (ver infrastructure/outfitWalkRenderer.js) e
// cicla-os num <canvas> por timer. Só reconstrói os quadros quando a aparência
// muda (outfit/gênero/addons/cores); congela o quadro quando o jogador morre.
let walkTimer = null;
let walkFrames = [];
let walkIdle = null;
let walkIdx = 0;

function stopWalk() {
  if (walkTimer) { clearInterval(walkTimer); walkTimer = null; }
  walkFrames = [];
  walkIdle = null;
}

// Bounding box do conteúdo (pixels não-transparentes) de um quadro 64x64.
function frameContentBBox(frame) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.imageSmoothingEnabled = false; cx.drawImage(frame, 0, 0);
  const d = cx.getImageData(0, 0, 64, 64).data;
  let minX = 64, minY = 64, maxX = -1, maxY = -1;
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      if (d[(y * 64 + x) * 4 + 3] > 16) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

// União das bounding boxes de vários quadros (o passo mexe braços/pernas, então
// usamos a maior extensão pra não cortar nada ao escalar).
function unionContentBBox(frames) {
  let u = null;
  for (const f of frames) {
    if (!f) continue;
    const b = frameContentBBox(f);
    if (!b) continue;
    u = u ? { minX: Math.min(u.minX, b.minX), minY: Math.min(u.minY, b.minY), maxX: Math.max(u.maxX, b.maxX), maxY: Math.max(u.maxY, b.maxY) } : b;
  }
  return u ? { minX: u.minX, minY: u.minY, w: u.maxX - u.minX + 1, h: u.maxY - u.minY + 1 } : null;
}

// Parâmetros de recorte+escala pra o conteúdo do outfit preencher FILL da caixa
// SIZE, centralizado — mesmo enquadramento usado nos sprites de monstro, pra o
// boneco ter o MESMO tamanho visual deles.
function fitContent(box, SIZE, FILL) {
  if (!box) return { sx: 0, sy: 0, sw: 64, sh: 64, dx: 0, dy: 0, dw: SIZE, dh: SIZE };
  const scale = (SIZE * FILL) / Math.max(box.w, box.h);
  const dw = box.w * scale, dh = box.h * scale;
  return { sx: box.minX, sy: box.minY, sw: box.w, sh: box.h, dx: (SIZE - dw) / 2, dy: (SIZE - dh) / 2, dw, dh };
}

function mountPlayerWalkSprite(wrap) {
  const outfitId = currentOutfitId();
  const icon = playerFallbackIcon();
  if (!outfitId) {
    if (wrap.dataset.walk !== 'none') { wrap.dataset.walk = 'none'; stopWalk(); wrap.innerHTML = `<span class="player-sprite">${icon}</span>`; }
    return;
  }
  const gender = G.outfitGender || 'male';
  const c = G.outfitColors || {};
  const sig = [outfitId, gender, G.outfitAddon1 ? 1 : 0, G.outfitAddon2 ? 1 : 0, c.head, c.body, c.legs, c.feet].join('|');
  if (wrap.dataset.walk === sig && wrap.querySelector('canvas.player-sprite')) return;
  wrap.dataset.walk = sig;
  stopWalk();
  wrap.innerHTML = '<canvas class="player-sprite" width="64" height="64"></canvas>';
  const canvas = wrap.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  buildWalkFrames(outfitWalkAtlasPath(outfitId, gender), {
    colors: G.outfitColors,
    addon1: G.outfitAddon1,
    addon2: G.outfitAddon2,
  }).then(({ idle, frames }) => {
    if (wrap.dataset.walk !== sig) return; // aparência mudou enquanto carregava
    const base = idle || frames[0];
    if (!base) { stopWalk(); wrap.innerHTML = `<span class="player-sprite">${icon}</span>`; return; }
    stopWalk(); // garante que nenhum timer antigo fique ciclando
    // Recorta o conteúdo do outfit (ocupa só parte da célula 64x64) e escala pra
    // preencher a caixa, centralizado — mesmo porte visual dos monstros (~90%).
    const fit = fitContent(unionContentBBox([idle, ...frames]), 64, 0.9);
    walkFrames = frames.filter(Boolean);
    walkIdle = base;
    walkIdx = 0;
    const draw = (frame) => {
      ctx.clearRect(0, 0, 64, 64);
      ctx.drawImage(frame, fit.sx, fit.sy, fit.sw, fit.sh, fit.dx, fit.dy, fit.dw, fit.dh);
    };
    // Enquanto PROCURA criatura (caçando, sem monstro na cena), o boneco anda:
    // cicla os quadros de caminhada. Ao entrar em combate (ou parar a caçada),
    // volta ao quadro idle frontal, estático — só os efeitos de spell se mexem.
    draw(walkIdle);
    walkTimer = setInterval(() => {
      const searching = G.hunting && !getCurrentMonster();
      if (searching && walkFrames.length > 1) {
        walkIdx = (walkIdx + 1) % walkFrames.length;
        draw(walkFrames[walkIdx]);
      } else if (walkIdx !== 0) {
        walkIdx = 0;
        draw(walkIdle);
      }
    }, 180);
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
  document.getElementById('char-name-display').textContent = G.playerName || '';
  document.getElementById('char-voc-name').textContent = v.name;
  document.getElementById('char-level').textContent = G.level;
  document.getElementById('char-xp').textContent = G.xp;
  document.getElementById('char-xp-next').textContent = XP_TABLE[G.level - 1] || '---';
  document.getElementById('stat-atk').textContent = getAtk();
  document.getElementById('stat-def').textContent = getDef();
  document.getElementById('stat-spd').textContent = getSpd().toFixed(1);
  document.getElementById('stat-magic').textContent = getMagic();
  renderCharSkills();
  renderBars();
}

// Skills compactas na barra do personagem (à direita do botão Outfit): cada
// skill como um chip pequeno (ícone + nível + mini-barra de progresso). A que
// está treinando agora ganha destaque. O treino em si acontece durante a
// caçada (ver application/skillUseCases.js) — aqui é só a leitura compacta.
export function renderCharSkills() {
  const el = document.getElementById('char-skills');
  if (!el || !G.vocation) return;
  const voc = VOC_TRAINING[G.vocation];
  const isMage = voc && voc.attackSkill === 'magic';
  const weaponSkillId = voc && !isMage ? getEquippedWeaponSkillId() : null;
  el.innerHTML = Object.entries(TIBIA_SKILLS).map(([id, s]) => {
    const sk = G.sk[id];
    const needed = triesForNext(id, sk.lv);
    const pct = Math.min(100, Math.round((sk.tries / needed) * 100));
    const active = (id === 'shielding' && !!G.equipment.shield) ||
      (id === 'magic' && (isMage || voc.magicMult >= 0.35)) ||
      (!isMage && id === weaponSkillId);
    return `<div class="char-skill-chip${active ? ' active' : ''}" title="${s.name}: ${sk.lv} (${pct}%)">
      <span class="char-skill-icon">${skillIconImg(id, s.icon, 'char-skill-icon-img')}</span>
      <span class="char-skill-lv">${sk.lv}</span>
      <span class="char-skill-track"><span class="char-skill-fill" style="width:${pct}%"></span></span>
    </div>`;
  }).join('');
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
  // XP mostra o número atual/próximo E a porcentagem (igual HP/mana mostram números).
  const xpNext = XP_TABLE[G.level - 1];
  document.getElementById('xp-text').textContent = (G.level < 100 && xpNext)
    ? `${formatNum(G.xp)}/${formatNum(xpNext)} · ${xpPct}%`
    : 'MAX';
  renderPlayerBattleSide();
}

export function renderHeaderStats() {
  document.getElementById('hdr-level').textContent = G.level;
  document.getElementById('hdr-gold').textContent = formatNum(G.gold);
  document.getElementById('hdr-rubini').textContent = formatNum(G.rubini);
  const huntPill = document.getElementById('hdr-hunt-status');
  const staminaPill = document.getElementById('hdr-stamina');
  if (G.vocation) {
    document.getElementById('hdr-hp').textContent = `${G.hp}/${getMaxHp()}`;
    document.getElementById('hdr-mana').textContent = `${G.mana}/${getMaxMana()}`;
    // Status de caçada + Stamina: moraram no Analisador de Caçada (só visível
    // na aba Caçada); agora ficam no header, visíveis em qualquer aba.
    const st = getHuntStats();
    huntPill.style.display = 'inline-block';
    huntPill.className = `stat-pill hunt-status-pill ${st.hunting ? 'on' : 'off'}`;
    huntPill.textContent = `${st.hunting ? '🟢 Caçando' : '⏸ Parado'} · ${fmtDuration(st.elapsedMs)}`;
    if (isStaminaEnabled()) {
      staminaPill.style.display = 'inline-block';
      staminaPill.className = `stat-pill stamina-pill tier-${staminaTier(G.stamina)}`;
      staminaPill.textContent = `🔋 Stamina ${formatStamina(G.stamina)} · XP ×${staminaXpMult(G.stamina)}`;
    } else {
      staminaPill.style.display = 'none';
    }
  } else {
    huntPill.style.display = 'none';
    staminaPill.style.display = 'none';
  }
}

// Espelha o lado do monstro (huntPanel.renderMonsterDisplay): mesmo tratamento
// de troca de sprite só quando muda, hit-flash e estado "morto" — sem recriar
// a <img> a cada tick (senão o sprite nunca termina de carregar).
export function renderPlayerBattleSide(hit = false, attacking = false, healing = false) {
  const wrap = document.getElementById('player-sprite-wrap');
  if (!wrap) return;

  if (!G.vocation) {
    wrap.dataset.walk = 'none';
    wrap.innerHTML = '<span class="player-sprite-fallback">🧑</span>';
    wrap.classList.remove('dead', 'hit', 'attacking', 'healing');
    document.getElementById('player-battle-name').textContent = '—';
    document.getElementById('player-hp-fill').style.width = '0%';
    document.getElementById('player-hp-label').textContent = '--/--';
    document.getElementById('player-mana-fill').style.width = '0%';
    document.getElementById('player-mana-label').textContent = '--/--';
    document.getElementById('player-xp-fill').style.width = '0%';
    document.getElementById('player-xp-label').textContent = '-- XP';
    return;
  }

  mountPlayerWalkSprite(wrap);
  if (hit) { wrap.classList.remove('hit'); void wrap.offsetWidth; wrap.classList.add('hit'); }
  if (attacking) { wrap.classList.remove('attacking'); void wrap.offsetWidth; wrap.classList.add('attacking'); }
  if (healing) { wrap.classList.remove('healing'); void wrap.offsetWidth; wrap.classList.add('healing'); }
  wrap.classList.toggle('dead', G.hp <= 0);

  const maxHp = getMaxHp();
  const pct = Math.max(0, Math.round((G.hp / maxHp) * 100));
  document.getElementById('player-battle-name').textContent = `${VOCATIONS[G.vocation].name} — Lv ${G.level}`;
  const hpFill = document.getElementById('player-hp-fill');
  hpFill.style.width = pct + '%';
  applyHpState(hpFill, pct);
  document.getElementById('player-hp-label').textContent = `${Math.max(0, G.hp)}/${maxHp}`;

  // Mana e XP na janela de batalha (mesmas contas da barra de status do char).
  const maxMana = getMaxMana();
  const manaPct = Math.max(0, Math.round((G.mana / maxMana) * 100));
  document.getElementById('player-mana-fill').style.width = manaPct + '%';
  document.getElementById('player-mana-label').textContent = `${Math.max(0, G.mana)}/${maxMana}`;
  const xpNext = XP_TABLE[G.level - 1];
  const xpPct = (G.level < 100 && xpNext) ? Math.max(0, Math.round((G.xp / xpNext) * 100)) : 100;
  document.getElementById('player-xp-fill').style.width = xpPct + '%';
  document.getElementById('player-xp-label').textContent = (G.level < 100 && xpNext) ? `${G.xp}/${xpNext} XP` : 'MAX';
}

export function wireCharacterPanelEvents() {
  on(EVENTS.CHAR_PANEL, renderCharPanel);
  on(EVENTS.CHAR_INFO, renderCharInfo);
  on(EVENTS.BARS, renderBars);
  on(EVENTS.HEADER_STATS, renderHeaderStats);
  on(EVENTS.PLAYER_BATTLE_SIDE, ({ hit, attacking, healing } = {}) => renderPlayerBattleSide(hit, attacking, healing));
}
