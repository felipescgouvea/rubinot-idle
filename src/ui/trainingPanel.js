// Seções de Treino — Online (dummy "ativo", exige o jogo aberto, rende mais
// rápido) e Offline (Exercise clássico, roda até fechado) — renderizadas na
// aba Training. Ver application/trainingUseCases.js pras regras.
import { G } from '../application/gameStore.js?v=223';
import { TIBIA_SKILLS, VOCATIONS } from '../domain/character.js?v=250';
import { TRAINABLE_SKILLS, ONLINE_RATE_MULTIPLIER, onlineTrainableSkills, triesPerMinuteFor, manaSpentPerMinute } from '../domain/training.js?v=221';
import { SPELLS } from '../domain/spells.js?v=221';
import { on, EVENTS } from '../shared/eventBus.js?v=221';
import { skillIconImg, spellIconImg, trainingDummyImg } from './shared.js?v=226';
import { startTraining, stopTraining, startOnlineTraining } from '../application/trainingUseCases.js?v=227';
import { t } from '../i18n/i18n.js?v=237';
import { trainingStageHtml, mountTrainingStagePlayer, iniciarPulsoCast, pararPulsoCast } from './trainingStage.js?v=54';

// Magia escolhida no picker do treino online de mago, antes de confirmar
// (estado só de UI — só vira G.trainingSpell quando o treino começa de fato).
let pickedTrainingSpell = null;

function activeTrainingCard(mode) {
  const s = TIBIA_SKILLS[G.trainingSkill];
  const spell = mode === 'online' && G.trainingSpell ? SPELLS[G.trainingSpell] : null;
  // Magic Level não conta tentativas: conta MANA GASTA (ver domain/training.js).
  // A tela dizia "+30 tentativas/min" pra ML, o que não existe no Tibia.
  const ehMagia = G.trainingSkill === 'magic';
  const mult = mode === 'online' ? ONLINE_RATE_MULTIPLIER : 1;
  const rate = ehMagia
    ? manaSpentPerMinute(spell, (VOCATIONS[G.vocation] || {}).manaRegen) * mult
    : triesPerMinuteFor(G.trainingSkill) * mult;
  // Online ganha um PALCO de verdade (boneco + dummy + projétil, ver
  // ui/trainingStage.js). Offline continua com o ícone: ali o jogo nem precisa
  // estar aberto, então animar não faz sentido.
  const cena = mode === 'online'
    ? trainingStageHtml(G.trainingSkill, spell)
    : `<div class="training-dummy-wrap">
          ${trainingDummyImg('training-dummy-icon')}
          ${skillIconImg(G.trainingSkill, s.icon, 'training-dummy-badge')}
        </div>`;
  return `
    <div class="training-active ${mode === 'online' ? 'training-active-stage' : ''}">
      <div class="training-active-info">
        ${cena}
        <div>
          <div class="training-active-title">${mode === 'online' ? '⚔️' : '🏋️'} ${t('training.trainingSkill', { skill: s.name })}</div>
          ${spell ? `<div class="muted">${t('training.usingSpell', { spell: spell.name })}</div>` : ''}
          <div class="muted">${t(mode === 'online' ? (ehMagia ? 'training.rateInfoOnlineMagic' : 'training.rateInfoOnline') : (ehMagia ? 'training.rateInfoMagic' : 'training.rateInfo'), { rate })}</div>
          ${mode === 'online' ? `<div class="muted training-online-hint">${t('training.onlineMustStayOpen')}</div>` : ''}
        </div>
      </div>
      <button class="btn-small danger" onclick="stopTraining()">⏹ ${t('training.stopTraining')}</button>
    </div>`;
}

function renderOnlineTrainingSection() {
  const el = document.getElementById('online-training-body');
  if (!el) return;
  // Qualquer estado que não seja "treino online de magia" não tem pulso: sem
  // isto o intervalo continuava vivo depois de encerrar o treino, acendendo um
  // efeito num palco que nem existe mais.
  pararPulsoCast();
  if (!G.vocation) { el.innerHTML = `<p class="muted">${t('training.chooseVocation')}</p>`; return; }

  if (G.trainingSkill && G.trainingMode === 'online') {
    el.innerHTML = activeTrainingCard('online');
    mountTrainingStagePlayer(G.trainingSkill);   // desenha o boneco recolorido
    // Só o mago tem efeito de magia no palco; quem treina arma usa o projétil.
    if (G.trainingSkill === 'magic') iniciarPulsoCast(SPELLS[G.trainingSpell] || null);
    else pararPulsoCast();
    return;
  }
  if (G.trainingSkill && G.trainingMode !== 'online') {
    el.innerHTML = `<p class="muted">${t('training.onlineBlockedByOffline')}</p>`;
    return;
  }

  // Uma vocação pode treinar skill de ARMA e Magic Level ao mesmo tempo (é o
  // caso do Paladino). Por isso as duas partes são montadas de forma
  // independente, em vez de um if/else por vocação: quem só tem arma vê só a
  // grade de skills (Knight), quem só tem magia vê só o seletor de magia
  // (Sorcerer/Druid), e o Paladino vê os dois.
  const skills = onlineTrainableSkills(G.vocation);
  const skillsDeArma = skills.filter(id => id !== 'magic');
  const temMagia = skills.includes('magic');

  const gradeDeArmas = skillsDeArma.length ? `
    <div class="training-skill-grid">
      ${skillsDeArma.map(id => {
        const s = TIBIA_SKILLS[id];
        return `<button class="training-skill-btn" onclick="startOnlineTraining('${id}')" title="${t('training.dummyTitle', { skill: s.name })}">
          <div class="training-dummy-wrap">
            ${trainingDummyImg('training-dummy-icon')}
            ${skillIconImg(id, s.icon, 'training-dummy-badge')}
          </div>
          <span>${s.name}</span>
          <small>${t('training.level', { lvl: G.sk[id]?.lv ?? s.base })}</small>
        </button>`;
      }).join('')}
    </div>` : '';

  // Magic Level exige escolher ANTES qual magia de ataque vai ser lançada no
  // dummy — é ela que aparece na animação e define o elemento do golpe.
  // TODA magia da vocação serve pra treinar Magic Level — de ataque E de cura.
  // No Tibia o ML sobe por mana gasta, não pelo tipo da magia; restringir a
  // ataque deixava o Paladino sem NENHUMA opção antes do nível 23 (a primeira
  // magia de ataque dele é Ethereal Spear), com a lista inteira cadeada.
  // Ordena por nível: as que já dá pra usar aparecem primeiro.
  // Só ataque e cura: conjuração exige soul points e Blank Rune que o treino
  // não consome (viraria ML de graça), e utilidade não tem o que fazer contra
  // um boneco. Era por isso que aparecia "Conjure Explosive Arrow" na lista.
  const attackSpells = temMagia
    ? Object.entries(SPELLS)
        .filter(([, sp]) => sp.voc.includes(G.vocation) && (sp.type === 'attack' || sp.type === 'heal'))
        .sort((a, b) => a[1].level - b[1].level)
    : [];
  // O cabeçalho + explicação da magia só aparecem quando há TAMBÉM skill de
  // arma na tela (Paladino) — pro mago puro a intro geral já diz isso, e
  // repetir o mesmo parágrafo duas vezes ficaria redundante.
  const blocoDeMagia = temMagia ? `
    ${skillsDeArma.length ? `
      <h4 class="training-subhead">${skillIconImg('magic', '🔮', 'training-subhead-icon')} ${TIBIA_SKILLS.magic.name} — ${t('training.level', { lvl: G.sk.magic?.lv ?? TIBIA_SKILLS.magic.base })}</h4>
      <p class="muted">${t('training.onlineIntroMage')}</p>` : ''}
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
    <button class="task-btn" style="margin-top:10px" onclick="startOnlineTraining('magic', pickedTrainingSpellId())" ${!pickedTrainingSpell ? 'disabled' : ''}>
      ⚔️ ${t('training.startOnlineTraining')}
    </button>` : '';

  const intro = skillsDeArma.length === 1 && !temMagia
    ? t('training.onlineIntroFixed', { skill: TIBIA_SKILLS[skillsDeArma[0]].name })
    : skillsDeArma.length ? t('training.onlineIntro') : t('training.onlineIntroMage');

  el.innerHTML = `
    <p class="muted">${intro}</p>
    ${gradeDeArmas}
    ${blocoDeMagia}`;
}

export function pickTrainingSpell(spellId) {
  pickedTrainingSpell = pickedTrainingSpell === spellId ? null : spellId;
  renderOnlineTrainingSection();
}

export function pickedTrainingSpellId() {
  return pickedTrainingSpell;
}

export function renderTrainingSection() {
  renderOnlineTrainingSection();

  const el = document.getElementById('training-body');
  if (!el) return;
  if (!G.vocation) { el.innerHTML = `<p class="muted">${t('training.chooseVocation')}</p>`; return; }

  if (G.trainingSkill && G.trainingMode === 'online') {
    el.innerHTML = `<p class="muted">${t('training.offlineBlockedByOnline')}</p>`;
    return;
  }
  if (G.trainingSkill) {
    el.innerHTML = activeTrainingCard('offline');
    return;
  }

  el.innerHTML = `
    <p class="muted">${t('training.intro')}</p>
    <div class="training-skill-grid">
      ${TRAINABLE_SKILLS.map(id => {
        const s = TIBIA_SKILLS[id];
        return `<button class="training-skill-btn" onclick="startTraining('${id}')" title="${t('training.dummyTitle', { skill: s.name })}">
          <div class="training-dummy-wrap">
            ${trainingDummyImg('training-dummy-icon')}
            ${skillIconImg(id, s.icon, 'training-dummy-badge')}
          </div>
          <span>${s.name}</span>
          <small>${t('training.level', { lvl: G.sk[id]?.lv ?? s.base })}</small>
        </button>`;
      }).join('')}
    </div>`;
}

export function wireTrainingPanelEvents() {
  on(EVENTS.TRAINING_PANEL, renderTrainingSection);
}
