// public/js/config.js - Configurações globais
const CONFIG = {
    API_BASE_URL: 'http://localhost:3000/api',
    APP_NAME: 'Help Desk Pro',
    VERSION: '1.0.0',
    REFRESH_INTERVAL: 30000,
    TOAST_DURATION: 5000
};

if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}



