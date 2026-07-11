// Treino Offline (Exercise / Offline Training do Tibia) — em vez de caçar, o
// personagem "treina" uma skill escolhida, ganhando tentativas de skill com o
// tempo (inclusive offline). Regras puras: nada aqui toca DOM, storage ou G.

// Skills treináveis nas dummies. Magic Level treina mais devagar (como no
// Tibia, onde treinar magia offline rende bem menos que uma skill de arma).
export const TRAINABLE_SKILLS = ['fist', 'club', 'sword', 'axe', 'distance', 'shielding', 'magic'];

// Tentativas de skill concedidas por minuto de treino. Ritmo deliberadamente
// modesto: treino é uma alternativa passiva à caçada (não some com a curva de
// skill), pensado pra rodar enquanto o jogador está fora.
export const TRIES_PER_MINUTE = 6;
export const MAGIC_TRIES_PER_MINUTE = 3;

// Teto de acúmulo offline do treino: mesmas 8h do progresso offline de caçada
// (ver application/persistenceUseCases.js) pra manter a regra consistente.
export const TRAINING_MAX_OFFLINE_SEC = 8 * 60 * 60;

export function triesPerMinuteFor(skillId) {
  return skillId === 'magic' ? MAGIC_TRIES_PER_MINUTE : TRIES_PER_MINUTE;
}

// Total de tentativas ganhas em `seconds` de treino da skill.
export function triesForTraining(skillId, seconds) {
  return Math.floor((seconds / 60) * triesPerMinuteFor(skillId));
}
