// Treino de skill (Offline Training / Exercise do Tibia). Enquanto um treino
// está ativo, o personagem não caça: acumula skill com o tempo, inclusive
// offline. Ver domain/training.js pras regras puras.
//
// AUTORITATIVO NO SERVIDOR (desde o fix do "treino offline some"): o estado do
// treino (skill/início/modo) vive em player_stats e a skill é creditada em
// player_skills pelo servidor (ver server/src/index.js: /train/*). Antes o
// treino só mexia em G.sk no cliente e o reconcile da caçada (G.sk = res.skills)
// apagava o ganho. Aqui só disparamos os endpoints e espelhamos o G.sk que o
// servidor devolve — a matemática do ganho é 100% do servidor.
//
// Mutex com a caçada sem import circular: startTraining chama stopHunt
// (training -> hunt, uma direção só); o caminho inverso usa o event bus —
// quando a caçada começa, HUNT_BUTTON{hunting:true} dispara e o treino se
// desliga sozinho (ver o on() no fim do arquivo).
import { G, ACCOUNT } from './gameStore.js?v=360';
import { TRAINABLE_SKILLS } from '../domain/training.js?v=358';
import { TIBIA_SKILLS } from '../domain/character.js?v=387';
import { SPELLS } from '../domain/spells.js?v=358';
import { emit, on, EVENTS } from '../shared/eventBus.js?v=358';
import { stopHunt } from './huntUseCases.js?v=424';
import { saveGame } from './saveGameUseCase.js?v=360';
import { trainStartOnServer, trainCreditOnServer, trainStopOnServer, getHuntState } from '../infrastructure/authClient.js?v=368';
import { t } from '../i18n/i18n.js?v=376';

let trainingInterval = null;
let creditBusy = false;
// Tries ganhas na sessão de treino ATUAL (soma o res.tries de cada crédito do
// servidor) — pro toast de "treino terminado".
let sessionTries = 0;

// Aplica o G.sk que o servidor devolveu (autoritativo) e re-renderiza.
function applyServerSkills(skills) {
  if (skills) { G.sk = skills; emit(EVENTS.CHAR_PANEL); emit(EVENTS.TRAINING_PANEL); }
}

// Tick: credita no servidor o tempo aberto e espelha o G.sk devolvido. Evita
// sobreposição de chamadas (creditBusy) — o servidor só reancora quando credita
// de fato (>=1 try), então um tick que rende 0 não perde a fração acumulada.
function startTrainingLoop() {
  if (trainingInterval) clearInterval(trainingInterval);
  trainingInterval = setInterval(async () => {
    if (creditBusy || !G.trainingSkill) return;
    creditBusy = true;
    try {
      const res = await trainCreditOnServer(ACCOUNT.activeSlot, G.vocation, 'live'); // jogo aberto → ritmo acelerado
      if (res.ok && res.active) { applyServerSkills(res.skills); if (res.tries) sessionTries += res.tries; }
      else if (res.ok && !res.active) { stopTrainingLocal(); } // servidor já não está treinando
    } finally { creditBusy = false; }
    emit(EVENTS.TRAINING_PANEL);
  }, 5000);
}

function stopTrainingLoop() {
  if (trainingInterval) { clearInterval(trainingInterval); trainingInterval = null; }
}

// Zera só o estado LOCAL do treino (sem chamar o servidor) — usado quando o
// servidor já reportou que não há treino ativo.
function stopTrainingLocal() {
  stopTrainingLoop();
  G.trainingSkill = null;
  G.trainingSince = null;
  G.trainingMode = null;
  G.trainingSpell = null;
  sessionTries = 0;
  emit(EVENTS.TRAINING_PANEL);
}

// TREINO UNIFICADO (decisão do Felipe): UM só treino, qualquer skill. Ele roda
// acelerado (10x) enquanto o jogo está aberto (o loop credita context 'live') e
// continua no ritmo de descanso (1x, até 8h) enquanto fechado (o resume credita
// 'resume'). Não há mais escolha online/offline. Pro Magic Level, precisa da
// magia usada no dummy (o ML sobe por mana gasta — ataque ou cura da vocação).
export async function startTraining(skillId, spellId = null) {
  if (!G.vocation) { emit(EVENTS.NOTIFY, { msg: t('training.chooseVocationFirst'), type: 'error' }); return; }
  if (!TRAINABLE_SKILLS.includes(skillId)) return;
  if (skillId === 'magic') {
    const spell = spellId ? SPELLS[spellId] : null;
    const treinavel = spell && (spell.type === 'attack' || spell.type === 'heal');
    if (!spell || !treinavel || !spell.voc.includes(G.vocation) || G.level < spell.level) {
      emit(EVENTS.NOTIFY, { msg: t('training.pickSpellFirst'), type: 'error' });
      return;
    }
  }
  stopHunt(); // treino e caçada são mutuamente exclusivos
  const res = await trainStartOnServer(ACCOUNT.activeSlot, skillId, G.vocation, (G.boosts && G.boosts.training) || 0, skillId === 'magic' ? spellId : null);
  if (!res.ok) { emit(EVENTS.NOTIFY, { msg: `⚠️ ${res.error}`, type: 'error' }); return; }
  applyServerSkills(res.skills); // crédito de um treino anterior, se houver
  G.trainingSkill = skillId;
  G.trainingSince = Date.now();
  G.trainingMode = 'unified';
  G.trainingSpell = skillId === 'magic' ? spellId : null;
  sessionTries = 0;
  startTrainingLoop();
  emit(EVENTS.NOTIFY, { msg: t('training.startedNotify', { skill: TIBIA_SKILLS[skillId].name }), type: 'success' });
  emit(EVENTS.TRAINING_PANEL);
  saveGame();
}

// Para o treino com resposta IMEDIATA na tela: antes a função só re-renderizava
// DEPOIS do round-trip ao servidor, e o botão ficava vários segundos sem reagir
// (reclamação do Felipe). Agora o painel para na hora e, se o servidor recusar,
// o estado volta ao que era — o crédito das tentativas continua vindo dele.
export async function stopTraining() {
  if (!G.trainingSkill) return;
  const skillId = G.trainingSkill;
  const anterior = { skill: G.trainingSkill, since: G.trainingSince, mode: G.trainingMode, spell: G.trainingSpell, tries: sessionTries };
  stopTrainingLocal();                                   // pinta a parada já
  const res = await trainStopOnServer(ACCOUNT.activeSlot, G.vocation);
  if (!res.ok) {                                         // desfaz: o servidor ainda acha que treina
    G.trainingSkill = anterior.skill; G.trainingSince = anterior.since;
    G.trainingMode = anterior.mode; G.trainingSpell = anterior.spell;
    sessionTries = anterior.tries;
    emit(EVENTS.TRAINING_PANEL);
    emit(EVENTS.NOTIFY, { msg: res.error || t('training.stopFailed'), type: 'error' });
    return;
  }
  applyServerSkills(res.skills);
  const tries = anterior.tries + (res.tries || 0);
  const skillName = TIBIA_SKILLS[skillId].name;
  emit(EVENTS.NOTIFY, {
    msg: tries > 0 ? t('training.stoppedNotifyGain', { tries, skill: skillName }) : t('training.stoppedNotify', { skill: skillName }),
    type: 'success',
  });
  saveGame();
}

// Chamada na inicialização (main.js): adota o estado de treino do SERVIDOR (a
// fonte de verdade), não o do save. Offline → credita o tempo de aba fechada
// (o servidor cappea em 8h). Online → reancora (o tempo de aba fechada não
// conta pro treino online). Depois religa o tick.
export async function resumeTrainingOnLoad() {
  if (!G.vocation) return;
  const state = await getHuntState(ACCOUNT.activeSlot);
  const s = state && state.ok && state.stats;
  if (!s || !s.training_skill) { stopTrainingLocal(); return; }
  G.trainingSkill = s.training_skill;
  G.trainingMode = 'unified';
  G.trainingSpell = s.training_spell || null;
  G.trainingSince = Date.now();
  sessionTries = 0;
  // Treino unificado: o tempo de jogo FECHADO é creditado no ritmo de descanso
  // (context 'resume', 1x, cap 8h). Depois o loop 'live' segue no ritmo acelerado.
  const res = await trainCreditOnServer(ACCOUNT.activeSlot, G.vocation, 'resume');
  if (res.ok && res.active) {
    applyServerSkills(res.skills);
    if (res.tries > 0) {
      const def = TIBIA_SKILLS[G.trainingSkill];
      emit(EVENTS.NOTIFY, { msg: t('training.offlineGain', { tries: res.tries, skill: def ? def.name : G.trainingSkill }), type: 'success' });
    }
  }
  startTrainingLoop();
  emit(EVENTS.TRAINING_PANEL);
}

// Auto-desliga o treino quando uma caçada começa (ver comentário do topo):
// credita o acumulado no servidor e limpa o estado local.
on(EVENTS.HUNT_BUTTON, ({ hunting } = {}) => {
  if (hunting && G.trainingSkill) {
    trainStopOnServer(ACCOUNT.activeSlot, G.vocation).then(res => { if (res.ok) applyServerSkills(res.skills); });
    stopTrainingLocal();
  }
});
