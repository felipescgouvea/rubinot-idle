// Painel do personagem: seleção de vocação, barras de HP/MP/XP, atributos e
// o retrato do jogador no card de Batalha (com sprite real + fallback).
import { G } from '../application/gameStore.js?v=296';
import { VOCATIONS, XP_TABLE, MAX_LEVEL, TIBIA_SKILLS, VOC_TRAINING, MANA_MULTIPLIER, triesForNext, PROMOTION, vocationDisplayName } from '../domain/character.js?v=323';
import { getEquippedWeaponSkillId } from '../application/stats.js?v=293';
import { skillIconImg, itemIconImg } from './shared.js?v=299';
import { VOCATION_DEFAULT_OUTFIT } from '../domain/outfits.js?v=292';
import { renderOutfitToCanvas } from '../infrastructure/outfitRenderer.js?v=292';
import { outfitWalkAtlasPath } from '../infrastructure/outfitAssets.js?v=292';
import { buildWalkFrames } from '../infrastructure/outfitWalkRenderer.js?v=292';
import { getAtk, getDef, getSpd, getMagic, getMaxHp, getMaxMana } from '../application/stats.js?v=293';
import { on, emit, EVENTS } from '../shared/eventBus.js?v=294';
import { formatNum, applyHpState } from './shared.js?v=299';
import { renderZonePicker, fmtDuration } from './huntPanel.js?v=313';
import { getCurrentMonster, getHuntStats } from '../application/huntUseCases.js?v=360';
import { isStaminaEnabled } from '../application/adminUseCases.js?v=297';
import { formatStamina, staminaXpMult, staminaTier } from '../domain/stamina.js?v=292';
import { selectVocation } from '../application/characterUseCases.js?v=297';
import { registerPlayerName } from '../application/highscoresUseCases.js?v=297';
import { t } from '../i18n/i18n.js?v=312';
import { stageWalkPhase, isStageWalking } from './stageWalk.js?v=133';

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
  // Valida COMPRIMENTO **e** charset ANTES de setar a vocação: selectVocation
  // fecha o overlay de criação pra sempre, então se o nome fosse rejeitado só
  // depois (registerPlayerName valida charset), o personagem ficava criado e
  // SEM nome, sem como corrigir (bug da auditoria). Mesmo charset do ranking.
  if (name.length < 3 || name.length > 20) {
    emit(EVENTS.NOTIFY, { msg: t('character.nameRequired'), type: 'error' });
    input?.focus();
    return;
  }
  if (!/^[A-Za-zÀ-ÿ0-9 ]+$/.test(name)) {
    emit(EVENTS.NOTIFY, { msg: t('character.nameInvalid'), type: 'error' });
    input?.focus();
    return;
  }
  selectVocation(voc);
  await registerPlayerName(name);
}

function playerFallbackIcon() {
  return G.vocation ? VOCATIONS[G.vocation].icon : '🧑';
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
    } else if (ok) {
      centerSpriteInCanvas(canvas);
    }
  });
}

// O sprite do outfit não fica centrado no canvas 64x64 (cada outfit desenha o
// boneco num canto diferente, com margem transparente), então o portrait do
// rail parecia "descentralizado". Aqui medimos a caixa dos pixels visíveis e
// deslocamos o canvas pra que o CENTRO do boneco caia no centro do tile —
// funciona pra qualquer outfit, sem número mágico por sprite.
function centerSpriteInCanvas(canvas) {
  try {
    const w = canvas.width, h = canvas.height;
    const d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = 0, maxY = 0, any = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 20) { any = true; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      }
    }
    if (!any) return;
    const dx = (w / 2 - (minX + maxX) / 2) / w * 100;
    const dy = (h / 2 - (minY + maxY) / 2) / h * 100;
    canvas.style.transform = `translate(${dx.toFixed(1)}%, ${dy.toFixed(1)}%)`;
  } catch { /* canvas não legível: deixa como está */ }
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
    //
    // O quadro NÃO vem mais de um timer próprio: vem da FASE da passada em
    // ui/stageWalk.js, a mesma que desloca o cenário. Assim a perna e o chão
    // andam juntos e, quando o monstro brota, os dois terminam a passada em vez
    // de cortar no meio (o boneco ficava com a perna no ar).
    draw(walkIdle);
    walkTimer = setInterval(() => {
      if (isStageWalking() && walkFrames.length > 1) {
        const idx = Math.floor(stageWalkPhase() * walkFrames.length) % walkFrames.length;
        if (idx !== walkIdx) { walkIdx = idx; draw(walkFrames[walkIdx]); }
      } else if (walkIdx !== 0) {
        walkIdx = 0;
        draw(walkIdle);
      }
    }, 60);
  });
}

export function renderCharPanel() {
  const vocSel = document.getElementById('vocation-select');
  const charCard = document.getElementById('char-card');
  const charInfo = document.getElementById('char-info');
  // A criação vive num MODAL sobre a tela desfocada (ver index.html:
  // #char-create-overlay). Quem manda na visibilidade é o overlay; o cartão
  // dentro dele fica sempre visível. Antes o cartão era um painel solto no meio
  // da aba Hunt e o jogador novo não sabia por onde começar.
  const overlay = document.getElementById('char-create-overlay');
  if (G.vocation) {
    if (overlay) overlay.style.display = 'none';
    charInfo.style.display = 'flex';
    renderCharInfo();
    renderZonePicker();
  } else {
    if (overlay) overlay.style.display = 'flex';
    if (charCard) charCard.style.display = 'block';
    vocSel.style.display = 'grid';
    charInfo.style.display = 'none';
    // Foco no nome: é o primeiro passo, e sem isto o jogador clica num set
    // antes de digitar e leva um erro de validação sem entender por quê.
    document.getElementById('char-name-input')?.focus();
  }
}

function renderCharInfo() {
  if (!G.vocation) return;
  const v = VOCATIONS[G.vocation];
  mountPlayerPortrait(document.getElementById('char-voc-icon'), 'char-voc-big');
  document.getElementById('char-name-display').textContent = G.playerName || '';
  // Vocação (título de elite se promovido) + título de achievement escolhido.
  document.getElementById('char-voc-name').textContent = vocationDisplayName(G.vocation, G.promoted) + (G.title ? `, ${G.title}` : '');
  // Botão Promover: some quando já promovido; senão mostra custo/requisito.
  const promoBtn = document.getElementById('promote-btn');
  if (promoBtn) {
    if (G.promoted) {
      promoBtn.style.display = 'none';
    } else {
      promoBtn.style.display = 'inline-block';
      const canPromote = G.level >= PROMOTION.level && G.gold >= PROMOTION.cost;
      promoBtn.textContent = `⭐ ${PROMOTION.names[G.vocation]} (${(PROMOTION.cost / 1000)}k)`;
      promoBtn.disabled = !canPromote;
      promoBtn.title = G.level < PROMOTION.level
        ? t('character.promoteReqLevel', { level: PROMOTION.level })
        : (G.gold < PROMOTION.cost ? t('character.promoteReqGold', { gold: PROMOTION.cost.toLocaleString() }) : t('character.promoteEffect'));
    }
  }
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
function renderCharSkills() {
  const el = document.getElementById('char-skills');
  if (!el || !G.vocation) return;
  const voc = VOC_TRAINING[G.vocation];
  const isMage = voc && voc.attackSkill === 'magic';
  const weaponSkillId = voc && !isMage ? getEquippedWeaponSkillId() : null;
  el.innerHTML = Object.entries(TIBIA_SKILLS).map(([id, s]) => {
    const sk = (G.sk && G.sk[id]) || { lv: s.base, tries: 0 };
    const needed = triesForNext(G.vocation, id, sk.lv);
    const pct = Math.min(100, Math.round((sk.tries / needed) * 100));
    const active = (id === 'shielding' && !!G.equipment.shield) ||
      (id === 'magic' && (isMage || MANA_MULTIPLIER[G.vocation] <= 1.4)) ||
      (!isMage && id === weaponSkillId);
    return `<div class="char-skill-chip${active ? ' active' : ''}" title="${s.name}: ${sk.lv} (${pct}%)">
      <span class="char-skill-icon">${skillIconImg(id, s.icon, 'char-skill-icon-img')}</span>
      <span class="char-skill-lv">${sk.lv}</span>
      <span class="char-skill-track"><span class="char-skill-fill" style="width:${pct}%"></span></span>
    </div>`;
  }).join('');
}

function renderBars() {
  if (!G.vocation) return;
  const maxHp = getMaxHp(), maxMana = getMaxMana();
  const hpPct = Math.round((G.hp / maxHp) * 100);
  const manaPct = Math.round((G.mana / maxMana) * 100);
  // clamp em 100: um personagem que ficou no antigo cap 100 acumulou XP não
  // convertida; até o 1º reconcile do servidor (que agora sobe o nível) o G.xp
  // pode passar de um nível inteiro e estourar a barra além de 100%.
  const xpPct = G.level < MAX_LEVEL ? Math.min(100, Math.round((G.xp / XP_TABLE[G.level - 1]) * 100)) : 100;

  const hpBar = document.getElementById('hp-bar');
  hpBar.style.width = hpPct + '%';
  applyHpState(hpBar, hpPct);
  document.getElementById('mana-bar').style.width = manaPct + '%';
  document.getElementById('xp-bar').style.width = xpPct + '%';
  // Clampa o número exibido ao teto: num frame de level-up o G.hp/G.mana pode
  // ficar 1 tick à frente do maxHp/maxMana recomputado, mostrando "530/500"
  // (barra >100%) por um instante. Cosmético, mas o auditor flagava — nunca
  // exibe atual > teto.
  // Math.floor: HP/mana são inteiros no Tibia, mas a regen passiva acumula
  // frações em G.hp/G.mana (ver huntUseCases: startRegen) — sem o piso, a tela
  // mostrava "39.4575/110" (bug pego no probe de morte).
  document.getElementById('hp-text').textContent = `${Math.floor(Math.min(G.hp, maxHp))}/${maxHp}`;
  document.getElementById('mana-text').textContent = `${Math.floor(Math.min(G.mana, maxMana))}/${maxMana}`;
  // XP mostra o número atual/próximo E a porcentagem (igual HP/mana mostram números).
  const xpNext = XP_TABLE[G.level - 1];
  document.getElementById('xp-text').textContent = (G.level < MAX_LEVEL && xpNext)
    ? t('character.xpFractionPct', { xp: formatNum(G.xp), xpNext: formatNum(xpNext), pct: xpPct })
    : t('character.max');
  renderPlayerBattleSide();
}

// Null-safe: os campos de recurso/status agora vivem no PAINEL LATERAL (rail),
// e alguns pills antigos do header (Lv/HP/mana) saíram porque o rail já mostra
// isso em barra. Cada set() ignora o que não existir, então mover/remover um
// elemento no HTML nunca quebra a atualização.
function renderHeaderStats() {
  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  set('hdr-level', G.level);
  set('hdr-gold', formatNum(G.gold));
  set('hdr-rubini', formatNum(G.rubini));
  const huntPill = document.getElementById('hdr-hunt-status');
  const staminaPill = document.getElementById('hdr-stamina');
  if (G.vocation) {
    set('hdr-hp', `${Math.floor(G.hp)}/${getMaxHp()}`);
    set('hdr-mana', `${Math.floor(G.mana)}/${getMaxMana()}`);
    const st = getHuntStats();
    if (huntPill) {
      huntPill.style.display = 'inline-block';
      huntPill.className = `stat-pill hunt-status-pill ${st.hunting ? 'on' : 'off'}`;
      huntPill.textContent = `${st.hunting ? `🟢 ${t('character.hunting')}` : `⏸ ${t('character.stopped')}`} · ${fmtDuration(st.huntDurationMs)}`;
    }
    if (staminaPill) {
      if (isStaminaEnabled()) {
        staminaPill.style.display = 'inline-block';
        staminaPill.className = `stat-pill stamina-pill tier-${staminaTier(G.stamina)}`;
        staminaPill.textContent = `🔋 ${t('character.staminaStatus', { stamina: formatStamina(G.stamina), mult: staminaXpMult(G.stamina) })}`;
      } else {
        staminaPill.style.display = 'none';
      }
    }
  } else {
    if (huntPill) huntPill.style.display = 'none';
    if (staminaPill) staminaPill.style.display = 'none';
  }
}

// Espelha o lado do monstro (huntPanel.renderMonsterDisplay): mesmo tratamento
// de troca de sprite só quando muda, hit-flash e estado "morto" — sem recriar
// a <img> a cada tick (senão o sprite nunca termina de carregar).
// GESTO DE CONJURAR — um pulso de luz da cor do elemento em volta do boneco,
// no instante do cast. Antes o jogador só via o número no log: a magia
// acontecia sem nada acontecer NELE, o que fazia o combate parecer um extrato
// bancário em vez de uma luta.
const COR_ELEMENTO = {
  heal: '#4ade80', fire: '#ff7a3d', ice: '#5fc8ff', energy: '#c78bff',
  earth: '#8fbf5f', death: '#9b7fb5', holy: '#ffe08a', physical: '#d8d8e0',
};

function mostrarGesto(elemento, rotulo) {
  const wrap = document.getElementById('player-sprite-wrap');
  if (!wrap) return;
  const cor = COR_ELEMENTO[elemento] || COR_ELEMENTO.energy;
  const g = document.createElement('span');
  g.className = 'cast-pulse';
  g.style.setProperty('--cast-cor', cor);
  if (rotulo) g.title = rotulo;
  wrap.appendChild(g);
  // Remove no fim da animação em vez de por setTimeout: se a aba estiver em
  // segundo plano a animação não roda e o elemento ficaria pendurado pra sempre.
  g.addEventListener('animationend', () => g.remove(), { once: true });
}

// BEBER POÇÃO — a sprite real da poção sobe e some sobre o personagem. Usa a
// mesma sprite do item, então o jogador reconhece qual poção foi bebida.
function mostrarPocao(itemId, vital) {
  const wrap = document.getElementById('player-sprite-wrap');
  if (!wrap) return;
  const bolha = document.createElement('span');
  bolha.className = 'potion-sip ' + (vital === 'mana' ? 'mana' : 'vida');
  bolha.innerHTML = itemIconImg(itemId, 'potion-sip-img');
  wrap.appendChild(bolha);
  bolha.addEventListener('animationend', () => bolha.remove(), { once: true });
}

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
    document.getElementById('player-xp-label').textContent = t('character.noXp');
    return;
  }

  mountPlayerWalkSprite(wrap);
  if (hit) { wrap.classList.remove('hit'); void wrap.offsetWidth; wrap.classList.add('hit'); }
  if (attacking) { wrap.classList.remove('attacking'); void wrap.offsetWidth; wrap.classList.add('attacking'); }
  if (healing) { wrap.classList.remove('healing'); void wrap.offsetWidth; wrap.classList.add('healing'); }
  wrap.classList.toggle('dead', G.hp <= 0);

  const maxHp = getMaxHp();
  const pct = Math.max(0, Math.round((G.hp / maxHp) * 100));
  document.getElementById('player-battle-name').textContent = t('character.battleNameLevel', { name: VOCATIONS[G.vocation].name, level: G.level });
  const hpFill = document.getElementById('player-hp-fill');
  hpFill.style.width = pct + '%';
  applyHpState(hpFill, pct);
  document.getElementById('player-hp-label').textContent = `${Math.floor(Math.min(Math.max(0, G.hp), maxHp))}/${maxHp}`;

  // Mana e XP na janela de batalha (mesmas contas da barra de status do char).
  const maxMana = getMaxMana();
  const manaPct = Math.max(0, Math.round((G.mana / maxMana) * 100));
  document.getElementById('player-mana-fill').style.width = manaPct + '%';
  document.getElementById('player-mana-label').textContent = `${Math.floor(Math.min(Math.max(0, G.mana), maxMana))}/${maxMana}`;
  const xpNext = XP_TABLE[G.level - 1];
  const xpPct = (G.level < MAX_LEVEL && xpNext) ? Math.min(100, Math.max(0, Math.round((G.xp / xpNext) * 100))) : 100;
  document.getElementById('player-xp-fill').style.width = xpPct + '%';
  document.getElementById('player-xp-label').textContent = (G.level < MAX_LEVEL && xpNext) ? t('character.xpFraction', { xp: G.xp, xpNext }) : t('character.max');
}

export function wireCharacterPanelEvents() {
  on(EVENTS.CHAR_PANEL, renderCharPanel);
  on(EVENTS.CHAR_INFO, renderCharInfo);
  on(EVENTS.BARS, renderBars);
  on(EVENTS.HEADER_STATS, renderHeaderStats);
  on(EVENTS.PLAYER_BATTLE_SIDE, (d = {}) => {
    renderPlayerBattleSide(d.hit, d.attacking, d.healing);
    if (d.cast) mostrarGesto(d.cast.kind === 'heal' ? 'heal' : (d.cast.element || 'energy'), d.cast.label);
    if (d.potion) mostrarPocao(d.potion, d.vital);
  });
}
