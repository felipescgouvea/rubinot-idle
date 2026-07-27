import { G } from './gameStore.js?v=359';
import { applySkillGain, TIBIA_SKILLS } from '../domain/character.js?v=386';
import { emit, EVENTS } from '../shared/eventBus.js?v=357';
import { getSkillRate } from './adminUseCases.js?v=360';
import { t } from '../i18n/i18n.js?v=375';

export function trainSkill(skillId, amount) {
  if (!G.vocation || !G.sk[skillId]) return;
  // Provisório (em Rook, antes de graduar): treina no ritmo neutro pra a
  // vocação do set não dar vantagem de skill — ver domain/character.js.
  const { sk, leveledUp, newLevel } = applySkillGain(G.sk, skillId, amount * getSkillRate(), G.vocation, !G.graduated);
  G.sk = sk;
  if (leveledUp) {
    const def = TIBIA_SKILLS[skillId];
    emit(EVENTS.LOG, t('skills.levelUpLog', { skill: def.name, level: newLevel }));
    emit(EVENTS.NOTIFY, { msg: t('skills.levelUpNotify', { icon: def.icon, skill: def.name, level: newLevel }), type: 'success' });
    emit(EVENTS.CHAR_INFO);
  }
}
