// Aba Quests: lista as raids (quest), cada uma com o chefe final e o prêmio
// real do Tibia; iniciar entra na raid (caça na zona sintética da quest). A
// conclusão e o prêmio são concedidos pelo servidor ao vencer o chefe (ver
// server/huntEngine.js) — aqui só mostramos o estado e disparamos a raid.
import { G, ACCOUNT } from '../application/gameStore.js?v=355';
import { QUESTS, QUEST_IDS, questTotalEnemies } from '../domain/quests.js?v=3';
import { MONSTERS } from '../domain/bestiary.js?v=374';
import { ITEMS } from '../domain/items.js?v=366';
import { t } from '../i18n/i18n.js?v=371';
import { monsterSpriteImg } from './huntPanel.js?v=372';
import { itemIconImg } from './shared.js?v=358';
import { selectZone, startHunt, stopHunt } from '../application/huntUseCases.js?v=419';
import { fetchQuestState } from '../infrastructure/authClient.js?v=363';

let completedCache = [];

function questCard(id) {
  const q = QUESTS[id];
  const done = completedCache.includes(id);
  const boss = MONSTERS[q.boss] || { name: q.boss };
  const reward = ITEMS[q.reward.item] || { name: q.reward.item };
  return `<div class="quest-card ${done ? 'done' : ''}">
    <div class="quest-head">
      <span class="quest-icon">${q.icon}</span><b>${q.name}</b>
      ${done ? `<span class="quest-done-badge">✅ ${t('quest.completed')}</span>` : ''}
    </div>
    <div class="quest-body">
      <div class="quest-cell"><span class="quest-cell-cap">${t('quest.boss')}</span>${monsterSpriteImg(q.boss, 'quest-boss-img')}<span class="quest-cell-name">${boss.name}</span></div>
      <div class="quest-cell"><span class="quest-cell-cap">${t('quest.reward')}</span>${itemIconImg(q.reward.item, 'quest-reward-img')}<span class="quest-cell-name">${reward.name}</span></div>
    </div>
    <div class="quest-foot">
      <span class="muted">${t('quest.recLevel', { level: q.recLevel })} · ${questTotalEnemies(q)} ${t('quest.enemies')}</span>
      <button class="btn-blue quest-start-btn" onclick="startQuestClick('${id}')">${done ? t('quest.replay') : t('quest.start')}</button>
    </div>
  </div>`;
}

function questsBodyHtml() {
  return `<div class="card">
    <h3>📜 ${t('shell.tabQuests')}</h3>
    <p class="muted">${t('quest.intro')}</p>
    <div class="quest-grid">${QUEST_IDS.map(questCard).join('')}</div>
  </div>`;
}

export async function renderQuestsPanel() {
  const el = document.getElementById('tab-quests');
  if (!el) return;
  if (!G.vocation) { el.innerHTML = `<div class="card"><p class="muted">${t('imbue.noChar')}</p></div>`; return; }
  // estado de conclusão vem do servidor (autoritativo)
  try {
    const res = await fetchQuestState(ACCOUNT.activeSlot);
    if (res && res.ok && Array.isArray(res.completed)) completedCache = res.completed;
  } catch (e) { /* mantém o cache anterior */ }
  el.innerHTML = questsBodyHtml();
}

// Inicia a raid da quest: para qualquer caça atual (evita a corrida com o
// auto-resume do login), seleciona a zona sintética da quest e inicia. Robusto
// ao estado de G.hunting — sempre arranca a raid na zona certa.
export function startQuestClick(id) {
  if (!QUESTS[id]) return;
  if (G.hunting) stopHunt();
  selectZone('quest:' + id);   // sem hunting ativo, só seta a zona (não re-inicia)
  document.querySelector('.tab[data-tab="hunt"]')?.click();
  startHunt();
}
