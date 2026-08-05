/**
 * Lógica da Tela Principal (Dashboard)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Verifica autenticação
  const currentUser = Auth.requireAuth();
  if (!currentUser) return;

  // 2. Renderiza cabeçalho e navegação
  Auth.renderHeaderAndNav('dashboard');

  // 3. Renderiza histórico recente no dashboard
  renderRecentHistory();

  // 4. Inicializa interceptador do scanner USB
  Scanner.init((donationResult, updatedUser) => {
    handleScanResult(donationResult, updatedUser);
  });

  // 5. Botão "📷 Iniciar Leitura" no Hero Card
  const startReadingBtn = document.getElementById('start-reading-btn');
  if (startReadingBtn) {
    startReadingBtn.addEventListener('click', () => {
      openScannerModal();
    });
  }

  // 6. Form de digitação manual dentro do Modal
  const modalManualForm = document.getElementById('modal-manual-scan-form');
  if (modalManualForm) {
    modalManualForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('manual-qr-input');
      const text = input ? input.value.trim() : '';

      if (text) {
        Scanner.processScannedText(text);
        input.value = '';
      } else {
        Auth.showToast('Digite uma chave de 44 dígitos ou a URL da nota.', 'warning');
      }
    });
  }

  // 7. Botão "⚡ Simular Leitura" no rodapé do Modal (gera nota válida para teste)
  const modalSimulateBtn = document.getElementById('modal-simulate-btn');
  if (modalSimulateBtn) {
    modalSimulateBtn.addEventListener('click', () => {
      simulateValidScan();
    });
  }
});

// Funções de Controle do Modal de Escaneamento Ativo
function openScannerModal() {
  const modal = document.getElementById('scanner-modal-overlay');
  if (modal) {
    modal.classList.add('active');
    Scanner.startListening();
    const input = document.getElementById('manual-qr-input');
    if (input) {
      input.value = '';
    }
  }
}

function closeScannerModal() {
  const modal = document.getElementById('scanner-modal-overlay');
  if (modal) {
    modal.classList.remove('active');
    Scanner.stopListening();
  }
}

// Gera uma Chave de NFCe de 44 dígitos exatos com Dígito Verificador Módulo 11 válido para teste
function simulateValidScan() {
  const timestampStr = String(Date.now());
  const code8 = timestampStr.substring(timestampStr.length - 8); // 8 dígitos
  const base43 = '35260812345678000195650010000055551' + code8; // 35 + 8 = 43 dígitos exatos
  
  let sum = 0, weight = 2;
  for (let i = base43.length - 1; i >= 0; i--) {
    sum += parseInt(base43.charAt(i), 10) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let remainder = sum % 11;
  let dv = 11 - remainder;
  if (dv >= 10) dv = 0;
  
  const validKey = base43 + String(dv); // 44 dígitos exatos
  const mockUrl = `https://www.sefaz.sp.gov.br/nfce/qrcode?p=${validKey}|2|1|1|ABCDEF`;
  Scanner.processScannedText(mockUrl);
}

// Manipula o resultado da leitura da nota
function handleScanResult(donationResult, updatedUser) {
  // Atualiza os contadores no Header bar
  const ptsVal = document.getElementById('user-points-val');
  const streakVal = document.getElementById('user-streak-val');

  if (ptsVal) ptsVal.textContent = updatedUser.points;
  if (streakVal) streakVal.textContent = `${updatedUser.streak} dias`;

  // Notifica o usuário e exibe feedback
  if (donationResult.status === 'valid') {
    closeScannerModal();

    // Dispara animação de confetti por cima de todas as modais (zIndex: 9999)
    if (typeof confetti === 'function') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 9999 });
    }

    Auth.showToast(`Nota Fiscal validada! +${donationResult.pointsEarned} pontos conquistados! ⭐`, 'success');
    
    // Exibe Modal com QR Code Virtual Reavaliado e envio por email
    QRCodeGen.showQRCodeModal(donationResult);
  } else if (donationResult.status === 'duplicate') {
    showScannerFeedback('⚠️ Esta nota já foi registrada anteriormente por você ou outro usuário.', 'warning');
  } else {
    showScannerFeedback('❌ ' + (donationResult.message || 'QR Code inválido: este código não pertence a uma Nota Fiscal Eletrônica.'), 'error');
  }

  // Atualiza a lista de histórico recente
  renderRecentHistory();
}

// Exibe uma mensagem de feedback diretamente dentro do modal do scanner
function showScannerFeedback(message, type) {
  const el = document.getElementById('scanner-feedback-msg');
  if (!el) return;

  const colors = {
    error:   { bg: 'rgba(234,67,53,0.12)', border: 'var(--danger)', color: '#ff6b6b' },
    warning: { bg: 'rgba(251,188,4,0.12)', border: 'var(--warning)', color: '#fcd34d' },
    success: { bg: 'rgba(52,168,83,0.12)', border: 'var(--accent)', color: 'var(--accent-light)' }
  };
  const c = colors[type] || colors.error;

  el.style.display = 'block';
  el.style.background = c.bg;
  el.style.border = `1.5px solid ${c.border}`;
  el.style.color = c.color;
  el.textContent = message;

  // Some automaticamente após 5 segundos
  clearTimeout(el._hideTimeout);
  el._hideTimeout = setTimeout(() => {
    el.style.display = 'none';
  }, 5000);
}

// Renderiza as últimas 5 atividades (notas e doações de pontos) no dashboard
function renderRecentHistory() {
  const container = document.getElementById('recent-history-list');
  if (!container) return;

  const currentUser = Storage.getCurrentUser();
  const allDonations = Storage.getDonations();
  const allTransfers = Storage.getPointTransfers();

  // 1. Doações de notas
  const noteItems = allDonations
    .filter(d => d.userId === currentUser.id)
    .map(d => ({
      type: 'note',
      status: d.status,
      date: d.date,
      issuer: d.issuer,
      pointsEarned: d.pointsEarned
    }));

  // 2. Doações de pontos (enviadas / recebidas)
  const transferItems = allTransfers
    .filter(t => t.senderId === currentUser.id || t.recipientId === currentUser.id)
    .map(t => {
      const isSender = t.senderId === currentUser.id;
      return {
        type: 'transfer',
        isSender: isSender,
        date: t.date,
        otherName: isSender ? t.recipientName : t.senderName,
        amount: t.amount
      };
    });

  // Combina e ordena os 5 mais recentes
  const combined = [...noteItems, ...transferItems]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (combined.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-muted);">
        <span style="font-size: 2.5rem; display: block; margin-bottom: 8px;">🧾</span>
        <p style="font-weight: 700;">Nenhuma atividade registrada ainda.</p>
        <p style="font-size: 0.85rem;">Utilize o scanner acima para registrar sua primeira nota!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = combined.map(item => {
    let iconClass = 'valid';
    let iconSymbol = '✅';
    let statusTitle = 'Nota validada com sucesso';
    let subtitle = item.issuer || 'Nota Fiscal';
    let ptsText = `+${item.pointsEarned} pts`;
    let ptsColor = 'var(--gold)';

    if (item.type === 'transfer') {
      iconClass = item.isSender ? 'duplicate' : 'valid';
      iconSymbol = '🎁';
      statusTitle = item.isSender ? 'Doação de Pontos Enviada' : 'Doação de Pontos Recebida';
      subtitle = item.isSender ? `Para ${item.otherName}` : `De ${item.otherName}`;
      ptsText = item.isSender ? `-${item.amount} pts` : `+${item.amount} pts`;
      ptsColor = item.isSender ? 'var(--streak)' : 'var(--gold)';
    } else {
      if (item.status === 'duplicate') {
        iconClass = 'duplicate';
        iconSymbol = '🔁';
        statusTitle = 'Nota já utilizada (repetida)';
        ptsText = '+0 pts';
      } else if (item.status === 'invalid') {
        iconClass = 'invalid';
        iconSymbol = '❌';
        statusTitle = 'Nota inválida';
        ptsText = '+0 pts';
      }
    }

    const dateFormatted = new Date(item.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="history-item">
        <div class="history-left">
          <div class="history-icon ${iconClass}">
            ${iconSymbol}
          </div>
          <div class="history-details">
            <h4>${statusTitle}</h4>
            <p>${subtitle} • ${dateFormatted}</p>
          </div>
        </div>
        <div class="history-points" style="color: ${ptsColor};">
          ${ptsText}
        </div>
      </div>
    `;
  }).join('');
}
