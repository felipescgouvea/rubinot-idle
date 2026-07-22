// Quantos personagens cabem numa conta, e a validação do slot que vem do
// cliente. Mora num módulo próprio porque DOIS pontos de entrada precisam da
// mesma regra — as rotas REST (index.js) e o handshake do WebSocket
// (realtime.js) — e o segundo não pode importar do primeiro sem ciclo.
//
// Duplicar a constante era o caminho fácil e o errado: bastaria esquecer um dos
// dois pra ter um slot que funciona em tudo, menos em tempo real.
//
// O mesmo limite existe no CHECK de cada tabela por personagem no banco e em
// MAX_CHARACTER_SLOTS (src/domain/gameState.js). Os três andam juntos.
export const MAX_SLOTS = 4;

export function validSlot(v) {
  return Number.isInteger(v) && v >= 0 && v < MAX_SLOTS ? v : null;
}
