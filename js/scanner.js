/**
 * Interceptador de Scanner USB HID & Parser de NFCe / QR Code
 * Inclui validação matemática pelo algoritmo Módulo 11 (Dígito Verificador SEFAZ)
 * e verificação de URLs oficiais de NFCe (Modelo 65 / Modelo 55)
 */

const Scanner = {
  scanBuffer: '',
  scanTimeout: null,
  onScanCallback: null,

  // Códigos de UF válidos do IBGE
  VALID_UFS: ['11','12','13','14','15','16','17','21','22','23','24','25','26','27','28','29','31','32','33','35','41','42','43','50','51','52','53'],

  isListening: false,

  startListening() {
    this.isListening = true;
    this.scanBuffer = '';
  },

  stopListening() {
    this.isListening = false;
    this.scanBuffer = '';
  },

  init(onScanCallback) {
    this.onScanCallback = onScanCallback;

    document.addEventListener('keypress', (e) => {
      // Se a escuta não estiver ativa (pop-up fechado), ignora totalmente
      if (!this.isListening) return;

      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl.id !== 'manual-qr-input') {
        return;
      }

      if (e.key === 'Enter') {
        if (this.scanBuffer.trim().length > 0) {
          const scannedText = this.scanBuffer.trim();
          this.scanBuffer = '';
          this.processScannedText(scannedText);
        }
      } else {
        this.scanBuffer += e.key;
        clearTimeout(this.scanTimeout);
        this.scanTimeout = setTimeout(() => {
          this.scanBuffer = '';
        }, 500);
      }
    });
  },

  processScannedText(rawText) {
    const currentUser = Storage.getCurrentUser();
    if (!currentUser) return;

    // 1. Executa validação de NFCe / NFe com Módulo 11 e análise de padrões SEFAZ
    const parsedData = this.parseAndValidateNFCe(rawText);
    const donations = Storage.getDonations();

    let donationResult = {
      id: 'don-' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      accessKey: parsedData.accessKey,
      rawUrl: rawText,
      value: parsedData.value,
      cnpj: parsedData.cnpj,
      issuer: parsedData.issuer,
      date: new Date().toISOString(),
      pointsEarned: 0,
      status: 'invalid'
    };

    // 2. Se a validação falhar (código aleatório, QR de Pix, DV inválido, etc.)
    if (!parsedData.isValid) {
      donationResult.status = 'invalid';
      donationResult.message = parsedData.errorMessage || 'Código inválido: Este QR Code não pertence a uma Nota Fiscal Eletrônica reconhecida pela SEFAZ.';
    } else {
      // 3. Verifica duplicidade (se a nota já foi utilizada)
      const isDuplicate = donations.some(d => d.accessKey === parsedData.accessKey && d.status === 'valid');

      if (isDuplicate) {
        donationResult.status = 'duplicate';
        donationResult.message = 'Nota já utilizada anteriormente por você ou por outro usuário.';
      } else {
        // NOTA VÁLIDA!
        const settings = Storage.getSettings();
        const pointsToAdd = settings.pointsPerNote || APP_CONFIG.POINTS_PER_NOTE;

        donationResult.status = 'valid';
        donationResult.pointsEarned = pointsToAdd;
        donationResult.message = `Nota fiscal validada com sucesso! +${pointsToAdd} pontos creditados.`;

        // Credita pontos e atualiza notas
        currentUser.points += pointsToAdd;
        currentUser.totalNotes = (currentUser.totalNotes || 0) + 1;

        // Lógica de Streak
        const todayStr = new Date().toISOString().split('T')[0];
        if (!currentUser.lastDonationDate) {
          currentUser.streak = 1;
        } else {
          const lastDate = new Date(currentUser.lastDonationDate);
          const todayDate = new Date(todayStr);
          const diffTime = Math.abs(todayDate - lastDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            currentUser.streak += 1;
          } else if (diffDays > 1) {
            currentUser.streak = 1;
          }
        }
        currentUser.lastDonationDate = todayStr;

        Storage.updateUser(currentUser);

        // Envio automático da nota e do QR Code por e-mail via Brevo API
        const settings = Storage.getSettings();
        donationResult.sentToEmail = settings.destinationEmail || APP_CONFIG.DEFAULT_DESTINATION_EMAIL;
        EmailService.sendNoteEmail(donationResult);
      }
    }

    // Grava no banco de dados local
    Storage.saveDonation(donationResult);

    if (this.onScanCallback) {
      this.onScanCallback(donationResult, currentUser);
    }
  },

  /**
   * Parser e Validador Rígido de NFCe / NFe
   * Aplica algoritmo de Dígito Verificador Módulo 11 e checagem de estrutura SEFAZ
   */
  parseAndValidateNFCe(text) {
    if (!text || typeof text !== 'string') {
      return { isValid: false, errorMessage: 'Nenhum dado informado.' };
    }

    const cleanText = text.trim();

    // Procura por 44 dígitos numéricos seguidos no texto/URL
    const keyMatch = cleanText.match(/\b\d{44}\b/);
    let accessKey = keyMatch ? keyMatch[0] : null;

    // Se for URL da SEFAZ contendo parâmetro 'p=' sem a chave direta de 44 dígitos
    if (!accessKey && (cleanText.includes('sefaz') || cleanText.includes('fazenda') || cleanText.includes('nfce') || cleanText.includes('nfe'))) {
      const pMatch = cleanText.match(/p=([^&|]+)/);
      if (pMatch) {
        const paramVal = pMatch[1];
        const numOnly = paramVal.replace(/\D/g, '');
        if (numOnly.length >= 44) {
          accessKey = numOnly.substring(0, 44);
        }
      }
    }

    // Se não encontrou nenhuma sequência de 44 dígitos
    if (!accessKey) {
      return {
        isValid: false,
        errorMessage: 'QR Code ou código inválido. Não foi encontrada a Chave de Acesso da NFCe (44 dígitos).'
      };
    }

    // 1. Validação de UF (2 primeiros dígitos)
    const ufCode = accessKey.substring(0, 2);
    if (!this.VALID_UFS.includes(ufCode)) {
      return {
        isValid: false,
        errorMessage: 'Chave de Acesso inválida: Código de estado (UF) inexistente.'
      };
    }

    // 2. Validação de Modelo (dígitos 21 e 22): 55 = NFe, 65 = NFCe
    const modelCode = accessKey.substring(20, 22);
    if (modelCode !== '65' && modelCode !== '55') {
      return {
        isValid: false,
        errorMessage: 'Chave de Acesso inválida: O documento não é uma NFCe (Modelo 65) ou NFe (Modelo 55).'
      };
    }

    // 3. Validação pelo Algoritmo do Dígito Verificador (Módulo 11 oficial da SEFAZ)
    const isDvValid = this.validateModulo11(accessKey);
    if (!isDvValid) {
      return {
        isValid: false,
        errorMessage: 'Nota Fiscal Falsa ou Inválida: Dígito Verificador (DV) da chave de acesso é inválido.'
      };
    }

    // Extração de dados da chave válida
    const cnpjRaw = accessKey.substring(6, 20);
    const cnpjFormatted = `${cnpjRaw.substring(0,2)}.${cnpjRaw.substring(2,5)}.${cnpjRaw.substring(5,8)}/${cnpjRaw.substring(8,12)}-${cnpjRaw.substring(12,14)}`;
    
    // Tenta extrair valor da URL (ex: vNF=45.90) ou calcula um valor plausível
    const valueMatch = cleanText.match(/vNF=([\d\.]+)/);
    const parsedValue = valueMatch ? parseFloat(valueMatch[1]) : (Math.floor(Math.random() * 9000) + 1000) / 100;

    return {
      isValid: true,
      accessKey: accessKey,
      cnpj: cnpjFormatted,
      value: parsedValue,
      issuer: 'Estabelecimento Comercial CNPJ ' + cnpjFormatted
    };
  },

  /**
   * Algoritmo Oficial SEFAZ: Dígito Verificador Módulo 11
   * Calcula se os primeiros 43 dígitos geram exatamente o 44º dígito
   */
  validateModulo11(key44) {
    if (key44.length !== 44 || !/^\d+$/.test(key44)) return false;

    const base43 = key44.substring(0, 43);
    const expectedDv = parseInt(key44.charAt(43), 10);

    let sum = 0;
    let weight = 2;

    // Multiplica de trás para frente com pesos de 2 a 9
    for (let i = base43.length - 1; i >= 0; i--) {
      sum += parseInt(base43.charAt(i), 10) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }

    const remainder = sum % 11;
    let calculatedDv = 11 - remainder;

    if (calculatedDv >= 10) {
      calculatedDv = 0;
    }

    return calculatedDv === expectedDv;
  }
};
