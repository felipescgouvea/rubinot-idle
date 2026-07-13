// Navegação por abas: troca qual painel está visível e dispara o render
// daquela aba (a maioria dos painéis só precisa renderizar ao ser aberta —
// os que mudam durante a caçada em segundo plano já escutam eventos próprios).
import { renderTasksPanel } from './tasksPanel.js?v=120';
import { renderSkillsPanel } from './skillsPanel.js?v=120';
import { renderArenaPanel } from './arenaPanel.js?v=120';
import { renderWorldsPanel } from './worldsPanel.js?v=120';
import { renderBattlePassPanel } from './battlePassPanel.js?v=120';
import { renderRtcPanel } from './rtcPanel.js?v=120';
import { renderShopPanel } from './shopPanel.js?v=120';
import { renderMarketPanel } from './marketPanel.js?v=120';
import { renderHighscoresPanel } from './highscoresPanel.js?v=120';
import { renderBossRushPanel } from './bossRushPanel.js?v=120';
import { renderBestiaryTab } from './bestiaryPanel.js?v=120';
import { renderTrainingSection } from './trainingPanel.js?v=120';
import { renderAdminPanel } from './adminPanel.js?v=120';
import { isMarketEnabled } from '../application/adminUseCases.js?v=120';
import { on, EVENTS } from '../shared/eventBus.js?v=120';

// A aba Skills renderiza também a seção de Treino Offline (que vive no topo
// dela) — as duas coisas são "progressão de skill", então dividem a aba.
function renderSkillsTab() {
  renderTrainingSection();
  renderSkillsPanel();
}

const RENDER_BY_TAB = {
  tasks: renderTasksPanel,
  skills: renderSkillsTab,
  bestiary: renderBestiaryTab,
  arena: renderArenaPanel,
  worlds: renderWorldsPanel,
  battlepass: renderBattlePassPanel,
  rtc: renderRtcPanel,
  shop: renderShopPanel,
  market: renderMarketPanel,
  highscores: renderHighscoresPanel,
  bossrush: renderBossRushPanel,
  admin: renderAdminPanel,
};

// Mostra/esconde a aba 🏪 Mercado conforme o toggle do Painel Admin. Quando
// desligado, se a aba de mercado estava aberta, volta pra Caçada. Chamado no
// boot e sempre que o dono liga/desliga o mercado (EVENTS.MARKET_VISIBILITY).
export function applyMarketVisibility() {
  const enabled = isMarketEnabled();
  const btn = document.querySelector('.tab[data-tab="market"]');
  if (btn) btn.style.display = enabled ? '' : 'none';
  if (!enabled && document.body.dataset.tab === 'market') {
    document.querySelector('.tab[data-tab="hunt"]')?.click();
  }
}

export function wireTabs() {
  on(EVENTS.MARKET_VISIBILITY, applyMarketVisibility);

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      document.body.dataset.tab = tab.dataset.tab;

      const render = RENDER_BY_TAB[tab.dataset.tab];
      if (render) render();
    });
  });
}
