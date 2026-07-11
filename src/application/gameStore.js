// Dono do estado mutável do jogo (G). É o único lugar em toda a aplicação
// que decide COMO o estado é substituído por inteiro (load de save, reset);
// todo o resto só lê/muta propriedades de G, nunca reatribui a variável.
import { createDefaultState } from '../domain/gameState.js?v=40';

export let G = createDefaultState();

export function replaceState(newState) {
  G = newState;
  return G;
}
