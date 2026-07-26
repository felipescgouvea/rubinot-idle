// Seleção de caçada em DOIS passos: primeiro o jogador escolhe uma CIDADE
// (ver domain/cities.js), depois vê as hunts daquela cidade. As cidades
// substituíram os "mundos" como eixo de navegação — o mundo virou só um bônus
// de fundo (ver domain/bestiary.js: isZoneUnlocked não gateia mais por mundo).
import { G } from '../application/gameStore.js?v=353';
import { ZONES, MONSTERS, isZoneUnlocked, boostedZoneForDate } from '../domain/bestiary.js?v=372';
import { CITIES, isCityUnlocked, ROOKGAARD_LEVEL_CAP } from '../domain/cities.js?v=356';
import { selectZone, startHunt } from '../application/huntUseCases.js?v=417';
import { openModal, closeModal } from './shared.js?v=356';
import { openBattleModal } from './battleModal.js?v=349';
import { zoneIconImg, monsterSpriteImg } from './huntPanel.js?v=370';
import { t } from '../i18n/i18n.js?v=369';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Qual cidade está aberta no picker (null = mostrando a grade de cidades).
let openCityId = null;

// Zonas de uma cidade, na ordem em que estão definidas em ZONES.
// Dificuldade de uma zona: média de XP dos monstros comuns dela (não do
// boss — o boss só aparece isolado no Boss Rush, não define o "nível" da
// hunt normal). Usada só pra ORDENAR a lista da cidade, do mais fácil pro
// mais difícil — não trava mais nada (ver domain/bestiary.js: isZoneUnlocked).
function zoneDifficulty(zone) {
  const xps = zone.monsters.map(id => MONSTERS[id]?.xp || 0);
  return xps.length ? xps.reduce((a, b) => a + b, 0) / xps.length : 0;
}

function zonesOfCity(cityId) {
  return Object.entries(ZONES)
    .filter(([, z]) => z.city === cityId)
    .sort(([, a], [, b]) => zoneDifficulty(a) - zoneDifficulty(b));
}

function unlockedCount(cityId) {
  const zs = zonesOfCity(cityId);
  const n = zs.filter(([id]) => isZoneUnlocked(id, G.level, G.currentWorld, G.defeatedZoneBosses)).length;
  return { unlocked: n, total: zs.length };
}

function cityCard(city) {
  const zs = zonesOfCity(city.id);
  if (zs.length === 0) return '';
  const { unlocked, total } = unlockedCount(city.id);
  const hasBoosted = zs.some(([id]) => id === boostedZoneForDate(todayStr()));
  const hasActive = zs.some(([id]) => id === G.activeZone);
  const levelLocked = !isCityUnlocked(city.id, G.level);
  const allLocked = unlocked === 0 || levelLocked;
  return `<div class="city-card ${hasActive ? 'active' : ''} ${allLocked ? 'locked' : ''}" title="${levelLocked ? t('zonePicker.cityLevelLocked', { level: ROOKGAARD_LEVEL_CAP }) : t(city.blurb)}"
      onclick="${levelLocked ? '' : `openCity('${city.id}')`}">
    ${hasBoosted ? `<div class="zone-boosted-badge" title="${t('zonePicker.bonusZoneTooltip')}">🔥 ${t('zonePicker.bonusZoneBadge')}</div>` : ''}
    <div class="city-card-icon">${city.icon}</div>
    <div class="zone-card-name">${city.name}</div>
    <div class="city-card-blurb">${levelLocked ? `🔒 ${t('zonePicker.cityLevelLocked', { level: ROOKGAARD_LEVEL_CAP })}` : t(city.blurb)}</div>
    ${!levelLocked ? `<div class="city-card-meta">🗺️ ${t('zonePicker.cityStats', { total, unlocked })}</div>` : ''}
  </div>`;
}

function zoneCard(id, z) {
  // Trava de boss encadeado DESLIGADA de propósito (pedido do Felipe) — toda
  // hunt fica livre, sem precisar derrotar o boss da anterior primeiro. Ver
  // domain/bestiary.js: isZoneUnlocked (mesma decisão, pro Boss Rush).
  const locked = false;
  const active = G.activeZone === id;
  const isBoostedToday = id === boostedZoneForDate(todayStr());
  const monsterTitle = z.monsters.map(mId => MONSTERS[mId]?.name || mId).join(', ');
  const monsterIcons = z.monsters.map(mId => monsterSpriteImg(mId, 'zone-card-monster-icon')).join('');
  const lockTitle = monsterTitle;
  return `<div class="zone-card ${active ? 'active' : ''} ${locked ? 'locked' : ''}" title="${lockTitle}">
    ${isBoostedToday ? `<div class="zone-boosted-badge" title="${t('zonePicker.bonusZoneTooltipFull')}">🔥 ${t('zonePicker.bonusZoneBadge')}</div>` : ''}
    <div class="zone-card-icon">${zoneIconImg(z, 'zone-card-icon-img')}</div>
    <div class="zone-card-name">${t(z.name)}</div>
    <div class="zone-card-monster-row">${monsterIcons}</div>
    ${locked
      ? `<div class="zone-card-req">🔒</div>`
      : `<button class="skill-upgrade-btn" onclick="pickZone('${id}')">${active ? `✅ ${t('zonePicker.hunting')}` : t('zonePicker.huntHere')}</button>`}
  </div>`;
}

function renderZonePickerModal() {
  if (!G.vocation) return;

  if (!openCityId) {
    // Passo 1: grade de cidades.
    openModal(`
      <h3 style="margin-bottom:4px">🏙️ ${t('zonePicker.chooseCity')}</h3>
      <p class="muted" style="margin-bottom:10px">${t('zonePicker.chooseCityHint')}</p>
      <div class="zone-picker-gallery">
        ${CITIES.map(cityCard).join('')}
      </div>
    `);
    return;
  }

  // Passo 2: hunts da cidade escolhida.
  const city = CITIES.find(c => c.id === openCityId);
  const zs = zonesOfCity(openCityId);
  openModal(`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <button class="btn-small" onclick="backToCities()">${t('zonePicker.backToCities')}</button>
      <h3 style="margin:0">${city ? city.icon + ' ' + city.name : t('zonePicker.cityFallback')}</h3>
    </div>
    <p class="muted" style="margin-bottom:10px">${city ? t(city.blurb) : ''}</p>
    <div class="zone-picker-gallery">
      ${zs.map(([id, z]) => zoneCard(id, z)).join('')}
    </div>
  `);
}

export function openZonePicker() {
  // Sempre abre na grade de CIDADES — o jogador escolhe a cidade primeiro e só
  // então vê as hunts dela (fluxo pedido: "selecionar a cidade → abrir as hunts").
  openCityId = null;
  renderZonePickerModal();
}

export function openCity(cityId) {
  if (!isCityUnlocked(cityId, G.level)) return;
  openCityId = cityId;
  renderZonePickerModal();
}

export function backToCities() {
  openCityId = null;
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
