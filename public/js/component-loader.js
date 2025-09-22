// component-loader.js - VERSÃO FINAL CORRIGIDA COM REPORTS
class ComponentLoader {
    constructor() {
        this.components = new Map();
        this.loadedComponents = new Set();
        this.baseUrl = '/components/';
    }

    registerComponent(name, path, container = null) {
        this.components.set(name, {
            path: this.baseUrl + path,
            container: container || `[data-component="${name}"]`,
            loaded: false
        });
    }

    async loadComponent(name) {
        if (this.loadedComponents.has(name)) {
            return true;
        }

        const component = this.components.get(name);
        if (!component) {
            console.warn(`Componente ${name} não registrado`);
            return false;
        }

        try {
            const response = await fetch(component.path);
            if (!response.ok) {
                console.warn(`Componente ${name} não encontrado - continuando sem ele`);
                return true;
            }
            
            const html = await response.text();
            const container = document.querySelector(component.container);
            
            if (container) {
                container.innerHTML = html;
                
                // EXECUTAR SCRIPTS INSERIDOS VIA innerHTML
                this.executeScripts(container);
                
                this.loadedComponents.add(name);
                console.log(`✅ Componente ${name} carregado`);
                return true;
            } else {
                console.warn(`Container ${component.container} não encontrado para ${name}`);
                return true;
            }
        } catch (error) {
            console.error(`❌ Erro ao carregar componente ${name}:`, error);
            return true;
        }
    }

    // Função para executar scripts que foram inseridos via innerHTML
    executeScripts(container) {
        const scripts = container.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            
            // Copiar atributos
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            
            // Copiar conteúdo
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            
            // Substituir script antigo pelo novo (que vai executar)
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    }

    async loadComponents(names) {
        for (const name of names) {
            await this.loadComponent(name);
        }
        return true;
    }

    registerAllComponents() {
        // Layout components
        this.registerComponent('head', 'layout/head.html', 'head');
        this.registerComponent('header', 'layout/header.html', '[data-component="header"]');
        this.registerComponent('sidebar', 'layout/sidebar.html', '[data-component="sidebar"]');

        // Section components  
        this.registerComponent('dashboard', 'sections/dashboard.html', '[data-component="dashboard"]');
        this.registerComponent('tickets', 'sections/tickets.html', '[data-component="tickets"]');
        this.registerComponent('new-ticket', 'sections/new-ticket.html', '[data-component="new-ticket"]');
        this.registerComponent('reports', 'sections/reports.html', '[data-component="reports"]');
        this.registerComponent('knowledge-base', 'sections/knowledge-base.html', '[data-component="knowledge-base"]');

        // Modal components
        this.registerComponent('ticket-modal', 'modals/ticket-modal.html', '[data-component="ticket-modal"]');
        
        // Script components
        this.registerComponent('core-scripts', 'scripts/core-scripts.html', '[data-component="core-scripts"]');
        this.registerComponent('auth-scripts', 'scripts/auth-scripts.html', '[data-component="auth-scripts"]');
        this.registerComponent('chart-scripts', 'scripts/chart-integration.html', '[data-component="chart-scripts"]');
        this.registerComponent('footer-scripts', 'scripts/footer-scripts.html', '[data-component="footer-scripts"]');
    }
}

// Sistema Modular Principal
class ModularSystem {
    constructor() {
        this.loader = new ComponentLoader();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return true;

        console.log('🔧 Iniciando carregamento modular...');

        try {
            // Registrar componentes
            this.loader.registerAllComponents();

            // Carregar head primeiro (CSS crítico)
            console.log('📦 Carregando head...');
            await this.loader.loadComponents(['head']);

            // Carregar layout
            console.log('📦 Carregando layout...');
            await this.loader.loadComponents(['header', 'sidebar']);

            // Carregar seções
            console.log('📦 Carregando seções...');  
            await this.loader.loadComponents(['dashboard', 'tickets', 'new-ticket', 'reports', 'knowledge-base']);

            // Carregar modais
            console.log('📦 Carregando modais...');
            await this.loader.loadComponents(['ticket-modal']);

            // Carregar scripts CORE primeiro
            console.log('📦 Carregando scripts core...');
            await this.loader.loadComponents(['core-scripts']);
            
            // Aguardar scripts core carregarem
            await new Promise(resolve => setTimeout(resolve, 500));

            // Carregar scripts de auth
            console.log('📦 Carregando scripts de auth...');
            await this.loader.loadComponents(['auth-scripts']);
            
            // Aguardar auth scripts
            await new Promise(resolve => setTimeout(resolve, 500));

            // Carregar scripts de charts
            console.log('📦 Carregando scripts de charts...');
            await this.loader.loadComponents(['chart-scripts']);
            
            // Aguardar charts scripts
            await new Promise(resolve => setTimeout(resolve, 500));

            // Carregar scripts finais (includes reports.js)
            console.log('📦 Carregando scripts finais...');
            await this.loader.loadComponents(['footer-scripts']);

            this.initialized = true;
            console.log('✅ Sistema Modular inicializado!');
            
            return true;

        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            return true;
        }
    }

    isReady() {
        return this.initialized;
    }
}

// Instância global
window.modularSystem = new ModularSystem();

// Aguardar DOM estar pronto
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM pronto, iniciando sistema...');
    
    const loadingElement = document.getElementById('loading');
    
    try {
        // Inicializar sistema modular
        await window.modularSystem.initialize();
        
        // Aguardar todos os scripts carregarem e inicializarem
        console.log('⏳ Aguardando inicialização dos scripts...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar se main.js foi carregado e inicializar se necessário
        if (typeof window.app === 'undefined') {
            console.log('🔄 Inicializando sistema principal...');
            // Aguardar um pouco mais para main.js carregar
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Ocultar loading
        if (loadingElement) {
            loadingElement.style.display = 'none';
            console.log('✅ Loading ocultado');
        }
        
        // Atualizar indicador modular
        const indicator = document.getElementById('modular-indicator');
        const counter = document.getElementById('active-modules-count');
        if (indicator && counter) {
            const loadedCount = window.modularSystem.loader.loadedComponents.size;
            counter.textContent = loadedCount;
            indicator.classList.add('active');
            indicator.style.display = 'block';
            console.log(`📊 Indicador atualizado: ${loadedCount} componentes`);
        }

        // Disparar evento personalizado para outros sistemas
        document.dispatchEvent(new CustomEvent('modularSystemReady', {
            detail: { componentsLoaded: window.modularSystem.loader.loadedComponents.size }
        }));

        // FORÇAR MOSTRAR DASHBOARD INICIAL
        setTimeout(() => {
            const dashboardSection = document.getElementById('dashboard-section');
            if (dashboardSection) {
                // Esconder todas as seções
                document.querySelectorAll('.content-section').forEach(section => {
                    section.classList.remove('active');
                });
                
                // Mostrar dashboard
                dashboardSection.classList.add('active');
                
                // Ativar navegação dashboard
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                const dashboardNav = document.querySelector('[data-section="dashboard"]');
                if (dashboardNav) dashboardNav.classList.add('active');
                
                console.log('📱 Dashboard ativado como seção inicial');
            }
        }, 500);

        console.log('🎉 Sistema totalmente pronto para uso!');

    } catch (error) {
        console.error('❌ Erro crítico na inicialização:', error);
        
        // Mesmo com erro, remover loading
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // Tentar fallback para sistema original
        console.log('🔄 Tentando fallback...');
        window.location.href = '/index-backup.html';
    }
});

// Função de debug para verificar estado
window.debugModularSystem = function() {
    console.log('🔍 Estado do Sistema Modular:');
    console.log('Inicializado:', window.modularSystem?.initialized);
    console.log('Componentes carregados:', window.modularSystem?.loader?.loadedComponents);
    console.log('App principal:', typeof window.app);
    console.log('Chart.js:', typeof Chart);
    console.log('ReportsManager:', typeof ReportsManager);
    console.log('window.reportsManager:', typeof window.reportsManager);
};

// Inicialização de módulos específicos com timing adequado para sistema modular
setTimeout(() => {
    // Forçar inicialização do main.js se não existir
    if (typeof window.app === 'undefined' && typeof HelpDeskApp !== 'undefined') {
        console.log('🔄 Forçando inicialização do main.js...');
        window.app = new HelpDeskApp();
    }
    
    // Inicializar ReportsManager se existir
    if (typeof ReportsManager !== 'undefined' && !window.reportsManager) {
        window.reportsManager = new ReportsManager();
        console.log('📊 ReportsManager inicializado pelo component-loader');
        
        // Conectar botões após inicialização
        setTimeout(() => {
            if (window.reportsManager) {
                window.reportsManager.connectButtons();
                console.log('🔗 Botões de relatórios conectados');
            }
        }, 500);
    }
    
    // Log final do status
    console.log('🎯 Status final dos módulos:');
    console.log('- HelpDeskApp:', typeof window.app);
    console.log('- ReportsManager:', typeof window.reportsManager);
    console.log('- AuthManager:', typeof window.authManager);
    
}, 3500); // Tempo aumentado para 3.5s para garantir que todos os scripts carreguem

console.log('📦 Component Loader FINAL carregado com ReportsManager - v2.0!');