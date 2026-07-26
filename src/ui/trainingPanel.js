// Seções de Treino — Online (dummy "ativo", exige o jogo aberto, rende mais
// rápido) e Offline (Exercise clássico, roda até fechado) — renderizadas na
// aba Training. Ver application/trainingUseCases.js pras regras.
import { G } from '../application/gameStore.js?v=328';
import { TIBIA_SKILLS, VOCATIONS, triesForNext } from '../domain/character.js?v=355';
import { TRAINABLE_SKILLS, ONLINE_RATE_MULTIPLIER, onlineTrainableSkills, triesPerMinuteFor, manaSpentPerMinute } from '../domain/training.js?v=326';
import { SPELLS } from '../domain/spells.js?v=326';
import { on, EVENTS } from '../shared/eventBus.js?v=326';
import { skillIconImg, spellIconImg, trainingDummyImg } from './shared.js?v=331';
import { startTraining, stopTraining, startOnlineTraining } from '../application/trainingUseCases.js?v=332';
import { t } from '../i18n/i18n.js?v=344';
import { trainingStageHtml, mountTrainingStagePlayer, iniciarPulsoCast, pararPulsoCast } from './trainingStage.js?v=159';

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

function activeTrainingCard(mode) {
  const s = TIBIA_SKILLS[G.trainingSkill];
  const spell = mode === 'online' && G.trainingSpell ? SPELLS[G.trainingSpell] : null;
  // Magic Level não conta tentativas: conta MANA GASTA (ver domain/training.js).
  // A tela dizia "+30 tentativas/min" pra ML, o que não existe no Tibia.
  const ehMagia = G.trainingSkill === 'magic';
  const mult = mode === 'online' ? ONLINE_RATE_MULTIPLIER : 1;
  const rate = ehMagia
    ? manaSpentPerMinute(spell, (VOCATIONS[G.vocation] || {}).manaPerMin) * mult
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
          ${projectionHtml(G.trainingSkill, rate)}
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
          ${projectionHtml(id, triesPerMinuteFor(id) * ONLINE_RATE_MULTIPLIER)}
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
          ${projectionHtml(id, id === 'magic' ? 0 : triesPerMinuteFor(id))}
        </button>`;
      }).join('')}
    </div>`;
}

export function wireTrainingPanelEvents() {
  on(EVENTS.TRAINING_PANEL, renderTrainingSection);
}
