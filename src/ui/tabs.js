// Navegação por abas: troca qual painel está visível e dispara o render
// daquela aba (a maioria dos painéis só precisa renderizar ao ser aberta —
// os que mudam durante a caçada em segundo plano já escutam eventos próprios).
import { renderTasksPanel } from './tasksPanel.js?v=13';
import { renderSkillsPanel } from './skillsPanel.js?v=13';
import { renderArenaPanel } from './arenaPanel.js?v=13';
import { renderInventory } from './inventoryAndEquipmentPanel.js?v=13';
import { renderWorldsPanel } from './worldsPanel.js?v=13';
import { renderBattlePassPanel } from './battlePassPanel.js?v=13';
import { renderRtcPanel } from './rtcPanel.js?v=13';
import { renderSpellsPanel } from './spellsPanel.js?v=13';
import { renderShopPanel } from './shopPanel.js?v=13';
import { renderMarketPanel } from './marketPanel.js?v=13';
import { renderHighscoresPanel } from './highscoresPanel.js?v=13';

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
