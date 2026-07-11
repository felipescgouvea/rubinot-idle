// Painel de escolha de zona de caça: um card por dungeon do mundo atual, com
// criaturas, multiplicadores e o requisito de nível — em vez do <select>
// escondido de antes. Mesmo padrão do seletor de outfit (ver outfitPicker.js).
import { G } from '../application/gameStore.js?v=42';
import { ZONES, MONSTERS, isZoneUnlocked, boostedZoneForDate } from '../domain/bestiary.js?v=42';
import { selectZone, startHunt } from '../application/huntUseCases.js?v=42';
import { openModal, closeModal, vitalIconImg, goldIconImg } from './shared.js?v=42';
import { openBattleModal } from './battleModal.js?v=42';
import { zoneIconImg, monsterSpriteImg } from './huntPanel.js?v=42';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function zoneCard(id, z) {
  const levelLocked = G.level < z.minLevel;
  const bossLocked = !levelLocked && z.requiresBossOf && !(G.defeatedZoneBosses || []).includes(z.requiresBossOf);
  const locked = levelLocked || bossLocked;
  const active = G.activeZone === id;
  const isBoostedToday = id === boostedZoneForDate(todayStr());
  const monsterTitle = z.monsters.map(mId => MONSTERS[mId]?.name || mId).join(', ');
  const monsterIcons = z.monsters.map(mId => monsterSpriteImg(mId, 'zone-card-monster-icon')).join('');
  const bossZoneName = bossLocked ? (ZONES[z.requiresBossOf]?.name || z.requiresBossOf) : '';
  const lockTitle = levelLocked ? `Nível mínimo: ${z.minLevel}` : bossLocked ? `Derrote o boss de ${bossZoneName} primeiro` : monsterTitle;
  return `<div class="zone-card ${active ? 'active' : ''} ${locked ? 'locked' : ''}" title="${lockTitle}">
    ${isBoostedToday ? '<div class="zone-boosted-badge" title="Zona Bônus do Dia: +50% XP/Gold">🔥 Bônus do Dia</div>' : ''}
    <div class="zone-card-icon">${zoneIconImg(z, 'zone-card-icon-img')}</div>
    <div class="zone-card-name">${z.name}</div>
    <div class="zone-card-monster-row">${monsterIcons}</div>
    <div class="zone-card-mults">${vitalIconImg('xp', 'inline-icon')}×${z.xpMult} ${goldIconImg('inline-icon')}×${z.goldMult}</div>
    ${locked
      ? `<div class="zone-card-req">${levelLocked ? `🔒 Lv ${z.minLevel}` : `🔒 Boss: ${bossZoneName}`}</div>`
      : `<button class="skill-upgrade-btn" onclick="pickZone('${id}')">${active ? '✅ Caçando' : 'Caçar aqui'}</button>`}
  </div>`;
}

export function renderZonePickerModal() {
  if (!G.vocation) return;
  const zonesInWorld = Object.entries(ZONES).filter(([, z]) => z.worldReq === G.currentWorld);
  openModal(`
    <h3 style="margin-bottom:10px">🗺️ Escolher Zona de Caça</h3>
    <div class="zone-picker-gallery">
      ${zonesInWorld.map(([id, z]) => zoneCard(id, z)).join('')}
    </div>
  `);
}

export function openZonePicker() {
  renderZonePickerModal();
}

// Escolher uma dungeon já entra nela: seleciona a zona, começa a caçar (se
// ainda não estava) e abre o modal de batalha — "escolher a dungeon" e
// "entrar na dungeon" são a mesma ação, como o jogador pediu.
export function pickZone(zoneId) {
  const wasHunting = G.hunting;
  selectZone(zoneId); // se já estava caçando, isso reinicia sozinho na zona nova
  if (!wasHunting) startHunt();
  closeModal();
  openBattleModal();
}
