// Aba Training — TREINO UNIFICADO (decisão do Felipe): UM só painel/treino, que
// roda acelerado com o jogo aberto e continua no ritmo de descanso enquanto
// fechado. Sem escolha online/offline. Ver application/trainingUseCases.js.
import { G } from '../application/gameStore.js?v=360';
import { TIBIA_SKILLS, VOCATIONS, triesForNext } from '../domain/character.js?v=387';
import { TRAINABLE_SKILLS, ONLINE_RATE_MULTIPLIER, triesPerMinuteFor, manaSpentPerMinute } from '../domain/training.js?v=358';
import { SPELLS } from '../domain/spells.js?v=358';
import { on, EVENTS } from '../shared/eventBus.js?v=358';
import { skillIconImg, spellIconImg, trainingDummyImg } from './shared.js?v=363';
import { startTraining, stopTraining } from '../application/trainingUseCases.js?v=364';
import { t } from '../i18n/i18n.js?v=376';
import { trainingStageHtml, mountTrainingStagePlayer, iniciarPulsoCast, pararPulsoCast } from './trainingStage.js?v=191';

// Magia escolhida no picker do treino online de mago, antes de confirmar
// (estado só de UI — só vira G.trainingSpell quando o treino começa de fato).
let pickedTrainingSpell = null;

// Formata segundos -> "2d 4h" / "3h 20m" / "12m" pra a projeção de treino.
function fmtEta(sec) {
  if (!isFinite(sec) || sec <= 0) return '—';
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(1, m)}m`;
}

// Projeção de ganho pra uma skill NO RITMO `perMin` (tentativas/min pra arma,
// mana/min pra magic): % até o próximo nível, tempo pro próximo e níveis em 8h.
// Dá ao jogador o "porquê" de escolher A vs B — antes o card só mostrava o nível.
function skillProjection(skillId, perMin) {
  const base = TIBIA_SKILLS[skillId] ? TIBIA_SKILLS[skillId].base : 10;
  const sk = (G.sk && G.sk[skillId]) || { lv: base, tries: 0 };
  const prov = !G.graduated; // em Rook treina no ritmo neutro (ver character.js)
  const needed = triesForNext(G.vocation, skillId, sk.lv, prov);
  const pct = needed > 0 ? Math.min(100, Math.round((sk.tries / needed) * 100)) : 0;
  const eta = perMin > 0 ? Math.round((Math.max(0, needed - sk.tries) / perMin) * 60) : Infinity;
  let lv = sk.lv, tr = sk.tries + perMin * 480; // 480 min = 8h
  let lvls = 0, need = triesForNext(G.vocation, skillId, lv, prov);
  while (tr >= need && lvls < 999) { tr -= need; lv++; lvls++; need = triesForNext(G.vocation, skillId, lv, prov); }
  return { pct, eta, lvls };
}

// Barra de progresso + "próximo nível em X" + "+N níveis/8h" (reaproveitado nos
// cards e na grade). perMin<=0 (ex.: magic sem magia escolhida) mostra só a barra.
function projectionHtml(skillId, perMin) {
  const p = skillProjection(skillId, perMin);
  const info = perMin > 0
    ? `<div class="skill-proj-info"><span title="próximo nível">⏭ ${fmtEta(p.eta)}</span><span title="níveis em 8h">+${p.lvls}/8h</span></div>`
    : '';
  return `<div class="skill-proj"><div class="skill-proj-bar"><div class="skill-proj-fill" style="width:${p.pct}%"></div></div>${info}</div>`;
}

// Card do treino ATIVO — sempre com o PALCO (boneco recolorido com o outfit
// fiel + dummy), ver ui/trainingStage.js. O rate exibido é o ACELERADO (jogo
// aberto); a nota lembra que fechado continua no ritmo de descanso.
function activeTrainingCard() {
  const s = TIBIA_SKILLS[G.trainingSkill];
  const ehMagia = G.trainingSkill === 'magic';
  const spell = ehMagia && G.trainingSpell ? SPELLS[G.trainingSpell] : null;
  const mult = ONLINE_RATE_MULTIPLIER; // jogo aberto = ritmo acelerado
  const rate = ehMagia
    ? manaSpentPerMinute(spell, (VOCATIONS[G.vocation] || {}).manaPerMin) * mult
    : triesPerMinuteFor(G.trainingSkill) * mult;
  return `
    <div class="training-active training-active-stage">
      <div class="training-active-info">
        ${trainingStageHtml(G.trainingSkill, spell)}
        <div>
          <div class="training-active-title">🏋️ ${t('training.trainingSkill', { skill: s.name })}</div>
          ${spell ? `<div class="muted">${t('training.usingSpell', { spell: spell.name })}</div>` : ''}
          <div class="muted">${t(ehMagia ? 'training.rateInfoOnlineMagic' : 'training.rateInfoOnline', { rate })}</div>
          ${projectionHtml(G.trainingSkill, rate)}
          <div class="muted training-online-hint">${t('training.unifiedHint')}</div>
        </div>
      </div>
      <button class="btn-small danger" onclick="stopTraining()">⏹ ${t('training.stopTraining')}</button>
    </div>`;
}

export function pickTrainingSpell(spellId) {
  pickedTrainingSpell = pickedTrainingSpell === spellId ? null : spellId;
  renderTrainingSection();
}

export function pickedTrainingSpellId() {
  return pickedTrainingSpell;
}

export function renderTrainingSection() {
  // Painel único (o antigo container de treino online foi unificado aqui). Se o
  // HTML ainda tiver o #online-training-body legado, esvazia pra não duplicar.
  const legacy = document.getElementById('online-training-body');
  if (legacy) legacy.innerHTML = '';

  const el = document.getElementById('training-body');
  if (!el) return;
  pararPulsoCast();
  if (!G.vocation) { el.innerHTML = `<p class="muted">${t('training.chooseVocation')}</p>`; return; }

  // Treinando: card ativo com o palco (boneco + outfit fiel).
  if (G.trainingSkill) {
    el.innerHTML = activeTrainingCard();
    mountTrainingStagePlayer(G.trainingSkill);   // desenha o boneco recolorido (outfit do personagem)
    if (G.trainingSkill === 'magic') iniciarPulsoCast(SPELLS[G.trainingSpell] || null);
    else pararPulsoCast();
    return;
  }

  // Não treinando: grade com TODAS as skills treináveis (qualquer skill). Skills
  // de arma iniciam direto; Magic Level abre o seletor da magia lançada no dummy.
  const skillsDeArma = TRAINABLE_SKILLS.filter(id => id !== 'magic');
  const gradeDeArmas = `
    <div class="training-skill-grid">
      ${skillsDeArma.map(id => {
        const s = TIBIA_SKILLS[id];
        return `<button class="training-skill-btn" onclick="startTraining('${id}')" title="${t('training.dummyTitle', { skill: s.name })}">
          <div class="training-dummy-wrap">
            ${trainingDummyImg('training-dummy-icon')}
            ${skillIconImg(id, s.icon, 'training-dummy-badge')}
          </div>
          <span>${s.name}</span>
          <small>${t('training.level', { lvl: G.sk[id]?.lv ?? s.base })}</small>
          ${projectionHtml(id, triesPerMinuteFor(id) * ONLINE_RATE_MULTIPLIER)}
        </button>`;
      }).join('')}
    </div>`;

  // Magic Level: escolher a magia (ataque OU cura da vocação) lançada no dummy —
  // é ela que anima e define o ganho de ML (mana gasta). Só ataque/cura: conjura
  // consumiria soul/rune, utilidade não faz sentido no boneco.
  const attackSpells = Object.entries(SPELLS)
    .filter(([, sp]) => sp.voc.includes(G.vocation) && (sp.type === 'attack' || sp.type === 'heal'))
    .sort((a, b) => a[1].level - b[1].level);
  const blocoDeMagia = attackSpells.length ? `
    <h4 class="training-subhead">${skillIconImg('magic', '🔮', 'training-subhead-icon')} ${TIBIA_SKILLS.magic.name} — ${t('training.level', { lvl: G.sk.magic?.lv ?? TIBIA_SKILLS.magic.base })}</h4>
    <p class="muted">${t('training.onlineIntroMage')}</p>
    <div class="training-spell-grid">
      ${attackSpells.map(([id, sp]) => {
        const unlocked = G.level >= sp.level;
        const selected = pickedTrainingSpell === id;
        return `<button class="training-spell-btn ${selected ? 'selected' : ''}" ${!unlocked ? 'disabled' : ''} onclick="pickTrainingSpell('${id}')" title="${sp.name}">
          ${spellIconImg(sp.name, sp.icon, 'training-dummy-badge')}
          <span>${sp.name}</span>
          ${!unlocked ? `<small>🔒 Lv ${sp.level}</small>` : ''}
        </button>`;
      }).join('')}
    </div>
    <button class="task-btn" style="margin-top:10px" onclick="startTraining('magic', pickedTrainingSpellId())" ${!pickedTrainingSpell ? 'disabled' : ''}>
      🏋️ ${t('training.startTrainingBtn')}
    </button>` : '';

  el.innerHTML = `
    <p class="muted">${t('training.intro')}</p>
    ${gradeDeArmas}
    ${blocoDeMagia}`;
}

export function wireTrainingPanelEvents() {
  on(EVENTS.TRAINING_PANEL, renderTrainingSection);
}
