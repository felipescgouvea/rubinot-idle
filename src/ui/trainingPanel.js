// Seções de Treino — Online (dummy "ativo", exige o jogo aberto, rende mais
// rápido) e Offline (Exercise clássico, roda até fechado) — renderizadas na
// aba Training. Ver application/trainingUseCases.js pras regras.
import { G } from '../application/gameStore.js?v=156';
import { TIBIA_SKILLS } from '../domain/character.js?v=183';
import { TRAINABLE_SKILLS, ONLINE_RATE_MULTIPLIER, onlineTrainableSkills, triesPerMinuteFor } from '../domain/training.js?v=154';
import { SPELLS } from '../domain/spells.js?v=154';
import { on, EVENTS } from '../shared/eventBus.js?v=154';
import { skillIconImg, spellIconImg, trainingDummyImg } from './shared.js?v=159';
import { startTraining, stopTraining, startOnlineTraining } from '../application/trainingUseCases.js?v=160';
import { t } from '../i18n/i18n.js?v=170';

// Magia escolhida no picker do treino online de mago, antes de confirmar
// (estado só de UI — só vira G.trainingSpell quando o treino começa de fato).
let pickedTrainingSpell = null;

function activeTrainingCard(mode) {
  const s = TIBIA_SKILLS[G.trainingSkill];
  const rate = triesPerMinuteFor(G.trainingSkill) * (mode === 'online' ? ONLINE_RATE_MULTIPLIER : 1);
  const spell = mode === 'online' && G.trainingSpell ? SPELLS[G.trainingSpell] : null;
  return `
    <div class="training-active">
      <div class="training-active-info">
        <div class="training-dummy-wrap">
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

  const skills = onlineTrainableSkills(G.vocation);
  if (skills.length === 1 && skills[0] !== 'magic') {
    // Paladin: só Distance — o dummy já é o próprio conteúdo, sem escolha.
    const id = skills[0];
    const s = TIBIA_SKILLS[id];
    el.innerHTML = `
      <p class="muted">${t('training.onlineIntroFixed', { skill: s.name })}</p>
      <div class="training-skill-grid">
        <button class="training-skill-btn" onclick="startOnlineTraining('${id}')" title="${t('training.dummyTitle', { skill: s.name })}">
          <div class="training-dummy-wrap">
            ${trainingDummyImg('training-dummy-icon')}
            ${skillIconImg(id, s.icon, 'training-dummy-badge')}
          </div>
          <span>${s.name}</span>
          <small>${t('training.level', { lvl: G.sk[id]?.lv ?? s.base })}</small>
        </button>
      </div>`;
    return;
  }

  if (skills[0] === 'magic') {
    // Sorcerer/Druid: escolher a magia de ataque usada no dummy antes de iniciar.
    const attackSpells = Object.entries(SPELLS).filter(([, sp]) => sp.type === 'attack' && sp.voc.includes(G.vocation));
    el.innerHTML = `
      <p class="muted">${t('training.onlineIntroMage')}</p>
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
      </button>`;
    return;
  }

  // Knight: escolher qual skill de melee (sword/axe/club) treinar.
  el.innerHTML = `
    <p class="muted">${t('training.onlineIntro')}</p>
    <div class="training-skill-grid">
      ${skills.map(id => {
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
    </div>`;
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
