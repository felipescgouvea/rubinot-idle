// Aba Skills. Só re-renderiza ao trocar de aba (o treino em si acontece
// silenciosamente durante a caçada — ver application/skillUseCases.js).
import { G } from '../application/gameStore.js?v=115';
import { TIBIA_SKILLS, VOC_TRAINING, triesForNext } from '../domain/character.js?v=115';
import { resolveEquippedItem } from '../domain/items.js?v=115';
import { getEquippedWeaponSkillId } from '../application/stats.js?v=115';
import { skillIconImg } from './shared.js?v=115';

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
    ? `<strong>Skills sobem por uso, como no Tibia — só treina o que você realmente usa.</strong> ` +
      (isMage
        ? `Sua vocação gasta mana para atacar/curar, treinando <span>Magic Level</span>.`
        : weaponSkillId === 'fist'
          ? `Você está desarmado (ou com uma arma sem skill corpo-a-corpo/distância): treinando <span>Fist Fighting</span>. Equipe uma arma para treinar a skill dela.`
          : `Com <span>${weaponItem ? weaponItem.name : ''}</span> equipada, você treina <span>${TIBIA_SKILLS[weaponSkillId].name}</span> ao atacar.`) +
      ` Shielding só sobe com um escudo equipado; Magic Level sobe ao gastar mana em qualquer vocação.`
    : 'Escolha uma vocação para começar a treinar.';

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
    const reasonInactive = id === 'shielding' && voc && !G.equipment.shield ? 'Equipe um escudo para treinar'
      : (!isMage && ['fist', 'club', 'sword', 'axe', 'distance'].includes(id) && id !== weaponSkillId) ? 'Equipe a arma correspondente para treinar'
      : 'Não treinada pela sua vocação';
    return `<div class="skill-card" ${isPrimary ? 'style="border-color:var(--gold-dim)"' : ''}>
      <div class="skill-card-header">
        <span class="skill-card-name">${skillIconImg(id, s.icon)} ${s.name}</span>
        <span class="skill-card-level">${sk.lv}</span>
      </div>
      <div class="skill-card-desc">${isPrimary ? '⭐ Treinando agora' : reasonInactive}</div>
      <div class="task-progress-bar-track"><div class="task-progress-bar" style="width:${pct}%"></div></div>
      <div class="skill-card-cost">${Math.floor(sk.tries)} / ${needed} para o próximo nível (${pct}%)</div>
    </div>`;
  }).join('');
}
