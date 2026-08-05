/**
 * Lógica da Tela de Perfil e Alteração de Senha
 */

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = Auth.requireAuth();
  if (!currentUser) return;

  Auth.renderHeaderAndNav('profile');
  renderProfileInfo(currentUser);

  const SVG_EYE_OPEN = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const SVG_EYE_OFF = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

  // Alternar visualização das senhas (botão olho SVG)
  document.querySelectorAll('.toggle-password-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (input) {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.innerHTML = isPassword ? SVG_EYE_OFF : SVG_EYE_OPEN;
      }
    });
  });

  // Form de alteração de senha
  const passwordForm = document.getElementById('change-password-form');
  passwordForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    changeUserPassword();
  });
});

function renderProfileInfo(user) {
  const initials = user.name
    .split(' ')
    .filter(n => n.length > 0)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');

  document.getElementById('profile-avatar-display').textContent = initials;
  document.getElementById('profile-name-display').textContent = user.name;
  document.getElementById('profile-email-display').textContent = user.email;

  document.getElementById('profile-points-val').textContent = user.points;
  document.getElementById('profile-streak-val').textContent = `${user.streak}d`;
  document.getElementById('profile-notes-val').textContent = user.totalNotes || 0;
}

function changeUserPassword() {
  const currentPassInput = document.getElementById('current-password-input');
  const newPassInput = document.getElementById('new-password-input');
  const confirmPassInput = document.getElementById('confirm-password-input');

  const currentPass = currentPassInput.value;
  const newPass = newPassInput.value;
  const confirmPass = confirmPassInput.value;

  const currentUser = Storage.getCurrentUser();

  if (currentPass !== currentUser.password) {
    Auth.showToast('Senha atual incorreta.', 'error');
    return;
  }

  if (newPass.length < 6) {
    Auth.showToast('A nova senha deve ter no mínimo 6 caracteres.', 'warning');
    return;
  }

  const hasLetter = /[a-zA-Z]/.test(newPass);
  const hasNumber = /[0-9]/.test(newPass);

  if (!hasLetter || !hasNumber) {
    Auth.showToast('A nova senha deve conter pelo menos uma letra e um número.', 'warning');
    return;
  }

  if (newPass !== confirmPass) {
    Auth.showToast('A nova senha e a confirmação de senha não conferem.', 'warning');
    return;
  }

  // Atualiza a senha do usuário
  currentUser.password = newPass;
  Storage.updateUser(currentUser);

  currentPassInput.value = '';
  newPassInput.value = '';
  confirmPassInput.value = '';

  Auth.showToast('Senha alterada com sucesso! 🔐', 'success');
}
