// A batalha agora vive INLINE na aba Hunt (não é mais um modal flutuante — ela é
// a estrela da tela). openBattleModal virou "leve o jogador pra ver a luta":
// troca pra aba Hunt e rola até a cena. Chamado quando começa um boss/zona
// (bossRushPanel, zonePicker) pra o combate aparecer na hora.
export function openBattleModal() {
  const tab = document.querySelector('.tab[data-tab="hunt"]');
  if (tab) tab.click();
  const el = document.getElementById('battle-inline');
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// No-op: a batalha é inline, não há o que fechar. Mantido pra não quebrar quem
// ainda chama (ESC no main.js, etc.).
export function closeBattleModal() {}
