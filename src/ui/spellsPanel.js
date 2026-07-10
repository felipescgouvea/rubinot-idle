import { G } from '../application/gameStore.js?v=12';
import { SPELLS } from '../domain/spells.js?v=12';
import { on, EVENTS } from '../shared/eventBus.js?v=12';

export function renderSpellsPanel() {
  const el = document.getElementById('spells-content');
  if (!el) return;
  if (!G.vocation) { el.innerHTML = '<p class="muted">Escolha uma vocação para ver suas magias.</p>'; return; }

  const mySpells = Object.entries(SPELLS).filter(([, s]) => s.voc.includes(G.vocation));
  const atkSel = G.spells.attack, healSel = G.spells.heal;

  el.innerHTML = `
    <div id="skill-points-display" style="margin: 0 0 12px !important">
      <strong>RTC Auto-Cast:</strong>
      ataque = <span>${atkSel ? `${SPELLS[atkSel].icon} "${SPELLS[atkSel].words}"` : 'nenhuma'}</span> ·
      cura (Smart Healing) = <span>${healSel ? `${SPELLS[healSel].icon} "${SPELLS[healSel].words}"` : 'exura (padrão)'}</span>
    </div>
    <div id="skills-grid" style="margin: 0 !important">
    ${mySpells.map(([id, s]) => {
      const unlocked = G.level >= s.level;
      const selected = (s.type === 'attack' && atkSel === id) || (s.type === 'heal' && healSel === id);
      return `<div class="skill-card" style="${selected ? 'border: 2px solid var(--gold); background:#fdf4d7;' : ''} ${!unlocked ? 'opacity:0.55' : ''}">
        <div class="skill-card-header">
          <span class="skill-card-name">${s.icon} ${s.name}</span>
          <span class="skill-card-level" style="font-size:11px">"${s.words}"</span>
        </div>
        <div class="skill-card-desc">
          ${s.type === 'attack' ? `⚔️ Dano ×${s.power}` : `💚 Cura ${Math.round(s.power * 100)}% do HP`}
          · 🔵 ${s.mana} mana · Nível ${s.level}+
        </div>
        <button class="skill-upgrade-btn" onclick="selectSpell('${id}')" ${!unlocked ? 'disabled' : ''}
          style="${selected ? 'background: linear-gradient(180deg, #c9a227, #8f6f2e); border-color:#6e5522;' : ''}">
          ${!unlocked ? `🔒 Requer nível ${s.level}` : selected ? '✅ Selecionada no RTC — clique p/ remover' : s.type === 'attack' ? 'Usar como ataque' : 'Usar como cura'}
        </button>
      </div>`;
    }).join('')}
    </div>`;
}

export function wireSpellsPanelEvents() {
  on(EVENTS.SPELLS_PANEL, renderSpellsPanel);
}
