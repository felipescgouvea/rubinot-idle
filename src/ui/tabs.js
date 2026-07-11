// Navegação por abas: troca qual painel está visível e dispara o render
// daquela aba (a maioria dos painéis só precisa renderizar ao ser aberta —
// os que mudam durante a caçada em segundo plano já escutam eventos próprios).
import { renderTasksPanel } from './tasksPanel.js?v=38';
import { renderSkillsPanel } from './skillsPanel.js?v=38';
import { renderArenaPanel } from './arenaPanel.js?v=38';
import { renderInventory, renderRelics } from './inventoryAndEquipmentPanel.js?v=38';
import { renderWorldsPanel } from './worldsPanel.js?v=38';
import { renderBattlePassPanel } from './battlePassPanel.js?v=38';
import { renderRtcPanel } from './rtcPanel.js?v=38';
import { renderShopPanel } from './shopPanel.js?v=38';
import { renderMarketPanel } from './marketPanel.js?v=38';
import { renderHighscoresPanel } from './highscoresPanel.js?v=38';
import { renderBossRushPanel } from './bossRushPanel.js?v=38';
import { renderBestiaryTab } from './bestiaryPanel.js?v=38';
import { renderTrainingSection } from './trainingPanel.js?v=38';

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
  relics: renderRelics,
  worlds: renderWorldsPanel,
  battlepass: renderBattlePassPanel,
  rtc: renderRtcPanel,
  shop: renderShopPanel,
  market: renderMarketPanel,
  highscores: renderHighscoresPanel,
  bossrush: renderBossRushPanel,
};

export function wireTabs() {
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
