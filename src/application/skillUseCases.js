import { G } from './gameStore.js?v=224';
import { applySkillGain, TIBIA_SKILLS } from '../domain/character.js?v=251';
import { emit, EVENTS } from '../shared/eventBus.js?v=222';
import { getSkillRate } from './adminUseCases.js?v=225';
import { t } from '../i18n/i18n.js?v=238';

export function trainSkill(skillId, amount) {
  if (!G.vocation || !G.sk[skillId]) return;
  const { sk, leveledUp, newLevel } = applySkillGain(G.sk, skillId, amount * getSkillRate(), G.vocation);
  G.sk = sk;
  if (leveledUp) {
    const def = TIBIA_SKILLS[skillId];
    emit(EVENTS.LOG, t('skills.levelUpLog', { skill: def.name, level: newLevel }));
    emit(EVENTS.NOTIFY, { msg: t('skills.levelUpNotify', { icon: def.icon, skill: def.name, level: newLevel }), type: 'success' });
    emit(EVENTS.CHAR_INFO);
  }
}
