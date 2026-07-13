// Seção de Treino Offline — renderizada no topo da aba Skills. Deixa escolher
// uma skill pra treinar (dummies): enquanto o treino roda, o personagem não
// caça, mas acumula tentativas da skill mesmo offline (ver
// application/trainingUseCases.js).
import { G } from '../application/gameStore.js?v=126';
import { TIBIA_SKILLS } from '../domain/character.js?v=126';
import { TRAINABLE_SKILLS, triesPerMinuteFor } from '../domain/training.js?v=125';
import { on, EVENTS } from '../shared/eventBus.js?v=125';
import { skillIconImg } from './shared.js?v=125';
import { startTraining, stopTraining } from '../application/trainingUseCases.js?v=125';
import { t } from '../i18n/i18n.js?v=132';

export function renderTrainingSection() {
  const el = document.getElementById('training-body');
  if (!el) return;
  if (!G.vocation) { el.innerHTML = `<p class="muted">${t('training.chooseVocation')}</p>`; return; }

  if (G.trainingSkill) {
    const s = TIBIA_SKILLS[G.trainingSkill];
    const rate = triesPerMinuteFor(G.trainingSkill);
    el.innerHTML = `
      <div class="training-active">
        <div class="training-active-info">
          ${skillIconImg(G.trainingSkill, s.icon, 'training-skill-icon')}
          <div>
            <div class="training-active-title">🏋️ ${t('training.trainingSkill', { skill: s.name })}</div>
            <div class="muted">${t('training.rateInfo', { rate })}</div>
          </div>
        </div>
        <button class="btn-small danger" onclick="stopTraining()">⏹ ${t('training.stopTraining')}</button>
      </div>`;
    return;
  }

  el.innerHTML = `
    <p class="muted">${t('training.intro')}</p>
    <div class="training-skill-grid">
      ${TRAINABLE_SKILLS.map(id => {
        const s = TIBIA_SKILLS[id];
        return `<button class="training-skill-btn" onclick="startTraining('${id}')">
          ${skillIconImg(id, s.icon, 'training-skill-icon')}
          <span>${s.name}</span>
          <small>${t('training.level', { lvl: G.sk[id]?.lv ?? s.base })}</small>
        </button>`;
      }).join('')}
    </div>`;
}

export function wireTrainingPanelEvents() {
  on(EVENTS.TRAINING_PANEL, renderTrainingSection);
}
