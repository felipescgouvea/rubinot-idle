import { G } from '../application/gameStore.js?v=12';
import { RTC_SETTINGS, computeRtcMods } from '../domain/shopCatalog.js?v=12';
import { SPELLS } from '../domain/spells.js?v=12';
import { on, EVENTS } from '../shared/eventBus.js?v=12';

export function renderRtcPanel() {
  const el = document.getElementById('rtc-settings');
  if (!el) return;
  const mods = computeRtcMods(G.rtc);
  const summary = [
    mods.lootBonus > 0 ? `+${Math.round(mods.lootBonus * 100)}% loot` : null,
    mods.goldTax > 0 ? `-${Math.round(mods.goldTax * 100)}% taxa gold` : null,
    mods.smartHeal ? 'auto-heal' : null,
    mods.spdMult !== 1 ? `${mods.spdMult > 1 ? '+' : ''}${Math.round((mods.spdMult - 1) * 100)}% vel. ataque` : null,
    mods.xpMult !== 1 ? `${mods.xpMult > 1 ? '+' : ''}${Math.round((mods.xpMult - 1) * 100)}% XP` : null,
    mods.dmgMult !== 1 ? `${mods.dmgMult > 1 ? '+' : ''}${Math.round((mods.dmgMult - 1) * 100)}% dano` : null,
    mods.goldMult !== 1 ? `${Math.round((mods.goldMult - 1) * 100)}% gold` : null,
  ].filter(Boolean).join(' · ') || 'configuração neutra';

  const atkS = G.spells?.attack ? SPELLS[G.spells.attack] : null;
  const healS = G.spells?.heal ? SPELLS[G.spells.heal] : null;
  el.innerHTML = `
    <div id="skill-points-display" style="margin-bottom:14px">
      <strong>🖥️ Efeitos ativos do RTC:</strong> <span>${summary}</span><br/>
      <strong>🗣️ Auto-cast (aba Spells):</strong> <span>${atkS ? `"${atkS.words}"` : 'sem spell de ataque'} · ${healS ? `"${healS.words}"` : 'cura padrão (exura)'}</span>
    </div>
    <div id="skills-grid">
    ${RTC_SETTINGS.map(s => {
      const val = G.rtc[s.id];
      let control;
      if (s.type === 'toggle') {
        control = `<button class="skill-upgrade-btn" onclick="setRtc('${s.id}', ${!val})" style="${val ? '' : 'background:var(--panel-3);border-color:var(--border);color:var(--ink-faint)'}">
          ${val ? '✅ LIGADO — clique p/ desligar' : '⬜ DESLIGADO — clique p/ ligar'}
        </button>`;
      } else {
        control = `<div style="display:flex;gap:6px">${s.options.map(o =>
          `<button class="task-btn ${val === o ? 'done' : ''}" onclick="setRtc('${s.id}', '${o}')" style="flex:1;text-transform:capitalize">${o}</button>`
        ).join('')}</div>`;
      }
      return `<div class="skill-card">
        <div class="skill-card-header">
          <span class="skill-card-name">${s.icon} ${s.name}</span>
        </div>
        <div class="skill-card-desc">${s.desc}</div>
        ${control}
      </div>`;
    }).join('')}
    </div>`;
}

export function wireRtcPanelEvents() {
  on(EVENTS.RTC_PANEL, renderRtcPanel);
}
