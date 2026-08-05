/**
 * Utilitário para Geração de QR Code Virtual
 * Gera imagens e elementos visuais de QR Code para reenvio e visualização da Nota Fiscal
 */

const QRCodeGen = {
  // Gera uma imagem SVG/Canvas Data URL de QR Code contendo a URL da Nota Fiscal
  // Usa API de SVG dinâmica / Canvas fallback
  generateQRCodeDataUrl(text) {
    const encodedText = encodeURIComponent(text);
    // Usa serviço online leve e confiável para imagem do QR code
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodedText}`;
  },

  // Exibe um modal de confirmação motivador para o usuário
  showQRCodeModal(donation) {
    let modal = document.getElementById('qr-modal-overlay');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'qr-modal-overlay';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const pointsEarned = donation.pointsEarned || APP_CONFIG.POINTS_PER_NOTE || 10;

    modal.innerHTML = `
      <div class="modal-card" style="text-align: center; max-width: 440px;">
        <div class="modal-header">
          <h3>🎉 Doação Realizada com Sucesso!</h3>
          <button class="modal-close" onclick="document.getElementById('qr-modal-overlay').classList.remove('active')">&times;</button>
        </div>
        <div style="padding: 12px 8px;">
          <div style="font-size: 3.5rem; margin-bottom: 8px; animation: bounce 1s infinite alternate;">
            🎁
          </div>

          <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255, 215, 0, 0.15); border: 2px solid var(--gold); padding: 8px 18px; border-radius: var(--radius-pill); font-weight: 900; font-size: 1.2rem; color: var(--gold); margin-bottom: 16px;">
            <span>⭐</span>
            <span>+${pointsEarned} Pontos Recebidos!</span>
          </div>

          <p style="color: var(--text); font-size: 1.05rem; font-weight: 800; margin-bottom: 8px;">
            Sua nota fiscal foi registrada e validada!
          </p>

          <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.4; margin-bottom: 20px;">
            Muito obrigado por sua contribuição. Continue doando notas fiscais diariamente para manter sua sequência 🔥 acesa e subir no ranking!
          </p>
        </div>
        <div>
          <button class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 1.05rem;" onclick="document.getElementById('qr-modal-overlay').classList.remove('active')">
            Incrível, Concluído! 🚀
          </button>
        </div>
      </div>
    `;

    setTimeout(() => modal.classList.add('active'), 10);
  }
};
