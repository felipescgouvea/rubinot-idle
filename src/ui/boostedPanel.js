// Quadro "BOOSTED" do dia — mostra a Boosted Creature e o Boosted Boss
// sorteados pra hoje, no mesmo espírito do bloco BOOSTED do site oficial do
// RubinOT. Renderizado na aba Caçada; troca sozinho quando o dia vira.
import { MONSTERS, ZONES, boostedCreatureForDate, boostedBossForDate } from '../domain/bestiary.js?v=365';
import { monsterSpriteImg } from './huntPanel.js?v=363';
import { uiIcon } from './uiIcons.js?v=347';
import { t } from '../i18n/i18n.js?v=362';

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
  // CTA: clicar na Boosted Creature abre o zone picker na cidade da PRIMEIRA zona
  // onde ela aparece (decisão: uma criatura pode estar em várias zonas; a 1ª é o
  // ponto de entrada previsível). Não auto-inicia a caça — o jogador escolhe a
  // zona. openZonePicker/openCity já são globais (ver main.js). Se a criatura não
  // tem zona (ex.: só boss), o card não vira clicável.
  const creatureZone = Object.values(ZONES).find(z => z.monsters?.includes(creatureId));
  const creatureCity = creatureZone?.city;
  const creatureCta = creatureCity
    ? ` boosted-clickable" onclick="openZonePicker();openCity('${creatureCity}')" title="${t('boosted.goHunt')}"`
    : '"';
  el.innerHTML = `
    <div class="boosted-item${creatureCta}>
      <div class="boosted-label">${uiIcon('prey', 'boosted-label-icon')} ${t('boosted.creature')}</div>
      <div class="boosted-sprite">${creature ? monsterSpriteImg(creatureId, 'boosted-sprite-img') : '❓'}</div>
      <div class="boosted-name">${creature ? creature.name : '—'}</div>
      <div class="boosted-bonus" title="${t('boosted.creatureTooltip')}">${uiIcon('boosted', 'boosted-label-icon')} 2× XP · loot</div>
    </div>
    <div class="boosted-item">
      <div class="boosted-label">${uiIcon('bossrush', 'boosted-label-icon')} ${t('boosted.boss')}</div>
      <div class="boosted-sprite">${boss ? monsterSpriteImg(bossId, 'boosted-sprite-img') : '❓'}</div>
      <div class="boosted-name">${boss ? boss.name : '—'}</div>
      <div class="boosted-bonus" title="${t('boosted.bossTooltip')}">${uiIcon('boosted', 'boosted-label-icon')} 2× XP · loot</div>
    </div>`;
}
