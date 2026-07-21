// Seções de Treino — Online (dummy "ativo", exige o jogo aberto, rende mais
// rápido) e Offline (Exercise clássico, roda até fechado) — renderizadas na
// aba Training. Ver application/trainingUseCases.js pras regras.
import { G } from '../application/gameStore.js?v=170';
import { TIBIA_SKILLS } from '../domain/character.js?v=197';
import { TRAINABLE_SKILLS, ONLINE_RATE_MULTIPLIER, onlineTrainableSkills, triesPerMinuteFor } from '../domain/training.js?v=168';
import { SPELLS } from '../domain/spells.js?v=168';
import { on, EVENTS } from '../shared/eventBus.js?v=168';
import { skillIconImg, spellIconImg, trainingDummyImg } from './shared.js?v=173';
import { startTraining, stopTraining, startOnlineTraining } from '../application/trainingUseCases.js?v=174';
import { t } from '../i18n/i18n.js?v=184';
import { ITEMS } from '../domain/items.js?v=181';
import { missileSpriteFile, spriteUrl } from '../infrastructure/tibiaSprites.js?v=171';

// Magia escolhida no picker do treino online de mago, antes de confirmar
// (estado só de UI — só vira G.trainingSpell quando o treino começa de fato).
let pickedTrainingSpell = null;

// Projétil que voa até o boneco durante o treino ONLINE, pra a cena não ser um
// ícone parado: flecha pro Distance, virote pra quem usa crossbow, e o míssil
// do elemento da magia escolhida pro Magic Level. Melee não tem projétil — o
// baque no boneco (classe .training-hit) já conta a história.
function trainingProjectileHtml(mode, spell) {
  if (mode !== 'online') return '';
  let missile = null;
  if (G.trainingSkill === 'distance') {
    // virote se a arma equipada for crossbow; flecha no resto
    const arma = G.equipment && G.equipment.weapon ? ITEMS[G.equipment.weapon] : null;
    missile = arma && /crossbow/i.test(arma.name || '') ? 'bolt' : 'arrow';
  } else if (G.trainingSkill === 'magic') {
    // 'physical' não tem míssil próprio: as magias físicas do Paladino são de
    // arremesso (Ethereal Spear), então a lança é o projétil certo.
    const el = (spell && spell.element) || 'energy';
    missile = el === 'physical' ? 'spear' : el;
  }
  const file = missile ? missileSpriteFile(missile) : null;
  if (!file) return '';
  return `<img class="training-projectile" src="${spriteUrl(file)}" alt="" aria-hidden="true" />`;
}

function activeTrainingCard(mode) {
  const s = TIBIA_SKILLS[G.trainingSkill];
  const rate = triesPerMinuteFor(G.trainingSkill) * (mode === 'online' ? ONLINE_RATE_MULTIPLIER : 1);
  const spell = mode === 'online' && G.trainingSpell ? SPELLS[G.trainingSpell] : null;
  const projetil = trainingProjectileHtml(mode, spell);
  return `
    <div class="training-active">
      <div class="training-active-info">
        <div class="training-dummy-wrap ${mode === 'online' ? 'training-online-anim' : ''}">
          ${projetil}
          ${trainingDummyImg('training-dummy-icon')}
          ${spell ? spellIconImg(spell.name, spell.icon, 'training-dummy-badge') : skillIconImg(G.trainingSkill, s.icon, 'training-dummy-badge')}
        </div>
        <div>
          <div class="training-active-title">${mode === 'online' ? '⚔️' : '🏋️'} ${t('training.trainingSkill', { skill: s.name })}</div>
          ${spell ? `<div class="muted">${t('training.usingSpell', { spell: spell.name })}</div>` : ''}
          <div class="muted">${t(mode === 'online' ? 'training.rateInfoOnline' : 'training.rateInfo', { rate })}</div>
          ${mode === 'online' ? `<div class="muted training-online-hint">${t('training.onlineMustStayOpen')}</div>` : ''}
        </div>
      </div>
      <button class="btn-small danger" onclick="stopTraining()">⏹ ${t('training.stopTraining')}</button>
    </div>`;
}

function renderOnlineTrainingSection() {
  const el = document.getElementById('online-training-body');
  if (!el) return;
  if (!G.vocation) { el.innerHTML = `<p class="muted">${t('training.chooseVocation')}</p>`; return; }

  if (G.trainingSkill && G.trainingMode === 'online') {
    el.innerHTML = activeTrainingCard('online');
    return;
  }
  if (G.trainingSkill && G.trainingMode !== 'online') {
    el.innerHTML = `<p class="muted">${t('training.onlineBlockedByOffline')}</p>`;
    return;
  }

  // Uma vocação pode treinar skill de ARMA e Magic Level ao mesmo tempo (é o
  // caso do Paladino). Por isso as duas partes são montadas de forma
  // independente, em vez de um if/else por vocação: quem só tem arma vê só a
  // grade de skills (Knight), quem só tem magia vê só o seletor de magia
  // (Sorcerer/Druid), e o Paladino vê os dois.
  const skills = onlineTrainableSkills(G.vocation);
  const skillsDeArma = skills.filter(id => id !== 'magic');
  const temMagia = skills.includes('magic');

  const gradeDeArmas = skillsDeArma.length ? `
    <div class="training-skill-grid">
      ${skillsDeArma.map(id => {
        const s = TIBIA_SKILLS[id];
        return `<button class="training-skill-btn" onclick="startOnlineTraining('${id}')" title="${t('training.dummyTitle', { skill: s.name })}">
          <div class="training-dummy-wrap">
            ${trainingDummyImg('training-dummy-icon')}
            ${skillIconImg(id, s.icon, 'training-dummy-badge')}
          </div>
          <span>${s.name}</span>
          <small>${t('training.level', { lvl: G.sk[id]?.lv ?? s.base })}</small>
        </button>`;
      }).join('')}
    </div>` : '';

  // Magic Level exige escolher ANTES qual magia de ataque vai ser lançada no
  // dummy — é ela que aparece na animação e define o elemento do golpe.
  const attackSpells = temMagia
    ? Object.entries(SPELLS).filter(([, sp]) => sp.type === 'attack' && sp.voc.includes(G.vocation))
    : [];
  // O cabeçalho + explicação da magia só aparecem quando há TAMBÉM skill de
  // arma na tela (Paladino) — pro mago puro a intro geral já diz isso, e
  // repetir o mesmo parágrafo duas vezes ficaria redundante.
  const blocoDeMagia = temMagia ? `
    ${skillsDeArma.length ? `
      <h4 class="training-subhead">${skillIconImg('magic', '🔮', 'training-subhead-icon')} ${TIBIA_SKILLS.magic.name} — ${t('training.level', { lvl: G.sk.magic?.lv ?? TIBIA_SKILLS.magic.base })}</h4>
      <p class="muted">${t('training.onlineIntroMage')}</p>` : ''}
    <div class="training-spell-grid">
      ${attackSpells.map(([id, sp]) => {
        const unlocked = G.level >= sp.level;
        const selected = pickedTrainingSpell === id;
        return `<button class="training-spell-btn ${selected ? 'selected' : ''}" ${!unlocked ? 'disabled' : ''} onclick="pickTrainingSpell('${id}')" title="${sp.name}">
          ${spellIconImg(sp.name, sp.icon, 'training-dummy-badge')}
          <span>${sp.name}</span>
          ${!unlocked ? `<small>🔒 Lv ${sp.level}</small>` : ''}
        </button>`;
      }).join('')}
    </div>
    <button class="task-btn" style="margin-top:10px" onclick="startOnlineTraining('magic', pickedTrainingSpellId())" ${!pickedTrainingSpell ? 'disabled' : ''}>
      ⚔️ ${t('training.startOnlineTraining')}
    </button>` : '';

  const intro = skillsDeArma.length === 1 && !temMagia
    ? t('training.onlineIntroFixed', { skill: TIBIA_SKILLS[skillsDeArma[0]].name })
    : skillsDeArma.length ? t('training.onlineIntro') : t('training.onlineIntroMage');

  el.innerHTML = `
    <p class="muted">${intro}</p>
    ${gradeDeArmas}
    ${blocoDeMagia}`;
}

export function pickTrainingSpell(spellId) {
  pickedTrainingSpell = pickedTrainingSpell === spellId ? null : spellId;
  renderOnlineTrainingSection();
}

export function pickedTrainingSpellId() {
  return pickedTrainingSpell;
}

export function renderTrainingSection() {
  renderOnlineTrainingSection();

  const el = document.getElementById('training-body');
  if (!el) return;
  if (!G.vocation) { el.innerHTML = `<p class="muted">${t('training.chooseVocation')}</p>`; return; }

  if (G.trainingSkill && G.trainingMode === 'online') {
    el.innerHTML = `<p class="muted">${t('training.offlineBlockedByOnline')}</p>`;
    return;
  }
  if (G.trainingSkill) {
    el.innerHTML = activeTrainingCard('offline');
    return;
  }

  el.innerHTML = `
    <p class="muted">${t('training.intro')}</p>
    <div class="training-skill-grid">
      ${TRAINABLE_SKILLS.map(id => {
        const s = TIBIA_SKILLS[id];
        return `<button class="training-skill-btn" onclick="startTraining('${id}')" title="${t('training.dummyTitle', { skill: s.name })}">
          <div class="training-dummy-wrap">
            ${trainingDummyImg('training-dummy-icon')}
            ${skillIconImg(id, s.icon, 'training-dummy-badge')}
          </div>
          <span>${s.name}</span>
          <small>${t('training.level', { lvl: G.sk[id]?.lv ?? s.base })}</small>
        </button>`;
      }).join('')}
    </div>`;
}

export function wireTrainingPanelEvents() {
  on(EVENTS.TRAINING_PANEL, renderTrainingSection);
}
