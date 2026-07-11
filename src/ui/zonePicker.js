// Painel de escolha de zona de caça: um card por dungeon do mundo atual, com
// criaturas, multiplicadores e o requisito de nível — em vez do <select>
// escondido de antes. Mesmo padrão do seletor de outfit (ver outfitPicker.js).
import { G } from '../application/gameStore.js?v=18';
import { ZONES, MONSTERS } from '../domain/bestiary.js?v=18';
import { selectZone, startHunt } from '../application/huntUseCases.js?v=18';
import { openModal, closeModal } from './shared.js?v=18';
import { openBattleModal } from './battleModal.js?v=18';

function zoneCard(id, z) {
  const locked = G.level < z.minLevel;
  const active = G.activeZone === id;
  const monsterNames = z.monsters.map(mId => `${MONSTERS[mId]?.icon || ''} ${MONSTERS[mId]?.name || mId}`).join(' · ');
  return `<div class="zone-card ${active ? 'active' : ''} ${locked ? 'locked' : ''}">
    <div class="zone-card-icon">${z.icon}</div>
    <div class="zone-card-name">${z.name}</div>
    <div class="zone-card-monsters">${monsterNames}</div>
    <div class="zone-card-mults">⭐ XP x${z.xpMult} · 💰 Gold x${z.goldMult}</div>
    ${locked
      ? `<div class="zone-card-req">🔒 Requer Nível ${z.minLevel}</div>`
      : `<button class="skill-upgrade-btn" onclick="pickZone('${id}')">${active ? '✅ Caçando aqui' : 'Caçar aqui'}</button>`}
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
