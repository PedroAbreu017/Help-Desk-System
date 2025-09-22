// public/js/core/base-module.js
// Classe base para todos os módulos do sistema

class BaseModule {
  constructor(name, options = {}) {
    this.name = name;
    this.isInitialized = false;
    this.isEnabled = true;
    this.dependencies = options.dependencies || [];
    this.container = options.container || null;
    this.eventListeners = [];
    this.intervals = [];
    this.data = {};
    this.config = {
      autoRefresh: options.autoRefresh || false,
      refreshInterval: options.refreshInterval || 30000,
      debugMode: options.debugMode || false,
      ...options.config
    };
    
    // Bind methods para manter contexto
    this.init = this.init.bind(this);
    this.destroy = this.destroy.bind(this);
    this.refresh = this.refresh.bind(this);
    this.enable = this.enable.bind(this);
    this.disable = this.disable.bind(this);
  }

  // Método de inicialização padrão
  async init() {
    if (this.isInitialized) return;
    
    this.log(`Inicializando módulo ${this.name}...`);
    
    try {
      // Verificar dependências
      await this.checkDependencies();
      
      // Hook para implementação específica
      await this.onInit();
      
      // Configurar eventos
      this.setupEventListeners();
      
      // Inicializar auto-refresh se configurado
      if (this.config.autoRefresh) {
        this.startAutoRefresh();
      }
      
      this.isInitialized = true;
      this.log(`Módulo ${this.name} inicializado com sucesso`);
      this.emit('initialized');
      
    } catch (error) {
      this.error(`Erro ao inicializar módulo ${this.name}:`, error);
      throw error;
    }
  }

  // Hook para implementação específica (deve ser sobrescrito)
  async onInit() {
    // Implementar na classe filha
  }

  // Verificar se dependências estão disponíveis
  async checkDependencies() {
    const missing = [];
    
    for (const dep of this.dependencies) {
      if (typeof dep === 'string') {
        // Dependência é uma variável global
        if (typeof window[dep] === 'undefined') {
          missing.push(dep);
        }
      } else if (typeof dep === 'object' && dep.name && dep.check) {
        // Dependência personalizada com verificação
        if (!dep.check()) {
          missing.push(dep.name);
        }
      }
    }
    
    if (missing.length > 0) {
      this.warn(`Dependências não encontradas: ${missing.join(', ')}`);
      // Não mais throw error - apenas warning para permitir funcionamento parcial
    }
    
    this.log(`Dependências verificadas: ${this.dependencies.join(', ')}`);
  }

  // Configurar event listeners padrão
  setupEventListeners() {
    // Hook para implementação específica
    this.onSetupEventListeners();
  }

  onSetupEventListeners() {
    // Implementar na classe filha
  }

  // Adicionar event listener com cleanup automático
  addEventListener(element, event, handler, options = {}) {
    if (!element || !event || !handler) return;
    
    const boundHandler = handler.bind(this);
    element.addEventListener(event, boundHandler, options);
    
    this.eventListeners.push({
      element,
      event,
      handler: boundHandler,
      options
    });
  }

  // Emitir evento customizado
  emit(eventName, data = null) {
    const event = new CustomEvent(`module:${this.name}:${eventName}`, {
      detail: { module: this.name, data }
    });
    document.dispatchEvent(event);
    this.log(`Evento emitido: ${eventName}`, data);
  }

  // Escutar eventos de outros módulos
  on(eventName, handler) {
    const fullEventName = eventName.includes(':') ? eventName : `module:${this.name}:${eventName}`;
    document.addEventListener(fullEventName, handler);
    
    this.eventListeners.push({
      element: document,
      event: fullEventName,
      handler,
      options: {}
    });
  }

  // Método de refresh (deve ser implementado pela classe filha)
  async refresh() {
    if (!this.isEnabled || !this.isInitialized) return;
    
    this.log(`Atualizando módulo ${this.name}...`);
    
    try {
      await this.onRefresh();
      this.emit('refreshed');
      this.log(`Módulo ${this.name} atualizado com sucesso`);
    } catch (error) {
      this.error(`Erro ao atualizar módulo ${this.name}:`, error);
    }
  }

  // Hook para refresh específico (implementar na classe filha)
  async onRefresh() {
    // Implementar na classe filha
  }

  // Carregar dados (método genérico)
  async loadData(endpoint, options = {}) {
    if (!endpoint) return null;
    
    try {
      this.log(`Carregando dados de: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.log(`Dados carregados de ${endpoint}:`, data);
      
      return data;
    } catch (error) {
      this.error(`Erro ao carregar dados de ${endpoint}:`, error);
      throw error;
    }
  }

  // Iniciar auto-refresh
  startAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(() => {
      this.refresh();
    }, this.config.refreshInterval);
    
    this.intervals.push(this.refreshInterval);
    this.log(`Auto-refresh iniciado (${this.config.refreshInterval}ms)`);
  }

  // Parar auto-refresh
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      this.log('Auto-refresh interrompido');
    }
  }

  // Habilitar módulo
  enable() {
    if (this.isEnabled) return;
    
    this.isEnabled = true;
    
    if (this.config.autoRefresh) {
      this.startAutoRefresh();
    }
    
    this.onEnable();
    this.emit('enabled');
    this.log(`Módulo ${this.name} habilitado`);
  }

  onEnable() {
    // Hook para implementação específica
  }

  // Desabilitar módulo
  disable() {
    if (!this.isEnabled) return;
    
    this.isEnabled = false;
    this.stopAutoRefresh();
    this.onDisable();
    this.emit('disabled');
    this.log(`Módulo ${this.name} desabilitado`);
  }

  onDisable() {
    // Hook para implementação específica
  }

  // Destruir módulo e fazer cleanup
  destroy() {
    this.log(`Destruindo módulo ${this.name}...`);
    
    // Limpar event listeners
    this.eventListeners.forEach(({ element, event, handler, options }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler, options);
      }
    });
    this.eventListeners = [];
    
    // Limpar intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    
    // Hook para cleanup específico
    this.onDestroy();
    
    this.isInitialized = false;
    this.isEnabled = false;
    
    this.emit('destroyed');
    this.log(`Módulo ${this.name} destruído`);
  }

  onDestroy() {
    // Hook para implementação específica
  }

  // Utilitários para elementos DOM
  findElement(selector, container = null) {
    const root = container || this.container || document;
    return root.querySelector(selector);
  }

  findElements(selector, container = null) {
    const root = container || this.container || document;
    return Array.from(root.querySelectorAll(selector));
  }

  createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else {
        element.setAttribute(key, value);
      }
    });
    
    if (content) {
      element.innerHTML = content;
    }
    
    return element;
  }

  // Loading state
  showLoading(container = null, message = 'Carregando...') {
    const target = container || this.container;
    if (!target) return;
    
    const existing = target.querySelector('.module-loading');
    if (existing) existing.remove();
    
    const loading = this.createElement('div', {
      className: 'module-loading',
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        background: 'rgba(255, 255, 255, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '1000'
      }
    }, `
      <div style="
        border: 3px solid #f3f3f3;
        border-top: 3px solid #3498db;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
        margin-bottom: 10px;
      "></div>
      <p style="margin: 0; color: #666; font-size: 14px;">${message}</p>
    `);
    
    target.style.position = 'relative';
    target.appendChild(loading);
  }

  hideLoading(container = null) {
    const target = container || this.container;
    if (!target) return;
    
    const loading = target.querySelector('.module-loading');
    if (loading) loading.remove();
  }

  // Sistema de logging
  log(message, data = null) {
    if (!this.config.debugMode && !window.DEBUG_MODULES) return;
    
    const prefix = `[${this.name}]`;
    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }

  error(message, error = null) {
    const prefix = `[${this.name}] ERROR:`;
    if (error) {
      console.error(prefix, message, error);
    } else {
      console.error(prefix, message);
    }
  }

  warn(message, data = null) {
    const prefix = `[${this.name}] WARN:`;
    if (data) {
      console.warn(prefix, message, data);
    } else {
      console.warn(prefix, message);
    }
  }

  // Getters para status
  get status() {
    return {
      name: this.name,
      initialized: this.isInitialized,
      enabled: this.isEnabled,
      dependencies: this.dependencies,
      config: this.config,
      hasData: Object.keys(this.data).length > 0
    };
  }
}

// CSS para animação de loading (verificar se já existe)
if (!document.getElementById('module-base-styles')) {
  const moduleStyles = document.createElement('style');
  moduleStyles.id = 'module-base-styles';
  moduleStyles.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(moduleStyles);
}

// Disponibilizar globalmente apenas se não existir
if (typeof window.BaseModule === 'undefined') {
  window.BaseModule = BaseModule;
}