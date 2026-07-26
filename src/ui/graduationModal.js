// TELA DE GRADUAÇÃO — aparece ao atingir o nível de sair da ilha inicial
// (ver domain/cities.js: GRADUATION_LEVEL).
//
// Dois papéis numa tela só, porque no Tibia real são o mesmo momento: você
// atravessa o portão da vocação e parte pro mainland. Então aqui o jogador
// CONFIRMA ou TROCA a vocação (até agora ela era provisória, vinda do set
// escolhido na criação) e recebe o Graduate Set pra encarar o continente.
//
// Não é fechável por fora de propósito: a graduação decide a vocação
// DEFINITIVA do personagem e entrega equipamento. Fechar no clique fora — como
// os outros modais fazem — deixaria o jogador sem escolher e sem o kit, e a
// tela só voltaria no próximo carregamento (ver characterUseCases:
// checkGraduation).
import { G } from '../application/gameStore.js?v=325';
import { VOCATIONS } from '../domain/character.js?v=352';
import { GRADUATE_KITS, GRADUATE_AMMO_QTY, ITEMS } from '../domain/items.js?v=336';
import { graduate } from '../application/characterUseCases.js?v=326';
import { on, EVENTS, emit } from '../shared/eventBus.js?v=323';
import { itemIconImg } from './shared.js?v=328';
import { t } from '../i18n/i18n.js?v=341';

const ORDEM = ['knight', 'paladin', 'sorcerer', 'druid'];

// Vocação em foco na tela — começa na provisória (a que o jogador vem jogando)
// pra que "confirmar" seja o caminho de menor atrito.
let escolhida = null;

function itensDoKit(voc) {
  const kit = GRADUATE_KITS[voc] || {};
  return Object.entries(kit).map(([slot, itemId]) => ({
    slot, itemId,
    nome: (ITEMS[itemId] && ITEMS[itemId].name) || itemId,
    qty: slot === 'ammo' ? GRADUATE_AMMO_QTY : 1,
  }));
}

function render() {
  const box = document.getElementById('graduation-body');
  if (!box) return;
  const v = VOCATIONS[escolhida];
  const trocando = escolhida !== G.vocation;

  box.innerHTML = `
    <p class="grad-intro">${t('graduation.intro', { level: G.level })}</p>

    <div class="grad-vocs">
      ${ORDEM.map(id => `
        <button class="grad-voc ${id === escolhida ? 'active' : ''} ${id === G.vocation ? 'atual' : ''}"
                onclick="pickGraduationVocation('${id}')">
          <span class="grad-voc-name">${VOCATIONS[id].name}</span>
          ${id === G.vocation ? `<span class="grad-voc-tag">${t('graduation.current')}</span>` : ''}
        </button>`).join('')}
    </div>

    <p class="grad-hint">${trocando ? t('graduation.switchHint', { vocation: v.name }) : t('graduation.keepHint')}</p>

    <h4 class="grad-kit-title">${t('graduation.kitTitle', { vocation: v.name })}</h4>
    <div class="grad-kit">
      ${itensDoKit(escolhida).map(i => `
        <div class="grad-kit-item" title="${i.nome}">
          ${itemIconImg(i.itemId, 'grad-kit-icon')}
          <span class="grad-kit-name">${i.nome}</span>
          ${i.qty > 1 ? `<span class="grad-kit-qty">x${i.qty}</span>` : ''}
        </div>`).join('')}
    </div>

    <button id="graduation-confirm" class="grad-confirm" onclick="confirmGraduation()">
      ${trocando ? t('graduation.confirmSwitch', { vocation: v.name }) : t('graduation.confirmKeep')}
    </button>
  `;
}

export function pickGraduationVocation(voc) {
  if (!VOCATIONS[voc]) return;
  escolhida = voc;
  render();
}

export async function confirmGraduation() {
  const btn = document.getElementById('graduation-confirm');
  // Trava o botão durante a ida ao servidor: sem isso, dois cliques rápidos
  // disparam duas graduações e a segunda volta recusada, mostrando um erro
  // gratuito pra quem só clicou com pressa. Troca o texto também (não só
  // opacidade) — um botão só escurecido, sem nenhum "carregando", parecia
  // travado durante o round-trip ao servidor (reportado pelo Felipe).
  const textoOriginal = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.style.opacity = '.6'; btn.textContent = t('graduation.confirming'); }
  const ok = await graduate(escolhida);
  if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.textContent = textoOriginal; }
  if (!ok) return;                    // servidor recusou (nível, repetição, rede)
  closeGraduationModal();
  emit(EVENTS.CHAR_PANEL);
  emit(EVENTS.ZONE_PICKER);           // o mainland abre junto com a graduação
}

export function openGraduationModal() {
  escolhida = G.vocation;
  const overlay = document.getElementById('graduation-overlay');
  if (!overlay) return;
  render();
  overlay.style.display = 'flex';
}

export function closeGraduationModal() {
  const overlay = document.getElementById('graduation-overlay');
  if (overlay) overlay.style.display = 'none';
}

export function wireGraduationEvents() {
  on(EVENTS.GRADUATION, openGraduationModal);
}
