import { G } from './gameStore.js?v=52';
import { applySkillGain, TIBIA_SKILLS } from '../domain/character.js?v=52';
import { emit, EVENTS } from '../shared/eventBus.js?v=52';
import { getSkillRate } from './adminUseCases.js?v=52';

export function trainSkill(skillId, amount) {
  if (!G.vocation || !G.sk[skillId]) return;
  const { sk, leveledUp, newLevel } = applySkillGain(G.sk, skillId, amount * getSkillRate());
  G.sk = sk;
  if (leveledUp) {
    const def = TIBIA_SKILLS[skillId];
    emit(EVENTS.LOG, `<span class="log-xp">📈 Você avançou em ${def.name} (nível ${newLevel}).</span>`);
    emit(EVENTS.NOTIFY, { msg: `${def.icon} ${def.name} → ${newLevel}!`, type: 'success' });
    emit(EVENTS.CHAR_INFO);
  }
}
