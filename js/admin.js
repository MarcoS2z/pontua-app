/**
 * Lógica do Painel Administrativo
 */

// Estado do histórico de doações
let donationsCurrentPage = 1;
const DONATIONS_PER_PAGE = 10;
let donationsFilteredData = [];

document.addEventListener('DOMContentLoaded', () => {
  // Apenas admins podem acessar
  const currentUser = Auth.requireAuth('admin');
  if (!currentUser) return;

  Auth.renderHeaderAndNav('admin');
  renderAdminStats();
  renderUsersTable();

  // Carrega históricos ao clicar nas abas correspondentes
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target.dataset.tab === 'tab-donations') {
        donationsCurrentPage = 1;
        loadDonationsTable();
      } else if (e.target.dataset.tab === 'tab-point-transfers') {
        renderPointTransfersTable();
      }
    });
  });

  // Admin Tab Navigation (mantém a troca de abas unificada)
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');

      e.target.classList.add('active');
      const targetId = e.target.dataset.tab;
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.style.display = 'block';
    });
  });

  // Settings Form Submit
  const settingsForm = document.getElementById('admin-settings-form');
  if (settingsForm) {
    // Carrega valores atuais
    const settings = Storage.getSettings();
    document.getElementById('setting-email').value = settings.destinationEmail || APP_CONFIG.DEFAULT_DESTINATION_EMAIL;
    document.getElementById('setting-points').value = settings.pointsPerNote || APP_CONFIG.POINTS_PER_NOTE;
    document.getElementById('setting-interval').value = settings.resetIntervalMonths || APP_CONFIG.RESET_INTERVAL_MONTHS;

    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveAdminSettings();
    });
  }

  // Trigger Manual Reset
  const manualResetBtn = document.getElementById('manual-reset-trigger-btn');
  manualResetBtn?.addEventListener('click', () => {
    executeManualPointsReset();
  });
});

// Renderiza Estatísticas Globais do Sistema
function renderAdminStats() {
  const users = Storage.getUsers();
  const donations = Storage.getDonations();
  const redeemed = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.REDEEMED_ITEMS) || '[]');

  const validDonations = donations.filter(d => d.status === 'valid');
  const totalNotesCount = validDonations.length;
  const totalPointsDistributed = validDonations.reduce((acc, curr) => acc + (curr.pointsEarned || 0), 0);

  document.getElementById('stat-total-notes').textContent = totalNotesCount;
  document.getElementById('stat-total-points').textContent = totalPointsDistributed;
  document.getElementById('stat-total-users').textContent = users.length;
  document.getElementById('stat-total-redemptions').textContent = redeemed.length;
}

// Renderiza Tabela de Usuários
function renderUsersTable() {
  const container = document.getElementById('users-table-tbody');
  if (!container) return;

  const users = Storage.getUsers();

  container.innerHTML = users.map(u => {
    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.85rem;">
              ${u.name.substring(0, 2).toUpperCase()}
            </div>
            <strong>${u.name}</strong>
          </div>
        </td>
        <td>${u.email}</td>
        <td style="text-align: center;">
          <span style="display: block; font-size: 0.95rem; margin-bottom: 2px;">⭐</span>
          <span style="color: var(--gold); font-weight: 900;">${u.points}</span>
        </td>
        <td style="text-align: center;">
          <span style="display: block; font-size: 0.95rem; margin-bottom: 2px;">🔥</span>
          <span style="color: var(--streak); font-weight: 900;">${u.streak}d</span>
        </td>
        <td style="text-align: center;">
          <span style="display: block; font-size: 0.95rem; margin-bottom: 2px;">🧾</span>
          <span style="font-weight: 900;">${u.totalNotes || 0}</span>
        </td>
        <td style="text-align: center;">
          <span style="padding: 4px 10px; border-radius: var(--radius-pill); font-size: 0.75rem; font-weight: 800; background-color: ${u.role === 'admin' ? 'rgba(255,215,0,0.2)' : 'var(--surface-2)'}; color: ${u.role === 'admin' ? 'var(--gold)' : 'var(--text-muted)'};">
            ${u.role.toUpperCase()}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// Alternar papel de usuário (Promover / Rebaixar)
function toggleUserRole(userId) {
  const users = Storage.getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;

  const newRole = user.role === 'admin' ? 'user' : 'admin';
  if (!confirm(`Deseja alterar a função de ${user.name} para "${newRole}"?`)) return;

  user.role = newRole;
  Storage.saveUsers(users);
  renderUsersTable();
  Auth.showToast(`Função de ${user.name} atualizada para ${newRole}.`, 'info');
}

// Salva Configurações do Sistema
function saveAdminSettings() {
  const email = document.getElementById('setting-email').value.trim();
  const points = parseInt(document.getElementById('setting-points').value, 10);
  const interval = parseInt(document.getElementById('setting-interval').value, 10);

  if (!email || isNaN(points) || isNaN(interval)) {
    Auth.showToast('Informe valores válidos para as configurações.', 'warning');
    return;
  }

  const settings = Storage.getSettings();
  settings.destinationEmail = email;
  settings.pointsPerNote = points;
  settings.resetIntervalMonths = interval;

  Storage.saveSettings(settings);
  Auth.showToast('Configurações do sistema salvas com sucesso! ⚙️', 'success');
}

// Executa Reset Manual de Pontos com snapshot para o Hall da Fama
function executeManualPointsReset() {
  if (!confirm('⚠️ ATENÇÃO: Esta ação irá zerar os pontos de TODOS os usuários do sistema e salvar o snapshot do ranking atual no Hall da Fama.\n\nDeseja continuar?')) {
    return;
  }

  if (!confirm('CONFIRMAÇÃO FINAL: Tem certeza absoluta? O streak e o histórico de doações serão mantidos, apenas os pontos serão zerados.')) {
    return;
  }

  const users = Storage.getUsers();
  const hof = Storage.getHallOfFame();

  // 1. Gera Snapshot do Top 3 para o Hall da Fama
  const sortedUsers = [...users].sort((a, b) => (b.totalNotes || 0) - (a.totalNotes || 0));
  const top3Winners = sortedUsers.slice(0, 3).map((u, idx) => ({
    rank: idx + 1,
    name: u.name,
    totalNotes: u.totalNotes || 0
  }));

  const now = new Date();
  const periodName = `Ciclo Extra (Encerrado em ${now.toLocaleDateString('pt-BR')})`;

  hof.unshift({
    id: 'hof-' + Date.now(),
    period: periodName,
    resetDate: now.toISOString().split('T')[0],
    top3: top3Winners
  });

  // 2. Zera APENAS os pontos dos usuários (mantém streak e total de notas)
  users.forEach(u => {
    u.points = 0;
  });

  // 3. Salva no Storage
  Storage.saveUsers(users);
  Storage.saveHallOfFame(hof);

  // Atualiza sessão do usuário atual
  const currentUser = Storage.getCurrentUser();
  if (currentUser) {
    currentUser.points = 0;
    Storage.setCurrentUser(currentUser);
  }

  // Recarrega telas
  Auth.renderHeaderAndNav('admin');
  renderAdminStats();
  renderUsersTable();

  Auth.showToast('Reset de pontos executado com sucesso! Ranking salvo no Hall da Fama. 🏆', 'success');
}

// ───────────────────────────────────────────────
// HISTÓRICO DE NOTAS (ABA ADMIN)
// ───────────────────────────────────────────────

// Carrega e aplica filtros ao histórico de doações válidas
function loadDonationsTable(searchQuery, sortOrder) {
  const allDonations = Storage.getDonations();
  const users = Storage.getUsers();

  // Só mostra notas VÁLIDAS
  let data = allDonations
    .filter(d => d.status === 'valid')
    .map(d => {
      // Enriquece com e-mail do doador (via lista de usuários)
      const userRecord = users.find(u => u.id === d.userId);
      return { ...d, userEmail: userRecord ? userRecord.email : '—' };
    });

  // Filtro por busca de usuário (nome ou e-mail)
  const query = (searchQuery || document.getElementById('donations-search-user')?.value || '').toLowerCase().trim();
  if (query) {
    data = data.filter(d =>
      (d.userName || '').toLowerCase().includes(query) ||
      (d.userEmail || '').toLowerCase().includes(query)
    );
  }

  // Ordenação
  const sort = sortOrder || document.getElementById('donations-sort')?.value || 'date_desc';
  data.sort((a, b) => {
    if (sort === 'date_desc') return new Date(b.date) - new Date(a.date);
    if (sort === 'date_asc')  return new Date(a.date) - new Date(b.date);
    if (sort === 'user_asc')  return (a.userName || '').localeCompare(b.userName || '');
    if (sort === 'user_desc') return (b.userName || '').localeCompare(a.userName || '');
    if (sort === 'value_desc') return (b.value || 0) - (a.value || 0);
    if (sort === 'value_asc')  return (a.value || 0) - (b.value || 0);
    return 0;
  });

  donationsFilteredData = data;
  donationsCurrentPage = 1;
  renderDonationsTable();
}

// Renderiza a tabela paginada com os dados filtrados
function renderDonationsTable() {
  const tbody = document.getElementById('donations-table-tbody');
  const countEl = document.getElementById('donations-count');
  if (!tbody) return;

  const total = donationsFilteredData.length;
  const totalPages = Math.ceil(total / DONATIONS_PER_PAGE) || 1;
  if (donationsCurrentPage > totalPages) donationsCurrentPage = totalPages;

  const start = (donationsCurrentPage - 1) * DONATIONS_PER_PAGE;
  const page = donationsFilteredData.slice(start, start + DONATIONS_PER_PAGE);

  if (countEl) {
    countEl.textContent = `Exibindo ${Math.min(start + 1, total)}–${Math.min(start + page.length, total)} de ${total} nota${total !== 1 ? 's' : ''} válida${total !== 1 ? 's' : ''}.`;
  }

  if (page.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 32px; color: var(--text-muted); font-weight: 700;">Nenhuma nota encontrada com os filtros aplicados.</td></tr>`;
    document.getElementById('donations-pagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = page.map(d => {
    const date = new Date(d.date).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    const initials = (d.userName || '?').split(' ').filter(n => n).slice(0, 2).map(n => n[0].toUpperCase()).join('');
    const shortKey = d.accessKey ? d.accessKey.substring(0, 10) + '...' + d.accessKey.substring(40) : '—';
    const isSimulated = d.isSimulated || (d.rawUrl && d.rawUrl.includes('ABCDEF'));
    const badgeTag = isSimulated
      ? `<span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 800; background: rgba(251,188,4,0.18); color: var(--warning); border: 1px solid var(--warning);"><i class="fa-solid fa-bolt"></i> Simulada</span>`
      : `<span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 800; background: rgba(52,168,83,0.18); color: var(--accent-light); border: 1px solid var(--accent-light);"><i class="fa-solid fa-circle-check"></i> Real</span>`;

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="user-avatar" style="width:32px; height:32px; font-size:0.8rem; flex-shrink:0;">${initials}</div>
            <div>
              <strong>${d.userName || '—'}</strong><br>
              ${badgeTag}
            </div>
          </div>
        </td>
        <td style="color: var(--text-muted); font-size: 0.88rem;">${d.userEmail || '—'}</td>
        <td style="font-size: 0.88rem;">${d.issuer || '—'}<br><span style="color: var(--text-muted); font-size: 0.78rem;">${d.cnpj || ''}</span></td>
        <td style="color: var(--accent-light); font-weight: 800;">R$ ${d.value ? d.value.toFixed(2) : '0.00'}</td>
        <td style="color: var(--gold); font-weight: 900;">+${d.pointsEarned || 0} pts</td>
        <td style="font-size: 0.85rem;">${date}</td>
        <td>
          <span title="${d.accessKey || ''}" style="font-family: monospace; font-size: 0.78rem; color: var(--text-muted); cursor: help;">${shortKey}</span>
        </td>
      </tr>
    `;
  }).join('');

  // Paginação
  const paginationEl = document.getElementById('donations-pagination');
  if (paginationEl) {
    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
    } else {
      paginationEl.innerHTML = `
        <button class="btn btn-outline" style="padding: 6px 14px;" ${donationsCurrentPage === 1 ? 'disabled' : ''} onclick="changeDonationsPage(${donationsCurrentPage - 1})">
          ◀ Anterior
        </button>
        <span style="font-weight: 800; color: var(--text-muted);">Página ${donationsCurrentPage} de ${totalPages}</span>
        <button class="btn btn-outline" style="padding: 6px 14px;" ${donationsCurrentPage === totalPages ? 'disabled' : ''} onclick="changeDonationsPage(${donationsCurrentPage + 1})">
          Próximo ▶
        </button>
      `;
    }
  }
}

function changeDonationsPage(page) {
  donationsCurrentPage = page;
  renderDonationsTable();
}

function applyDonationsFilter() {
  donationsCurrentPage = 1;
  loadDonationsTable();
}

function clearDonationsFilter() {
  const searchEl = document.getElementById('donations-search-user');
  const sortEl = document.getElementById('donations-sort');
  if (searchEl) searchEl.value = '';
  if (sortEl) sortEl.value = 'date_desc';
  donationsCurrentPage = 1;
  loadDonationsTable();
}

// ───────────────────────────────────────────────
// HISTÓRICO GLOBAL DE DOAÇÃO DE PONTOS ENTRE USUÁRIOS
// ───────────────────────────────────────────────

function renderPointTransfersTable() {
  const tbody = document.getElementById('point-transfers-table-tbody');
  if (!tbody) return;

  const transfers = Storage.getPointTransfers();

  if (transfers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 32px; color: var(--text-muted); font-weight: 700;">Nenhuma doação de pontos realizada entre usuários até o momento.</td></tr>`;
    return;
  }

  tbody.innerHTML = transfers.map(t => {
    const dateStr = new Date(t.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const senderInitials = (t.senderName || '?').split(' ').filter(n => n).slice(0, 2).map(n => n[0].toUpperCase()).join('');
    const recipientInitials = (t.recipientName || '?').split(' ').filter(n => n).slice(0, 2).map(n => n[0].toUpperCase()).join('');

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="user-avatar" style="width:32px; height:32px; font-size:0.8rem; flex-shrink:0;">${senderInitials}</div>
            <strong>${t.senderName || '—'}</strong>
          </div>
        </td>
        <td style="color: var(--text-muted); font-size: 0.88rem;">${t.senderEmail || '—'}</td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="user-avatar" style="width:32px; height:32px; font-size:0.8rem; flex-shrink:0; background: linear-gradient(135deg, var(--accent), var(--primary));">${recipientInitials}</div>
            <strong>${t.recipientName || '—'}</strong>
          </div>
        </td>
        <td style="color: var(--text-muted); font-size: 0.88rem;">${t.recipientEmail || '—'}</td>
        <td><span style="color: var(--gold); font-weight: 900;">⭐ ${t.amount} pts</span></td>
        <td style="font-size: 0.85rem;">${dateStr}</td>
      </tr>
    `;
  }).join('');
}
