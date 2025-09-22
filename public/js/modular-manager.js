// public/js/modular-manager.js
// Gerenciador que integra módulos SEM interferir no sistema existente

class ModularManager {
  constructor() {
    this.modules = {};
    this.isInitialized = false;
    this.originalApp = null;
  }

  async init() {
    console.log('🔧 Inicializando Gerenciador Modular...');
    
    try {
      // Aguardar o sistema original estar pronto
      await this.waitForOriginalSystem();
      
      // Referenciar o app original
      this.originalApp = window.app;
      
      // Inicializar apenas módulos compatíveis que existem
      await this.initializeAvailableModules();
      
      // Integrar com sistema original
      this.integrateWithOriginalSystem();
      
      this.isInitialized = true;
      console.log('✅ Sistema modular integrado com sistema original');
      
      // Atualizar indicador
      this.updateIndicator();
      
    } catch (error) {
      console.error('❌ Erro no gerenciador modular:', error);
    }
  }

  async waitForOriginalSystem() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 100; // 10 segundos
      
      const checkSystem = () => {
        attempts++;
        
        if (window.app && window.app.isInitialized !== false) {
          console.log('✅ Sistema original detectado e pronto');
          resolve();
          return;
        }
        
        if (attempts >= maxAttempts) {
          console.log('⚠️ Timeout aguardando sistema original, continuando...');
          resolve();
          return;
        }
        
        setTimeout(checkSystem, 100);
      };
      
      setTimeout(checkSystem, 1000); // Aguardar 1s antes de começar
    });
  }

  async initializeAvailableModules() {
    const moduleClasses = [
      { name: 'dashboard', class: window.DashboardModule },
      { name: 'tickets', class: window.TicketsModule },
      { name: 'auth', class: window.AuthModule },
      { name: 'charts', class: window.ChartsModule }
    ];

    for (const { name, class: ModuleClass } of moduleClasses) {
      if (typeof ModuleClass === 'function') {
        try {
          console.log(`📦 Inicializando módulo ${name}...`);
          
          const module = new ModuleClass();
          await module.init();
          
          this.modules[name] = module;
          console.log(`✅ Módulo ${name} inicializado`);
          
        } catch (error) {
          console.error(`❌ Erro ao inicializar módulo ${name}:`, error);
        }
      } else {
        console.log(`⚠️ Módulo ${name} não encontrado, pulando...`);
      }
    }
  }

  integrateWithOriginalSystem() {
    if (!this.originalApp) return;

    // Interceptar métodos do app original para adicionar funcionalidades modulares
    this.enhanceRefreshData();
    this.enhanceLoadDashboard();
    this.enhanceLoadTickets();
    this.enhanceShowSection();
  }

  enhanceRefreshData() {
    if (typeof window.refreshData !== 'function') return;
    
    const originalRefreshData = window.refreshData;
    
    window.refreshData = async () => {
      console.log('🔄 RefreshData interceptado - executando original + módulos');
      
      // Executar função original
      await originalRefreshData();
      
      // Refresh módulos
      Object.values(this.modules).forEach(module => {
        if (module && typeof module.refresh === 'function') {
          module.refresh().catch(err => 
            console.warn(`Erro no refresh do módulo ${module.name}:`, err)
          );
        }
      });
    };
  }

  enhanceLoadDashboard() {
    if (!this.originalApp || typeof this.originalApp.loadDashboardData !== 'function') return;
    
    const originalLoad = this.originalApp.loadDashboardData.bind(this.originalApp);
    
    this.originalApp.loadDashboardData = async () => {
      // Executar carregamento original
      await originalLoad();
      
      // Notificar módulos
      if (this.modules.dashboard) {
        this.modules.dashboard.emit('originalDataLoaded', this.originalApp.stats);
      }
    };
  }

  enhanceLoadTickets() {
    if (!this.originalApp || typeof this.originalApp.loadTickets !== 'function') return;
    
    const originalLoad = this.originalApp.loadTickets.bind(this.originalApp);
    
    this.originalApp.loadTickets = async (filters) => {
      // Executar carregamento original
      await originalLoad(filters);
      
      // Notificar módulos
      if (this.modules.tickets) {
        this.modules.tickets.emit('originalTicketsLoaded', {
          tickets: this.originalApp.tickets,
          filters
        });
      }
    };
  }

  enhanceShowSection() {
    if (!this.originalApp || typeof this.originalApp.showSection !== 'function') return;
    
    const originalShow = this.originalApp.showSection.bind(this.originalApp);
    
    this.originalApp.showSection = (sectionName) => {
      // Executar navegação original
      originalShow(sectionName);
      
      // Notificar módulos sobre mudança de seção
      Object.values(this.modules).forEach(module => {
        if (module && typeof module.emit === 'function') {
          module.emit('sectionChanged', sectionName);
        }
      });
    };
  }

  updateIndicator() {
    const indicator = document.getElementById('modular-indicator');
    const counter = document.getElementById('active-modules-count');
    
    if (indicator && counter) {
      const count = Object.keys(this.modules).length;
      counter.textContent = count;
      
      if (count > 0) {
        indicator.classList.add('active');
        indicator.title = `Módulos ativos: ${Object.keys(this.modules).join(', ')}`;
      }
    }
  }

  // Métodos públicos para controle
  getModule(name) {
    return this.modules[name];
  }

  getAllModules() {
    return this.modules;
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      moduleCount: Object.keys(this.modules).length,
      modules: Object.keys(this.modules).reduce((acc, name) => {
        const module = this.modules[name];
        acc[name] = {
          initialized: module?.isInitialized || false,
          enabled: module?.isEnabled || false,
          status: module?.status || 'unknown'
        };
        return acc;
      }, {}),
      originalApp: !!this.originalApp
    };
  }

  async refreshAll() {
    console.log('🔄 Refreshing all modules...');
    
    const promises = Object.values(this.modules).map(module => {
      if (module && typeof module.refresh === 'function') {
        return module.refresh().catch(err => 
          console.warn(`Erro no refresh do módulo ${module.name}:`, err)
        );
      }
      return Promise.resolve();
    });
    
    await Promise.all(promises);
    console.log('✅ Todos os módulos atualizados');
  }

  enableModule(name) {
    const module = this.modules[name];
    if (module && typeof module.enable === 'function') {
      module.enable();
      console.log(`✅ Módulo ${name} habilitado`);
    }
  }

  disableModule(name) {
    const module = this.modules[name];
    if (module && typeof module.disable === 'function') {
      module.disable();
      console.log(`⏸️ Módulo ${name} desabilitado`);
    }
  }

  // Debug e diagnóstico
  diagnose() {
    console.log('🔍 Diagnóstico do Sistema Modular');
    console.log('================================');
    console.log('Status do Gerenciador:', this.isInitialized);
    console.log('App Original:', !!this.originalApp);
    console.log('Módulos carregados:', Object.keys(this.modules));
    
    console.log('\n📊 Status dos Módulos:');
    Object.entries(this.modules).forEach(([name, module]) => {
      console.log(`  ${name}:`, {
        inicializado: module?.isInitialized,
        habilitado: module?.isEnabled,
        dependências: module?.dependencies
      });
    });
    
    console.log('\n🌐 Verificação de Dependências Globais:');
    console.log('  window.app:', !!window.app);
    console.log('  Chart.js:', typeof Chart !== 'undefined');
    console.log('  BaseModule:', typeof BaseModule !== 'undefined');
    
    return this.getStatus();
  }
}

// Controle modular global para console
window.modularControl = {
  status: () => window.modularManager?.getStatus() || 'Não inicializado',
  refresh: () => window.modularManager?.refreshAll() || 'Não disponível',
  enable: (name) => window.modularManager?.enableModule(name) || 'Não disponível',
  disable: (name) => window.modularManager?.disableModule(name) || 'Não disponível',
  diagnose: () => window.modularManager?.diagnose() || 'Não disponível',
  modules: () => window.modularManager?.getAllModules() || {}
};

// Disponibilizar globalmente
window.ModularManager = ModularManager;