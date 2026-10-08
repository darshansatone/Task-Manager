// Authentication State & Form Handlers

const Auth = (() => {
  const TOKEN_KEY = 'taskmaster_token';
  const USER_KEY = 'taskmaster_user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isAuthenticated() {
    return !!getToken();
  }

  // Route guarding
  function enforceRouteGuard() {
    const path = window.location.pathname;
    const isAuth = isAuthenticated();

    if (path.includes('dashboard') && !isAuth) {
      window.location.href = '/login.html';
      return;
    }

    if ((path.includes('login') || path.includes('register')) && isAuth) {
      window.location.href = '/dashboard.html';
      return;
    }
  }

  // Register form logic
  async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('registerSubmitBtn');
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!name || !email || !password) {
      window.showToast('Please fill in all required fields.', 'warning');
      return;
    }

    if (password.length < 6) {
      window.showToast('Password must be at least 6 characters.', 'warning');
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Creating account...';
      }

      const res = await window.api.post('/api/auth/register', { name, email, password });
      setSession(res.token, res.user);
      window.showToast('Account created successfully! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 800);
    } catch (err) {
      window.showToast(err.message || 'Registration failed.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    }
  }

  // Login form logic
  async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginSubmitBtn');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      window.showToast('Please provide both email and password.', 'warning');
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Signing in...';
      }

      const res = await window.api.post('/api/auth/login', { email, password });
      setSession(res.token, res.user);
      window.showToast('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 700);
    } catch (err) {
      window.showToast(err.message || 'Invalid email or password.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    }
  }

  // Logout logic
  async function logout() {
    try {
      if (window.api) {
        await window.api.post('/api/auth/logout').catch(() => {});
      }
    } finally {
      clearSession();
      window.location.href = '/login.html';
    }
  }

  // Bind forms on page load
  document.addEventListener('DOMContentLoaded', () => {
    enforceRouteGuard();

    const regForm = document.getElementById('registerForm');
    if (regForm) regForm.addEventListener('submit', handleRegister);

    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Populate user profile widgets if authenticated
    const user = getUser();
    if (user) {
      const nameLabels = document.querySelectorAll('.user-name-label');
      nameLabels.forEach((el) => (el.textContent = user.name || 'User'));

      const emailLabels = document.querySelectorAll('.user-email-label');
      emailLabels.forEach((el) => (el.textContent = user.email || ''));

      const initials = (user.name || 'U')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      const avatarBoxes = document.querySelectorAll('.user-avatar');
      avatarBoxes.forEach((el) => (el.textContent = initials));
    }
  });

  return {
    getToken,
    getUser,
    isAuthenticated,
    setSession,
    clearSession,
    logout
  };
})();

window.Auth = Auth;
