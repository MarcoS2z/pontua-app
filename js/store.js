/**
 * Lógica da Loja de Prêmios
 */

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = Auth.requireAuth();
  if (!currentUser) return;

  Auth.renderHeaderAndNav('store');
  renderStoreItems();

  // Exibe botão de adicionar item se for admin
  if (currentUser.role === 'admin') {
    const adminBtnContainer = document.getElementById('admin-add-product-container');
    if (adminBtnContainer) {
      adminBtnContainer.innerHTML = `
        <button class="btn btn-accent" onclick="openAddProductModal()">
          ➕ Adicionar Novo Prêmio
        </button>
      `;
    }
  }

  // Handle form submit para criar/editar produto (Admin)
  const productForm = document.getElementById('product-form');
  if (productForm) {
    productForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveProduct();
    });
  }
});

// Renderiza o grid de prêmios da loja
function renderStoreItems() {
  const container = document.getElementById('store-grid-container');
  if (!container) return;

  const currentUser = Storage.getCurrentUser();
  const items = Storage.getStoreItems();
  const isAdmin = currentUser.role === 'admin';

  if (items.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <span style="font-size: 3rem; display: block; margin-bottom: 12px;">🎁</span>
        <h3>Nenhum prêmio disponível no momento.</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const isOutOfStock = item.stock <= 0;
    const canAfford = currentUser.points >= item.cost;

    return `
      <div class="product-card">
        <div class="product-image-container">
          <img src="${item.imageUrl}" alt="${item.name}" class="product-image" onerror="this.src='https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=400&q=80'" />
          <span class="product-badge ${isOutOfStock ? 'out-of-stock' : 'in-stock'}">
            ${isOutOfStock ? 'Indisponível' : `${item.stock} em estoque`}
          </span>
        </div>
        <div class="product-body">
          <h3 class="product-title">${item.name}</h3>
          <p class="product-desc">${item.description}</p>
        </div>
        <div class="product-footer">
          <div class="product-cost">
            <span>⭐</span>
            <span>${item.cost} pts</span>
          </div>
          <button 
            class="btn btn-primary" 
            ${(isOutOfStock || !canAfford) ? 'disabled' : ''}
            onclick="redeemItem('${item.id}')"
            title="${!canAfford ? 'Pontos insuficientes' : isOutOfStock ? 'Estoque esgotado' : 'Resgatar prêmio'}"
          >
            Resgatar
          </button>
        </div>
        ${isAdmin ? `
          <div class="admin-actions" style="padding: 10px 20px;">
            <button class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem; flex: 1;" onclick="openEditProductModal('${item.id}')">✏️ Editar</button>
            <button class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem; flex: 1; border-color: var(--danger); color: var(--danger);" onclick="deleteProduct('${item.id}')">🗑️ Excluir</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Resgatar item da loja
function redeemItem(itemId) {
  const currentUser = Storage.getCurrentUser();
  const items = Storage.getStoreItems();
  const item = items.find(i => i.id === itemId);

  if (!item) return;

  if (item.stock <= 0) {
    Auth.showToast('Item indisponível no momento.', 'error');
    return;
  }

  if (currentUser.points < item.cost) {
    Auth.showToast(`Você precisa de ${item.cost} pontos para este prêmio!`, 'warning');
    return;
  }

  if (!confirm(`Deseja resgatar "${item.name}" por ${item.cost} pontos?`)) {
    return;
  }

  // 1. Debita pontos do usuário
  currentUser.points -= item.cost;

  // 2. Decrementa o estoque do item
  item.stock -= 1;

  // 3. Atualiza no Storage
  Storage.updateUser(currentUser);
  Storage.saveStoreItems(items);

  // 4. Registra log de resgate
  const redeemed = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.REDEEMED_ITEMS) || '[]');
  redeemed.push({
    id: 'red-' + Date.now(),
    userId: currentUser.id,
    userName: currentUser.name,
    itemId: item.id,
    itemName: item.name,
    cost: item.cost,
    date: new Date().toISOString()
  });
  localStorage.setItem(APP_CONFIG.STORAGE_KEYS.REDEEMED_ITEMS, JSON.stringify(redeemed));

  // 5. Atualiza UI
  Auth.renderHeaderAndNav('store');
  renderStoreItems();

  if (typeof confetti === 'function') {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, zIndex: 9999 });
  }

  Auth.showToast(`Parabéns! Você resgatou "${item.name}" com sucesso! 🎉`, 'success');
}

// Modais Admin (Criar / Editar Prêmios)
function openAddProductModal() {
  document.getElementById('modal-product-title').textContent = '➕ Adicionar Novo Prêmio';
  document.getElementById('product-id').value = '';
  document.getElementById('product-name').value = '';
  document.getElementById('product-desc').value = '';
  document.getElementById('product-cost').value = '100';
  document.getElementById('product-stock').value = '5';
  document.getElementById('product-image').value = 'https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=400&q=80';

  document.getElementById('product-modal-overlay').classList.add('active');
}

function openEditProductModal(itemId) {
  const items = Storage.getStoreItems();
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  document.getElementById('modal-product-title').textContent = '✏️ Editar Prêmio';
  document.getElementById('product-id').value = item.id;
  document.getElementById('product-name').value = item.name;
  document.getElementById('product-desc').value = item.description;
  document.getElementById('product-cost').value = item.cost;
  document.getElementById('product-stock').value = item.stock;
  document.getElementById('product-image').value = item.imageUrl;

  document.getElementById('product-modal-overlay').classList.add('active');
}

function saveProduct() {
  const id = document.getElementById('product-id').value;
  const name = document.getElementById('product-name').value.trim();
  const desc = document.getElementById('product-desc').value.trim();
  const cost = parseInt(document.getElementById('product-cost').value, 10);
  const stock = parseInt(document.getElementById('product-stock').value, 10);
  const imageUrl = document.getElementById('product-image').value.trim();

  if (!name || isNaN(cost) || isNaN(stock)) {
    Auth.showToast('Preencha os campos corretamente.', 'warning');
    return;
  }

  const items = Storage.getStoreItems();

  if (id) {
    // Editar
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      items[index] = { id, name, description: desc, cost, stock, imageUrl };
    }
  } else {
    // Criar novo
    items.push({
      id: 'item-' + Date.now(),
      name,
      description: desc,
      cost,
      stock,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=400&q=80'
    });
  }

  Storage.saveStoreItems(items);
  document.getElementById('product-modal-overlay').classList.remove('active');
  renderStoreItems();
  Auth.showToast('Prêmio salvo com sucesso! 🛒', 'success');
}

function deleteProduct(itemId) {
  if (!confirm('Tem certeza que deseja excluir este prêmio?')) return;

  const items = Storage.getStoreItems().filter(i => i.id !== itemId);
  Storage.saveStoreItems(items);
  renderStoreItems();
  Auth.showToast('Prêmio excluído.', 'info');
}
