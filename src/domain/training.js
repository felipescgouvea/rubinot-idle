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

// Teto de acúmulo offline do treino: mesmas 8h do progresso offline de caçada
// (ver application/persistenceUseCases.js) pra manter a regra consistente.
export const TRAINING_MAX_OFFLINE_SEC = 8 * 60 * 60;

export function triesPerMinuteFor(skillId) {
  return TRIES_PER_MINUTE;
}

// MAGIC LEVEL não ganha "tentativas": ele sobe por MANA GASTA (Crystal Server,
// Player::addManaSpent — a cada nível são 1600 · manaMultiplier^lv de mana).
// Treinar ML é castar a mesma magia repetidamente, então o ganho por minuto é
// simplesmente a mana que o personagem consegue gastar nesse minuto.
//
// E o que limita isso, no Tibia, é a REGENERAÇÃO: não dá pra sustentar mais
// gasto do que se recupera. Por isso a conta é o menor entre "quantas vezes o
// cooldown deixa castar" e "quanta mana volta no minuto" — e é isso que faz um
// sorcerer treinar ML muito mais rápido que um knight, sem precisar de nenhum
// número inventado por vocação.
//
// Antes havia um MAGIC_TRIES_PER_MINUTE = 3 fixo, que não vinha de lugar
// nenhum: ignorava a magia escolhida, a vocação e a própria mana.
export function manaSpentPerMinute(spell, manaRegen) {
  if (!spell || !spell.mana) return 0;
  const castsPorMinuto = 60 / Math.max(1, spell.cd || 1);
  const gastoPossivel = castsPorMinuto * spell.mana;
  // regen*90/min é a mesma taxa usada na caçada e no ocioso (ver o regen do
  // servidor em /hunt/start e huntEngine: regenVitals).
  const manaPorMinuto = (manaRegen || 0) * 90;
  return Math.floor(Math.min(gastoPossivel, manaPorMinuto));
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

// Total ganho em `seconds` de treino. Para skills de arma são TENTATIVAS;
// para magic é MANA GASTA, e aí precisa da magia treinada e da regeneração da
// vocação (ver manaSpentPerMinute).
export function triesForTraining(skillId, seconds, multiplier = 1, ctx = null) {
  if (skillId === 'magic') {
    if (!ctx || !ctx.spell) return 0;   // sem magia escolhida não há mana gasta
    return Math.floor((seconds / 60) * manaSpentPerMinute(ctx.spell, ctx.manaRegen) * multiplier);
  }
  return Math.floor((seconds / 60) * triesPerMinuteFor(skillId) * multiplier);
}

// Quais skills cada vocação pode treinar no modo ONLINE (o dummy "sabe" só
// reagir ao que a vocação de verdade usa em combate — sword/axe/club pro
// Knight escolher, Distance fixo pro Paladin, Magic Level fixo pro
// Sorcerer/Druid). O treino OFFLINE continua livre pra qualquer skill,
// como já era (dummy passivo, sem exigir animação de ataque real).
export function onlineTrainableSkills(vocation) {
  if (vocation === 'knight') return ['sword', 'axe', 'club'];
  // Paladino treina Distance E Magic Level: no Tibia ele tem magias de ataque
  // próprias (Ethereal Spear, Divine Missile…) e sobe ML com elas como
  // qualquer vocação — só mais devagar que um mago.
  if (vocation === 'paladin') return ['distance', 'magic'];
  if (vocation === 'sorcerer' || vocation === 'druid') return ['magic'];
  return TRAINABLE_SKILLS;
}
