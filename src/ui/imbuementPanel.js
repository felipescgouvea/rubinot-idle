// Modal de Imbuements — escolhe um aprimoramento pra arma equipada, mostra
// custo (gold + materiais) e o imbuement ativo com tempo restante. O efeito é
// resolvido no combate pelo servidor (ver huntEngine.js).
import { G } from '../application/gameStore.js?v=147';
import { IMBUEMENTS, isImbuementActive } from '../domain/imbuements.js?v=143';
import { ITEMS } from '../domain/items.js?v=158';
import { canImbue } from '../application/imbuementUseCases.js?v=143';
import { openModal } from './shared.js?v=150';

function fmtRemaining(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expirado';
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function imbueHtml() {
  const active = G.imbuements && G.imbuements.weapon;
  const activeOn = isImbuementActive(active);
  const activeDef = activeOn ? IMBUEMENTS[active.id] : null;
  const activeHtml = activeOn
    ? `<div class="imbue-active">Ativo na arma: <b>${activeDef.icon} ${activeDef.name}</b> · ${activeDef.desc} · ⏳ ${fmtRemaining(active.expiresAt)}</div>`
    : `<div class="imbue-active muted">Nenhum imbuement ativo na arma.</div>`;
  const rows = Object.entries(IMBUEMENTS).map(([id, def]) => {
    const pre = canImbue(id);
    const mats = def.cost.materials.map(([itemId, qty]) => {
      const have = G.inventory[itemId] || 0;
      return `<span class="${have >= qty ? '' : 'imbue-lack'}">${qty}x ${ITEMS[itemId]?.name || itemId} (${have})</span>`;
    }).join(', ');
    return `<div class="imbue-row">
      <div class="imbue-head"><span class="imbue-icon">${def.icon}</span> <b>${def.name}</b> <small>${def.desc}</small></div>
      <div class="imbue-cost">💰 ${def.cost.gold.toLocaleString()} · ${mats} · ⏳ ${def.durationH}h</div>
      <button class="imbue-btn" ${pre.ok ? '' : 'disabled'} onclick="applyImbuementClick('${id}')" title="${pre.ok ? 'Aplicar' : pre.reason}">Aplicar</button>
    </div>`;
  }).join('');
  return `<h3>🔮 Imbuements</h3>
    ${activeHtml}
    <div class="muted" style="font-size:12px;margin:6px 0">Aplicar troca o imbuement atual da arma. Trocar de arma perde o imbuement.</div>
    <div class="imbue-list">${rows}</div>`;
}

export function openImbueModal() {
  openModal(imbueHtml());
}

// Chamado pelo botão Aplicar — importa dinamicamente pra não acoplar a UI ao
// use case de forma circular; re-renderiza o modal após aplicar.
export async function applyImbuementClick(id) {
  const { applyImbuement } = await import('../application/imbuementUseCases.js?v=143');
  await applyImbuement(id);
  openModal(imbueHtml());
}
