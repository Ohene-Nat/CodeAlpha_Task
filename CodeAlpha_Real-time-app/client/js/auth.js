// If already signed in, skip straight to the lobby.
if (Session.get()) {
  window.location.href = 'lobby.html';
}

const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');

document.getElementById('show-register').addEventListener('click', () => {
  loginView.classList.add('hidden');
  registerView.classList.remove('hidden');
});
document.getElementById('show-login').addEventListener('click', () => {
  registerView.classList.add('hidden');
  loginView.classList.remove('hidden');
});

function showError(elId, message) {
  const el = document.getElementById(elId);
  el.textContent = message;
  el.classList.add('visible');
}
function hideError(elId) {
  document.getElementById(elId).classList.remove('visible');
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError('login-error');
  const submitBtn = document.getElementById('login-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

  try {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    Session.save(data.token, data.user);
    window.location.href = 'lobby.html';
  } catch (err) {
    showError('login-error', err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign in';
  }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError('register-error');
  const submitBtn = document.getElementById('register-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account…';

  try {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      auth: false,
      body: { name, email, password },
    });
    Session.save(data.token, data.user);
    window.location.href = 'lobby.html';
  } catch (err) {
    showError('register-error', err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
  }
});
