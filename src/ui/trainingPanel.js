// Seção de Treino Offline — renderizada no topo da aba Skills. Deixa escolher
// uma skill pra treinar (dummies): enquanto o treino roda, o personagem não
// caça, mas acumula tentativas da skill mesmo offline (ver
// application/trainingUseCases.js).
import { G } from '../application/gameStore.js?v=84';
import { TIBIA_SKILLS } from '../domain/character.js?v=84';
import { TRAINABLE_SKILLS, triesPerMinuteFor } from '../domain/training.js?v=84';
import { on, EVENTS } from '../shared/eventBus.js?v=84';
import { skillIconImg } from './shared.js?v=84';
import { startTraining, stopTraining } from '../application/trainingUseCases.js?v=84';

export function renderTrainingSection() {
  const el = document.getElementById('training-body');
  if (!el) return;
  if (!G.vocation) { el.innerHTML = '<p class="muted">Escolha uma vocação para treinar.</p>'; return; }

  if (G.trainingSkill) {
    const s = TIBIA_SKILLS[G.trainingSkill];
    const rate = triesPerMinuteFor(G.trainingSkill);
    el.innerHTML = `
      <div class="training-active">
        <div class="training-active-info">
          ${skillIconImg(G.trainingSkill, s.icon, 'training-skill-icon')}
          <div>
            <div class="training-active-title">🏋️ Treinando ${s.name}</div>
            <div class="muted">+${rate} tentativas/min · continua enquanto você está fora (até 8h). Iniciar uma caçada encerra o treino.</div>
          </div>
        </div>
        <button class="btn-small danger" onclick="stopTraining()">⏹ Encerrar Treino</button>
      </div>`;
    return;
  }

  el.innerHTML = `
    <p class="muted">Escolha uma skill para treinar nas dummies. O treino roda em segundo plano (inclusive offline) e pausa a caçada.</p>
    <div class="training-skill-grid">
      ${TRAINABLE_SKILLS.map(id => {
        const s = TIBIA_SKILLS[id];
        return `<button class="training-skill-btn" onclick="startTraining('${id}')">
          ${skillIconImg(id, s.icon, 'training-skill-icon')}
          <span>${s.name}</span>
          <small>Nv ${G.sk[id]?.lv ?? s.base}</small>
        </button>`;
      }).join('')}
    </div>`;
}

export function wireTrainingPanelEvents() {
  on(EVENTS.TRAINING_PANEL, renderTrainingSection);
}
