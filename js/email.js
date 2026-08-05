/**
 * Módulo de Envio de E-mail Automático via Brevo API
 * Prepara e envia os dados da nota e da imagem do QR Code para o e-mail pré-definido
 */

const EmailService = {
  // Envia a nota fiscal processada para o e-mail pré-definido
  async sendNoteEmail(donationData) {
    const settings = Storage.getSettings();
    const destination = settings.destinationEmail || APP_CONFIG.DEFAULT_DESTINATION_EMAIL;
    const qrImageUrl = QRCodeGen.generateQRCodeDataUrl(donationData.accessKey || donationData.rawUrl);

    const apiKey = APP_CONFIG.BREVO_API_KEY;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7fa; color: #1a2634; margin: 0; padding: 20px; }
          .card { max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%); padding: 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px; }
          .header p { margin: 4px 0 0 0; opacity: 0.9; font-size: 14px; }
          .content { padding: 24px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .info-table td { padding: 10px 12px; border-bottom: 1px solid #edf2f7; font-size: 14px; }
          .info-table td.label { font-weight: bold; color: #1a73e8; width: 140px; }
          .key-box { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; font-weight: bold; word-break: break-all; text-align: center; color: #0f1923; margin: 16px 0; }
          .qr-container { text-align: center; margin: 24px 0 10px 0; }
          .qr-container img { border: 3px solid #1a73e8; border-radius: 12px; padding: 6px; background: #fff; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #8fa3bf; border-top: 1px solid #edf2f7; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>Pontua 🧾</h1>
            <p>Nova Nota Fiscal Doada pelo Usuário</p>
          </div>
          <div class="content">
            <p style="font-size: 15px; margin-top: 0;">Uma nova nota fiscal foi doada e registrada com sucesso no sistema!</p>
            
            <table class="info-table">
              <tr>
                <td class="label">👤 Doador:</td>
                <td><strong>${donationData.userName || 'Usuário'}</strong></td>
              </tr>
              <tr>
                <td class="label">🏪 Emitente:</td>
                <td>${donationData.issuer || 'Supermercado/Loja'}</td>
              </tr>
              <tr>
                <td class="label">💵 Valor da Nota:</td>
                <td><strong style="color: #34a853; font-size: 16px;">R$ ${donationData.value ? Number(donationData.value).toFixed(2) : '0.00'}</strong></td>
              </tr>
              <tr>
                <td class="label">⭐ Pontos Gerados:</td>
                <td>+${donationData.pointsEarned || 10} Pontos</td>
              </tr>
              <tr>
                <td class="label">📅 Data:</td>
                <td>${new Date(donationData.date || Date.now()).toLocaleString('pt-BR')}</td>
              </tr>
            </table>

            <div style="font-size: 12px; font-weight: bold; color: #475569; margin-bottom: 4px;">CHAVE DE ACESSO DA NOTA (44 DÍGITOS):</div>
            <div class="key-box">${donationData.accessKey || 'N/A'}</div>

            <div class="qr-container">
              <p style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">📱 Leitura do QR Code:</p>
              <img src="${qrImageUrl}" alt="QR Code da Nota Fiscal" width="220" height="220" />
            </div>
          </div>
          <div class="footer">
            Pontua App • Envio Automático de Notas Fiscais
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`🚀 Enviando e-mail automático via Brevo API para: ${destination}...`);

    if (!apiKey) {
      console.warn('⚠️ BREVO_API_KEY não configurada. Simulando envio.');
      return { success: true, simulated: true, sentTo: destination };
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: "Pontua App",
            email: "marcosvinicius17052006@gmail.com"
          },
          to: [
            {
              email: destination,
              name: "Administração Pontua"
            }
          ],
          subject: `🧾 Nova Nota Fiscal Doada por ${donationData.userName || 'Usuário'} - R$ ${donationData.value ? Number(donationData.value).toFixed(2) : '0.00'}`,
          htmlContent: htmlContent
        })
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ E-mail enviado com sucesso via Brevo API!', result);
        return { success: true, messageId: result.messageId, sentTo: destination };
      } else {
        console.error('❌ Erro no envio via Brevo:', result);
        return { success: false, error: result, sentTo: destination };
      }
    } catch (err) {
      console.error('❌ Falha na requisição da API do Brevo:', err);
      return { success: false, error: err, sentTo: destination };
    }
  }
};
