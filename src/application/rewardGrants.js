// Concessão dos prêmios NÃO-MATERIAIS da Arena e do Battle Pass.
//
// Regra de negócio: prêmio de competição/temporada nunca é gold, Rubini Coin
// nem equipamento — só vantagem de tempo (ver domain/progression.js pro porquê).
// Os quatro tipos vivem todos no save do jogador (G), não no servidor, então o
// grant é client-side; o servidor só valida QUE o resgate pode acontecer (uma
// vez só, tier alcançado) — ver /bp/claim.
import { G } from './gameStore.js?v=205';
import { emit, EVENTS } from '../shared/eventBus.js?v=203';
import { t } from '../i18n/i18n.js?v=219';

// Rótulo curto do prêmio, pra notificação e pros cartões da UI.
export function rewardLabel(r) {
  if (!r) return '';
  if (r.type === 'boost') return t('reward.boost', { kind: t(`reward.boostKind.${r.boost}`), minutes: r.minutes });
  if (r.type === 'charm') return t('reward.charm', { amount: r.amount });
  if (r.type === 'preyCard') return t('reward.preyCard', { amount: r.amount });
  if (r.type === 'trainWand') return t('reward.trainWand', { minutes: r.minutes });
  return '';
}

// Aplica o prêmio em G. Devolve false se o tipo não for reconhecido, pra quem
// chama não marcar como resgatado à toa.
export function grantReward(r) {
  if (!r) return false;
  const now = Date.now();
  if (r.type === 'boost' || r.type === 'trainWand') {
    // 'trainWand' é um boost de treino com outro nome — o Tibia chama de
    // exercise weapon; aqui acelera o treino de dummy enquanto durar.
    const kind = r.type === 'trainWand' ? 'training' : r.boost;
    G.boosts = G.boosts || {};
    // acumula tempo em vez de sobrescrever (igual à compra na loja)
    const base = G.boosts[kind] && G.boosts[kind] > now ? G.boosts[kind] : now;
    G.boosts[kind] = base + r.minutes * 60000;
  } else if (r.type === 'charm') {
    G.charmPoints = (G.charmPoints || 0) + r.amount;
  } else if (r.type === 'preyCard') {
    G.preyCards = (G.preyCards || 0) + r.amount;
  } else {
    return false;
  }
  emit(EVENTS.NOTIFY, { msg: `🎁 ${rewardLabel(r)}`, type: 'success' });
  emit(EVENTS.HEADER_STATS);
  return true;
}
