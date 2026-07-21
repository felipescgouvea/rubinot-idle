// Carregar o personagem, aplicar progresso offline e resetar. (saveGame mora
// em saveGameUseCase.js — ver o comentário lá para o motivo.)
import { G, replaceState, replaceAccount } from './gameStore.js?v=163';
import { createDefaultState } from '../domain/gameState.js?v=163';
import { createDefaultSkills } from '../domain/character.js?v=190';
import { createDefaultRtc, isRuneAvailableToVocation, normalizeAttackSpells, isRuneEntry, runeEntryId } from '../domain/rtcConfig.js?v=193';
import { isSpellAvailable } from '../domain/spells.js?v=161';
import { findOutfit } from '../domain/outfits.js?v=159';
import { DEFAULT_OUTFIT_COLORS } from '../domain/outfitColors.js?v=159';
import { ZONES } from '../domain/bestiary.js?v=181';
import { isRelicId, STARTER_KITS } from '../domain/items.js?v=174';
import { addItemToInventory } from './inventoryCore.js?v=161';
import { LEGACY_RARITY_MAP } from '../domain/rarity.js?v=160';
import { LEGACY_ARENA_DIVISION_MAP, TASK_ROOMS } from '../domain/progression.js?v=162';
import { loadRawState, clearState, saveState } from '../infrastructure/storage.js?v=159';
import { t } from '../i18n/i18n.js?v=177';
import { getMaxHp, getMaxMana } from './stats.js?v=160';
import { STAMINA_MAX } from '../domain/stamina.js?v=159';

// Prepara o save da sessão do usuário logado ANTES do loadGame(): se há save na
// nuvem, ele vira o save local (a nuvem é a fonte de verdade da conta); se não
// há (conta nova), mantém o que estiver local — assim um jogador que já jogava
// sem conta importa o progresso ao criar a 1ª conta. Chamada só pelo main.js,
// logo após o login e antes de loadGame().
export function applyCloudSave(cloudData) {
  // Grava no localStorage E APLICA ao estado vivo (loadGame) na hora. Só
  // saveState() não bastava: no 1º login (dispositivo novo, sem localStorage
  // prévio) o char do cloud ia pro localStorage mas o G continuava default até
  // um reload — o jogador via a tela de "criar personagem" mesmo já tendo
  // personagem (bug pego pelo auditor de browser: localStorage tinha o char mas
  // a UI mostrava criação; reload resolvia). loadGame() aqui garante que o G
  // reflita o save da nuvem imediatamente.
  if (cloudData) { saveState(cloudData); loadGame(); }
}

// Normaliza o que veio do storage (local ou nuvem) pro formato de CONTA
// { activeSlot, slots: [slot0, slot1] }. Saves de antes do multi-personagem
// eram o personagem inteiro, direto na raiz (sem `slots`) — vira o slot 0,
// sem perder nada, e o slot 1 começa vazio.
function normalizeAccountData(parsed) {
  if (parsed && Array.isArray(parsed.slots)) {
    const slots = [parsed.slots[0] || null, parsed.slots[1] || null];
    // NÃO exigir que o slot já tenha dado (`slots[activeSlot]` truthy) aqui —
    // o slot ativo pode estar legitimamente vazio bem no momento de criar o
    // 2º personagem (troca pro slot vazio, recarrega, cai na tela de escolha
    // de vocação). Exigir dado prévio travava esse fluxo permanentemente de
    // volta pro slot 0.
    const activeSlot = parsed.activeSlot === 1 ? 1 : 0;
    return { activeSlot, slots };
  }
  return { activeSlot: 0, slots: [parsed, null] }; // formato antigo (pré multi-personagem)
}

export function loadGame() {
  const parsed = loadRawState();
  if (!parsed) return;

  const account = normalizeAccountData(parsed);
  replaceAccount(account);
  replaceState({ ...createDefaultState(), ...(account.slots[account.activeSlot] || {}) });

  // Blindagem contra save corrompido: um save antigo/quebrado podia trazer
  // inventory/equipment como null (visto em produção). Como o spread de
  // createDefaultState é sobrescrito pelo valor do slot, o null vinha pra cá e
  // qualquer acesso G.inventory[x] passava a estourar (cura/regen/inventário
  // paravam de renderizar — "a tela não atualiza"). Restaura o shape padrão.
  if (!G.inventory || typeof G.inventory !== 'object') G.inventory = {};
  if (!Array.isArray(G.inventoryOrder)) G.inventoryOrder = Object.keys(G.inventory);
  if (!G.equipment || typeof G.equipment !== 'object') {
    G.equipment = { weapon: null, armor: null, shield: null, helmet: null, ammo: null, ring: null, legs: null, boots: null };
  }
  // migração: zona/tarefa de versões antigas do bestiário
  if (G.activeZone && !ZONES[G.activeZone]) G.activeZone = null;
  if (!G.defeatedZoneBosses) G.defeatedZoneBosses = [];
  if (!G.notifiedWorlds) G.notifiedWorlds = [];
  // migração: TASK_ROOMS foi reescrito (94 tasks reais do RubinOT, ver
  // domain/progression.js) — o shape de G.activeTask mudou de
  // { monster, required } pra { roomId, taskIndex, key, monsters, required }.
  // Uma task ativa de antes da migração não bate mais no formato novo (sem
  // roomId/key) nem existe mais na lista atual de salas — descarta em vez de
  // deixar a UI travada num estado inválido.
  if (G.activeTask && (!G.activeTask.roomId || !TASK_ROOMS.find(r => r.id === G.activeTask.roomId))) G.activeTask = null;
  // migração: sistema antigo de pontos de skill → skills de treino Tibia
  if (!G.sk || !G.sk.magic) G.sk = createDefaultSkills();
  // migração: RTC ganhou ataque (spell/runa) e cura por poção — saves antigos têm só
  // os ajustes antigos (autoLoot/graphics/etc., já removidos) ou nenhum rtc ainda.
  G.rtc = { ...createDefaultRtc(), ...G.rtc };
  // Smart Priority desligada de propósito (pedido do Felipe) — força false
  // mesmo pra saves antigos que já tinham ligado antes do toggle virar
  // somente-leitura na UI (ver ui/rtcPanel.js).
  G.rtc.smartElement = false;
  // migração: seleção de spell de ataque/cura morava em G.spells (aba "Spells",
  // removida) — agora mora dentro do próprio G.rtc, junto do resto da automação.
  if (G.spells) {
    if (G.spells.attack && !normalizeAttackSpells(G.rtc).length) { G.rtc.attackSpells = [G.spells.attack]; }
    if (G.spells.heal && !G.rtc.healSpell) G.rtc.healSpell = G.spells.heal;
    delete G.spells;
  }
  // migração: ataque automático virou lista de PRIORIDADE (attackSpells). Saves
  // antigos guardavam uma única attackSpell — converte pra lista de um item.
  G.rtc.attackSpells = normalizeAttackSpells(G.rtc);
  delete G.rtc.attackSpell;
  if (!G.boosts) G.boosts = {};
  // migração: auto-vender lixo, stamina e bênçãos são novos.
  if (typeof G.blessings !== 'number') G.blessings = 0;
  if (!G.autoSell) G.autoSell = { enabled: false, maxValue: 50 };
  if (typeof G.stamina !== 'number') G.stamina = STAMINA_MAX;
  if (typeof G.promoted !== 'boolean') G.promoted = false; // migração: promoção de vocação é nova
  if (G.title === undefined) G.title = null; // migração: título de achievement é novo
  if (!G.imbuements || typeof G.imbuements !== 'object') G.imbuements = {}; // migração: imbuements são novos
  if (typeof G.bpPremium !== 'boolean') G.bpPremium = false; // migração: trilha premium do BP é nova
  if (!Array.isArray(G.bpClaimedPremium)) G.bpClaimedPremium = [];
  if (!G.bpWeeklyProgress || typeof G.bpWeeklyProgress !== 'object') G.bpWeeklyProgress = { kills: 0, gold: 0, tasks: 0, arenaWins: 0 };
  if (!Array.isArray(G.bpWeeklyClaimed)) G.bpWeeklyClaimed = [];
  if (G.bpSeason === undefined) G.bpSeason = null;
  if (G.bpWeekId === undefined) G.bpWeekId = null;
  // migração: Mochila-item + ordem do inventário (drag) são novos. Todo save
  // ganha o bag inicial e uma ordem inicial a partir dos itens que já tem.
  if (!G.backpack) G.backpack = 'bag';
  if (!Array.isArray(G.inventoryOrder)) G.inventoryOrder = [];
  Object.keys(G.inventory || {}).forEach(id => { if (!G.inventoryOrder.includes(id)) G.inventoryOrder.push(id); });
  // migração: Relíquias (itens com modificador de raridade — ver
  // domain/gameState.js) são novas; saves antigos não têm nenhum dos dois campos.
  if (!G.relics) G.relics = [];
  if (!G.relicSeq) G.relicSeq = 0;
  // migração: a escala de raridade foi renomeada/expandida (refined/exceptional
  // → incomum/raro/épico/lendário — ver domain/rarity.js). Remapeia os ids
  // antigos guardados nas relíquias pra a UI não achar RARITY_TIERS[rarity]
  // indefinido. O bônus efetivo (bonusPct) já vive na própria relíquia, então
  // o poder de itens antigos não muda — só o rótulo/cor.
  G.relics.forEach(r => { if (LEGACY_RARITY_MAP[r.rarity]) r.rarity = LEGACY_RARITY_MAP[r.rarity]; });
  // migração: divisões da Arena viraram nomes em inglês (Bronze/Silver/Gold/...
  // — ver domain/progression.js: LEGACY_ARENA_DIVISION_MAP). Sem isso, quem já
  // resgatou a recompensa de uma divisão em português conseguiria resgatar de
  // novo sob o nome novo.
  if (Array.isArray(G.arenaDivisionsClaimed)) {
    G.arenaDivisionsClaimed = G.arenaDivisionsClaimed.map(d => LEGACY_ARENA_DIVISION_MAP[d] || d);
  }
  // migração defensiva: um slot de equipamento apontando pra uma relíquia que
  // não existe mais em G.relics (save corrompido/editado à mão) travaria o
  // slot pra sempre — solta o slot em vez de propagar o id fantasma.
  Object.keys(G.equipment).forEach(slot => {
    const val = G.equipment[slot];
    if (isRelicId(val) && !G.relics.some(r => r.id === val)) G.equipment[slot] = null;
  });
  if (!G.outfitsOwned) G.outfitsOwned = [];
  if (!G.outfitGender) G.outfitGender = 'male';
  // migração: outfits antigos eram identificados por emoji/id de item de loja;
  // o sistema novo usa os ids reais do Tibia (ver domain/outfits.js) — qualquer
  // coisa que não bater com o catálogo novo simplesmente reseta pro padrão.
  G.outfitsOwned = G.outfitsOwned.filter(id => findOutfit(id));
  if (G.outfit && !findOutfit(G.outfit)) G.outfit = null;
  if (!G.outfitColors) G.outfitColors = { ...DEFAULT_OUTFIT_COLORS };
  if (!('legs' in G.equipment)) { G.equipment.legs = null; G.equipment.boots = null; }
  // migração: slot de Munição (ammo) é novo — ver domain/items.js.
  if (!('ammo' in G.equipment)) G.equipment.ammo = null;
  // migração: o kit inicial ganhou capacete (e escudo/spellbook pros magos) —
  // personagens criados antes disso nunca receberam essas peças. Preenche só
  // slot VAZIO (não sobrescreve equipamento que o jogador já trocou).
  if (G.vocation) {
    const kit = STARTER_KITS[G.vocation] || {};
    Object.entries(kit).forEach(([slot, itemId]) => {
      if (!G.equipment[slot]) {
        addItemToInventory(itemId);
        G.equipment[slot] = itemId;
      }
    });
  }
  // Tira da prioridade magias/runas que a vocação/nível atual não pode mais usar.
  G.rtc.attackSpells = normalizeAttackSpells(G.rtc).filter(entry => isRuneEntry(entry)
    ? isRuneAvailableToVocation(runeEntryId(entry), G.vocation)
    : isSpellAvailable(entry, G.vocation, G.level));
  delete G.rtc.attackType;
  delete G.rtc.attackRune;
  if (G.rtc.healSpell && !isSpellAvailable(G.rtc.healSpell, G.vocation, G.level)) G.rtc.healSpell = null;
  // hp/mana no boot. Desde o Marco 5/6b, HP/mana são AUTORITATIVOS do servidor
  // (reconcileWithServer no boot corrige pro valor real em segundos). O save
  // local nem sempre traz hp/mana (viraram estado do servidor), então um char
  // COM vocação pode carregar com o default 0 do createDefaultState — e o painel
  // renderiza ANTES do reconcile responder (ver main.js: renderCharPanel antes
  // do await checkAndResumeHuntSession), mostrando "0/130 · 0/380" por ~alguns
  // segundos a cada login (parece morto/quebrado — "os números não fazem sentido
  // antes de entrar na batalha"). Regra: valor salvo VÁLIDO (>0) é preservado e
  // só é clampado ao teto; hp/mana ausentes/0 (desconhecidos) assumem CHEIO —
  // um char em descanso não aparece morto — e o servidor sobrescreve com a
  // verdade logo em seguida (inclusive uma morte real, que ele revive com %).
  if (G.vocation) {
    const maxHp = getMaxHp(), maxMana = getMaxMana();
    G.hp = G.hp > 0 ? Math.min(G.hp, maxHp) : maxHp;
    G.mana = G.mana > 0 ? Math.min(G.mana, maxMana) : maxMana;
  }
}

// A antiga applyOfflineProgress() (estimativa aproximada de gold/xp offline,
// killsPerMin fixo etc.) foi removida: desde o Marco 6b nada no cliente decide
// gold/xp reais, e o servidor de caçada (Railway) continua tickando de VERDADE
// mesmo com a aba fechada (ver server/src/huntEngine.js) — o tempo que o
// jogador ficou fora já foi contado de verdade lá, e checkAndResumeHuntSession()
// (ver main.js: bootGame, chamada antes desta função existiria) já reconcilia
// esse ganho real via reconcileWithServer(). Rodar uma estimativa aqui em cima
// contaria a mesma janela duas vezes (uma real, outra inventada).
// Única lacuna aceita conscientemente: se o PROCESSO do servidor reiniciou
// (deploy/crash no Railway) enquanto o jogador estava caçando, a sessão em
// memória morre e reapStaleSessionsOnBoot() marca hunt_sessions.active=false
// — nenhum tick rodou durante essa janela específica, e o jogador não ganha
// nada por ela. Preferimos zero ganho nesse caso raro a reintroduzir um
// palpite do cliente, o que quebraria "o servidor é a única fonte de verdade".

// Helper genérico de reconciliação: chama `fetchFn()` (uma função de
// infrastructure/authClient.js, que retorna `{ ok: true, ...dados }` ou
// `{ ok: false, error }`); se `ok`, aplica `applyToG(resultado)` (uma função
// que muta G com os campos vindos do servidor) e retorna o resultado; se
// falhar, não mexe em G e retorna null. Sem lógica específica de nenhum
// domínio — qualquer mecânica futura no modelo "servidor é a fonte de
// verdade" pode reusar isto em vez de reescrever o mesmo try/then.
export async function reconcileField(fetchFn, applyToG) {
  const result = await fetchFn();
  if (!result || !result.ok) return null;
  applyToG(result);
  return result;
}

export function confirmReset() {
  if (confirm(t('persistence.resetConfirm'))) {
    clearState();
    location.reload();
  }
}
