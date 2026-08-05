/**
 * Lógica de Autenticação e Controle de Sessão
 */

const Auth = {
  // Verifica se o usuário está logado
  requireAuth(requiredRole = null) {
    const user = Storage.getCurrentUser();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }

    if (requiredRole && user.role !== requiredRole) {
      alert('Acesso negado: esta página é exclusiva para administradores.');
      window.location.href = 'dashboard.html';
      return null;
    }

    return user;
  },

  // Efetua login
  login(email, password) {
    const user = Storage.getUserByEmail(email);

    if (!user) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    if (user.password !== password) {
      return { success: false, message: 'Senha incorreta.' };
    }

    Storage.setCurrentUser(user);
    return { success: true, user };
  },

  // Registra novo usuário com validações profissionais
  register(name, email, password, confirmPassword) {
    if (!name || !email || !password || !confirmPassword) {
      return { success: false, message: 'Preencha todos os campos obrigatórios.' };
    }

    if (password !== confirmPassword) {
      return { success: false, message: 'A senha e a confirmação de senha não conferem.' };
    }

    if (password.length < 6) {
      return { success: false, message: 'A senha deve conter no mínimo 6 caracteres.' };
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasLetter || !hasNumber) {
      return { success: false, message: 'A senha deve conter pelo menos uma letra e um número.' };
    }

    const existingUser = Storage.getUserByEmail(email);
    if (existingUser) {
      return { success: false, message: 'Este e-mail já está cadastrado no sistema.' };
    }

    const newUser = {
      id: 'user-' + Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      role: 'user', // padrão é usuário comum
      points: 0,
      streak: 0,
      totalNotes: 0,
      lastDonationDate: null,
      registeredAt: new Date().toISOString()
    };

    const users = Storage.getUsers();
    users.push(newUser);
    Storage.saveUsers(users);

    // Faz login automático
    Storage.setCurrentUser(newUser);
    return { success: true, user: newUser };
  },

  // Renderiza cabeçalho e menu de navegação responsivo
  renderHeaderAndNav(activePage = '') {
    const user = Storage.getCurrentUser();
    if (!user) return;

    // Renderiza dados do usuário no header
    const initials = user.name
      .split(' ')
      .filter(n => n.length > 0)
      .slice(0, 2)
      .map(n => n[0].toUpperCase())
      .join('');

    const headerContainer = document.getElementById('header-bar-container');
    if (headerContainer) {
      headerContainer.innerHTML = `
        <div class="header-bar">
          <div class="header-user-stats">
            <div class="stat-pill points" title="Seus pontos acumulados">
              <span>⭐</span>
              <span id="user-points-val">${user.points}</span>
            </div>
            <div class="stat-pill streak" title="${user.streak} dias seguidos doando notas!">
              <span>🔥</span>
              <span id="user-streak-val">${user.streak} dias</span>
            </div>
          </div>
          <a href="profile.html" class="user-profile-btn" title="Ver seu perfil">
            <div class="user-avatar">${initials}</div>
            <span class="user-name-text">${user.name.split(' ')[0]}</span>
          </a>
        </div>
      `;
    }

    // Renderiza Sidebar / Navbar
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
      const isAdmin = user.role === 'admin';
      
      sidebarContainer.innerHTML = `
        <aside class="sidebar">
          <div>
            <div class="sidebar-brand">
              <div class="logo-icon">🧾</div>
              <div>
                <h1>Pon<span>tua</span></h1>
              </div>
            </div>
            <ul class="nav-list">
              <li>
                <a href="dashboard.html" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">
                  <span class="nav-icon">🏠</span>
                  <span>Início</span>
                </a>
              </li>
              <li>
                <a href="history.html" class="nav-link ${activePage === 'history' ? 'active' : ''}">
                  <span class="nav-icon">📋</span>
                  <span>Histórico</span>
                </a>
              </li>
              <li>
                <a href="store.html" class="nav-link ${activePage === 'store' ? 'active' : ''}">
                  <span class="nav-icon">🛒</span>
                  <span>Loja</span>
                </a>
              </li>
              <li>
                <a href="ranking.html" class="nav-link ${activePage === 'ranking' ? 'active' : ''}">
                  <span class="nav-icon">🏆</span>
                  <span>Ranking</span>
                </a>
              </li>
              <li>
                <a href="donate-points.html" class="nav-link ${activePage === 'donate' ? 'active' : ''}">
                  <span class="nav-icon">🎁</span>
                  <span>Transferir Pontos</span>
                </a>
              </li>
              <li>
                <a href="profile.html" class="nav-link ${activePage === 'profile' ? 'active' : ''}">
                  <span class="nav-icon">👤</span>
                  <span>Perfil</span>
                </a>
              </li>
              <li>
                <a href="about.html" class="nav-link ${activePage === 'about' ? 'active' : ''}">
                  <span class="nav-icon">💙</span>
                  <span>Sobre Nós</span>
                </a>
              </li>
              ${isAdmin ? `
              <li>
                <a href="admin.html" class="nav-link admin-link ${activePage === 'admin' ? 'active' : ''}">
                  <span class="nav-icon">⚙️</span>
                  <span>Painel Admin</span>
                </a>
              </li>
              ` : ''}
            </ul>
          </div>

          <div class="sidebar-footer" style="padding-top: 20px;">
            <button id="logout-btn" class="btn btn-outline" style="width: 100%; border-color: var(--danger); color: var(--danger);">
              🚪 Sair
            </button>
          </div>
        </aside>
      `;

      // Evento de Logout
      document.getElementById('logout-btn')?.addEventListener('click', () => {
        if (confirm('Deseja realmente sair da sua conta?')) {
          Storage.logout();
          window.location.href = 'index.html';
        }
      });
    }
  },

  // Helper para exibir notificações Toast
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};
