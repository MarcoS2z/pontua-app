/**
 * Lógica da Tela de Histórico Completo de Doações
 */

let currentFilter = 'all';
let currentPage = 1;
const ITEMS_PER_PAGE = 8;

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = Auth.requireAuth();
  if (!currentUser) return;

  Auth.renderHeaderAndNav('history');
  renderFullHistory();

  // Filter Buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      currentPage = 1;
      renderFullHistory();
    });
  });
});

function renderFullHistory() {
  const currentUser = Storage.getCurrentUser();
  const allDonations = Storage.getDonations();
  const allTransfers = Storage.getPointTransfers();

  // 1. Doações de notas do usuário
  let noteItems = allDonations
    .filter(d => d.userId === currentUser.id)
    .map(d => ({
      type: 'note',
      status: d.status,
      date: d.date,
      issuer: d.issuer,
      cnpj: d.cnpj,
      accessKey: d.accessKey,
      pointsEarned: d.pointsEarned
    }));

  // 2. Transferências de pontos do usuário (enviadas e recebidas)
  let transferItems = allTransfers
    .filter(t => t.senderId === currentUser.id || t.recipientId === currentUser.id)
    .map(t => {
      const isSender = t.senderId === currentUser.id;
      return {
        type: 'transfer',
        status: 'transfers',
        isSender: isSender,
        date: t.date,
        otherName: isSender ? t.recipientName : t.senderName,
        otherEmail: isSender ? t.recipientEmail : t.senderEmail,
        amount: t.amount
      };
    });

  // 3. Aplicação dos Filtros
  let combinedItems = [];
  if (currentFilter === 'all') {
    combinedItems = [...noteItems, ...transferItems];
  } else if (currentFilter === 'transfers') {
    combinedItems = transferItems;
  } else {
    combinedItems = noteItems.filter(item => item.status === currentFilter);
  }

  // Ordena por data mais recente primeiro
  combinedItems.sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalItems = combinedItems.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = combinedItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const container = document.getElementById('full-history-list');
  if (!container) return;

  if (pageItems.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <span style="font-size: 3rem; display: block; margin-bottom: 12px;">📂</span>
        <p style="font-weight: 700;">Nenhum registro encontrado para este filtro.</p>
      </div>
    `;
    renderPagination(0, 1);
    return;
  }

  container.innerHTML = pageItems.map(item => {
    let iconClass = 'valid';
    let iconSymbol = '✅';
    let statusTitle = 'Nota Validada com Sucesso';
    let detailsHtml = '';
    let ptsText = '';
    let ptsColor = 'var(--gold)';

    if (item.type === 'transfer') {
      iconClass = item.isSender ? 'duplicate' : 'valid';
      iconSymbol = '🎁';
      statusTitle = item.isSender ? 'Doação de Pontos Enviada' : 'Doação de Pontos Recebida';
      detailsHtml = `<p>${item.isSender ? 'Para' : 'De'}: ${item.otherName} • ${item.otherEmail}</p>`;
      ptsText = item.isSender ? `-${item.amount} pts` : `+${item.amount} pts`;
      ptsColor = item.isSender ? 'var(--streak)' : 'var(--gold)';
    } else {
      if (item.status === 'duplicate') {
        iconClass = 'duplicate';
        iconSymbol = '🔁';
        statusTitle = 'Nota Já Utilizada (Repetida)';
        ptsText = '+0 pts';
      } else if (item.status === 'invalid') {
        iconClass = 'invalid';
        iconSymbol = '❌';
        statusTitle = 'Nota Inválida';
        ptsText = '+0 pts';
      } else {
        ptsText = `+${item.pointsEarned} pts`;
      }
      detailsHtml = `
        <p>${item.issuer || 'Nota Fiscal'} • CNPJ: ${item.cnpj || 'N/A'}</p>
        <p style="font-size: 0.78rem; font-family: monospace; color: var(--text-muted); margin-top: 4px;">Chave: ${item.accessKey || 'N/A'}</p>
      `;
    }

    const dateFormatted = new Date(item.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="history-item" style="padding: 18px;">
        <div class="history-left">
          <div class="history-icon ${iconClass}">
            ${iconSymbol}
          </div>
          <div class="history-details">
            <h4 style="font-size: 1.05rem;">${statusTitle}</h4>
            ${detailsHtml}
          </div>
        </div>
        <div style="text-align: right;">
          <div class="history-points" style="font-size: 1.1rem; color: ${ptsColor};">
            ${ptsText}
          </div>
          <span style="font-size: 0.8rem; color: var(--text-muted);">${dateFormatted}</span>
        </div>
      </div>
    `;
  }).join('');

  renderPagination(totalPages, currentPage);
}

function renderPagination(totalPages, page) {
  const container = document.getElementById('pagination-container');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <button class="btn btn-outline" style="padding: 6px 14px;" ${page === 1 ? 'disabled' : ''} onclick="changePage(${page - 1})">
      ◀ Anterior
    </button>
    <span style="font-weight: 800; color: var(--text-muted);">Página ${page} de ${totalPages}</span>
    <button class="btn btn-outline" style="padding: 6px 14px;" ${page === totalPages ? 'disabled' : ''} onclick="changePage(${page + 1})">
      Próximo ▶
    </button>
  `;
}

function changePage(newPage) {
  currentPage = newPage;
  renderFullHistory();
}
