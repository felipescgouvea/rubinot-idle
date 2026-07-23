import { G, ACCOUNT } from './gameStore.js?v=233';
import { VOCATIONS } from '../domain/character.js?v=260';
import { STARTER_KITS, STARTER_SUPPLIES, STARTER_AMMO_QTY, GRADUATE_KITS, GRADUATE_AMMO_QTY } from '../domain/items.js?v=244';
import { canGraduate } from '../domain/cities.js?v=244';
import { getMaxHp, getMaxMana } from './stats.js?v=244';
import { emit, on, EVENTS } from '../shared/eventBus.js?v=231';
import { addItemToInventory } from './inventoryCore.js?v=231';
import { startRegen } from './huntUseCases.js?v=297';
import { saveGame } from './saveGameUseCase.js?v=233';
import { grantStarterKit, grantGraduateKit, updateHuntRtc } from '../infrastructure/authClient.js?v=238';
import { pruneRtcForVocation } from './rtcUseCases.js?v=259';
import { t } from '../i18n/i18n.js?v=247';

// Abre a tela de graduação se o personagem já pode graduar e ainda não graduou.
//
// Chamado em DOIS momentos de propósito: ao subir de nível (o caso normal) e ao
// CARREGAR o personagem. Só no level-up não bastaria — quem fecha a aba na hora
// da premiação, ou quem passou do nível 8 antes desta funcionalidade existir,
// nunca mais veria a tela e ficaria sem a vocação definitiva e sem o kit.
on(EVENTS.LEVEL_UP, () => checkGraduation());

export function checkGraduation() {
  if (!canGraduate(G.level, G.graduated) || !G.vocation) return false;
  emit(EVENTS.GRADUATION, { level: G.level, vocation: G.vocation });
  return true;
}

// GRADUAÇÃO (nível 8) — o jogador confirma ou TROCA a vocação e recebe o
// Graduate Set pra encarar o mainland. Até aqui a vocação escolhida na criação
// era provisória: no Dawnport real você atravessa o portão de uma vocação,
// joga com ela e pode trocar de portão quantas vezes quiser até partir.
//
// Trocar de vocação aqui NÃO precisa recalcular hp/mana na mão: getMaxHp/
// getMaxMana derivam de vocação+nível (ver application/stats.js), então o teto
// muda sozinho. Só o valor ATUAL precisa ser aparado, senão um knight que vira
// mago fica com hp acima do próprio máximo.
// Assíncrona e SERVIDOR PRIMEIRO, de propósito. Antes eu aplicava tudo local e
// mandava o grant com `.catch(() => {})`: se o servidor recusasse (nível,
// graduação repetida, rede caindo), o cliente já tinha trocado a vocação e
// marcado graduated, e os dois ficavam permanentemente em desacordo — o jogador
// veria "sou paladino" enquanto o combate, que roda no servidor, seguiria
// calculando com o equipamento e a vocação de knight. Quem decide é o servidor;
// o local só reflete o que ele confirmou.
export async function graduate(voc) {
  if (!canGraduate(G.level, G.graduated)) return false;
  if (!VOCATIONS[voc]) return false;

  const resp = await grantGraduateKit(ACCOUNT.activeSlot, voc).catch(e => ({ error: e.message || String(e) }));
  if (!resp || resp.error || !resp.ok) {
    emit(EVENTS.NOTIFY, { msg: t('character.graduateFailed'), type: 'error' });
    return false;
  }

  const vocAnterior = G.vocation;
  const trocou = vocAnterior !== voc;
  G.vocation = voc;
  G.graduated = true;

  // Troca de vocação joga fora as magias/runas armadas que a nova vocação não
  // pode lançar. A graduação NÃO recarrega a página, então o filtro que roda no
  // load não pega esse caso — sem isto o paladino recém-graduado continuava
  // lançando a magia de sorcerer que estava no RTC (bug do Felipe). Se estiver
  // caçando, empurra o RTC limpo pra sessão viva no servidor na hora, senão a
  // próxima startHunt() já manda o certo.
  if (trocou) {
    pruneRtcForVocation();
    if (G.hunting) updateHuntRtc(ACCOUNT.activeSlot, G.rtc, G.fightMode, G.density || 'normal');
  }

  const kit = GRADUATE_KITS[voc] || {};
  // Kit inicial da vocação que ele VINHA jogando, não da nova: numa troca de
  // vocação, comparar com o kit da nova deixaria o couro antigo equipado
  // (nenhuma peça bateria) e o Graduate Set ficaria só na mochila.
  const kitInicial = STARTER_KITS[vocAnterior] || {};
  Object.entries(kit).forEach(([slot, itemId]) => {
    const qty = slot === 'ammo' ? GRADUATE_AMMO_QTY : 1;
    for (let i = 0; i < qty; i++) addItemToInventory(itemId);
    // Equipa só quando o slot está VAZIO ou ainda tem a peça do kit inicial.
    // Sobrescrever cegamente rebaixaria quem lutou 8 níveis pra achar algo
    // melhor que o couro — o item entra na mochila e a escolha continua sendo
    // do jogador, como no Tibia real (lá o set é entregue, não vestido à força).
    const atual = G.equipment[slot];
    const ehDoKitInicial = Object.values(kitInicial).includes(atual);
    if (!atual || ehDoKitInicial) G.equipment[slot] = itemId;
  });

  G.hp = Math.min(G.hp, getMaxHp());
  G.mana = Math.min(G.mana, getMaxMana());

  emit(EVENTS.CHAR_PANEL);
  emit(EVENTS.EQUIPMENT_SLOTS);
  emit(EVENTS.INVENTORY);
  saveGame();
  emit(EVENTS.NOTIFY, {
    msg: t(trocou ? 'character.graduatedSwitched' : 'character.graduated', { vocation: VOCATIONS[voc].name }),
    type: 'success',
  });
  return true;
}

export function selectVocation(voc) {
  if (G.vocation) return;
  G.vocation = voc;
  const v = VOCATIONS[voc];
  G.hp = v.baseHp;
  G.mana = v.baseMana;
  // kit inicial da vocação, como o equipamento entregue a um personagem recém-criado no RubinOT
  const kit = STARTER_KITS[voc] || {};
  Object.entries(kit).forEach(([slot, itemId]) => {
    // munição entra como PILHA (senão 1 flecha = "sem flecha" na prática); o
    // resto do kit é 1 de cada. Ver STARTER_AMMO_QTY em domain/items.js.
    const qty = slot === 'ammo' ? STARTER_AMMO_QTY : 1;
    for (let i = 0; i < qty; i++) addItemToInventory(itemId);
    G.equipment[slot] = itemId;
  });
  // supply inicial (poções/comida), fiel ao Dawnport real (ver domain/items.js)
  const supplies = STARTER_SUPPLIES[voc] || {};
  Object.entries(supplies).forEach(([itemId, qty]) => {
    for (let i = 0; i < qty; i++) addItemToInventory(itemId);
  });
  emit(EVENTS.CHAR_PANEL);
  emit(EVENTS.EQUIPMENT_SLOTS);
  emit(EVENTS.INVENTORY);
  startRegen();
  saveGame();
  // Concede o kit no SERVIDOR também (ver server/src/index.js:
  // /character/starter-kit) — sem isso o hunt-start lia player_equipment
  // vazio e computava o combate real como se o personagem estivesse
  // desarmado, mesmo mostrando o kit equipado aqui no cliente.
  grantStarterKit(ACCOUNT.activeSlot, voc).catch(() => {});
  emit(EVENTS.NOTIFY, { msg: t('character.vocationChosen', { vocation: v.name }), type: 'success' });
}
