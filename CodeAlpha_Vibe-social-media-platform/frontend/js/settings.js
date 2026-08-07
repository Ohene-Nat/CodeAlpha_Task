// ============================================================
// Vibe — Settings View
// ============================================================

async function renderSettingsView() {
  const main = document.getElementById('main-view');
  const me = Auth.getUser();
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';

  main.innerHTML = `
    <div class="glass card fade-in" style="margin-bottom:16px;">
      <h2 style="font-size:1.2rem;">Settings</h2>
    </div>

    <div class="settings-section glass">
      <h3>Appearance</h3>
      <p class="section-desc">Choose how Vibe looks on this device.</p>
      <div class="settings-row">
        <div class="row-label">
          <strong>Dark mode</strong>
          <span>Switch between light and dark themes</span>
        </div>
        <label class="switch">
          <input type="checkbox" id="settings-theme-toggle" ${theme === 'dark' ? 'checked' : ''}>
          <span class="track"><span class="thumb"></span></span>
        </label>
      </div>
    </div>

    <div class="settings-section glass">
      <h3>Edit Profile</h3>
      <p class="section-desc">Update your name, username, bio, and photos.</p>
      <button class="btn btn-glass" id="settings-edit-profile-btn"><i class="fa-solid fa-pen"></i> Edit Profile</button>
    </div>

    <div class="settings-section glass">
      <h3>Change Password</h3>
      <p class="section-desc">Use a strong password you're not using elsewhere.</p>
      <form id="change-password-form">
        <div class="field" id="current-password-field">
          <label for="current-password">Current Password</label>
          <input type="password" id="current-password" class="input" required>
          <div class="field-error"></div>
        </div>
        <div class="field" id="new-password-field">
          <label for="new-password">New Password</label>
          <input type="password" id="new-password" class="input" required>
          <div class="field-error"></div>
        </div>
        <button type="submit" class="btn btn-primary" id="change-password-btn">Update Password</button>
      </form>
    </div>

    <div class="settings-section glass" style="border: 1px solid rgba(239,68,68,0.25);">
      <h3 style="color:var(--danger);">Danger Zone</h3>
      <p class="section-desc">Permanently delete your account and all of its data. This cannot be undone.</p>
      <button class="btn btn-danger" id="delete-account-btn"><i class="fa-solid fa-triangle-exclamation"></i> Delete Account</button>
    </div>
  `;

  document.getElementById('settings-theme-toggle').addEventListener('change', () => {
    const newTheme = toggleTheme();
    document.getElementById('theme-toggle-btn').querySelector('i').className =
      newTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  });

  document.getElementById('settings-edit-profile-btn').addEventListener('click', async () => {
    const res = await API.getProfile(me.username);
    openEditProfileModal(res.data.user);
  });

  document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelectorAll('#change-password-form .field').forEach((f) => f.classList.remove('has-error'));

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;

    if (newPassword.length < 8 || !/\d/.test(newPassword)) {
      const field = document.getElementById('new-password-field');
      field.classList.add('has-error');
      field.querySelector('.field-error').textContent = 'At least 8 characters, including a number.';
      return;
    }

    const btn = document.getElementById('change-password-btn');
    const original = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span>`;

    try {
      const res = await API.changePassword({ currentPassword, newPassword });
      showToast(res.message, 'success');
      document.getElementById('change-password-form').reset();
    } catch (err) {
      const field = document.getElementById('current-password-field');
      field.classList.add('has-error');
      field.querySelector('.field-error').textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  document.getElementById('delete-account-btn').addEventListener('click', () => {
    openConfirmModal({
      title: 'Delete your account?',
      message: 'This will permanently delete your profile, posts, comments, and all associated data. This action cannot be undone.',
      actionLabel: 'Delete Account',
      onConfirm: async () => {
        try {
          await API.deleteAccount();
          showToast('Your account has been deleted.', 'success');
          Auth.clearToken();
          localStorage.removeItem('Vibe_user');
          sessionStorage.removeItem('Vibe_user');
          setTimeout(() => { window.location.href = 'auth.html'; }, 800);
        } catch (err) {
          showToast(err.message, 'error');
        }
      },
    });
  });
}
