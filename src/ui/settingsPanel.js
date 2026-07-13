// Painel de Configurações (⚙️): resume num só lugar informações e opções que
// hoje ficam espalhadas pelo jogo — conta logada, status do save (local +
// nuvem) e o auto-vender lixo (que só existia dentro da Bag). Não introduz
// estado novo: reaproveita G.autoSell e setAutoSell/setAutoSellMax (mesmas
// funções da Bag, ver ui/inventoryAndEquipmentPanel.js) e G.lastSave (grava-
// do em cada saveGame, ver application/saveGameUseCase.js).
import { G } from '../application/gameStore.js?v=124';
import { currentUser } from '../infrastructure/authClient.js?v=124';
import { goldIconImg, openModal } from './shared.js?v=124';

function fmtLastSave() {
  if (!G.lastSave) return 'ainda não salvo nesta sessão';
  const d = new Date(G.lastSave);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// A versão exibida é a mesma query string ?v= usada pro cache-busting dos
// assets (index.html) — não é um número de versão formal, só um proxy
// sempre-atualizado do "build" atual, sem precisar manter uma constante à parte.
function gameVersion() {
  try {
    const link = document.querySelector('link[rel="stylesheet"]');
    return new URL(link.href, location.href).searchParams.get('v') || '?';
  } catch {
    return '?';
  }
}

export function openSettingsPanel() {
  const user = currentUser();
  const as = G.autoSell || { enabled: false, maxValue: 50 };
  openModal(`
    <h3>⚙️ Configurações</h3>

    <div class="settings-section">
      <h4>Conta</h4>
      <p class="settings-row">👤 ${user?.email || 'não logado'}</p>
      <button class="btn-small danger" onclick="closeModal(); logout()">Sair da conta</button>
    </div>

    <div class="settings-section">
      <h4>Save</h4>
      <p class="settings-row">Salva local a cada 30s · envia pra nuvem ~8s após cada mudança.</p>
      <p class="settings-row">Último save local: <strong>${fmtLastSave()}</strong></p>
      <button class="btn-small" onclick="saveGame(); openSettingsPanel()">💾 Salvar agora</button>
    </div>

    <div class="settings-section">
      <h4>Auto-vender lixo <span class="muted">(itens de material na Bag)</span></h4>
      <div class="autosell-row">
        <label class="autosell-toggle"><input type="checkbox" ${as.enabled ? 'checked' : ''} onchange="setAutoSell(this.checked)" /> 🧹 Vender automaticamente</label>
        <span class="autosell-max">≤ <input type="number" min="0" class="autosell-input" value="${as.maxValue}" onchange="setAutoSellMax(this.value)" /> ${goldIconImg('inline-icon')}</span>
      </div>
      <p class="muted settings-hint">Vende na hora itens de material até esse valor de venda, sem lotar a bag.</p>
    </div>

    <p class="settings-version muted">Rubinot Idle · build ${gameVersion()}</p>
  `);
}
