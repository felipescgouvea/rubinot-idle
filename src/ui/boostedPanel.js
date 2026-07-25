// Quadro "BOOSTED" do dia — mostra a Boosted Creature e o Boosted Boss
// sorteados pra hoje, no mesmo espírito do bloco BOOSTED do site oficial do
// RubinOT. Renderizado na aba Caçada; troca sozinho quando o dia vira.
import { MONSTERS, boostedCreatureForDate, boostedBossForDate } from '../domain/bestiary.js?v=304';
import { monsterSpriteImg } from './huntPanel.js?v=303';
import { t } from '../i18n/i18n.js?v=302';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function renderBoostedPanel() {
  const el = document.getElementById('boosted-body');
  if (!el) return;
  const creatureId = boostedCreatureForDate(todayStr());
  const bossId = boostedBossForDate(todayStr());
  const creature = MONSTERS[creatureId];
  const boss = MONSTERS[bossId];
  el.innerHTML = `
    <div class="boosted-item">
      <div class="boosted-label">🐗 ${t('boosted.creature')}</div>
      <div class="boosted-sprite">${creature ? monsterSpriteImg(creatureId, 'boosted-sprite-img') : '❓'}</div>
      <div class="boosted-name">${creature ? creature.name : '—'}</div>
      <div class="boosted-bonus" title="${t('boosted.creatureTooltip')}">⚡ 2× XP · loot</div>
    </div>
    <div class="boosted-item">
      <div class="boosted-label">💀 ${t('boosted.boss')}</div>
      <div class="boosted-sprite">${boss ? monsterSpriteImg(bossId, 'boosted-sprite-img') : '❓'}</div>
      <div class="boosted-name">${boss ? boss.name : '—'}</div>
      <div class="boosted-bonus" title="${t('boosted.bossTooltip')}">⚡ 2× XP · loot</div>
    </div>`;
}
