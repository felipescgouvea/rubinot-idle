// Casos de uso do Bestiário e Charms: Charm Points e desbloqueio são
// AUTORITATIVOS NO SERVIDOR (ver server/src/index.js: /charm/state,
// /charm/unlock) — antes G.charmPoints/G.charmsUnlocked eram só locais, e
// /hunt/start aceitava qualquer id de charm do cliente sem checar posse
// contra nada real (achado de auditoria: um cliente adulterado ganhava o
// bônus real de gold/xp/loot de graça). player_bestiary.state.kills (contagem
// de mortes por espécie) é gravado pelo PRÓPRIO servidor a cada kill (ver
// huntEngine.js: settleKill/flushBestiaryKills) — o cliente não escreve mais
// nisso, só espelha o que o servidor devolve.
import { G, ACCOUNT } from './gameStore.js?v=299';
import { CHARMS, CHARM_EQUIP_SLOTS } from '../domain/charms.js?v=296';
import { emit, on, EVENTS } from '../shared/eventBus.js?v=297';
import { saveGame } from './saveGameUseCase.js?v=299';
import { fetchCharmState, unlockCharmOnServer, grantCharmBonusOnServer } from '../infrastructure/authClient.js?v=307';
import { t } from '../i18n/i18n.js?v=315';

let lastSyncAt = 0;

// #R4: credita charm points de prêmio (Arena) no servidor e aplica o novo total
// autoritativo. Antes o prêmio era só `G.charmPoints += amount` local, e o sync
// (que deriva das kills) o descartava na próxima morte. Ver server /charm/grant-bonus.
export async function grantCharmBonus(amount) {
  if (!(amount > 0)) return;
  const res = await grantCharmBonusOnServer(ACCOUNT.activeSlot, amount);
  if (res && res.ok && res.points != null) { G.charmPoints = res.points; emit(EVENTS.HEADER_STATS); }
}

// Busca o estado real (pontos, desbloqueados, mortes por espécie) e espelha
// em G — chamado ao matar (throttled) e ao abrir o Bestiário. Notifica só
// quando os pontos sobem (equivalente a "completou uma etapa"), sem tentar
// atribuir a mortes específicas (isso exigiria o servidor devolver por onde
// veio o ganho, o que não é necessário pra a mecânica em si).
export async function syncCharmState(force = false) {
  const now = Date.now();
  if (!force && now - lastSyncAt < 5000) return;
  lastSyncAt = now;
  const res = await fetchCharmState(ACCOUNT.activeSlot);
  if (!res.ok) return;
  const before = G.charmPoints || 0;
  G.charmPoints = res.points;
  G.charmsUnlocked = res.unlocked;
  G.killCounters = res.kills || {};
  if (res.points > before) {
    emit(EVENTS.LOG, `<span class="log-loot">📖 ${t('bestiary.progressLog', { delta: res.points - before })}</span>`);
  }
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.BESTIARY_PANEL);
}

export async function unlockCharm(charmId) {
  const charm = CHARMS[charmId];
  if (!charm) return;
  const res = await unlockCharmOnServer(ACCOUNT.activeSlot, charmId);
  if (!res.ok) {
    emit(EVENTS.NOTIFY, { msg: res.error === 'charm points insuficientes' ? t('bestiary.insufficientCharmPoints', { cost: charm.cost }) : `⚠️ ${res.error}`, type: 'error' });
    return;
  }
  G.charmPoints = res.points;
  G.charmsUnlocked = res.unlocked;
  emit(EVENTS.NOTIFY, { msg: `${charm.icon} ${t('bestiary.charmUnlocked', { name: charm.name })}`, type: 'success' });
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.BESTIARY_PANEL);
  saveGame();
}

// Liga/desliga um charm equipado (respeitando o limite de slots).
export function toggleCharmEquipped(charmId) {
  G.charmsEquipped = G.charmsEquipped || [];
  if (!(G.charmsUnlocked || []).includes(charmId)) return;
  const i = G.charmsEquipped.indexOf(charmId);
  if (i >= 0) {
    G.charmsEquipped.splice(i, 1);
  } else {
    if (G.charmsEquipped.length >= CHARM_EQUIP_SLOTS) {
      emit(EVENTS.NOTIFY, { msg: t('bestiary.maxCharmsEquipped', { max: CHARM_EQUIP_SLOTS }), type: 'error' });
      return;
    }
    G.charmsEquipped.push(charmId);
  }
  emit(EVENTS.BESTIARY_PANEL);
  saveGame();
}

on(EVENTS.MONSTER_KILLED, () => { syncCharmState(); });
