// Aba Skills. Só re-renderiza ao trocar de aba (o treino em si acontece
// silenciosamente durante a caçada — ver application/skillUseCases.js).
import { G } from '../application/gameStore.js?v=125';
import { TIBIA_SKILLS, VOC_TRAINING, triesForNext } from '../domain/character.js?v=125';
import { resolveEquippedItem } from '../domain/items.js?v=125';
import { getEquippedWeaponSkillId } from '../application/stats.js?v=125';
import { skillIconImg } from './shared.js?v=125';
import { t } from '../i18n/i18n.js?v=126';

export function renderSkillsPanel() {
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
    const needed = triesForNext(id, sk.lv);
    const pct = Math.min(100, Math.round((sk.tries / needed) * 100));
    const isPrimary = voc && (
      (id === 'shielding' && !!G.equipment.shield) ||
      (id === 'magic' && (isMage || voc.magicMult >= 0.35)) ||
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
