// ============================================================
// Vibe — Auth Page Logic
// ============================================================

(function () {
  initTheme();
  attachRipple();

  // Redirect straight to the app if already logged in
  if (Auth.isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');

  function switchTab(name) {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    forms.forEach((f) => f.classList.toggle('active', f.id === `${name}-form`));
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
  document.querySelectorAll('[data-switch-tab]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(link.dataset.switchTab);
    });
  });

  // ---- Password visibility toggle ----
  document.querySelectorAll('.toggle-password').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const icon = btn.querySelector('i');
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      icon.classList.toggle('fa-eye', showing);
      icon.classList.toggle('fa-eye-slash', !showing);
    });
  });

  // ---- Field error helpers ----
  function setFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.add('has-error');
    field.querySelector('.field-error').textContent = message;
  }
  function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.remove('has-error');
  }
  function clearAllErrors(form) {
    form.querySelectorAll('.field').forEach((f) => f.classList.remove('has-error'));
  }

  function setLoading(btn, loading, label) {
    btn.disabled = loading;
    btn.querySelector('.btn-label').innerHTML = loading
      ? `<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span>`
      : label;
  }

  // ---- Password strength meter ----
  const regPassword = document.getElementById('reg-password');
  const strengthBar = document.getElementById('password-strength-bar');
  regPassword.addEventListener('input', () => {
    const val = regPassword.value;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/\d/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const pct = (score / 4) * 100;
    const colors = ['#EF4444', '#EF4444', '#F59E0B', '#F59E0B', '#22C55E'];
    strengthBar.style.width = `${pct}%`;
    strengthBar.style.background = colors[score];
  });

  // ---- Avatar preview for registration ----
  const avatarInput = document.getElementById('reg-avatar-input');
  const avatarPreview = document.getElementById('reg-avatar-preview');
  let selectedAvatarFile = null;
  avatarPreview.addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB.', 'error');
      avatarInput.value = '';
      return;
    }
    selectedAvatarFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      avatarPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
  });

  // ---- LOGIN ----
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(loginForm);

    const identifier = document.getElementById('login-identifier').value.trim();
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;

    if (!identifier) return setFieldError('login-identifier-field', 'Please enter your email or username.');
    if (!password) return setFieldError('login-password-field', 'Please enter your password.');

    const btn = document.getElementById('login-submit-btn');
    setLoading(btn, true);
    startTopLoader();

    try {
      const res = await API.login({ emailOrUsername: identifier, password, rememberMe });
      Auth.setToken(res.data.token, rememberMe);
      Auth.setUser(res.data.user, rememberMe);
      showToast(res.message, 'success');
      finishTopLoader();
      setTimeout(() => { window.location.href = 'index.html'; }, 400);
    } catch (err) {
      finishTopLoader();
      showToast(err.message, 'error');
      setLoading(btn, false, 'Log In');
    }
  });

  // ---- REGISTER ----
  const registerForm = document.getElementById('register-form');
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(registerForm);

    const fullname = document.getElementById('reg-fullname').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm').value;

    let hasError = false;
    if (fullname.length < 2) { setFieldError('reg-fullname-field', 'Please enter your full name.'); hasError = true; }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) { setFieldError('reg-username-field', 'Username: 3-30 letters, numbers, or underscores.'); hasError = true; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setFieldError('reg-email-field', 'Please enter a valid email.'); hasError = true; }
    if (password.length < 8 || !/\d/.test(password)) { setFieldError('reg-password-field', 'At least 8 characters, including a number.'); hasError = true; }
    if (password !== confirmPassword) { setFieldError('reg-confirm-field', 'Passwords do not match.'); hasError = true; }
    if (hasError) return;

    const btn = document.getElementById('register-submit-btn');
    setLoading(btn, true);
    startTopLoader();

    try {
      const formData = new FormData();
      formData.append('fullname', fullname);
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);
      if (selectedAvatarFile) formData.append('profileImage', selectedAvatarFile);

      const res = await API.register(formData);
      Auth.setToken(res.data.token, true);
      Auth.setUser(res.data.user, true);
      showToast(res.message, 'success');
      finishTopLoader();
      setTimeout(() => { window.location.href = 'index.html'; }, 400);
    } catch (err) {
      finishTopLoader();
      showToast(err.message, 'error');
      setLoading(btn, false, 'Create Account');
    }
  });
})();
