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

// public/js/dashboard.js - Módulo específico do dashboard (OPCIONAL)
class DashboardModule {
    constructor() {
        this.refreshInterval = null;
    }

    async init() {
        await this.loadData();
        this.setupAutoRefresh();
    }

    async loadData() {
        // Esta lógica já está no main.js
        // Apenas organizaria melhor o código
    }

    setupAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            if (window.app && window.app.currentSection === 'dashboard') {
                window.app.refreshDashboard();
            }
        }, CONFIG.REFRESH_INTERVAL);
    }
}

// public/js/reports.js - Módulo de relatórios (OPCIONAL)
class ReportsModule {
    async generateReport(dateRange) {
        // Esta lógica já está implementada na API
        // Apenas organizaria a UI dos relatórios
    }
}

// public/js/knowledge-base.js - Módulo da base de conhecimento (OPCIONAL)
class KnowledgeBaseModule {
    constructor() {
        this.articles = []; // Já implementado no main.js
    }
}

console.log('📦 Módulos complementares carregados');