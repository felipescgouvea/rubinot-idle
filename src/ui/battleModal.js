// Abre/fecha o modal de batalha. Só alterna o display — o conteúdo (sprite do
// jogador/monstro, log) é o mesmo elemento fixo do DOM o tempo todo, mantido
// atualizado pelos eventos de caçada mesmo com o modal fechado, então reabrir
// sempre mostra o estado atual sem recriar nada.
export function openBattleModal() {
  const el = document.getElementById('battle-modal-overlay');
  if (el) el.style.display = 'flex';
}

export function closeBattleModal() {
  const el = document.getElementById('battle-modal-overlay');
  if (el) el.style.display = 'none';
}
