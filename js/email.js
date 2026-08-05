/**
 * Módulo de Simulação e Envio de E-mail
 * Prepara o envio automático dos dados da nota e da imagem do QR Code para o e-mail pré-definido
 */

const EmailService = {
  // Envia a nota fiscal processada para o e-mail pré-definido
  sendNoteEmail(donationData) {
    const settings = Storage.getSettings();
    const destination = settings.destinationEmail || APP_CONFIG.DEFAULT_DESTINATION_EMAIL;
    const qrImageUrl = QRCodeGen.generateQRCodeDataUrl(donationData.accessKey || donationData.rawUrl);

    console.log('----------------------------------------------------');
    console.log(`🚀 [E-mail automático enviado para: ${destination}]`);
    console.log(`Assunto: Nova Nota Fiscal Doada - Chave: ${donationData.accessKey}`);
    console.log(`Doador: ${donationData.userName} (ID: ${donationData.userId})`);
    console.log(`Emitente: ${donationData.issuer || 'N/A'}`);
    console.log(`Valor: R$ ${donationData.value ? donationData.value.toFixed(2) : '0.00'}`);
    console.log(`Imagem QR Code Virtual: ${qrImageUrl}`);
    console.log('----------------------------------------------------');

    return {
      success: true,
      sentTo: destination,
      qrImageUrl: qrImageUrl,
      timestamp: new Date().toISOString()
    };
  }
};
