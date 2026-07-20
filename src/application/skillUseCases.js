import { G } from './gameStore.js?v=150';
import { applySkillGain, TIBIA_SKILLS } from '../domain/character.js?v=177';
import { emit, EVENTS } from '../shared/eventBus.js?v=148';
import { getSkillRate } from './adminUseCases.js?v=151';
import { t } from '../i18n/i18n.js?v=164';

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
