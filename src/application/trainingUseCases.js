// Treino de skill (Offline Training / Exercise do Tibia). Enquanto um treino
// está ativo, o personagem não caça: acumula tentativas da skill escolhida com
// o tempo, inclusive offline. Ver domain/training.js pras regras puras.
//
// Mutex com a caçada sem import circular: startTraining chama stopHunt
// (training -> hunt, uma direção só); o caminho inverso usa o event bus —
// quando a caçada começa, HUNT_BUTTON{hunting:true} dispara e o treino se
// desliga sozinho (ver o on() no fim do arquivo).
import { G } from './gameStore.js?v=105';
import { TRAINABLE_SKILLS, TRAINING_MAX_OFFLINE_SEC, triesForTraining } from '../domain/training.js?v=105';
import { TIBIA_SKILLS } from '../domain/character.js?v=105';
import { emit, on, EVENTS } from '../shared/eventBus.js?v=105';
import { trainSkill } from './skillUseCases.js?v=105';
import { stopHunt } from './huntUseCases.js?v=105';
import { saveGame } from './saveGameUseCase.js?v=105';

let trainingInterval = null;

// Credita as tentativas acumuladas desde o último "âncora" (trainingSince) e
// reancoragem em agora. Usada tanto pelo tick online quanto na retomada
// offline (o âncora salvo carrega o tempo em que o jogo ficou fechado).
export function accrueTraining({ offline = false } = {}) {
  if (!G.trainingSkill || !G.trainingSince) return 0;
  const now = Date.now();
  let elapsedSec = Math.floor((now - G.trainingSince) / 1000);
  if (elapsedSec <= 0) return 0;
  if (offline) elapsedSec = Math.min(elapsedSec, TRAINING_MAX_OFFLINE_SEC);
  const tries = triesForTraining(G.trainingSkill, elapsedSec);
  if (tries > 0) trainSkill(G.trainingSkill, tries);
  G.trainingSince = now;
  return tries;
}

function startTrainingLoop() {
  if (trainingInterval) clearInterval(trainingInterval);
  // tick a cada 3s só pra o progresso aparecer vivo na tela; o cálculo é por
  // tempo decorrido, então a frequência do tick não muda o total ganho.
  trainingInterval = setInterval(() => {
    accrueTraining();
    emit(EVENTS.TRAINING_PANEL);
  }, 3000);
}

function stopTrainingLoop() {
  if (trainingInterval) { clearInterval(trainingInterval); trainingInterval = null; }
}

export function startTraining(skillId) {
  if (!G.vocation) { emit(EVENTS.NOTIFY, { msg: 'Escolha uma vocação primeiro!', type: 'error' }); return; }
  if (!TRAINABLE_SKILLS.includes(skillId)) return;
  stopHunt(); // treino e caçada são mutuamente exclusivos
  G.trainingSkill = skillId;
  G.trainingSince = Date.now();
  startTrainingLoop();
  emit(EVENTS.NOTIFY, { msg: `🏋️ Treinando ${TIBIA_SKILLS[skillId].name}. Volte depois pra colher o progresso!`, type: 'success' });
  emit(EVENTS.TRAINING_PANEL);
  saveGame();
}

export function stopTraining() {
  if (!G.trainingSkill) return;
  accrueTraining();
  stopTrainingLoop();
  const skillId = G.trainingSkill;
  G.trainingSkill = null;
  G.trainingSince = null;
  emit(EVENTS.NOTIFY, { msg: `Treino de ${TIBIA_SKILLS[skillId].name} encerrado.`, type: 'success' });
  emit(EVENTS.TRAINING_PANEL);
  saveGame();
}

// Chamada na inicialização (main.js): se o save trazia um treino ativo,
// credita o tempo offline e religa o tick.
export function resumeTrainingOnLoad() {
  if (!G.trainingSkill || !G.trainingSince) return;
  const tries = accrueTraining({ offline: true });
  if (tries > 0) {
    const s = TIBIA_SKILLS[G.trainingSkill];
    emit(EVENTS.NOTIFY, { msg: `🏋️ Treino offline: +${tries} tentativas de ${s ? s.name : G.trainingSkill}.`, type: 'success' });
  }
  startTrainingLoop();
}

export function isTraining() {
  return !!G.trainingSkill;
}

// Auto-desliga o treino quando uma caçada começa (ver comentário do topo).
on(EVENTS.HUNT_BUTTON, ({ hunting } = {}) => {
  if (hunting && G.trainingSkill) {
    accrueTraining();
    stopTrainingLoop();
    G.trainingSkill = null;
    G.trainingSince = null;
    emit(EVENTS.TRAINING_PANEL);
  }
});
