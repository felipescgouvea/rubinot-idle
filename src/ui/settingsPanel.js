// Painel de Configurações (⚙️): resume num só lugar informações e opções que
// hoje ficam espalhadas pelo jogo — conta logada, status do save (local +
// nuvem), o idioma da interface e o auto-vender lixo (que só existia dentro
// da Bag). Não introduz estado novo: reaproveita G.autoSell e setAutoSell/
// setAutoSellMax (mesmas funções da Bag, ver ui/inventoryAndEquipmentPanel.js)
// e G.lastSave (gravado em cada saveGame, ver application/saveGameUseCase.js).
import { G } from '../application/gameStore.js?v=363';
import { currentUser } from '../infrastructure/authClient.js?v=371';
import { getCharacterSlots } from '../application/accountUseCases.js?v=361';
import { VOCATIONS } from '../domain/character.js?v=390';
import { MAX_CHARACTER_SLOTS } from '../domain/gameState.js?v=363';
import { goldIconImg, openModal } from './shared.js?v=366';
import { t, getLocale, LOCALE_NAMES } from '../i18n/i18n.js?v=379';

function fmtLastSave() {
  if (!G.lastSave) return t('settings.neverSavedThisSession');
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
  const locale = getLocale();
  const langBtns = Object.entries(LOCALE_NAMES)
    .map(([code, label]) => `<button class="btn-small${code === locale ? ' active-lang' : ''}" onclick="setLocale('${code}')">${label}</button>`)
    .join('');
  const slotRows = getCharacterSlots().map(s => {
    if (s.empty) {
      return `<div class="settings-slot-row">
        <span class="settings-slot-info muted">${t('account.emptySlot')}</span>
        <button class="btn-small" onclick="closeModal(); confirmSwitchCharacterSlot(${s.slot})">${t('account.createHere')}</button>
      </div>`;
    }
    const voc = VOCATIONS[s.vocation];
    const label = `${voc ? voc.icon : ''} ${s.name || voc?.name || s.vocation} <span class="muted">(${t('account.slotLevel', { level: s.level })})</span>`;
    return `<div class="settings-slot-row">
      <span class="settings-slot-info">${label}${s.active ? ` <strong class="settings-slot-active">· ${t('account.activeSlot')}</strong>` : ''}</span>
      ${s.active ? '' : `<button class="btn-small" onclick="closeModal(); confirmSwitchCharacterSlot(${s.slot})">${t('account.playThis')}</button>`}
    </div>`;
  }).join('');
  openModal(`
    <h3>⚙️ ${t('settings.title')}</h3>

    <div class="settings-section">
      <h4>${t('settings.account')}</h4>
      <p class="settings-row">👤 ${user?.email || t('settings.notLoggedIn')}</p>
      <button class="btn-small danger" onclick="closeModal(); logout()">${t('settings.signOut')}</button>
    </div>

    <div class="settings-section">
      <h4>${t('account.title')}</h4>
      <div class="settings-slot-list">${slotRows}</div>
      <p class="muted settings-hint">${t('account.hint', { max: MAX_CHARACTER_SLOTS })}</p>
    </div>

    <div class="settings-section">
      <h4>${t('settings.language')}</h4>
      <div class="settings-lang-row">${langBtns}</div>
    </div>

    <div class="settings-section">
      <h4>${t('settings.save')}</h4>
      <p class="settings-row">${t('settings.saveDesc')}</p>
      <p class="settings-row">${t('settings.lastSave', { time: `<strong>${fmtLastSave()}</strong>` })}</p>
      <button class="btn-small" onclick="saveGame(); openSettingsPanel()">💾 ${t('settings.saveNow')}</button>
    </div>

    <div class="settings-section">
      <h4>${t('settings.autoSell')} <span class="muted">${t('settings.autoSellDesc')}</span></h4>
      <div class="autosell-presets">
        <button class="autosell-preset ${!as.enabled ? 'active' : ''}" onclick="setAutoSellPreset('off'); openSettingsPanel()">${t('settings.autoSellOff')}</button>
        <button class="autosell-preset ${as.enabled && as.maxValue <= 50 ? 'active' : ''}" onclick="setAutoSellPreset('cheap'); openSettingsPanel()">${t('settings.autoSellCheap')}</button>
        <button class="autosell-preset ${as.enabled && as.maxValue > 50 && as.maxValue <= 250 ? 'active' : ''}" onclick="setAutoSellPreset('junk'); openSettingsPanel()">🧹 ${t('settings.autoSellJunk')}</button>
      </div>
      <div class="autosell-row">
        <label class="autosell-toggle"><input type="checkbox" ${as.enabled ? 'checked' : ''} onchange="setAutoSell(this.checked)" /> ${t('settings.autoSellToggle')}</label>
        <span class="autosell-max">${t('settings.autoSellCustom')} ≤ <input type="number" min="0" class="autosell-input" value="${as.maxValue}" onchange="setAutoSellMax(this.value)" /> ${goldIconImg('inline-icon')}</span>
      </div>
      <p class="muted settings-hint">${t('settings.autoSellHint')}</p>
    </div>

    <p class="settings-version muted">${t('settings.build', { v: gameVersion() })}</p>
  `);
}
