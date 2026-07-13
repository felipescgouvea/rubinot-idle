// Tela de login / criar conta (gate obrigatório antes do jogo) e o indicador
// de usuário logado no cabeçalho. Fala com o Supabase via infrastructure/
// authClient.js. Enquanto não há sessão válida, o #auth-gate cobre a tela toda
// e o jogo não inicia.
import { signIn, signUp, signOut, currentUser, resendConfirmation } from '../infrastructure/authClient.js?v=116';

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

export function hideAuthGate() {
  const gate = document.getElementById('auth-gate');
  if (gate) gate.style.display = 'none';
}

function setBusy(busy, msg) {
  const btn = document.getElementById('auth-submit');
  const err = document.getElementById('auth-error');
  if (btn) { btn.disabled = busy; btn.textContent = busy ? (msg || 'Aguarde…') : btn.dataset.label; }
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
  gate.innerHTML = `
    <div class="auth-card">
      <div class="auth-logo"><img src="logo.webp" alt="RubinOT" class="auth-logo-img" /><span class="auth-logo-sub">IDLE</span></div>
      <div class="auth-tabs">
        <button class="auth-tab ${isLogin ? 'active' : ''}" data-mode="login">Entrar</button>
        <button class="auth-tab ${!isLogin ? 'active' : ''}" data-mode="register">Criar conta</button>
      </div>
      <form id="auth-form" autocomplete="on">
        <label class="auth-label">E-mail
          <input id="auth-email" type="email" required placeholder="voce@exemplo.com" autocomplete="email" />
        </label>
        <label class="auth-label">Senha
          <input id="auth-password" type="password" required minlength="6" placeholder="mínimo 6 caracteres" autocomplete="${isLogin ? 'current-password' : 'new-password'}" />
        </label>
        <div id="auth-error" class="auth-msg"></div>
        <button id="auth-submit" type="submit" class="auth-submit" data-label="${isLogin ? 'Entrar' : 'Criar conta'}">${isLogin ? 'Entrar' : 'Criar conta'}</button>
      </form>
      <p class="auth-foot">${isLogin ? 'Não tem conta? <a href="#" data-mode="register">Crie uma</a>' : 'Já tem conta? <a href="#" data-mode="login">Entrar</a>'}</p>
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
      <h3 class="auth-confirm-title">Confirme seu e-mail</h3>
      <p class="auth-confirm-text">Enviamos um link de confirmação para<br><strong>${email}</strong>.<br>
        Clique no link para ativar sua conta e entrar. (Confira também a caixa de spam.)</p>
      <div id="auth-error" class="auth-msg"></div>
      <button id="auth-resend" class="auth-submit" data-label="Reenviar e-mail">Reenviar e-mail</button>
      <p class="auth-foot"><a href="#" data-mode="login">Já confirmei — entrar</a></p>
    </div>
  `;
  gate.querySelector('[data-mode="login"]').addEventListener('click', (e) => { e.preventDefault(); renderGate('login'); });
  gate.querySelector('#auth-resend').addEventListener('click', async () => {
    const btn = document.getElementById('auth-resend');
    btn.disabled = true; btn.textContent = 'Reenviando…';
    const r = await resendConfirmation(email);
    btn.disabled = false; btn.textContent = 'Reenviar e-mail';
    if (r.ok) showInfo('E-mail reenviado. Confira sua caixa de entrada.');
    else showError(r.error || 'Não foi possível reenviar agora.');
  });
}

async function handleSubmit(mode) {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || !password) { showError('Preencha e-mail e senha.'); return; }
  if (password.length < 6) { showError('A senha precisa ter pelo menos 6 caracteres.'); return; }

  setBusy(true, mode === 'login' ? 'Entrando…' : 'Criando…');
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
    showError('Falha de conexão. Verifique sua internet e tente de novo.');
  }
}

async function finishSuccess() {
  if (onSuccess) await onSuccess();
  hideAuthGate();
}

// Indicador de usuário logado no cabeçalho (e-mail + sair).
export function renderAuthUser() {
  const el = document.getElementById('auth-user');
  if (!el) return;
  const user = currentUser();
  el.innerHTML = user
    ? `<span class="auth-user-email" title="${user.email || ''}">👤 ${user.email || 'conta'}</span>
       <button class="btn-small" id="auth-logout-btn">Sair</button>`
    : '';
  const btn = document.getElementById('auth-logout-btn');
  if (btn) btn.addEventListener('click', doLogout);
}

async function doLogout() {
  await signOut();
  // recarrega pra voltar limpo ao gate (evita vazar estado do usuário anterior)
  location.reload();
}
