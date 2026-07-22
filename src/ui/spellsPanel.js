// LIVRO DE MAGIAS — a lista completa das magias da vocação, no espírito da
// spellbook do Tibia: tudo que existe aparece, com nível e mana, e o que ainda
// não destravou fica visível com cadeado (é assim que o jogador planeja pra
// onde subir).
//
// Só as de CONJURAÇÃO têm botão: são as únicas lançadas na mão. Ataque e cura
// são automáticos pelo RTC — mostrar um "lançar" ali seria mentira, porque
// quem decide o momento é o motor de combate no servidor.
import { G, ACCOUNT } from '../application/gameStore.js?v=226';
import { SPELLS, isSpellAvailable } from '../domain/spells.js?v=166';
import { ITEMS } from '../domain/items.js?v=237';
import { areaName, isAreaAttack } from '../domain/attackAreas.js?v=222';
import { maxSoul } from '../domain/soul.js?v=164';
import { conjureSpell } from '../application/spellUseCases.js?v=138';
import { on, EVENTS } from '../shared/eventBus.js?v=224';
import { itemIconImg, spellIconImg } from './shared.js?v=229';
import { t } from '../i18n/i18n.js?v=240';

// Ordem das seções: primeiro o que o jogador USA na mão (conjurar), depois o
// que o RTC dispara sozinho, e por último o que é só de mundo.
const SECOES = [
  { id: 'conjure', titulo: '📜 Conjuração', hint: 'Fabrica munição e runas. Custa mana e soul points — e as runas ainda gastam uma Blank Rune.' },
  { id: 'attack', titulo: '⚔️ Ataque', hint: 'Lançadas automaticamente pelo RTC, na ordem de prioridade que você configurar.' },
  { id: 'heal', titulo: '💚 Cura', hint: 'O RTC casta a de cura escolhida quando seu HP cruza o gatilho.' },
  { id: 'support', titulo: '🛡️ Suporte', hint: 'Buffs de combate.' },
  { id: 'utility', titulo: '🔧 Utilidade', hint: 'Magias de mundo aberto (luz, corda, grupo). Existem no livro, mas não têm efeito na caçada.' },
];

function soulAtual() { return Math.min(G.soulMax || maxSoul(G.promoted), G.soul || 0); }

// Por que a magia não pode ser lançada agora — null quando pode. Devolver o
// MOTIVO (em vez de só true/false) é o que evita o botão morto: o jogador vê
// "faltam 2 soul" em vez de clicar num botão que não faz nada.
function bloqueio(id, s) {
  if (!isSpellAvailable(id, G.vocation, G.level)) return `🔒 nível ${s.level}`;
  if (s.type !== 'conjure') return null;
  if ((G.mana || 0) < s.mana) return `💧 falta mana (${s.mana})`;
  if ((s.soul || 0) > soulAtual()) return `✨ falta soul (${s.soul})`;
  if (s.reagent && (G.inventory[s.reagent.item] || 0) < s.reagent.count) {
    return `📦 falta ${ITEMS[s.reagent.item].name}`;
  }
  return null;
}

function detalhe(id, s) {
  const partes = [`lv ${s.level}`, `${s.mana} mana`];
  if (s.soul) partes.push(`${s.soul} soul`);
  if (s.type === 'conjure') {
    const alvo = ITEMS[s.conjures.item];
    partes.push(`→ ${s.conjures.count}× ${alvo ? alvo.name : s.conjures.item}`);
    if (s.reagent) partes.push(`usa ${s.reagent.count}× ${ITEMS[s.reagent.item].name}`);
  }
  if (s.type === 'attack') {
    if (s.dot) partes.push('dano ao longo do tempo');
    if (isAreaAttack(s.area)) partes.push(areaName(s.area, t));
  }
  if (s.buff && s.buff.ms) partes.push(`dura ${Math.round(s.buff.ms / 1000)}s`);
  return partes.join(' · ');
}

function linha(id, s) {
  const trava = bloqueio(id, s);
  const destravada = isSpellAvailable(id, G.vocation, G.level);
  const icone = s.type === 'conjure' && ITEMS[s.conjures.item]
    ? itemIconImg(s.conjures.item, 'rtc-row-icon-img')
    : spellIconImg(s.name, s.icon, 'item-icon');
  const acao = s.type === 'conjure'
    ? `<button class="rtc-row-btn" onclick="castConjureSpell('${id}')" ${trava ? 'disabled' : ''}>${trava || 'Conjurar'}</button>`
    : `<span class="muted">${trava || ''}</span>`;
  return `<div class="rtc-row ${destravada ? '' : 'locked'}">
    <span class="rtc-row-icon">${icone}</span>
    <div class="rtc-row-info">
      <div class="rtc-row-name">${s.name} <span class="muted">"${s.words}"</span></div>
      <div class="rtc-row-desc">${detalhe(id, s)}</div>
    </div>
    ${acao}
  </div>`;
}

export function renderSpellsPanel() {
  const box = document.getElementById('spells-book');
  if (!box) return;
  const voc = G.vocation;
  if (!voc) { box.innerHTML = '<p class="muted">Crie um personagem para ver o livro de magias.</p>'; return; }

  const daVocacao = Object.entries(SPELLS).filter(([, s]) => s.voc.includes(voc));
  const teto = G.soulMax || maxSoul(G.promoted);
  const secoes = SECOES.map(sec => {
    const lista = daVocacao
      .filter(([, s]) => s.type === sec.id)
      .sort((a, b) => a[1].level - b[1].level || a[1].name.localeCompare(b[1].name));
    if (!lista.length) return '';
    const destravadas = lista.filter(([id]) => isSpellAvailable(id, voc, G.level)).length;
    return `<h5>${sec.titulo} <span class="muted">(${destravadas}/${lista.length})</span></h5>
      <p class="muted">${sec.hint}</p>
      <div class="rtc-rows">${lista.map(([id, s]) => linha(id, s)).join('')}</div>`;
  }).join('');

  box.innerHTML = `<div class="spellbook-header">
      <strong>✨ ${soulAtual()}/${teto} soul points</strong>
      <span class="muted"> · 1 ponto a cada ${G.promoted ? 15 : 120}s${G.promoted ? '' : ' (promovido: a cada 15s, teto 200)'}</span>
    </div>${secoes}`;
}

// Exposto pro onclick do HTML (mesmo padrão dos outros painéis).
export async function castConjureSpell(spellId) {
  await conjureSpell(ACCOUNT.activeSlot, spellId);
  renderSpellsPanel();
}

// Soul e mana mudam por fora do painel (regeneração, caçada) — sem redesenhar,
// o botão continuaria desabilitado mesmo depois do soul ter voltado.
on(EVENTS.HEADER_STATS, () => { if (document.body.dataset.tab === 'spells') renderSpellsPanel(); });
