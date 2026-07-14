// Seleção de caçada em DOIS passos: primeiro o jogador escolhe uma CIDADE
// (ver domain/cities.js), depois vê as hunts daquela cidade. As cidades
// substituíram os "mundos" como eixo de navegação — o mundo virou só um bônus
// de fundo (ver domain/bestiary.js: isZoneUnlocked não gateia mais por mundo).
import { G } from '../application/gameStore.js?v=126';
import { ZONES, MONSTERS, isZoneUnlocked, boostedZoneForDate } from '../domain/bestiary.js?v=132';
import { CITIES, isCityUnlocked, ROOKGAARD_LEVEL_CAP } from '../domain/cities.js?v=131';
import { selectZone, startHunt } from '../application/huntUseCases.js?v=131';
import { openModal, closeModal } from './shared.js?v=126';
import { openBattleModal } from './battleModal.js?v=125';
import { zoneIconImg, monsterSpriteImg } from './huntPanel.js?v=128';
import { t } from '../i18n/i18n.js?v=135';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Qual cidade está aberta no picker (null = mostrando a grade de cidades).
let openCityId = null;

// Zonas de uma cidade, na ordem em que estão definidas em ZONES.
function zonesOfCity(cityId) {
  return Object.entries(ZONES).filter(([, z]) => z.city === cityId);
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
  // Sem trava de nível: a única trava é a cadeia de boss (uma hunt encadeada só
  // abre depois de derrotar o boss da anterior).
  const bossLocked = z.requiresBossOf && !(G.defeatedZoneBosses || []).includes(z.requiresBossOf);
  const locked = bossLocked;
  const active = G.activeZone === id;
  const isBoostedToday = id === boostedZoneForDate(todayStr());
  const monsterTitle = z.monsters.map(mId => MONSTERS[mId]?.name || mId).join(', ');
  const monsterIcons = z.monsters.map(mId => monsterSpriteImg(mId, 'zone-card-monster-icon')).join('');
  const bossZoneName = bossLocked ? t(ZONES[z.requiresBossOf]?.name || z.requiresBossOf) : '';
  const lockTitle = bossLocked ? t('zonePicker.defeatBossFirst', { zone: bossZoneName }) : monsterTitle;
  return `<div class="zone-card ${active ? 'active' : ''} ${locked ? 'locked' : ''}" title="${lockTitle}">
    ${isBoostedToday ? `<div class="zone-boosted-badge" title="${t('zonePicker.bonusZoneTooltipFull')}">🔥 ${t('zonePicker.bonusZoneBadge')}</div>` : ''}
    <div class="zone-card-icon">${zoneIconImg(z, 'zone-card-icon-img')}</div>
    <div class="zone-card-name">${t(z.name)}</div>
    <div class="zone-card-monster-row">${monsterIcons}</div>
    ${locked
      ? `<div class="zone-card-req">🔒 ${t('zonePicker.bossLabel', { zone: bossZoneName })}</div>`
      : `<button class="skill-upgrade-btn" onclick="pickZone('${id}')">${active ? `✅ ${t('zonePicker.hunting')}` : t('zonePicker.huntHere')}</button>`}
  </div>`;
}

export function renderZonePickerModal() {
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
