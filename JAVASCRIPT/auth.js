// novela/JAVASCRIPT/auth.js (versión actualizada con eliminación de cuenta)
window.AUTH = {
  logged: false,
  userId: null,
  username: null
};

async function checkSessionSilent() {
  try {
    const res = await fetch('../PHP/session_check.php', { cache: 'no-store' });
    const data = await res.json();
    if (data && data.logged) {
      window.AUTH.logged = true;
      window.AUTH.userId = data.user_id;
      window.AUTH.username = data.username || null;
    } else {
      window.AUTH.logged = false;
      window.AUTH.userId = null;
      window.AUTH.username = null;
    }
  } catch (err) {
    window.AUTH.logged = false;
  }

  updateAuthUI();

  try {
    window.dispatchEvent(new Event('auth:checked'));
  } catch(e) {}
}

function updateAuthUI() {
  const authLabel = document.getElementById('authLabel');
  const loggedActions = document.getElementById('loggedActions');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (!authLabel) return;

  if (window.AUTH.logged) {
    authLabel.textContent = window.AUTH.username ? `Hola, ${window.AUTH.username}` : 'Conectado';
    document.getElementById('loggedUser').textContent = window.AUTH.username || 'Usuario';
    if (loggedActions) loggedActions.style.display = 'block';
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
  } else {
    authLabel.textContent = 'Iniciar sesión / Registrar';
    if (loggedActions) loggedActions.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
  }
}

function openAuthModal(initialTab = 'login') {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.style.display = 'flex';
  if (initialTab === 'register') showRegisterTab();
  else showLoginTab();
}
function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.style.display = 'none';
}

function showLoginTab() {
  document.getElementById('authTitle').textContent = 'Iniciar sesión';
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('tabLogin').classList.add('active');
  document.getElementById('tabRegister').classList.remove('active');
}
function showRegisterTab() {
  document.getElementById('authTitle').textContent = 'Registro';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
  document.getElementById('tabLogin').classList.remove('active');
  document.getElementById('tabRegister').classList.add('active');
}

function openDeleteModal() {
  const modal = document.getElementById('deleteAccountModal');
  if (!modal) return;
  // limpiar campos
  const pwd = document.getElementById('deletePasswordInput');
  const msg = document.getElementById('deleteMsg');
  if (pwd) pwd.value = '';
  if (msg) { msg.className = ''; msg.textContent = ''; }
  modal.style.display = 'flex';
}
function closeDeleteModal() {
  const modal = document.getElementById('deleteAccountModal');
  if (!modal) return;
  modal.style.display = 'none';
}

function setupAuthEvents() {
  const btnAuth = document.getElementById('btnAuth');
  if (btnAuth) btnAuth.addEventListener('click', () => {
    openAuthModal(window.AUTH.logged ? 'login' : 'login');
  });

  const closeAuth = document.getElementById('closeAuth');
  if (closeAuth) closeAuth.addEventListener('click', closeAuthModal);

  const authModal = document.getElementById('authModal');
  if (authModal) authModal.addEventListener('click', (e) => {
    if (e.target.id === 'authModal') closeAuthModal();
  });

  const tabLogin = document.getElementById('tabLogin');
  if (tabLogin) tabLogin.addEventListener('click', showLoginTab);
  const tabRegister = document.getElementById('tabRegister');
  if (tabRegister) tabRegister.addEventListener('click', showRegisterTab);

  // LOGIN
  const btnLoginModal = document.getElementById('btnLoginModal');
  if (btnLoginModal) btnLoginModal.addEventListener('click', async () => {
    const u = document.getElementById('login_username').value.trim();
    const p = document.getElementById('login_password').value;
    const msg = document.getElementById('loginMsg');
    msg.className = '';
    msg.textContent = 'Iniciando...';

    if (!u || !p) { msg.textContent = 'Completa usuario y contraseña.'; return; }

    try {
      const res = await fetch('../PHP/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      const text = await res.text();
      // intentar parse JSON de forma segura
      let data;
      try { data = JSON.parse(text); } catch(e) {
        msg.textContent = 'Respuesta inesperada del servidor.';
        console.error('login parse error:', text);
        return;
      }

      if (data.success) {
        msg.className = 'ok';
        msg.textContent = data.message || 'Conectado';
        window.AUTH.logged = true;
        window.AUTH.userId = data.user_id || null;
        window.AUTH.username = u;
        updateAuthUI();
        setTimeout(closeAuthModal, 700);
      } else {
        msg.textContent = data.message || 'Error al iniciar sesión.';
      }
    } catch (err) {
      msg.textContent = 'Fallo en la conexión.';
      console.error(err);
    }
  });

  // REGISTER
  const btnRegisterModal = document.getElementById('btnRegisterModal');
  if (btnRegisterModal) btnRegisterModal.addEventListener('click', async () => {
    const u = document.getElementById('reg_username').value.trim();
    const p = document.getElementById('reg_password').value;
    const pc = document.getElementById('reg_password_confirm').value;
    const msg = document.getElementById('regMsg');
    msg.className = '';
    msg.textContent = 'Registrando...';

    if (!u || !p) { msg.textContent = 'Completa usuario y contraseña.'; return; }
    if (p !== pc) { msg.textContent = 'Las contraseñas no coinciden.'; return; }

    try {
      const res = await fetch('../PHP/register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p, password_confirm: pc })
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) {
        msg.textContent = 'Respuesta inesperada del servidor.';
        console.error('register parse error:', text);
        return;
      }
      if (data.success) {
        msg.className = 'ok';
        msg.textContent = 'Registrado y conectado.';
        window.AUTH.logged = true;
        window.AUTH.userId = data.user_id || null;
        window.AUTH.username = u;
        updateAuthUI();
        setTimeout(closeAuthModal, 800);
      } else {
        msg.textContent = data.message || 'Error al registrar.';
      }
    } catch (err) {
      msg.textContent = 'Fallo en la conexión.';
      console.error(err);
    }
  });

  // LOGOUT
  const btnLogoutModal = document.getElementById('btnLogoutModal');
  if (btnLogoutModal) btnLogoutModal.addEventListener('click', async () => {
    try {
      const res = await fetch('../PHP/logout.php', { method: 'GET' });
      const data = await res.json();
      window.AUTH.logged = false;
      window.AUTH.userId = null;
      window.AUTH.username = null;
      updateAuthUI();
      closeAuthModal();
    } catch (err) {
      console.error('Logout error', err);
    }
  });

  // DELETE ACCOUNT - abrir modal
  const btnDeleteAccount = document.getElementById('btnDeleteAccount');
  if (btnDeleteAccount) btnDeleteAccount.addEventListener('click', () => {
    openDeleteModal();
  });

  // CANCEL delete
  const btnDeleteCancel = document.getElementById('btnDeleteConfirm_Cancel');
  if (btnDeleteCancel) btnDeleteCancel.addEventListener('click', () => {
    closeDeleteModal();
  });

  // CONFIRM delete
  const btnDeleteOK = document.getElementById('btnDeleteConfirm_OK');
  if (btnDeleteOK) btnDeleteOK.addEventListener('click', async () => {
    const pwdInput = document.getElementById('deletePasswordInput');
    const msg = document.getElementById('deleteMsg');
    if (!pwdInput || !msg) return;
    const pwd = pwdInput.value || '';
    msg.className = '';
    msg.textContent = 'Eliminando...';

    if (!pwd) { msg.textContent = 'Introduce tu contraseña para confirmar.'; return; }

    try {
      const res = await fetch('../PHP/delete_account.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) {
        msg.textContent = 'Respuesta inesperada del servidor.';
        console.error('delete parse error:', text);
        return;
      }

      if (data.success) {
        msg.className = 'ok';
        msg.textContent = data.message || 'Cuenta eliminada.';
        // estado local: desloguear y actualizar UI
        window.AUTH.logged = false;
        window.AUTH.userId = null;
        window.AUTH.username = null;
        updateAuthUI();
        setTimeout(() => {
          closeDeleteModal();
          // opcional: recargar página para limpiar estado de la app
          // location.reload();
        }, 900);
      } else {
        msg.textContent = data.message || 'No se pudo eliminar la cuenta.';
      }
    } catch (err) {
      msg.textContent = 'Fallo en la conexión.';
      console.error(err);
    }
  });

  // cerrar modal si se hace click fuera
  const delModal = document.getElementById('deleteAccountModal');
  if (delModal) delModal.addEventListener('click', (e) => {
    if (e.target.id === 'deleteAccountModal') closeDeleteModal();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupAuthEvents();
  checkSessionSilent();
});