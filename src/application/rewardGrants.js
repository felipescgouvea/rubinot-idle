// Concessão dos prêmios NÃO-MATERIAIS da Arena e do Battle Pass.
//
// Regra de negócio: prêmio de competição/temporada nunca é gold, Rubini Coin
// nem equipamento — só vantagem de tempo (ver domain/progression.js pro porquê).
// Os quatro tipos vivem todos no save do jogador (G), não no servidor, então o
// grant é client-side; o servidor só valida QUE o resgate pode acontecer (uma
// vez só, tier alcançado) — ver /bp/claim.
import { G } from './gameStore.js?v=308';
import { emit, EVENTS } from '../shared/eventBus.js?v=306';
import { t } from '../i18n/i18n.js?v=324';

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
  if (r.type === 'boost' || r.type === 'trainWand') {
    // #3: boost e varinha de treino ('trainWand' = exercise weapon, boost de treino)
    // são server-authoritative — o servidor concede (BP no /bp/claim, Arena via
    // grantBoostOnServer) e o CHAMADOR aplica G.boosts do retorno. Creditar local aqui
    // seria descartado pelo /hunt/start (que agora só lê player_stats.boosts). Só
    // reconhecemos o tipo (notifica abaixo).
  } else if (r.type === 'charm') {
    // #R4: charm points são server-authoritative (derivados das kills + bonus).
    // O crédito acontece no servidor — BP no /bp/claim, Arena via grantCharmBonus —
    // e o CHAMADOR aplica o total real. Creditar local aqui duplicaria e seria
    // descartado pelo sync na próxima morte. Só reconhecemos o tipo (notifica abaixo).
  } else if (r.type === 'preyCard') {
    G.preyCards = (G.preyCards || 0) + r.amount;
  } else {
    return false;
  }
  emit(EVENTS.NOTIFY, { msg: `🎁 ${rewardLabel(r)}`, type: 'success' });
  emit(EVENTS.HEADER_STATS);
  return true;
}
