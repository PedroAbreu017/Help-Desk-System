// public/js/app.js - Versão simplificada para funcionar com estrutura atual

class HelpDeskApp {
  constructor() {
    this.components = {};
    this.currentView = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    
    console.log('🚀 Inicializando Help Desk App Modular v2.0...');
    
    try {
      // Verificar dependências essenciais
      await this.checkDependencies();
      
      // Inicializar componentes básicos
      await this.initializeComponents();
      
      // Inicializar dashboard no main-container
      await this.initializeDashboard();
      
      this.isInitialized = true;
      console.log('✅ App modular inicializado com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro no app modular:', error);
      console.log('🔄 Sistema original assumirá o controle...');
      
      // Não quebrar - deixar main.js funcionar
      return;
    }
  }

  async checkDependencies() {
    const missing = [];
    
    if (typeof BaseView === 'undefined') {
      missing.push('BaseView');
    }
    
    if (typeof DashboardView === 'undefined') {
      missing.push('DashboardView');
    }
    
    if (missing.length > 0) {
      throw new Error(`Classes não encontradas: ${missing.join(', ')}`);
    }
    
    console.log('✅ Dependências verificadas');
  }

  async initializeComponents() {
    console.log('📦 Inicializando componentes...');
    
    // Inicializar sistema de notificações se disponível
    if (window.NotificationsComponent) {
      try {
        this.components.notifications = new window.NotificationsComponent();
        this.components.notifications.init();
        window.notifications = this.components.notifications;
        console.log('✅ Notifications component loaded');
      } catch (error) {
        console.log('⚠️ Notifications não inicializadas:', error.message);
      }
    }

    // Inicializar componente de gráficos se disponível
    if (window.ChartsComponent) {
      console.log('✅ Charts component available');
    }
  }

  async initializeDashboard() {
    console.log('📊 Inicializando Dashboard...');
    
    const container = document.getElementById('main-container');
    if (!container) {
      throw new Error('Container main-container não encontrado');
    }

    // Limpar container e adicionar conteúdo do dashboard
    container.innerHTML = `
      <div class="dashboard-view">
        <div class="section-header">
          <h2><i class="fas fa-chart-dashboard"></i> Dashboard Modular</h2>
          <p>Sistema modular carregado com sucesso</p>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-ticket-alt"></i>
            </div>
            <div class="stat-content">
              <h3 id="total-tickets">--</h3>
              <p>Total de Tickets</p>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-clock"></i>
            </div>
            <div class="stat-content">
              <h3 id="open-tickets">--</h3>
              <p>Tickets Abertos</p>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-check-circle"></i>
            </div>
            <div class="stat-content">
              <h3 id="resolved-tickets">--</h3>
              <p>Resolvidos</p>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-content">
              <h3 id="active-users">--</h3>
              <p>Usuários Ativos</p>
            </div>
          </div>
        </div>
        
        <div class="charts-section" id="charts-container">
          <div class="chart-row">
            <div class="chart-card">
              <div class="chart-header">
                <h3>Tickets por Categoria</h3>
                <button onclick="window.helpDeskApp.refreshChart('category')" class="btn-refresh">
                  <i class="fas fa-sync-alt"></i>
                </button>
              </div>
              <canvas id="categoryChart"></canvas>
            </div>
            
            <div class="chart-card">
              <div class="chart-header">
                <h3>Prioridades</h3>
                <button onclick="window.helpDeskApp.refreshChart('priority')" class="btn-refresh">
                  <i class="fas fa-sync-alt"></i>
                </button>
              </div>
              <canvas id="priorityChart"></canvas>
            </div>
          </div>
          
          <div class="chart-row">
            <div class="chart-card">
              <div class="chart-header">
                <h3>Timeline de Tickets</h3>
                <select id="timelineSelect" onchange="window.helpDeskApp.updateTimeline()">
                  <option value="7">Últimos 7 dias</option>
                  <option value="14">Últimos 14 dias</option>
                  <option value="30">Últimos 30 dias</option>
                </select>
              </div>
              <canvas id="timelineChart"></canvas>
            </div>
            
            <div class="chart-card">
              <div class="chart-header">
                <h3>Status dos Tickets</h3>
                <button onclick="window.helpDeskApp.refreshChart('status')" class="btn-refresh">
                  <i class="fas fa-sync-alt"></i>
                </button>
              </div>
              <canvas id="statusChart"></canvas>
            </div>
          </div>
        </div>
        
        <div class="modular-info" style="margin-top: 2rem; padding: 1rem; background: #e8f5e8; border-radius: 8px; border-left: 4px solid #28a745;">
          <h4 style="color: #155724; margin: 0 0 0.5rem 0;">
            <i class="fas fa-check-circle"></i> Sistema Modular Ativo
          </h4>
          <p style="color: #155724; margin: 0; font-size: 0.9rem;">
            Dashboard carregado usando arquitetura modular. Componentes: BaseView, DashboardView, Charts disponíveis.
          </p>
        </div>
      </div>
    `;

    // Criar instância da DashboardView
    this.currentView = new DashboardView(container);
    await this.currentView.init();
    
    // Inicializar gráficos se Chart.js estiver disponível
    if (typeof Chart !== 'undefined') {
      this.initializeCharts();
    }

    console.log('✅ Dashboard modular inicializado');
  }

  initializeCharts() {
    // Dados de exemplo para demonstração
    const sampleData = {
      categories: {
        'Hardware': 8,
        'Software': 6,
        'Rede': 4,
        'Sistema': 4,
        'Email': 3
      },
      priorities: {
        'Baixa': 5,
        'Média': 12,
        'Alta': 6,
        'Crítica': 2
      },
      timeline: {
        labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'],
        values: [3, 5, 2, 8, 4, 2, 6]
      },
      status: {
        'Aberto': 8,
        'Em Andamento': 5,
        'Resolvido': 10,
        'Fechado': 2
      }
    };

    // Atualizar contadores
    document.getElementById('total-tickets').textContent = '25';
    document.getElementById('open-tickets').textContent = '13';
    document.getElementById('resolved-tickets').textContent = '10';
    document.getElementById('active-users').textContent = '12';

    // Criar gráficos
    this.createChart('categoryChart', 'doughnut', sampleData.categories, ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']);
    this.createChart('priorityChart', 'bar', sampleData.priorities, ['#28a745', '#ffc107', '#fd7e14', '#dc3545']);
    this.createTimelineChart(sampleData.timeline);
    this.createChart('statusChart', 'pie', sampleData.status, ['#17a2b8', '#ffc107', '#28a745', '#6c757d']);
  }

  createChart(canvasId, type, data, colors) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
      type: type,
      data: {
        labels: Object.keys(data),
        datasets: [{
          data: Object.values(data),
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        },
        scales: type === 'bar' ? {
          y: { beginAtZero: true }
        } : {}
      }
    });
  }

  createTimelineChart(timelineData) {
    const ctx = document.getElementById('timelineChart');
    if (!ctx) return;

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: timelineData.labels,
        datasets: [{
          label: 'Tickets Criados',
          data: timelineData.values,
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  // Métodos públicos para interação
  refreshChart(type) {
    console.log(`🔄 Refreshing ${type} chart`);
    if (this.currentView && this.currentView.refreshChart) {
      this.currentView.refreshChart(type);
    }
  }

  updateTimeline() {
    const select = document.getElementById('timelineSelect');
    if (select) {
      console.log(`📊 Updating timeline: ${select.value} days`);
    }
  }

  showToast(message, type = 'info', duration = 3000) {
    if (window.notifications) {
      window.notifications.show(message, type, duration);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  // Aguardar um pouco para garantir que todos os scripts carregaram
  setTimeout(() => {
    window.helpDeskApp = new HelpDeskApp();
    window.helpDeskApp.init();
  }, 500);
});

// Disponibilizar globalmente
window.HelpDeskApp = HelpDeskApp;