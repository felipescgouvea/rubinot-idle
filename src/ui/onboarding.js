// Onboarding do 1º minuto: um coach-mark de 3 passos (caçar → loot → gastar)
// mostrado UMA vez pro jogador novo, com destaque (spotlight) no alvo de cada
// passo. Não bloqueia o jogo (pointer-events:none no overlay) — o jogador pode
// clicar no próprio botão destacado; o card tem Pular/Próximo. Persiste em
// localStorage pra não repetir.
import { t } from '../i18n/i18n.js?v=376';

const KEY = 'rubinot_onboarded_v1';
const STEPS = [
  { sel: '#hunt-toggle', key: 'hunt' },
  { sel: '#char-info',   key: 'loot' },
  { sel: '#store-btn',   key: 'spend' },
];

let idx = 0, overlay = null;

export function maybeStartOnboarding() {
  try { if (localStorage.getItem(KEY)) return; } catch { return; }
  // só pra quem já tem personagem e com os alvos na tela
  if (!document.querySelector('#hunt-toggle')) return;
  idx = 0;
  build();
  showStep();
}

function build() {
  overlay = document.createElement('div');
  overlay.className = 'onboard-overlay';
  overlay.innerHTML = `
    <div class="onboard-spot"></div>
    <div class="onboard-card">
      <div class="onboard-text"></div>
      <div class="onboard-row">
        <button type="button" class="onboard-skip">${t('onboard.skip')}</button>
        <span class="onboard-dots"></span>
        <button type="button" class="onboard-next">${t('onboard.next')}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('.onboard-skip').addEventListener('click', finish);
  overlay.querySelector('.onboard-next').addEventListener('click', () => {
    idx++;
    if (idx >= STEPS.length) finish(); else showStep();
  });
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);
}

function showStep() {
  const el = document.querySelector(STEPS[idx].sel);
  if (!el || el.offsetParent === null) { // alvo ausente/escondido: pula
    idx++;
    if (idx >= STEPS.length) return finish();
    return showStep();
  }
  overlay.querySelector('.onboard-text').innerHTML = t('onboard.' + STEPS[idx].key);
  overlay.querySelector('.onboard-dots').textContent = STEPS.map((_, i) => i === idx ? '●' : '○').join(' ');
  overlay.querySelector('.onboard-next').textContent = idx === STEPS.length - 1 ? t('onboard.done') : t('onboard.next');
  reposition();
}

function reposition() {
  if (!overlay) return;
  const el = document.querySelector(STEPS[idx].sel);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const pad = 8;
  const spot = overlay.querySelector('.onboard-spot');
  Object.assign(spot.style, {
    left: (r.left - pad) + 'px', top: (r.top - pad) + 'px',
    width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px',
  });
  const card = overlay.querySelector('.onboard-card');
  const cw = 268;
  const left = Math.min(Math.max(8, r.left + r.width / 2 - cw / 2), window.innerWidth - cw - 8);
  let top = r.bottom + 14;
  if (top + 130 > window.innerHeight) top = r.top - 140;
  card.style.left = left + 'px';
  card.style.top = Math.max(8, top) + 'px';
}

function finish() {
  try { localStorage.setItem(KEY, '1'); } catch {}
  window.removeEventListener('resize', reposition);
  window.removeEventListener('scroll', reposition, true);
  if (overlay) { overlay.remove(); overlay = null; }
}
