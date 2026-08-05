/**
 * Camada de Armazenamento de Dados (Firebase Firestore + LocalStorage Cache)
 * Sincroniza em tempo real com o Firestore na nuvem e provê suporte a cache local.
 */

const Storage = {
  db: null,

  // Inicializa o banco de dados local e listeners do Firebase Firestore
  init() {
    if (typeof firebase !== 'undefined' && APP_CONFIG.FIREBASE_CONFIG) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(APP_CONFIG.FIREBASE_CONFIG);
        }
        this.db = firebase.firestore();
        this.initFirestoreSync();
      } catch (err) {
        console.warn('Erro ao inicializar Firebase:', err);
      }
    }

    // Se o localStorage ainda estiver limpo, faz o seeding inicial
    if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USERS)) {
      this.seedData();
    }
  },

  initFirestoreSync() {
    if (!this.db) return;

    // 1. Sincronização em tempo real de Usuários
    this.db.collection('users').onSnapshot(snapshot => {
      if (!snapshot.empty) {
        const users = [];
        snapshot.forEach(doc => users.push(doc.data()));
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USERS, JSON.stringify(users));

        // Atualiza a sessão se o usuário logado mudou
        const current = this.getCurrentUser();
        if (current) {
          const fresh = users.find(u => u.id === current.id);
          if (fresh) {
            sessionStorage.setItem(APP_CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(fresh));
          }
        }
      } else {
        // Se a coleção no Firestore estiver vazia, faz upload dos dados iniciais
        this.seedFirestore();
      }
    }, err => console.warn('Erro no sync de users:', err));

    // 2. Sincronização de Doações
    this.db.collection('donations').onSnapshot(snapshot => {
      if (!snapshot.empty) {
        const donations = [];
        snapshot.forEach(doc => donations.push(doc.data()));
        donations.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.DONATIONS, JSON.stringify(donations));
      }
    }, err => console.warn('Erro no sync de donations:', err));

    // 3. Sincronização de Transferências de Pontos
    this.db.collection('point_transfers').onSnapshot(snapshot => {
      if (!snapshot.empty) {
        const transfers = [];
        snapshot.forEach(doc => transfers.push(doc.data()));
        transfers.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.POINT_TRANSFERS, JSON.stringify(transfers));
      }
    }, err => console.warn('Erro no sync de point_transfers:', err));

    // 4. Sincronização da Loja
    this.db.collection('store_items').onSnapshot(snapshot => {
      if (!snapshot.empty) {
        const items = [];
        snapshot.forEach(doc => items.push(doc.data()));
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.STORE_ITEMS, JSON.stringify(items));
      }
    }, err => console.warn('Erro no sync de store_items:', err));

    // 5. Configurações Globais
    this.db.collection('settings').doc('global').onSnapshot(doc => {
      if (doc.exists) {
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(doc.data()));
      }
    }, err => console.warn('Erro no sync de settings:', err));

    // 6. Hall da Fama
    this.db.collection('hall_of_fame').doc('global').onSnapshot(doc => {
      if (doc.exists && doc.data().items) {
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.HALL_OF_FAME, JSON.stringify(doc.data().items));
      }
    }, err => console.warn('Erro no sync de hall_of_fame:', err));
  },

  async seedFirestore() {
    if (!this.db) return;
    const seedUsers = this.getSeedUsers();
    const seedStoreItems = this.getSeedStoreItems();
    const seedDonations = this.getSeedDonations();
    const seedHallOfFame = this.getSeedHallOfFame();
    const seedSettings = this.getSeedSettings();

    try {
      const batch = this.db.batch();
      seedUsers.forEach(u => batch.set(this.db.collection('users').doc(u.id), u));
      seedStoreItems.forEach(item => batch.set(this.db.collection('store_items').doc(item.id), item));
      seedDonations.forEach(d => batch.set(this.db.collection('donations').doc(d.id), d));
      batch.set(this.db.collection('settings').doc('global'), seedSettings);
      batch.set(this.db.collection('hall_of_fame').doc('global'), { items: seedHallOfFame });

      await batch.commit();
      console.log('🌱 Firestore semeado com sucesso com dados iniciais!');
    } catch (err) {
      console.error('Erro ao semear Firestore:', err);
    }
  },

  // Dados iniciais de fallback
  getSeedUsers() {
    return [
      {
        id: 'user-admin-1',
        name: 'Administrador do Sistema',
        email: 'admin@sistema.com',
        password: 'admin',
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
  },

  getSeedStoreItems() {
    return [
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
  },

  getSeedDonations() {
    return [
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
  },

  getSeedHallOfFame() {
    return [
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
  },

  getSeedSettings() {
    return {
      destinationEmail: APP_CONFIG.DEFAULT_DESTINATION_EMAIL,
      pointsPerNote: APP_CONFIG.POINTS_PER_NOTE,
      resetIntervalMonths: APP_CONFIG.RESET_INTERVAL_MONTHS,
      lastResetDate: '2026-04-01'
    };
  },

  seedData() {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USERS, JSON.stringify(this.getSeedUsers()));
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.STORE_ITEMS, JSON.stringify(this.getSeedStoreItems()));
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.DONATIONS, JSON.stringify(this.getSeedDonations()));
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.HALL_OF_FAME, JSON.stringify(this.getSeedHallOfFame()));
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(this.getSeedSettings()));
  },

  // Helpers para Usuários
  getUsers() {
    return JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USERS) || '[]');
  },

  // Helper para remover/substituir propriedades com valor undefined que causam erro no Firestore
  cleanForFirestore(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const clean = Array.isArray(obj) ? [] : {};
    Object.keys(obj).forEach(key => {
      const val = obj[key];
      if (val !== undefined) {
        clean[key] = (typeof val === 'object' && val !== null) ? this.cleanForFirestore(val) : val;
      } else {
        clean[key] = null;
      }
    });
    return clean;
  },

  saveUsers(users) {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USERS, JSON.stringify(users));
    if (this.db) {
      users.forEach(u => {
        this.db.collection('users').doc(u.id).set(this.cleanForFirestore(u)).catch(e => console.warn(e));
      });
    }
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
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USERS, JSON.stringify(users));

      // Atualiza a sessão
      const current = this.getCurrentUser();
      if (current && current.id === updatedUser.id) {
        sessionStorage.setItem(APP_CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
      }

      // Persiste no Firestore
      if (this.db) {
        this.db.collection('users').doc(updatedUser.id).set(this.cleanForFirestore(updatedUser)).catch(e => console.warn(e));
      }
    }
  },

  // Sessão de Login
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
    donations.unshift(donation);
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.DONATIONS, JSON.stringify(donations));

    if (this.db) {
      this.db.collection('donations').doc(donation.id).set(this.cleanForFirestore(donation)).catch(e => console.warn(e));
    }
  },

  // Helpers para Loja
  getStoreItems() {
    return JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.STORE_ITEMS) || '[]');
  },

  saveStoreItems(items) {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.STORE_ITEMS, JSON.stringify(items));
    if (this.db) {
      items.forEach(item => {
        this.db.collection('store_items').doc(item.id).set(this.cleanForFirestore(item)).catch(e => console.warn(e));
      });
    }
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
    if (this.db) {
      this.db.collection('settings').doc('global').set(this.cleanForFirestore(settings)).catch(e => console.warn(e));
    }
  },

  // Hall da Fama
  getHallOfFame() {
    return JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.HALL_OF_FAME) || '[]');
  },

  saveHallOfFame(hof) {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.HALL_OF_FAME, JSON.stringify(hof));
    if (this.db) {
      this.db.collection('hall_of_fame').doc('global').set(this.cleanForFirestore({ items: hof })).catch(e => console.warn(e));
    }
  },

  // Doação / Transferência de Pontos Entre Usuários
  getPointTransfers() {
    return JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.POINT_TRANSFERS) || '[]');
  },

  savePointTransfer(transfer) {
    const transfers = this.getPointTransfers();
    transfers.unshift(transfer);
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.POINT_TRANSFERS, JSON.stringify(transfers));

    if (this.db) {
      this.db.collection('point_transfers').doc(transfer.id).set(this.cleanForFirestore(transfer)).catch(e => console.warn(e));
    }
  }
};

// Executa inicialização
Storage.init();
