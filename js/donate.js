/**
 * Lógica da Doação de Pontos entre Usuários
 */

let selectedRecipient = null;

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = Auth.requireAuth();
  if (!currentUser) return;

  Auth.renderHeaderAndNav('donate');

  const searchInput = document.getElementById('search-user-input');
  const searchBtn = document.getElementById('search-user-btn');
  const donateForm = document.getElementById('donate-points-form');

  searchBtn?.addEventListener('click', () => {
    searchUsers(searchInput.value.trim());
  });

  searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchUsers(searchInput.value.trim());
    }
  });

  donateForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    executePointsDonation();
  });
});

// Busca usuários por Nome ou Email
function searchUsers(query) {
  const container = document.getElementById('search-results-container');
  if (!container) return;

  if (!query) {
    container.innerHTML = `
      <p style="color: var(--text-muted); font-size: 0.9rem;">Digite o nome ou e-mail do usuário para buscar.</p>
    `;
    return;
  }

  const currentUser = Storage.getCurrentUser();
  const users = Storage.getUsers();

  // Filtra por nome ou email (excluindo a si mesmo)
  const results = users.filter(u => 
    u.id !== currentUser.id && 
    (u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase()))
  );

  if (results.length === 0) {
    container.innerHTML = `
      <div style="padding: 16px; background-color: var(--surface-2); border-radius: var(--radius-md); text-align: center; color: var(--text-muted);">
        Nenhum usuário encontrado com esse nome ou e-mail.
      </div>
    `;
    selectedRecipient = null;
    document.getElementById('transfer-section').style.display = 'none';
    return;
  }

  container.innerHTML = results.map(u => {
    const initials = u.name
      .split(' ')
      .filter(n => n.length > 0)
      .slice(0, 2)
      .map(n => n[0].toUpperCase())
      .join('');

    return `
      <div class="user-search-card" onclick="selectRecipient('${u.id}')" id="user-card-${u.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 14px; background-color: var(--surface-2); border: 2px solid var(--surface-border); border-radius: var(--radius-md); margin-bottom: 10px; cursor: pointer; transition: var(--transition);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="user-avatar">${initials}</div>
          <div>
            <strong style="color: var(--text); display: block;">${u.name}</strong>
            <span style="font-size: 0.85rem; color: var(--text-muted);">${u.email}</span>
          </div>
        </div>
        <button class="btn btn-outline" style="padding: 6px 14px; font-size: 0.85rem;">Selecionar</button>
      </div>
    `;
  }).join('');
}

function selectRecipient(userId) {
  const user = Storage.getUserById(userId);
  if (!user) return;

  selectedRecipient = user;

  // Destaque visual
  document.querySelectorAll('.user-search-card').forEach(card => {
    card.style.borderColor = 'var(--surface-border)';
    card.style.backgroundColor = 'var(--surface-2)';
  });

  const selectedCard = document.getElementById(`user-card-${userId}`);
  if (selectedCard) {
    selectedCard.style.borderColor = 'var(--primary-light)';
    selectedCard.style.backgroundColor = 'rgba(26, 115, 232, 0.15)';
  }

  // Exibe seção de transferência
  const transferSection = document.getElementById('transfer-section');
  const recipientNameSpan = document.getElementById('recipient-name-display');

  if (transferSection && recipientNameSpan) {
    recipientNameSpan.textContent = user.name;
    transferSection.style.display = 'block';
    transferSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// Executa a transferência de pontos
function executePointsDonation() {
  if (!selectedRecipient) {
    Auth.showToast('Selecione um usuário destinatário.', 'warning');
    return;
  }

  const currentUser = Storage.getCurrentUser();
  const pointsInput = document.getElementById('points-amount-input');
  const amount = parseInt(pointsInput ? pointsInput.value : '0', 10);

  if (isNaN(amount) || amount <= 0) {
    Auth.showToast('Informe um número de pontos válido.', 'warning');
    return;
  }

  if (currentUser.points < amount) {
    Auth.showToast(`Saldo insuficiente. Você possui apenas ${currentUser.points} pontos.`, 'error');
    return;
  }

  if (!confirm(`Confirmar a doação de ${amount} pontos para ${selectedRecipient.name}?`)) {
    return;
  }

  // Debita do doador
  currentUser.points -= amount;
  Storage.updateUser(currentUser);

  // Credita no destinatário
  const recipientInDb = Storage.getUserById(selectedRecipient.id);
  if (recipientInDb) {
    recipientInDb.points += amount;
    Storage.updateUser(recipientInDb);
  }

  // Grava a transferência no histórico global
  const transferRecord = {
    id: 'trans-' + Date.now(),
    senderId: currentUser.id,
    senderName: currentUser.name,
    senderEmail: currentUser.email,
    recipientId: selectedRecipient.id,
    recipientName: selectedRecipient.name,
    recipientEmail: selectedRecipient.email,
    amount: amount,
    date: new Date().toISOString()
  };
  Storage.savePointTransfer(transferRecord);

  // Atualiza Header e limpa formulário
  Auth.renderHeaderAndNav('donate');
  pointsInput.value = '';
  document.getElementById('transfer-section').style.display = 'none';
  document.getElementById('search-results-container').innerHTML = '';

  Auth.showToast(`Sucesso! Você doou ${amount} pontos para ${selectedRecipient.name}! 🎁`, 'success');
  selectedRecipient = null;
}
