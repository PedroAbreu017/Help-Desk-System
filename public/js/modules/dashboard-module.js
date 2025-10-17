// public/js/modules/dashboard-module.js
// Módulo que MELHORA o dashboard existente sem substituí-lo
// Aguardar BaseModule estar disponível
function waitForBaseModule() {
    return new Promise((resolve) => {
        if (typeof BaseModule !== 'undefined') {
            resolve();
            return;
        }
        
        const checkInterval = setInterval(() => {
            if (typeof BaseModule !== 'undefined') {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });
}

// Definir classe após BaseModule estar disponível
waitForBaseModule().then(() => {
class DashboardModule extends BaseModule {
  constructor() {
    super('dashboard', {
      dependencies: [], // Remover dependências obrigatórias
      autoRefresh: false, // Deixar o sistema original controlar
      debugMode: true
    });
    
    this.originalApp = null;
  }

  async onInit() {
    this.log('Inicializando Dashboard Module como complemento...');
    
    // Aguardar app original estar disponível
    await this.waitForOriginalApp();
    
    // Adicionar melhorias ao dashboard existente
    this.addEnhancements();
    
    this.log('Dashboard Module inicializado como complemento');
  }

  async waitForOriginalApp() {
    return new Promise((resolve) => {
      const checkApp = () => {
        if (window.app) {
          this.originalApp = window.app;
          resolve();
        } else {
          setTimeout(checkApp, 500);
        }
      };
      checkApp();
    });
  }

  onSetupEventListeners() {
    // Escutar eventos do sistema original
    this.on('originalDataLoaded', (event) => {
      this.handleOriginalDataLoaded(event.detail.data);
    });

    // Interceptar cliques nos cards de estatística para adicionar feedback
    document.addEventListener('click', (e) => {
      if (e.target.closest('.stat-card')) {
        this.handleStatCardClick(e.target.closest('.stat-card'));
      }
    });
  }

  addEnhancements() {
    // Adicionar indicadores de loading aos cards de estatísticas
    this.addLoadingStates();
    
    // Adicionar tooltips informativos
    this.addTooltips();
    
    // Adicionar animações suaves
    this.addAnimations();
    
    // Adicionar timestamp de última atualização
    this.addLastUpdateTimestamp();
  }

  addLoadingStates() {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
      card.style.transition = 'all 0.3s ease';
      
      // Adicionar classe para identificação
      card.classList.add('enhanced-stat-card');
    });
  }

  addTooltips() {
    const tooltipMap = {
      'total-tickets': 'Total de tickets criados no sistema',
      'open-tickets': 'Tickets aguardando atendimento ou em andamento',
      'progress-tickets': 'Tickets sendo trabalhados pela equipe',
      'resolved-tickets': 'Tickets concluídos e resolvidos'
    };

    Object.entries(tooltipMap).forEach(([id, tooltip]) => {
      const element = document.getElementById(id);
      if (element) {
        const card = element.closest('.stat-card');
        if (card) {
          card.title = tooltip;
          card.style.cursor = 'help';
        }
      }
    });
  }

  addAnimations() {
    // Adicionar efeito hover aos cards
    const style = document.createElement('style');
    style.textContent = `
      .enhanced-stat-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
      }
      
      .enhanced-stat-card.loading {
        opacity: 0.6;
        pointer-events: none;
      }
      
      .enhanced-stat-card .stat-value {
        transition: color 0.3s ease;
      }
      
      .enhanced-stat-card.updated .stat-value {
        color: #10b981;
      }
      
      .last-update {
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.8rem;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .last-update.show {
        opacity: 1;
      }
    `;
    
    if (!document.getElementById('dashboard-module-styles')) {
      style.id = 'dashboard-module-styles';
      document.head.appendChild(style);
    }
  }

  addLastUpdateTimestamp() {
    // Criar elemento de timestamp se não existir
    if (!document.getElementById('last-update-timestamp')) {
      const timestamp = document.createElement('div');
      timestamp.id = 'last-update-timestamp';
      timestamp.className = 'last-update';
      document.body.appendChild(timestamp);
    }
  }

  handleOriginalDataLoaded(data) {
    this.log('Dados originais carregados, aplicando melhorias...', data);
    
    // Mostrar timestamp de atualização
    this.showUpdateTimestamp();
    
    // Adicionar feedback visual aos cards
    this.animateCardUpdates();
  }

  showUpdateTimestamp() {
    const timestamp = document.getElementById('last-update-timestamp');
    if (timestamp) {
      timestamp.textContent = `Última atualização: ${new Date().toLocaleTimeString('pt-BR')}`;
      timestamp.classList.add('show');
      
      // Esconder após 3 segundos
      setTimeout(() => {
        timestamp.classList.remove('show');
      }, 3000);
    }
  }

  animateCardUpdates() {
    const cards = document.querySelectorAll('.enhanced-stat-card');
    cards.forEach((card, index) => {
      // Adicionar classe de atualização com delay escalonado
      setTimeout(() => {
        card.classList.add('updated');
        
        // Remover classe após animação
        setTimeout(() => {
          card.classList.remove('updated');
        }, 1000);
      }, index * 150);
    });
  }

  handleStatCardClick(card) {
    this.log('Card de estatística clicado:', card);
    
    // Adicionar feedback visual
    card.style.transform = 'scale(0.98)';
    setTimeout(() => {
      card.style.transform = '';
    }, 150);

    // Mostrar informação adicional (exemplo)
    const cardType = this.getCardType(card);
    if (cardType) {
      this.showCardInfo(cardType);
    }
  }

  getCardType(card) {
    if (card.classList.contains('total')) return 'total';
    if (card.classList.contains('open')) return 'open';
    if (card.classList.contains('progress')) return 'progress';
    if (card.classList.contains('resolved')) return 'resolved';
    return null;
  }

  showCardInfo(cardType) {
    const messages = {
      total: 'Total geral de tickets no sistema',
      open: 'Tickets aguardando atendimento inicial',
      progress: 'Tickets sendo trabalhados pela equipe técnica',
      resolved: 'Tickets concluídos com sucesso'
    };

    const message = messages[cardType];
    if (message) {
      this.showToast(message, 'info');
    }
  }

  showToast(message, type = 'info') {
    // Usar sistema de toast do app original se disponível
    if (this.originalApp && typeof this.originalApp.showToast === 'function') {
      this.originalApp.showToast(`📊 ${message}`, type);
    } else {
      // Fallback simples
      console.log(`[Dashboard] ${message}`);
    }
  }

  // Interceptar refresh do dashboard original
  async onRefresh() {
    this.log('Dashboard sendo atualizado...');
    
    // Adicionar loading state aos cards
    const cards = document.querySelectorAll('.enhanced-stat-card');
    cards.forEach(card => card.classList.add('loading'));
    
    // Aguardar um pouco para simular processamento
    setTimeout(() => {
      cards.forEach(card => card.classList.remove('loading'));
    }, 1000);
  }

  // Métodos públicos para integração
  highlightCard(cardType) {
    const card = document.querySelector(`.stat-card.${cardType}`);
    if (card) {
      card.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
      setTimeout(() => {
        card.style.boxShadow = '';
      }, 2000);
    }
  }

  updateCardValue(cardId, newValue, animate = true) {
    const element = document.getElementById(cardId);
    if (!element) return;

    if (animate) {
      this.animateCounterChange(element, newValue);
    } else {
      element.textContent = newValue;
    }
  }

  animateCounterChange(element, targetValue) {
    const currentValue = parseInt(element.textContent) || 0;
    const difference = targetValue - currentValue;
    const steps = 20;
    const stepValue = difference / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const newValue = Math.round(currentValue + (stepValue * currentStep));
      element.textContent = newValue;

      if (currentStep >= steps) {
        clearInterval(interval);
        element.textContent = targetValue;
      }
    }, 50);
  }

  // Integração com notificações
  onEnable() {
    this.log('Dashboard module habilitado');
    
    // Reaplica melhorias se necessário
    if (document.querySelector('.stat-card')) {
      this.addEnhancements();
    }
  }

  onDisable() {
    this.log('Dashboard module desabilitado');
    
    // Remove melhorias visuais
    const cards = document.querySelectorAll('.enhanced-stat-card');
    cards.forEach(card => {
      card.classList.remove('enhanced-stat-card');
      card.style.transform = '';
      card.style.transition = '';
      card.title = '';
      card.style.cursor = '';
    });
  }

  onDestroy() {
    // Cleanup
    const timestamp = document.getElementById('last-update-timestamp');
    if (timestamp) timestamp.remove();
    
    const styles = document.getElementById('dashboard-module-styles');
    if (styles) styles.remove();
    
    this.originalApp = null;
  }

  // Debug
  getStatus() {
    return {
      ...this.status,
      originalApp: !!this.originalApp,
      enhancedCards: document.querySelectorAll('.enhanced-stat-card').length,
      hasTimestamp: !!document.getElementById('last-update-timestamp')
    };
  }
}

// Disponibilizar globalmente apenas se BaseModule existir
if (typeof window.BaseModule !== 'undefined') {
  window.DashboardModule = DashboardModule;
} else {
  console.warn('[DashboardModule] BaseModule não encontrado, módulo não carregado');
}
});