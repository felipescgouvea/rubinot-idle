// Tela de login / criar conta (gate obrigatório antes do jogo) e o indicador
// de usuário logado no cabeçalho. Fala com o Supabase via infrastructure/
// authClient.js. Enquanto não há sessão válida, o #auth-gate cobre a tela toda
// e o jogo não inicia.
import { signIn, signUp, signOut, currentUser, resendConfirmation } from '../infrastructure/authClient.js?v=292';
import { t } from '../i18n/i18n.js?v=300';

// Callback disparado quando o login/cadastro dá certo (main.js liga o boot do
// jogo aqui, depois de puxar o save da nuvem).
let onSuccess = null;
export function setAuthSuccessHandler(fn) { onSuccess = fn; }

export function showAuthGate() {
  const gate = document.getElementById('auth-gate');
  if (!gate) return;
  gate.style.display = 'flex';
  renderGate('login');
}

// Cobre a tela com um estado de "carregando" (sem formulário) enquanto o
// boot de uma sessão JÁ LOGADA roda (recarregar a página com sessão válida —
// ver main.js). Sem isso, o #app ficava visível com o HTML estático padrão
// (tela de criar personagem, 0 gold, sem equipamento) até o boot terminar de
// buscar a nuvem/hunt-state — o login manual já tinha esse cuidado (o gate
// cobre a tela até o bootGame() terminar), mas um F5 com sessão existente
// nunca mostrava gate nenhum, então o "flash" ficava exposto o tempo todo.
export function showLoadingGate() {
  const gate = document.getElementById('auth-gate');
  if (!gate) return;
  gate.style.display = 'flex';
  gate.innerHTML = `
    <div class="auth-card">
      <div class="auth-logo"><img src="logo.webp" alt="RubinOT" class="auth-logo-img" /><span class="auth-logo-sub">IDLE</span></div>
      <p class="auth-foot" style="margin-top:16px">${t('auth.loggingIn')}</p>
    </div>
  `;
}

export function hideAuthGate() {
  const gate = document.getElementById('auth-gate');
  if (gate) gate.style.display = 'none';
}

function setBusy(busy, msg) {
  const btn = document.getElementById('auth-submit');
  const err = document.getElementById('auth-error');
  if (btn) { btn.disabled = busy; btn.textContent = busy ? (msg || t('auth.pleaseWait')) : btn.dataset.label; }
  if (err && busy) { err.textContent = ''; err.className = 'auth-msg'; }
}

function showError(text) {
  const err = document.getElementById('auth-error');
  if (err) { err.textContent = text; err.className = 'auth-msg auth-msg-error'; }
}
function showInfo(text) {
  const err = document.getElementById('auth-error');
  if (err) { err.textContent = text; err.className = 'auth-msg auth-msg-info'; }
}

function renderGate(mode) {
  const gate = document.getElementById('auth-gate');
  const isLogin = mode === 'login';
  const submitLabel = isLogin ? t('auth.login') : t('auth.createAccount');
  gate.innerHTML = `
    <div class="auth-card">
      <div class="auth-logo"><img src="logo.webp" alt="RubinOT" class="auth-logo-img" /><span class="auth-logo-sub">IDLE</span></div>
      <div class="auth-tabs">
        <button class="auth-tab ${isLogin ? 'active' : ''}" data-mode="login">${t('auth.login')}</button>
        <button class="auth-tab ${!isLogin ? 'active' : ''}" data-mode="register">${t('auth.createAccount')}</button>
      </div>
      <form id="auth-form" autocomplete="on">
        <label class="auth-label">${t('auth.email')}
          <input id="auth-email" type="email" required placeholder="you@example.com" autocomplete="email" />
        </label>
        <label class="auth-label">${t('auth.password')}
          <input id="auth-password" type="password" required minlength="6" placeholder="${t('auth.passwordPlaceholder')}" autocomplete="${isLogin ? 'current-password' : 'new-password'}" />
        </label>
        <div id="auth-error" class="auth-msg"></div>
        <button id="auth-submit" type="submit" class="auth-submit" data-label="${submitLabel}">${submitLabel}</button>
      </form>
      <p class="auth-foot">${isLogin ? `${t('auth.noAccount')} <a href="#" data-mode="register">${t('auth.createOne')}</a>` : `${t('auth.hasAccount')} <a href="#" data-mode="login">${t('auth.login')}</a>`}</p>
    </div>
  `;

  gate.querySelectorAll('[data-mode]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (el.tagName === 'A') e.preventDefault();
      renderGate(el.dataset.mode);
    });
  });

  document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit(mode);
  });
}

// Tela de "confirme seu e-mail" — mostrada logo após o cadastro. A conta só
// é ativada quando o usuário clica no link enviado; aqui ele pode reenviar o
// e-mail ou voltar para entrar (depois de confirmar).
function renderConfirmSent(email) {
  const gate = document.getElementById('auth-gate');
  gate.innerHTML = `
    <div class="auth-card">
      <div class="auth-logo"><img src="logo.webp" alt="RubinOT" class="auth-logo-img" /><span class="auth-logo-sub">IDLE</span></div>
      <div class="auth-confirm-icon">📧</div>
      <h3 class="auth-confirm-title">${t('auth.confirmEmailTitle')}</h3>
      <p class="auth-confirm-text">${t('auth.confirmEmailBody', { email: `<br><strong>${email}</strong>` })}</p>
      <div id="auth-error" class="auth-msg"></div>
      <button id="auth-resend" class="auth-submit" data-label="${t('auth.resendEmail')}">${t('auth.resendEmail')}</button>
      <p class="auth-foot"><a href="#" data-mode="login">${t('auth.alreadyConfirmed')}</a></p>
    </div>
  `;
  gate.querySelector('[data-mode="login"]').addEventListener('click', (e) => { e.preventDefault(); renderGate('login'); });
  gate.querySelector('#auth-resend').addEventListener('click', async () => {
    const btn = document.getElementById('auth-resend');
    btn.disabled = true; btn.textContent = t('auth.resending');
    const r = await resendConfirmation(email);
    btn.disabled = false; btn.textContent = t('auth.resendEmail');
    if (r.ok) showInfo(t('auth.resendSuccess'));
    else showError(r.error || t('auth.resendError'));
  });
}

async function handleSubmit(mode) {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || !password) { showError(t('auth.fillEmailPassword')); return; }
  if (password.length < 6) { showError(t('auth.passwordTooShort')); return; }

  setBusy(true, mode === 'login' ? t('auth.loggingIn') : t('auth.creatingAccount'));
  try {
    if (mode === 'login') {
      const r = await signIn(email, password);
      if (!r.ok) { setBusy(false); showError(r.error); return; }
      await finishSuccess();
    } else {
      const r = await signUp(email, password);
      if (!r.ok) { setBusy(false); showError(r.error); return; }
      if (r.needsConfirmation) {
        renderConfirmSent(email); // conta só ativa após confirmar o e-mail
        return;
      }
      await finishSuccess();
    }
  } catch (err) {
    setBusy(false);
    showError(t('auth.connectionError'));
  }
}

async function finishSuccess() {
  if (onSuccess) await onSuccess();
  hideAuthGate();
}

// Indicador de usuário logado no cabeçalho (só o e-mail — sair mora no
// painel de Configurações agora, ver ui/settingsPanel.js).
export function renderAuthUser() {
  const el = document.getElementById('auth-user');
  if (!el) return;
  const user = currentUser();
  el.innerHTML = user
    ? `<span class="auth-user-email" title="${user.email || ''}">👤 ${user.email || t('auth.account')}</span>`
    : '';
}

// Exportado (em vez de local) pra também ser chamado pelo botão "Sair da
// conta" do painel de Configurações — ver ui/settingsPanel.js.
export async function logout() {
  await signOut();
  // recarrega pra voltar limpo ao gate (evita vazar estado do usuário anterior)
  location.reload();
}
