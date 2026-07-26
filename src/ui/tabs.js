// Navegação por abas: troca qual painel está visível e dispara o render
// daquela aba (a maioria dos painéis só precisa renderizar ao ser aberta —
// os que mudam durante a caçada em segundo plano já escutam eventos próprios).
import { renderTasksPanel } from './tasksPanel.js?v=323';
import { renderSpellsPanel } from './spellsPanel.js?v=231';
import { renderSkillsPanel } from './skillsPanel.js?v=317';
import { renderArenaPanel } from './arenaPanel.js?v=316';
import { renderWorldsPanel } from './worldsPanel.js?v=315';
import { renderBattlePassPanel } from './battlePassPanel.js?v=315';
import { renderRtcPanel } from './rtcPanel.js?v=350';
import { renderShopPanel } from './shopPanel.js?v=323';
import { renderMarketPanel } from './marketPanel.js?v=319';
import { renderHighscoresPanel } from './highscoresPanel.js?v=320';
import { renderBossRushPanel } from './bossRushPanel.js?v=321';
import { renderBestiaryTab } from './bestiaryPanel.js?v=321';
import { renderTrainingSection } from './trainingPanel.js?v=324';
import { renderImbuePanel } from './imbuementPanel.js?v=315';
import { renderAdminPanel } from './adminPanel.js?v=325';
import { isMarketEnabled, isAdminUser } from '../application/adminUseCases.js?v=319';
import { on, EVENTS } from '../shared/eventBus.js?v=316';

const RENDER_BY_TAB = {
  tasks: renderTasksPanel,
  spells: renderSpellsPanel,
  skills: renderSkillsPanel,
  imbue: renderImbuePanel,
  training: renderTrainingSection,
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

// Esconde a aba ⚙️ Admin pra quem não está na whitelist public.admins (checada
// no servidor por initGameConfig(), ver application/adminUseCases.js). Chamado
// uma vez no boot, depois que a checagem de admin resolveu. Sem isso, QUALQUER
// jogador logado conseguia abrir o painel e mudar taxas de XP/gold/loot —
// mesmo já com a escrita bloqueada no servidor, a aba não deveria nem aparecer.
export function applyAdminTabVisibility() {
  const admin = isAdminUser();
  const btn = document.querySelector('.tab[data-tab="admin"]');
  if (btn) btn.style.display = admin ? '' : 'none';
  if (!admin && document.body.dataset.tab === 'admin') {
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
