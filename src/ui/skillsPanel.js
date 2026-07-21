// Aba Skills. Só re-renderiza ao trocar de aba (o treino em si acontece
// silenciosamente durante a caçada — ver application/skillUseCases.js).
// Dividida em 2 subtabs: Atributos (ATK/DEF/SPD/MGC, antes fixos na barra
// de status — pedido do Felipe pra tirar da tela principal) e Skills
// (treino de cada skill, conteúdo que já existia aqui).
import { G } from '../application/gameStore.js?v=182';
import { TIBIA_SKILLS, VOC_TRAINING, MANA_MULTIPLIER, triesForNext } from '../domain/character.js?v=209';
import { resolveEquippedItem } from '../domain/items.js?v=193';
import { getAtk, getDef, getSpd, getMagic, getEquippedWeaponSkillId } from '../application/stats.js?v=179';
import { skillIconImg } from './shared.js?v=185';
import { t } from '../i18n/i18n.js?v=196';

let activeSkillsSubtab = 'attributes';
export function setSkillsSubtab(tab) {
  if (tab !== 'attributes' && tab !== 'upgrades') return;
  activeSkillsSubtab = tab;
  renderSkillsPanel();
}

function renderSkillsSubtabs() {
  const el = document.getElementById('skills-subtabs');
  if (!el) return;
  el.innerHTML = `
    <button class="admin-subtab-btn ${activeSkillsSubtab === 'attributes' ? 'active' : ''}" onclick="setSkillsSubtab('attributes')">📊 ${t('skills.subtabAttributes')}</button>
    <button class="admin-subtab-btn ${activeSkillsSubtab === 'upgrades' ? 'active' : ''}" onclick="setSkillsSubtab('upgrades')">⚡ ${t('skills.subtabTraining')}</button>
  `;
  const attrEl = document.getElementById('skills-subtab-attributes');
  const upgEl = document.getElementById('skills-subtab-upgrades');
  if (attrEl) attrEl.style.display = activeSkillsSubtab === 'attributes' ? 'block' : 'none';
  if (upgEl) upgEl.style.display = activeSkillsSubtab === 'upgrades' ? 'block' : 'none';
}

function renderAttributesSubtab() {
  const atk = document.getElementById('stat-atk');
  if (!atk) return;
  document.getElementById('stat-atk').textContent = getAtk();
  document.getElementById('stat-def').textContent = getDef();
  document.getElementById('stat-spd').textContent = getSpd().toFixed(1);
  document.getElementById('stat-magic').textContent = getMagic();
}

export function renderSkillsPanel() {
  renderSkillsSubtabs();
  renderAttributesSubtab();
  const pts = document.getElementById('skill-points-display');
  const voc = G.vocation ? VOC_TRAINING[G.vocation] : null;
  const isMage = voc && voc.attackSkill === 'magic';
  const weaponSkillId = voc && !isMage ? getEquippedWeaponSkillId() : null;
  // resolveEquippedItem() cobre tanto uma arma comum quanto uma Relíquia
  // equipada no slot de arma (ver domain/items.js) — sem isso, uma arma-relíquia
  // ficaria com nome vazio aqui (e, pior, sem isso em combatFormulas.js, seria
  // tratada como desarmada).
  const weaponItem = resolveEquippedItem(G.equipment.weapon, G.relics);

  pts.innerHTML = G.vocation
    ? `<strong>${t('skills.upToUseNote')}</strong> ` +
      (isMage
        ? t('skills.mageTraining')
        : weaponSkillId === 'fist'
          ? t('skills.disarmedTraining')
          : t('skills.weaponTraining', { weapon: weaponItem ? weaponItem.name : '', skill: TIBIA_SKILLS[weaponSkillId].name })) +
      ` ${t('skills.footerNote')}`
    : t('skills.noVocation');

  const grid = document.getElementById('skills-grid');
  grid.innerHTML = Object.entries(TIBIA_SKILLS).map(([id, s]) => {
    const sk = G.sk[id];
    const needed = triesForNext(G.vocation, id, sk.lv);
    const pct = Math.min(100, Math.round((sk.tries / needed) * 100));
    const isPrimary = voc && (
      (id === 'shielding' && !!G.equipment.shield) ||
      (id === 'magic' && (isMage || MANA_MULTIPLIER[G.vocation] <= 1.4)) ||
      (!isMage && id === weaponSkillId)
    );
    const reasonInactive = id === 'shielding' && voc && !G.equipment.shield ? t('skills.equipShieldToTrain')
      : (!isMage && ['fist', 'club', 'sword', 'axe', 'distance'].includes(id) && id !== weaponSkillId) ? t('skills.equipMatchingWeapon')
      : t('skills.notTrainedByVocation');
    return `<div class="skill-card" ${isPrimary ? 'style="border-color:var(--gold-dim)"' : ''}>
      <div class="skill-card-header">
        <span class="skill-card-name">${skillIconImg(id, s.icon)} ${s.name}</span>
        <span class="skill-card-level">${sk.lv}</span>
      </div>
      <div class="skill-card-desc">${isPrimary ? `⭐ ${t('skills.trainingNow')}` : reasonInactive}</div>
      <div class="task-progress-bar-track"><div class="task-progress-bar" style="width:${pct}%"></div></div>
      <div class="skill-card-cost">${t('skills.triesProgress', { tries: Math.floor(sk.tries), needed, pct })}</div>
    </div>`;
  }).join('');
}
