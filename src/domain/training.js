// Treino Offline (Exercise / Offline Training do Tibia) — em vez de caçar, o
// personagem "treina" uma skill escolhida, ganhando tentativas de skill com o
// tempo (inclusive offline). Regras puras: nada aqui toca DOM, storage ou G.

// Skills treináveis nas dummies. Magic Level treina mais devagar (como no
// Tibia, onde treinar magia offline rende bem menos que uma skill de arma).
export const TRAINABLE_SKILLS = ['fist', 'club', 'sword', 'axe', 'distance', 'shielding', 'magic'];

// Tentativas de skill concedidas por minuto de treino. Ritmo deliberadamente
// modesto: treino é uma alternativa passiva à caçada (não some com a curva de
// skill), pensado pra rodar enquanto o jogador está fora.
const TRIES_PER_MINUTE = 6;
const MAGIC_TRIES_PER_MINUTE = 3;

// Teto de acúmulo offline do treino: mesmas 8h do progresso offline de caçada
// (ver application/persistenceUseCases.js) pra manter a regra consistente.
export const TRAINING_MAX_OFFLINE_SEC = 8 * 60 * 60;

export function triesPerMinuteFor(skillId) {
  return skillId === 'magic' ? MAGIC_TRIES_PER_MINUTE : TRIES_PER_MINUTE;
}

// Treino Online (jogador ativo assistindo o dummy sendo atacado, igual ao
// treino offline do Tibia mas exigindo o jogo aberto) rende mais rápido que
// o offline — recompensa a atenção — mas NÃO acumula enquanto o jogo está
// fechado (ver application/trainingUseCases.js: resumeTrainingOnLoad).
export const ONLINE_RATE_MULTIPLIER = 10;

// Varinha de treino (a "exercise weapon" do Tibia) — prêmio de Arena/Battle
// Pass que dobra o rendimento do treino enquanto a janela estiver ativa.
// Multiplica o modo em uso (online ou offline), não substitui.
export const TRAINING_WAND_MULT = 2;

// Total de tentativas ganhas em `seconds` de treino da skill.
export function triesForTraining(skillId, seconds, multiplier = 1) {
  return Math.floor((seconds / 60) * triesPerMinuteFor(skillId) * multiplier);
}

// Quais skills cada vocação pode treinar no modo ONLINE (o dummy "sabe" só
// reagir ao que a vocação de verdade usa em combate — sword/axe/club pro
// Knight escolher, Distance fixo pro Paladin, Magic Level fixo pro
// Sorcerer/Druid). O treino OFFLINE continua livre pra qualquer skill,
// como já era (dummy passivo, sem exigir animação de ataque real).
export function onlineTrainableSkills(vocation) {
  if (vocation === 'knight') return ['sword', 'axe', 'club'];
  if (vocation === 'paladin') return ['distance'];
  if (vocation === 'sorcerer' || vocation === 'druid') return ['magic'];
  return TRAINABLE_SKILLS;
}
