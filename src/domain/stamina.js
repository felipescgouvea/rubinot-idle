// Stamina (opcional, fiel ao Tibia) — em MINUTOS. Cai caçando, regenera
// descansando, e reduz a XP abaixo dos limiares. Só tem efeito se o dono ligar
// no Admin (adminConfig.staminaEnabled). Ver application/huntUseCases.js.

export const STAMINA_MAX = 2520; // 42h em minutos

// Multiplicador de XP pela stamina (como no Tibia):
//  • ≥ 14h (840min): XP normal (×1).
//  • < 14h: XP pela metade (×0.5) — desestimula caçar sem descansar.
//  • 0: continua ×0.5 (não zera a XP, só penaliza).
export function staminaXpMult(minutes) {
  return minutes < 840 ? 0.5 : 1;
}

export function staminaTier(minutes) {
  if (minutes < 840) return 'low';
  if (minutes < 2400) return 'mid';
  return 'high';
}

export function formatStamina(minutes) {
  const m = Math.max(0, Math.floor(minutes));
  return `${Math.floor(m / 60)}h ${m % 60}min`;
}
