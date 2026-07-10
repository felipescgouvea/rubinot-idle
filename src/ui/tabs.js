// Navegação por abas: troca qual painel está visível e dispara o render
// daquela aba (a maioria dos painéis só precisa renderizar ao ser aberta —
// os que mudam durante a caçada em segundo plano já escutam eventos próprios).
import { renderTasksPanel } from './tasksPanel.js?v=14';
import { renderSkillsPanel } from './skillsPanel.js?v=14';
import { renderArenaPanel } from './arenaPanel.js?v=14';
import { renderInventory } from './inventoryAndEquipmentPanel.js?v=14';
import { renderWorldsPanel } from './worldsPanel.js?v=14';
import { renderBattlePassPanel } from './battlePassPanel.js?v=14';
import { renderRtcPanel } from './rtcPanel.js?v=14';
import { renderSpellsPanel } from './spellsPanel.js?v=14';
import { renderShopPanel } from './shopPanel.js?v=14';
import { renderMarketPanel } from './marketPanel.js?v=14';
import { renderHighscoresPanel } from './highscoresPanel.js?v=14';

const RENDER_BY_TAB = {
  tasks: renderTasksPanel,
  skills: renderSkillsPanel,
  arena: renderArenaPanel,
  inventory: renderInventory,
  worlds: renderWorldsPanel,
  battlepass: renderBattlePassPanel,
  rtc: renderRtcPanel,
  spells: renderSpellsPanel,
  shop: renderShopPanel,
  market: renderMarketPanel,
  highscores: renderHighscoresPanel,
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
