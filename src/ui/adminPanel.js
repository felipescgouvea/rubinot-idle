// Painel Admin (aba ⚙️): o dono ajusta taxas de XP/skills/gold/loot, spawn de
// monstros por hunt e os drops (relíquias + itens normais), em 3 sub-abas pra
// não virar uma tela só gigante. Lê/escreve via application/adminUseCases.js;
// as mudanças aplicam na hora e são salvas.
import { ADMIN_RATE_FIELDS, RARITY_TIER_ORDER, zoneSpawnPercents } from '../domain/adminConfig.js?v=359';
import { RARITY_TIERS } from '../domain/rarity.js?v=357';
import { ZONES, MONSTERS } from '../domain/bestiary.js?v=379';
import { ITEMS } from '../domain/items.js?v=371';
import { on, EVENTS } from '../shared/eventBus.js?v=358';
import { getAdminConfig, getZoneSpawn, getMonsterLoot } from '../application/adminUseCases.js?v=361';
import { itemIconImg } from './shared.js?v=363';
import { zoneIconImg, monsterSpriteImg } from './huntPanel.js?v=377';
import { t } from '../i18n/i18n.js?v=376';

// Sub-aba ativa do Painel Admin (estado só de UI, preservado entre re-renders
// — mesmo padrão do RTC, ver ui/rtcPanel.js: activeRtcTab).
let adminActiveTab = 'general';
export function setAdminTab(tab) {
  if (!['general', 'spawn', 'loot'].includes(tab)) return;
  adminActiveTab = tab;
  renderAdminPanel();
}

// Zona selecionada no sub-painel de Spawn (estado só de UI, preservado entre
// re-renders do painel). Começa na primeira zona.
let adminSpawnZone = null;
export function setAdminSpawnZone(zoneId) {
  adminSpawnZone = zoneId;
  renderAdminPanel();
}

// Zona selecionada no sub-painel de Loot (mesma ideia do spawn acima, estado
// próprio pra não interferir na seleção do spawn quando o dono troca de aba).
let adminLootZone = null;
export function setAdminLootZone(zoneId) {
  adminLootZone = zoneId;
  renderAdminPanel();
}

// Sub-aba "Geral": taxas globais, tempo de spawn, multiplicadores de zona,
// mercado e fidelidades opcionais. Tudo que não é spawn por monstro nem loot.
function renderGeneralSubPanel(cfg) {
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
    const xpVal = ov.xp != null ? ov.xp : 1;
    const goldVal = ov.gold != null ? ov.gold : 1;
    return `
    <div class="admin-zone-row">
      <span class="admin-zone-name">${zoneIconImg(z, 'admin-zone-icon-img')} ${t(z.name)}</span>
      <label class="admin-zone-mult">XP ×<input type="number" min="0" step="0.1" value="${xpVal}"
        onchange="setZoneMultiplier('${id}', 'xp', parseFloat(this.value))" /></label>
      <label class="admin-zone-mult">Gold ×<input type="number" min="0" step="0.1" value="${goldVal}"
        onchange="setZoneMultiplier('${id}', 'gold', parseFloat(this.value))" /></label>
    </div>`;
  }).join('');

  return `
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

    <h4>🏹 Velocidade do projétil</h4>
    <div class="admin-field">
      <label>Duração do voo</label>
      <div class="admin-input-row">
        <input type="range" min="60" max="1000" step="10" value="${cfg.projectileSpeedMs}"
          oninput="this.nextElementSibling.textContent = this.value + ' ms'"
          onchange="setAdminRate('projectileSpeedMs', parseInt(this.value, 10))" style="flex:1" />
        <span class="admin-x">${cfg.projectileSpeedMs} ms</span>
      </div>
      <small>Tempo (em ms) que a flecha/virote/raio leva do boneco até o alvo. Menor = mais rápido. A queda de vida na barra acompanha esse mesmo tempo.</small>
    </div>

    <button class="btn-small danger" style="margin-top:14px" onclick="resetAdminConfig()">🔄 Restaurar padrões</button>`;
}

// Sub-aba "Spawn de Hunts": escolhe a zona e configura a % de cada monstro
// (peso relativo) e a faixa do tamanho do grupo (min..max).
function renderSpawnSubPanel() {
  const zoneIds = Object.keys(ZONES);
  if (!zoneIds.length) return '';
  const sel = zoneIds.includes(adminSpawnZone) ? adminSpawnZone : zoneIds[0];
  const zone = ZONES[sel];
  const spawn = getZoneSpawn(sel, zone.monsters, zone.spawn);
  const pcts = zoneSpawnPercents(spawn.weights, zone.monsters);
  const options = zoneIds.map(id => `<option value="${id}" ${id === sel ? 'selected' : ''}>${ZONES[id].icon} ${t(ZONES[id].name)}</option>`).join('');
  const monsterRows = zone.monsters.map(mid => {
    const m = MONSTERS[mid];
    const name = m ? m.name : mid;
    const icon = m ? monsterSpriteImg(mid, 'admin-spawn-icon-img') : '❓';
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
      <small>Configure a % de cada monstro (peso relativo — a % é peso/soma) e a frequência do grupo. Só vale na caçada comum (o Boss Zone é sempre 1 boss).</small>
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

// Sub-aba "Loot": % direta de cada raridade de Relíquia (drop de boss) + a
// chance de cada item normal cair, monstro a monstro (override do bestiário).
function renderLootSubPanel(cfg) {
  const rarityRows = RARITY_TIER_ORDER.map(id => {
    const tier = RARITY_TIERS[id];
    return `
    <div class="admin-rarity-row">
      <span class="admin-rarity-name" style="color:${tier.color}">💎 ${t(tier.name)}</span>
      <input type="number" min="0" max="100" step="0.1" value="${cfg.rarityWeights[id]}"
        onchange="setRarityPercent('${id}', parseFloat(this.value))" title="% desta raridade, independente das outras" />
      <span class="admin-x">%</span>
    </div>`;
  }).join('');

  const zoneIds = Object.keys(ZONES);
  const sel = zoneIds.includes(adminLootZone) ? adminLootZone : zoneIds[0];
  const zone = sel ? ZONES[sel] : null;
  const options = zoneIds.map(id => `<option value="${id}" ${id === sel ? 'selected' : ''}>${ZONES[id].icon} ${t(ZONES[id].name)}</option>`).join('');
  const monsterBlocks = zone ? zone.monsters.map(mid => {
    const m = MONSTERS[mid];
    if (!m || !m.loot || !m.loot.length) return '';
    const effectiveLoot = getMonsterLoot(mid, m.loot); // [[itemId, chance0..1], ...] — mesma ordem de m.loot
    const itemRows = effectiveLoot.map(([itemId, effective], idx) => {
      const baseChance = m.loot[idx][1];
      const item = ITEMS[itemId];
      const overridden = !!(cfg.lootOverrides && cfg.lootOverrides[mid] && Number.isFinite(cfg.lootOverrides[mid][itemId]));
      return `
      <div class="admin-loot-row">
        <span class="admin-loot-item">${itemIconImg(itemId, 'admin-loot-icon')} ${item ? item.name : itemId}</span>
        <input type="number" min="0" step="0.01" value="${+(effective * 100).toFixed(2)}"
          onchange="setLootChance('${mid}','${itemId}', parseFloat(this.value))" title="Padrão do jogo: ${+(baseChance * 100).toFixed(2)}%" />
        <span class="admin-x">%</span>
        ${overridden ? `<button class="admin-loot-reset" title="Voltar ao padrão (${+(baseChance * 100).toFixed(2)}%)" onclick="resetLootChance('${mid}','${itemId}')">↺</button>` : '<span class="admin-loot-reset-spacer"></span>'}
      </div>`;
    }).join('');
    return `
    <div class="admin-loot-monster">
      <div class="admin-loot-monster-name">${monsterSpriteImg(mid, 'admin-loot-monster-icon')} ${m.name}</div>
      ${itemRows}
    </div>`;
  }).join('') : '';

  return `
    <h4>💎 Raridade das Relíquias</h4>
    <div class="admin-field">
      <label>Chance de relíquia por boss</label>
      <div class="admin-input-row">
        <input type="number" min="0" max="100" step="0.5" value="${+(cfg.relicDropChance * 100).toFixed(2)}"
          onchange="setRelicDropChancePct(parseFloat(this.value))" />
        <span class="admin-x">%</span>
      </div>
      <small>Probabilidade de cair PELO MENOS 1 relíquia ao matar um boss — se cair, cada raridade abaixo rola a sua própria % pra decidir quais relíquias saem.</small>
    </div>
    <div class="admin-field">
      <label>% de cada raridade <small>cada uma é independente das outras — não precisam somar 100%, e mais de uma pode bater no mesmo drop (vira uma relíquia pra cada raridade que bateu)</small></label>
      <div class="admin-rarity-list">${rarityRows}</div>
    </div>

    <h4>📦 Drop de itens normais por monstro</h4>
    <div class="admin-field">
      <label>Escolha a hunt</label>
      <select class="admin-spawn-select" onchange="setAdminLootZone(this.value)">${options}</select>
      <small>% de chance de CADA item cair ao matar o monstro (são independentes entre si, não precisam somar 100%). A Taxa de Loot da aba Geral multiplica tudo isso por cima. ↺ volta um item ao padrão do jogo.</small>
    </div>
    <div class="admin-loot-list">${monsterBlocks || '<p class="muted">Nenhum item de loot nesta hunt.</p>'}</div>`;
}

export function renderAdminPanel() {
  const el = document.getElementById('admin-content');
  if (!el) return;
  const cfg = getAdminConfig();

  el.innerHTML = `
    <div class="admin-warn">⚠️ Painel do dono — altera o balanceamento do jogo. As mudanças valem na hora e ficam salvas.</div>

    <div class="admin-subtabs">
      <button class="admin-subtab-btn ${adminActiveTab === 'general' ? 'active' : ''}" onclick="setAdminTab('general')">⚙️ Geral</button>
      <button class="admin-subtab-btn ${adminActiveTab === 'spawn' ? 'active' : ''}" onclick="setAdminTab('spawn')">🎯 Spawn de Hunts</button>
      <button class="admin-subtab-btn ${adminActiveTab === 'loot' ? 'active' : ''}" onclick="setAdminTab('loot')">💰 Loot</button>
    </div>

    ${adminActiveTab === 'general' ? renderGeneralSubPanel(cfg) : ''}
    ${adminActiveTab === 'spawn' ? renderSpawnSubPanel() : ''}
    ${adminActiveTab === 'loot' ? renderLootSubPanel(cfg) : ''}
  `;
}

export function wireAdminPanelEvents() {
  on(EVENTS.ADMIN_PANEL, renderAdminPanel);
}
