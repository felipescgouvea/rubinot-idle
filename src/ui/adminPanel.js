// Painel Admin (aba ⚙️): o dono ajusta taxas de XP/skills/gold/loot, a chance
// de relíquia por boss e os pesos de cada raridade. Lê/escreve via
// application/adminUseCases.js; as mudanças aplicam na hora e são salvas.
import { ADMIN_RATE_FIELDS, RARITY_TIER_ORDER, rarityChancePercents } from '../domain/adminConfig.js?v=50';
import { RARITY_TIERS } from '../domain/rarity.js?v=50';
import { on, EVENTS } from '../shared/eventBus.js?v=50';
import { getAdminConfig } from '../application/adminUseCases.js?v=50';

export function renderAdminPanel() {
  const el = document.getElementById('admin-content');
  if (!el) return;
  const cfg = getAdminConfig();
  const pct = rarityChancePercents(cfg.rarityWeights);

  const rateInputs = ADMIN_RATE_FIELDS.map(f => `
    <div class="admin-field">
      <label>${f.label}</label>
      <div class="admin-input-row">
        <input type="number" min="0" step="0.1" value="${cfg[f.key]}"
          onchange="setAdminRate('${f.key}', parseFloat(this.value))" />
        <span class="admin-x">×</span>
      </div>
      <small>${f.hint}</small>
    </div>`).join('');

  const rarityRows = RARITY_TIER_ORDER.map(id => {
    const tier = RARITY_TIERS[id];
    return `
    <div class="admin-rarity-row">
      <span class="admin-rarity-name" style="color:${tier.color}">💎 ${tier.name}</span>
      <input type="number" min="0" step="1" value="${cfg.rarityWeights[id]}"
        onchange="setRarityWeight('${id}', parseFloat(this.value))" title="Peso relativo" />
      <span class="admin-rarity-pct">${pct[id]}%</span>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="admin-warn">⚠️ Painel do dono — altera o balanceamento do jogo. As mudanças valem na hora e ficam salvas.</div>

    <h4>📈 Taxas (multiplicadores)</h4>
    <div class="admin-grid">${rateInputs}</div>

    <h4>💎 Raridade das Relíquias</h4>
    <div class="admin-field">
      <label>Chance de relíquia por boss</label>
      <div class="admin-input-row">
        <input type="number" min="0" max="100" step="0.5" value="${+(cfg.relicDropChance * 100).toFixed(2)}"
          onchange="setRelicDropChancePct(parseFloat(this.value))" />
        <span class="admin-x">%</span>
      </div>
      <small>Probabilidade de cair 1 relíquia ao matar um boss.</small>
    </div>
    <div class="admin-field">
      <label>Peso de cada raridade <small>(a % é relativa à soma dos pesos)</small></label>
      <div class="admin-rarity-list">${rarityRows}</div>
    </div>

    <button class="btn-small danger" style="margin-top:14px" onclick="resetAdminConfig()">🔄 Restaurar padrões</button>
  `;
}

export function wireAdminPanelEvents() {
  on(EVENTS.ADMIN_PANEL, renderAdminPanel);
}
