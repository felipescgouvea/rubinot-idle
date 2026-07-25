// Janela de MORTE estilo Tibia: quando o jogador morre, um overlay BLOQUEANTE
// cobre a tela com o resumo da morte (quem matou, XP perdida, nível atual) e um
// botão OK que PRECISA ser clicado antes de qualquer outra ação — como o "You
// are dead" do cliente do Tibia. Sem clique-fora pra fechar: a morte é um marco,
// não some sozinha. O overlay é criado sob demanda (não polui o index.html).
import { on, EVENTS } from '../shared/eventBus.js?v=287';
import { t } from '../i18n/i18n.js?v=305';
import { spriteUrl } from '../infrastructure/tibiaSprites.js?v=290';

let overlay = null;

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'death-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(overlay);
  return overlay;
}

function showDeath({ monster, xpLost, level } = {}) {
  const ov = ensureOverlay();
  const skull = spriteUrl('items/Demon_Skull.webp');
  ov.innerHTML = `
    <div class="death-window" role="dialog" aria-modal="true" aria-labelledby="death-title">
      <div class="death-header" id="death-title">${t('death.title')}</div>
      <div class="death-body">
        <img class="death-skull" src="${skull}" alt="" aria-hidden="true"
          onerror="this.outerHTML='<span class=&quot;death-skull-fallback&quot; aria-hidden=&quot;true&quot;>💀</span>'" />
        <div class="death-lines">
          <p class="death-killed">${t('death.killedBy', { monster: monster || '—' })}</p>
          ${xpLost ? `<p class="death-xp">${t('death.xpLost', { xp: xpLost })}</p>` : ''}
          <p class="death-level">${t('death.nowLevel', { level: level || 1 })}</p>
        </div>
      </div>
      <button class="death-ok" type="button">${t('death.ok')}</button>
    </div>`;
  ov.style.display = 'flex';
  ov.setAttribute('aria-hidden', 'false');
  const btn = ov.querySelector('.death-ok');
  const close = () => { ov.style.display = 'none'; ov.setAttribute('aria-hidden', 'true'); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') { e.preventDefault(); close(); } };
  btn.addEventListener('click', close, { once: true });
  document.addEventListener('keydown', onKey);
  btn.focus();
}

export function wireDeathModal() {
  on(EVENTS.PLAYER_DEATH, showDeath);
}
