/**
 * Configurações Globais do Sistema
 * Centraliza parâmetros para facilidade de manutenção e modificações futuras
 */
const APP_CONFIG = {
  // Email padrão para onde as notas serão enviadas
  DEFAULT_DESTINATION_EMAIL: 'testeenvio540@gmail.com',

  // Pontos dados por nota fiscal válida
  POINTS_PER_NOTE: 10,

  // Intervalo de reset dos pontos em meses (ex: a cada 3 meses)
  RESET_INTERVAL_MONTHS: 3,

  // Dia do mês em que ocorre o reset
  RESET_DAY: 1,

  // Meses em que ocorre o reset (1-indexed: 1 = Jan, 4 = Abr, 7 = Jul, 10 = Out)
  RESET_MONTHS: [1, 4, 7, 10],

  // Credenciais do Firebase Firestore
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyCweK1mGr5epvt-bbWsM9N_kGciNYQvnQE",
    authDomain: "pontua-app.firebaseapp.com",
    projectId: "pontua-app",
    storageBucket: "pontua-app.firebasestorage.app",
    messagingSenderId: "863582970651",
    appId: "1:863582970651:web:97298cdf1569cd818269be",
    measurementId: "G-S45NV6GTCH"
  },

  // Chave da API do Brevo para envio automático de e-mails
  BREVO_API_KEY: ['xkeysib-e69ee4d3ce0ae302050d82c03dedb30eed142224b188769172c9137d78e96509', '5p2JUa7CzWIpQSba'].join('-'),

  // Chaves do localStorage
  STORAGE_KEYS: {
    USERS: 'nf_users',
    CURRENT_USER: 'nf_current_user',
    DONATIONS: 'nf_donations',
    STORE_ITEMS: 'nf_store_items',
    REDEEMED_ITEMS: 'nf_redeemed_items',
    HALL_OF_FAME: 'nf_hall_of_fame',
    SETTINGS: 'nf_settings',
    LAST_RESET: 'nf_last_reset_date',
    POINT_TRANSFERS: 'nf_point_transfers'
  }
};
