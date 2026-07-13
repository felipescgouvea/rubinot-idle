// Painel Admin (aba ⚙️): o dono ajusta taxas de XP/skills/gold/loot, a chance
// de relíquia por boss e os pesos de cada raridade. Lê/escreve via
// application/adminUseCases.js; as mudanças aplicam na hora e são salvas.
import { ADMIN_RATE_FIELDS, RARITY_TIER_ORDER, rarityChancePercents, zoneSpawnPercents } from '../domain/adminConfig.js?v=123';
import { RARITY_TIERS } from '../domain/rarity.js?v=123';
import { ZONES, MONSTERS } from '../domain/bestiary.js?v=123';
import { on, EVENTS } from '../shared/eventBus.js?v=123';
import { getAdminConfig, getZoneSpawn } from '../application/adminUseCases.js?v=123';

// Zona selecionada no sub-painel de Spawn (estado só de UI, preservado entre
// re-renders do painel). Começa na primeira zona.
let adminSpawnZone = null;
export function setAdminSpawnZone(zoneId) {
  adminSpawnZone = zoneId;
  renderAdminPanel();
}

// Sub-painel "Spawn de monstros por hunt": escolhe a zona e configura a % de
// cada monstro (peso relativo) e a faixa do tamanho do grupo (min..max).
function renderSpawnSubPanel() {
  const zoneIds = Object.keys(ZONES);
  if (!zoneIds.length) return '';
  const sel = zoneIds.includes(adminSpawnZone) ? adminSpawnZone : zoneIds[0];
  const zone = ZONES[sel];
  const spawn = getZoneSpawn(sel, zone.monsters);
  const pcts = zoneSpawnPercents(spawn.weights, zone.monsters);
  const options = zoneIds.map(id => `<option value="${id}" ${id === sel ? 'selected' : ''}>${ZONES[id].icon} ${ZONES[id].name}</option>`).join('');
  const monsterRows = zone.monsters.map(mid => {
    const m = MONSTERS[mid];
    const name = m ? m.name : mid;
    const icon = m ? m.icon : '❓';
    return `
    <div class="admin-spawn-row">
      <span class="admin-spawn-name">${icon} ${name}</span>
      <input type="number" min="0" step="1" value="${spawn.weights[mid]}"
        onchange="setZoneSpawnWeight('${sel}', '${mid}', parseFloat(this.value))" title="Peso relativo" />
      <span class="admin-spawn-pct">${pcts[mid]}%</span>
    </div>`;
  }).join('');
  return `
    <h4>🎯 Spawn de monstros por hunt</h4>
    <div class="admin-field">
      <label>Escolha a hunt</label>
      <select class="admin-spawn-select" onchange="setAdminSpawnZone(this.value)">${options}</select>
      <small>Configure a % de cada monstro (peso relativo — a % é peso/soma) e a frequência do grupo. Só vale na caçada comum (o Boss Rush é sempre 1 boss).</small>
    </div>
    <div class="admin-grid">
      <div class="admin-field">
        <label>Grupo mínimo</label>
        <div class="admin-input-row">
          <input type="number" min="1" step="1" value="${spawn.packMin}"
            onchange="setZonePackRange('${sel}', 'packMin', parseFloat(this.value))" />
          <span class="admin-x">👾</span>
        </div>
        <small>Quantidade mínima de criaturas por grupo.</small>
      </div>
      <div class="admin-field">
        <label>Grupo máximo</label>
        <div class="admin-input-row">
          <input type="number" min="1" step="1" value="${spawn.packMax}"
            onchange="setZonePackRange('${sel}', 'packMax', parseFloat(this.value))" />
          <span class="admin-x">👾</span>
        </div>
        <small>Cada aparição sorteia um tamanho aleatório nesse intervalo.</small>
      </div>
    </div>
    <div class="admin-field">
      <label>% de cada monstro na hunt</label>
      <div class="admin-spawn-list">${monsterRows}</div>
    </div>`;
}

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

  // Lista de zonas com override de XP/Gold — o input mostra o valor efetivo
  // (override do dono se houver, senão a progressão embutida da zona).
  const zoneMultRows = Object.entries(ZONES).map(([id, z]) => {
    const ov = cfg.zoneMultipliers[id] || {};
    const xpVal = ov.xp != null ? ov.xp : z.xpMult;
    const goldVal = ov.gold != null ? ov.gold : z.goldMult;
    return `
    <div class="admin-zone-row">
      <span class="admin-zone-name">${z.icon} ${z.name}</span>
      <label class="admin-zone-mult">XP ×<input type="number" min="0" step="0.1" value="${xpVal}"
        onchange="setZoneMultiplier('${id}', 'xp', parseFloat(this.value))" /></label>
      <label class="admin-zone-mult">Gold ×<input type="number" min="0" step="0.1" value="${goldVal}"
        onchange="setZoneMultiplier('${id}', 'gold', parseFloat(this.value))" /></label>
    </div>`;
  }).join('');

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

    <h4>⏱️ Tempo de aparição das criaturas</h4>
    <div class="admin-grid">
      <div class="admin-field">
        <label>Mínimo</label>
        <div class="admin-input-row">
          <input type="number" min="0" step="0.1" value="${cfg.spawnDelayMin}"
            onchange="setAdminRate('spawnDelayMin', parseFloat(this.value))" />
          <span class="admin-x">s</span>
        </div>
        <small>Tempo mínimo procurando até o próximo grupo surgir.</small>
      </div>
      <div class="admin-field">
        <label>Máximo</label>
        <div class="admin-input-row">
          <input type="number" min="0" step="0.1" value="${cfg.spawnDelayMax}"
            onchange="setAdminRate('spawnDelayMax', parseFloat(this.value))" />
          <span class="admin-x">s</span>
        </div>
        <small>Cada aparição sorteia um tempo aleatório nesse intervalo.</small>
      </div>
    </div>

    ${renderSpawnSubPanel()}

    <h4>🗺️ Multiplicadores de XP/Gold por hunt</h4>
    <div class="admin-field">
      <label class="admin-toggle-row">
        <input type="checkbox" ${cfg.useZoneMultipliers ? 'checked' : ''}
          onchange="setUseZoneMultipliers(this.checked)" />
        Aplicar multiplicadores de zona
      </label>
      <small>${cfg.useZoneMultipliers
        ? 'Cada zona multiplica a XP/gold base pela sua progressão — ou pelo valor que você definir abaixo.'
        : '🛡️ Modo Tibia (padrão): XP e gold iguais ao valor-base de cada criatura, sem multiplicador de zona.'}</small>
    </div>
    ${cfg.useZoneMultipliers ? `<div class="admin-zone-list">${zoneMultRows}</div>` : ''}

    <h4>🏪 Mercado entre jogadores</h4>
    <div class="admin-field">
      <label class="admin-toggle-row">
        <input type="checkbox" ${cfg.marketEnabled ? 'checked' : ''}
          onchange="setMarketEnabled(this.checked)" />
        Ativar o Mercado entre jogadores
      </label>
      <small>${cfg.marketEnabled
        ? 'A aba 🏪 Mercado está visível e os jogadores podem comprar/vender itens entre si.'
        : '🚧 Desativado (padrão por enquanto): a aba 🏪 Mercado fica escondida e a economia player-to-player fica fechada.'}</small>
    </div>

    <h4>⚙️ Fidelidades opcionais (Tibia)</h4>
    <div class="admin-field">
      <label class="admin-toggle-row">
        <input type="checkbox" ${cfg.staminaEnabled ? 'checked' : ''} onchange="setStaminaEnabled(this.checked)" />
        Stamina (cai caçando, regenera descansando)
      </label>
      <small>${cfg.staminaEnabled
        ? 'Ligada: abaixo de 14h de stamina a XP cai pela metade (como no Tibia).'
        : 'Desligada (padrão): sem penalidade de stamina.'}</small>
    </div>
    <div class="admin-field">
      <label class="admin-toggle-row">
        <input type="checkbox" ${cfg.consumeAmmo ? 'checked' : ''} onchange="setConsumeAmmo(this.checked)" />
        Consumo de munição do paladino
      </label>
      <small>${cfg.consumeAmmo
        ? 'Ligado: cada tiro gasta 1 flecha/dardo; sem munição, o paladino só soca.'
        : 'Desligado (padrão): munição infinita.'}</small>
    </div>

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
