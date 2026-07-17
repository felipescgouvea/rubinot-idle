// Treino de skill (Offline Training / Exercise do Tibia). Enquanto um treino
// está ativo, o personagem não caça: acumula tentativas da skill escolhida com
// o tempo, inclusive offline. Ver domain/training.js pras regras puras.
//
// Mutex com a caçada sem import circular: startTraining chama stopHunt
// (training -> hunt, uma direção só); o caminho inverso usa o event bus —
// quando a caçada começa, HUNT_BUTTON{hunting:true} dispara e o treino se
// desliga sozinho (ver o on() no fim do arquivo).
import { G } from './gameStore.js?v=129';
import { TRAINABLE_SKILLS, TRAINING_MAX_OFFLINE_SEC, ONLINE_RATE_MULTIPLIER, onlineTrainableSkills, triesForTraining } from '../domain/training.js?v=127';
import { TIBIA_SKILLS } from '../domain/character.js?v=156';
import { SPELLS } from '../domain/spells.js?v=126';
import { emit, on, EVENTS } from '../shared/eventBus.js?v=126';
import { trainSkill } from './skillUseCases.js?v=127';
import { stopHunt } from './huntUseCases.js?v=170';
import { saveGame } from './saveGameUseCase.js?v=129';
import { t } from '../i18n/i18n.js?v=139';

let trainingInterval = null;

// Soma as tentativas ganhas na sessão de treino ATUAL (desde o último
// start*Training) — só de sessão, como huntSession em huntUseCases.js. Sem
// isso, o toast de "treino terminado" só teria o resíduo do último tick de
// 3s, não o progresso real da sessão inteira (bug reportado pelo Felipe: o
// treino online terminava sem mostrar quanto rendeu).
let sessionTries = 0;

// Credita as tentativas acumuladas desde o último "âncora" (trainingSince) e
// reancoragem em agora. Usada tanto pelo tick online quanto na retomada
// offline (o âncora salvo carrega o tempo em que o jogo ficou fechado).
export function accrueTraining({ offline = false } = {}) {
  if (!G.trainingSkill || !G.trainingSince) return 0;
  const now = Date.now();
  let elapsedSec = Math.floor((now - G.trainingSince) / 1000);
  if (elapsedSec <= 0) return 0;
  // Treino Online exige o jogo aberto — tempo que passou com o jogo fechado
  // não conta (só reancora), diferente do Offline que credita normalmente.
  if (offline && G.trainingMode === 'online') { G.trainingSince = now; return 0; }
  if (offline) elapsedSec = Math.min(elapsedSec, TRAINING_MAX_OFFLINE_SEC);
  const multiplier = G.trainingMode === 'online' ? ONLINE_RATE_MULTIPLIER : 1;
  const tries = triesForTraining(G.trainingSkill, elapsedSec, multiplier);
  if (tries > 0) { trainSkill(G.trainingSkill, tries); sessionTries += tries; }
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
  if (!G.vocation) { emit(EVENTS.NOTIFY, { msg: t('training.chooseVocationFirst'), type: 'error' }); return; }
  if (!TRAINABLE_SKILLS.includes(skillId)) return;
  stopHunt(); // treino e caçada são mutuamente exclusivos
  G.trainingSkill = skillId;
  G.trainingSince = Date.now();
  G.trainingMode = 'offline';
  G.trainingSpell = null;
  sessionTries = 0;
  startTrainingLoop();
  emit(EVENTS.NOTIFY, { msg: t('training.startedNotify', { skill: TIBIA_SKILLS[skillId].name }), type: 'success' });
  emit(EVENTS.TRAINING_PANEL);
  saveGame();
}

// Treino Online: exige escolher a skill (dentre as que a vocação treina de
// verdade — ver onlineTrainableSkills) e, pro mago, a magia usada no dummy
// (só cosmético/estado — a matemática de ganho é igual, o que muda é o
// multiplicador e não acumular offline).
export function startOnlineTraining(skillId, spellId = null) {
  if (!G.vocation) { emit(EVENTS.NOTIFY, { msg: t('training.chooseVocationFirst'), type: 'error' }); return; }
  if (!onlineTrainableSkills(G.vocation).includes(skillId)) return;
  if (skillId === 'magic') {
    const spell = spellId ? SPELLS[spellId] : null;
    if (!spell || spell.type !== 'attack' || !spell.voc.includes(G.vocation) || G.level < spell.level) return;
  }
  stopHunt();
  G.trainingSkill = skillId;
  G.trainingSince = Date.now();
  G.trainingMode = 'online';
  G.trainingSpell = skillId === 'magic' ? spellId : null;
  sessionTries = 0;
  startTrainingLoop();
  emit(EVENTS.NOTIFY, { msg: t('training.startedNotify', { skill: TIBIA_SKILLS[skillId].name }), type: 'success' });
  emit(EVENTS.TRAINING_PANEL);
  saveGame();
}

export function stopTraining() {
  if (!G.trainingSkill) return;
  accrueTraining();
  stopTrainingLoop();
  const skillId = G.trainingSkill;
  const tries = sessionTries;
  G.trainingSkill = null;
  G.trainingSince = null;
  G.trainingMode = 'offline';
  G.trainingSpell = null;
  sessionTries = 0;
  const skillName = TIBIA_SKILLS[skillId].name;
  emit(EVENTS.NOTIFY, {
    msg: tries > 0 ? t('training.stoppedNotifyGain', { tries, skill: skillName }) : t('training.stoppedNotify', { skill: skillName }),
    type: 'success',
  });
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
    emit(EVENTS.NOTIFY, { msg: t('training.offlineGain', { tries, skill: s ? s.name : G.trainingSkill }), type: 'success' });
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
    sessionTries = 0;
    emit(EVENTS.TRAINING_PANEL);
  }
});
