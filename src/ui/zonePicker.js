// Painel de escolha de zona de caça: um card por dungeon do mundo atual, com
// criaturas, multiplicadores e o requisito de nível — em vez do <select>
// escondido de antes. Mesmo padrão do seletor de outfit (ver outfitPicker.js).
import { G } from '../application/gameStore.js?v=27';
import { ZONES, MONSTERS } from '../domain/bestiary.js?v=27';
import { selectZone, startHunt } from '../application/huntUseCases.js?v=27';
import { openModal, closeModal } from './shared.js?v=27';
import { openBattleModal } from './battleModal.js?v=27';
import { zoneIconImg, monsterSpriteImg } from './huntPanel.js?v=27';

function zoneCard(id, z) {
  const locked = G.level < z.minLevel;
  const active = G.activeZone === id;
  const monsterTitle = z.monsters.map(mId => MONSTERS[mId]?.name || mId).join(', ');
  const monsterIcons = z.monsters.map(mId => monsterSpriteImg(mId, 'zone-card-monster-icon')).join('');
  return `<div class="zone-card ${active ? 'active' : ''} ${locked ? 'locked' : ''}" title="${monsterTitle}">
    <div class="zone-card-icon">${zoneIconImg(z, 'zone-card-icon-img')}</div>
    <div class="zone-card-name">${z.name}</div>
    <div class="zone-card-monster-row">${monsterIcons}</div>
    <div class="zone-card-mults">⭐×${z.xpMult} 💰×${z.goldMult}</div>
    ${locked
      ? `<div class="zone-card-req">🔒 Lv ${z.minLevel}</div>`
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
