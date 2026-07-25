// Mutex assíncrono POR USUÁRIO — serializa as operações econômicas do mesmo
// jogador pra fechar corridas de read-modify-write (gold/rubini/inventário) que
// acontecem em requests REST separados, sem transação.
//
// Dois clientes deste lock:
//  - index.js: os endpoints econômicos (ECON_PATHS) seguram o lock do início do
//    request até a resposta terminar.
//  - huntEngine.js: o FLUSH do tick de caçada (flushVitals) segura o lock enquanto
//    grava — senão um flush (gold = gold + delta) que caísse ENTRE o select e o
//    upsert de uma compra (gold = stats.gold - custo, absoluto) era sobrescrito,
//    perdendo o ganho da caçada (#R2, "corrida da carteira").
//
// O processo é único (as sessões vivem na memória dele), então serializar aqui
// resolve a corrida sem precisar reescrever cada operação em SQL atômico.
const userLocks = new Map();   // userId -> cauda da fila de promessas

export async function acquireUserLock(userId) {
  const prev = userLocks.get(userId) || Promise.resolve();
  let release;
  const curr = new Promise(r => { release = r; });
  const tail = prev.then(() => curr);
  userLocks.set(userId, tail);
  await prev.catch(() => {});
  return () => { release(); if (userLocks.get(userId) === tail) userLocks.delete(userId); };
}
