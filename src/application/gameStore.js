// Dono do estado mutável do jogo (G). É o único lugar em toda a aplicação
// que decide COMO o estado é substituído por inteiro (load de save, reset);
// todo o resto só lê/muta propriedades de G, nunca reatribui a variável.
import { createDefaultState, MAX_CHARACTER_SLOTS } from '../domain/gameState.js?v=305';

export let G = createDefaultState();

// ACCOUNT = os personagens (slots) da mesma conta — ver
// application/accountUseCases.js. G é SEMPRE o personagem ATIVO
// (ACCOUNT.slots[ACCOUNT.activeSlot]); o resto do jogo inteiro só enxerga G,
// nunca ACCOUNT diretamente, então trocar de slot é só trocar o que G aponta
// pra (ver persistenceUseCases.js: loadGame) — nenhum outro código muda.
export let ACCOUNT = { activeSlot: 0, slots: Array(MAX_CHARACTER_SLOTS).fill(null) };

export function replaceState(newState) {
  G = newState;
  return G;
}

export function replaceAccount(newAccount) {
  ACCOUNT = newAccount;
  return ACCOUNT;
}
