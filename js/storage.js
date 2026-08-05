/**
 * Camada de Armazenamento de Dados (LocalStorage)
 * Simula um Banco de Dados MySQL com seeding inicial e métodos helper
 */

const Storage = {
  // Inicializa o banco de dados local se estiver vazio
  init() {
    if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USERS)) {
      this.seedData();
    }
  },

  seedData() {
    // 1. Usuários Padrão (Admin + Usuários Comuns de exemplo)
    const seedUsers = [
      {
        id: 'user-admin-1',
        name: 'Administrador do Sistema',
        email: 'admin@sistema.com',
        password: 'admin', // Em prod seria hash
        role: 'admin',
        points: 450,
        streak: 12,
        totalNotes: 45,
        lastDonationDate: '2026-08-04',
        registeredAt: '2026-01-01T10:00:00Z'
      },
      {
        id: 'user-2',
        name: 'Maria Oliveira',
        email: 'maria@email.com',
        password: '123',
        role: 'user',
        points: 280,
        streak: 8,
        totalNotes: 28,
        lastDonationDate: '2026-08-04',
        registeredAt: '2026-01-15T14:30:00Z'
      },
      {
        id: 'user-3',
        name: 'Carlos Eduardo',
        email: 'carlos@email.com',
        password: '123',
        role: 'user',
        points: 190,
        streak: 5,
        totalNotes: 19,
        lastDonationDate: '2026-08-03',
        registeredAt: '2026-02-01T09:15:00Z'
      },
      {
        id: 'user-4',
        name: 'Ana Beatriz',
        email: 'ana@email.com',
        password: '123',
        role: 'user',
        points: 120,
        streak: 3,
        totalNotes: 12,
        lastDonationDate: '2026-08-02',
        registeredAt: '2026-02-10T11:00:00Z'
      }
    ];

    // 2. Prêmios da Loja de Exemplo
    const seedStoreItems = [
      {
        id: 'item-1',
        name: 'Garrafa Térmica Ecológica 500ml',
        description: 'Mantenha sua bebida gelada por 24h ou quente por 12h. Material sustentável.',
        imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80',
        cost: 100,
        stock: 5
      },
      {
        id: 'item-2',
        name: 'Ecobag de Algodão Orgânico',
        description: 'Sacola reutilizável resistente com estampa exclusiva da campanha.',
        imageUrl: 'https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=400&q=80',
        cost: 50,
        stock: 10
      },
      {
        id: 'item-3',
        name: 'Ingresso de Cinema',
        description: 'Válido para qualquer sessão na rede de cinemas parceira.',
        imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80',
        cost: 150,
        stock: 3
      },
      {
        id: 'item-4',
        name: 'Kit Sementes para Horta',
        description: 'Sementes orgânicas de manjericão, tomate cereja e alecrim.',
        imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=400&q=80',
        cost: 30,
        stock: 0
      }
    ];

    // 3. Doações iniciais de exemplo
    const seedDonations = [
      {
        id: 'don-1',
        userId: 'user-admin-1',
        userName: 'Administrador do Sistema',
        accessKey: '35260804123456789012550010000012341000012341',
        status: 'valid',
        value: 128.50,
        cnpj: '12.345.678/0001-95',
        issuer: 'Supermercado Bom Preço',
        date: '2026-08-04T10:15:00Z',
        pointsEarned: 10,
        sentToEmail: APP_CONFIG.DEFAULT_DESTINATION_EMAIL
      },
      {
        id: 'don-2',
        userId: 'user-2',
        userName: 'Maria Oliveira',
        accessKey: '35260804123456789012550010000055551000055551',
        status: 'valid',
        value: 45.90,
        cnpj: '98.765.432/0001-10',
        issuer: 'Farmácia Vida',
        date: '2026-08-04T09:30:00Z',
        pointsEarned: 10,
        sentToEmail: APP_CONFIG.DEFAULT_DESTINATION_EMAIL
      }
    ];

    // 4. Hall da Fama inicial (Ciclo anterior)
    const seedHallOfFame = [
      {
        id: 'hof-1',
        period: '1º Trimestre (Jan - Mar 2026)',
        resetDate: '2026-04-01',
        top3: [
          { rank: 1, name: 'Administrador do Sistema', totalNotes: 120 },
          { rank: 2, name: 'Maria Oliveira', totalNotes: 95 },
          { rank: 3, name: 'Carlos Eduardo', totalNotes: 78 }
        ]
      }
    ];

    // Configurações salvas
    const seedSettings = {
      destinationEmail: APP_CONFIG.DEFAULT_DESTINATION_EMAIL,
      pointsPerNote: APP_CONFIG.POINTS_PER_NOTE,
      resetIntervalMonths: APP_CONFIG.RESET_INTERVAL_MONTHS,
      lastResetDate: '2026-04-01'
    };

    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USERS, JSON.stringify(seedUsers));
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.STORE_ITEMS, JSON.stringify(seedStoreItems));
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.DONATIONS, JSON.stringify(seedDonations));
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.HALL_OF_FAME, JSON.stringify(seedHallOfFame));
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(seedSettings));
  },

  // Helpers para Usuários
  getUsers() {
    return JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USERS) || '[]');
  },

  saveUsers(users) {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getUserById(id) {
    return this.getUsers().find(u => u.id === id);
  },

  getUserByEmail(email) {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  },

  updateUser(updatedUser) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
      this.saveUsers(users);

      // Se for o usuário atual logado, atualiza a sessão
      const current = this.getCurrentUser();
      if (current && current.id === updatedUser.id) {
        sessionStorage.setItem(APP_CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
      }
    }
  },

  // Sessão de Login (Sempre re-sincroniza com os dados mais recentes do localStorage)
  getCurrentUser() {
    const sessionUser = JSON.parse(sessionStorage.getItem(APP_CONFIG.STORAGE_KEYS.CURRENT_USER) || 'null');
    if (!sessionUser) return null;

    const freshUser = this.getUserById(sessionUser.id);
    if (freshUser) {
      sessionStorage.setItem(APP_CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(freshUser));
      return freshUser;
    }
    return sessionUser;
  },

  setCurrentUser(user) {
    sessionStorage.setItem(APP_CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  },

  logout() {
    sessionStorage.removeItem(APP_CONFIG.STORAGE_KEYS.CURRENT_USER);
  },

  // Helpers para Doações
  getDonations() {
    return JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.DONATIONS) || '[]');
  },

  saveDonation(donation) {
    const donations = this.getDonations();
    donations.unshift(donation); // Adiciona no início (mais recente)
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.DONATIONS, JSON.stringify(donations));
  },

  // Helpers para Loja
  getStoreItems() {
    return JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.STORE_ITEMS) || '[]');
  },

  saveStoreItems(items) {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.STORE_ITEMS, JSON.stringify(items));
  },

  // Configurações do Sistema
  getSettings() {
    const defaultSettings = {
      destinationEmail: APP_CONFIG.DEFAULT_DESTINATION_EMAIL,
      pointsPerNote: APP_CONFIG.POINTS_PER_NOTE,
      resetIntervalMonths: APP_CONFIG.RESET_INTERVAL_MONTHS,
      lastResetDate: '2026-04-01'
    };
    return JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.SETTINGS)) || defaultSettings;
  },

  saveSettings(settings) {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // Hall da Fama
  getHallOfFame() {
    return JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.HALL_OF_FAME) || '[]');
  },

  saveHallOfFame(hof) {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.HALL_OF_FAME, JSON.stringify(hof));
  },

  // Doação / Transferência de Pontos Entre Usuários
  getPointTransfers() {
    return JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.POINT_TRANSFERS) || '[]');
  },

  savePointTransfer(transfer) {
    const transfers = this.getPointTransfers();
    transfers.unshift(transfer);
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.POINT_TRANSFERS, JSON.stringify(transfers));
  }
};

// Executa inicialização
Storage.init();
