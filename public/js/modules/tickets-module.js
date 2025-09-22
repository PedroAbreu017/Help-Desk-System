// public/js/modules/tickets-module.js - CORRIGIDO
class TicketsModule extends BaseModule {
  constructor() {
    super('tickets', {
      dependencies: ['fetch'],
      autoRefresh: false
    });
    
    this.filters = {
      status: '',
      priority: '',
      category: ''
    };
    
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.tickets = [];
  }

  async onInit() {
    this.log('Inicializando Tickets Module...');
    
    // ASSUMIR CONTROLE TOTAL - criar toda a estrutura
    this.ticketsSection = document.getElementById('tickets-section');
    
    if (!this.ticketsSection) {
      this.error('Seção tickets-section não encontrada no HTML');
      return;
    }

    // LIMPAR seção e criar estrutura completa
    this.createCompleteTicketsStructure();
    
    // Configurar referências DOM
    this.ticketsTable = document.getElementById('tickets-table');
    this.ticketsTableBody = document.getElementById('tickets-tbody');
    this.pagination = document.getElementById('pagination');
    
    // Configurar eventos
    this.setupEventListeners();
    
    // Carregar dados se seção estiver ativa
    if (this.ticketsSection.classList.contains('active')) {
      await this.loadTickets();
    }
    
    this.log('Tickets Module inicializado - controle total assumido');
  }

  // CRIAR estrutura completa para seção tickets
  createCompleteTicketsStructure() {
    this.ticketsSection.innerHTML = `
      <div class="section-header">
        <h2><i class="fas fa-ticket-alt"></i> Gerenciar Tickets</h2>
        <p>Visualizar e gerenciar todos os tickets de suporte</p>
      </div>
      
      <div class="filters-bar">
        <div class="filter-group search-filter">
          <label for="filter-search">Buscar:</label>
          <input type="text" id="filter-search" class="filter-input" placeholder="Título ou usuário...">
        </div>
        <div class="filter-group">
          <label>Status:</label>
          <select id="filter-status" class="filter-select">
            <option value="">Todos</option>
            <option value="aberto">Aberto</option>
            <option value="andamento">Em Andamento</option>
            <option value="resolvido">Resolvido</option>
            <option value="fechado">Fechado</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Prioridade:</label>
          <select id="filter-priority" class="filter-select">
            <option value="">Todas</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Categoria:</label>
          <select id="filter-category" class="filter-select">
            <option value="">Todas</option>
            <option value="hardware">Hardware</option>
            <option value="software">Software</option>
            <option value="rede">Rede</option>
            <option value="sistema">Sistema</option>
          </select>
        </div>
        <div class="filter-group">
          <span class="results-count">Carregando...</span>
        </div>
        <div class="filter-actions">
          <button class="btn btn-primary btn-filter">Filtrar</button>
          <button class="btn btn-secondary btn-clear">Limpar</button>
        </div>
      </div>
      
      <div class="table-container">
        <table id="tickets-table" class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Título</th>
              <th>Usuário</th>
              <th>Categoria</th>
              <th>Prioridade</th>
              <th>Status</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="tickets-tbody">
            <tr>
              <td colspan="8" style="text-align: center; padding: 2rem;">
                <i class="fas fa-spinner fa-spin" style="margin-right: 0.5rem;"></i>
                Inicializando...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div id="pagination" class="pagination"></div>
    `;
  }

  setupEventListeners() {
    // Navegação para seção tickets
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-section="tickets"]')) {
        setTimeout(() => this.onSectionActive(), 100);
      }
    });

    // Filtros
    const filterButton = document.getElementById('filter-status')?.closest('.filters-bar')?.querySelector('.btn-filter');
    const clearButton = document.getElementById('filter-status')?.closest('.filters-bar')?.querySelector('.btn-clear');
    
    if (filterButton) {
      filterButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.applyFilters();
      });
    }

    if (clearButton) {
      clearButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.clearFilters();
      });
    }

    // Auto-filtros em tempo real
    const filterSelects = document.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
      select.addEventListener('change', () => {
        this.onFilterChange();
      });
    });

    // Busca em tempo real
    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce(() => {
        this.onSearchChange();
      }, 300));
    }

    // Ordenação por headers
    const headers = document.querySelectorAll('#tickets-table th');
    headers.forEach((header, index) => {
      if (index === 0 || index === headers.length - 1) return;
      
      header.style.cursor = 'pointer';
      header.title = 'Clique para ordenar';
      header.addEventListener('click', () => {
        this.sortTable(header.textContent.toLowerCase(), header);
      });
    });
  }

  async onSectionActive() {
    this.log('Seção tickets ativada');
    await this.loadTickets();
  }

  async onRefresh() {
    await this.loadTickets();
  }

  async loadTickets() {
    try {
      this.showLoadingState();
      
      // Construir query com filtros
      const params = new URLSearchParams();
      
      if (this.filters.status) params.append('status', this.filters.status);
      if (this.filters.priority) params.append('priority', this.filters.priority);
      if (this.filters.category) params.append('category', this.filters.category);
      if (this.filters.search) params.append('search', this.filters.search);
      
      params.append('page', this.currentPage);
      params.append('limit', this.itemsPerPage);

      const response = await fetch(`/api/tickets?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar tickets');
      
      const result = await response.json();
      this.tickets = result.data?.tickets || result.data || [];
      this.totalTickets = result.data?.total_count || result.total || this.tickets.length;
      
      this.log(`Tickets carregados: ${this.tickets.length}`);
      
      this.renderTickets();
      this.renderPagination();
      this.updateResultsCounter();
      
      this.emit('ticketsLoaded', { tickets: this.tickets, total: this.totalTickets });
      
    } catch (error) {
      this.error('Erro ao carregar tickets:', error);
      this.renderError('Erro ao carregar tickets. Tente novamente.');
    }
  }

  showLoadingState() {
    const tbody = document.getElementById('tickets-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr class="loading-row">
          <td colspan="8" style="text-align: center; padding: 2rem;">
            <i class="fas fa-spinner fa-spin" style="margin-right: 0.5rem;"></i>
            Carregando tickets...
          </td>
        </tr>
      `;
    }
  }

  renderTickets() {
    const tbody = document.getElementById('tickets-tbody');
    if (!tbody) {
      this.error('Elemento tickets-tbody não encontrado');
      return;
    }
    
    if (!this.tickets || this.tickets.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2rem; color: #6b7280;">
            <i class="fas fa-ticket-alt" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem; display: block;"></i>
            Nenhum ticket encontrado
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.tickets.map(ticket => `
      <tr data-ticket-id="${ticket.id}" class="ticket-row">
        <td class="ticket-id">#${ticket.id.substring(0, 8)}</td>
        <td class="ticket-title">
          <strong>${this.escapeHtml(ticket.title)}</strong>
          ${ticket.description ? `<div class="ticket-excerpt" style="font-size: 0.8rem; color: #666; margin-top: 4px;">${this.truncate(ticket.description, 50)}</div>` : ''}
        </td>
        <td class="user-info">
          <strong>${this.escapeHtml(ticket.user_name || 'N/A')}</strong>
          ${ticket.user_email ? `<div style="font-size: 0.8rem; color: #666;">${ticket.user_email}</div>` : ''}
        </td>
        <td>
          <span class="badge badge-category">
            <i class="fas fa-${this.getCategoryIcon(ticket.category)}"></i>
            ${this.getCategoryDisplay(ticket.category)}
          </span>
        </td>
        <td>
          <span class="badge badge-priority priority-${(ticket.priority || '').toLowerCase()}">
            ${this.getPriorityDisplay(ticket.priority)}
          </span>
        </td>
        <td>
          <span class="badge badge-status status-${(ticket.status || '').toLowerCase()}">
            ${this.getStatusDisplay(ticket.status)}
          </span>
        </td>
        <td class="ticket-date" title="${new Date(ticket.created_at).toLocaleString('pt-BR')}">
          ${this.formatRelativeDate(ticket.created_at)}
        </td>
        <td class="ticket-actions">
          <button class="btn-action btn-view" onclick="window.app?.showTicketDetails('${ticket.id}')" title="Visualizar">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-action btn-edit" onclick="window.modularManager?.modules.tickets?.editTicket('${ticket.id}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          ${ticket.status !== 'fechado' ? `
            <button class="btn-action btn-close" onclick="window.modularManager?.modules.tickets?.closeTicket('${ticket.id}')" title="Fechar">
              <i class="fas fa-times-circle"></i>
            </button>
          ` : ''}
        </td>
      </tr>
    `).join('');

    // Adicionar eventos de hover
    this.addTableInteractions();
    
    this.log(`Renderizados ${this.tickets.length} tickets na tabela`);
  }

  addTableInteractions() {
    const rows = document.querySelectorAll('.ticket-row');
    rows.forEach(row => {
      this.addEventListener(row, 'mouseenter', () => {
        row.style.backgroundColor = '#f8fafc';
      });
      
      this.addEventListener(row, 'mouseleave', () => {
        row.style.backgroundColor = '';
      });
    });
  }

  renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;
    
    const totalPages = Math.ceil(this.totalTickets / this.itemsPerPage);
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let paginationHTML = '<div class="pagination-controls">';
    
    // Botão anterior
    paginationHTML += `
      <button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
              onclick="window.modularManager?.modules.tickets?.goToPage(${this.currentPage - 1})" 
              ${this.currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
      </button>
    `;

    // Páginas
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(totalPages, this.currentPage + 2);

    if (startPage > 1) {
      paginationHTML += `<button class="page-btn" onclick="window.modularManager?.modules.tickets?.goToPage(1)">1</button>`;
      if (startPage > 2) paginationHTML += '<span class="page-ellipsis">...</span>';
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                onclick="window.modularManager?.modules.tickets?.goToPage(${i})">
          ${i}
        </button>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) paginationHTML += '<span class="page-ellipsis">...</span>';
      paginationHTML += `<button class="page-btn" onclick="window.modularManager?.modules.tickets?.goToPage(${totalPages})">${totalPages}</button>`;
    }

    // Botão próximo
    paginationHTML += `
      <button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
              onclick="window.modularManager?.modules.tickets?.goToPage(${this.currentPage + 1})" 
              ${this.currentPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
      </button>
    `;

    paginationHTML += '</div>';
    container.innerHTML = paginationHTML;
  }

  updateResultsCounter() {
    const counter = document.querySelector('.results-count');
    if (counter) {
      const start = (this.currentPage - 1) * this.itemsPerPage + 1;
      const end = Math.min(this.currentPage * this.itemsPerPage, this.totalTickets);
      counter.textContent = `${start}-${end} de ${this.totalTickets} tickets`;
    }
  }

  renderError(message) {
    const tbody = document.getElementById('tickets-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2rem; color: #ef4444;">
          <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
          ${message}
        </td>
      </tr>
    `;
  }

  // Métodos de ação e utilidade mantidos do código original
  async viewTicket(ticketId) {
    this.log(`Visualizando ticket ${ticketId}`);
    if (window.app && typeof window.app.showTicketDetails === 'function') {
      window.app.showTicketDetails(ticketId);
    }
  }

  async editTicket(ticketId) {
    this.log(`Editando ticket ${ticketId}`);
  }

  async closeTicket(ticketId) {
    this.log(`Fechando ticket ${ticketId}`);
  }

  applyFilters() {
    this.filters.status = document.getElementById('filter-status')?.value || '';
    this.filters.priority = document.getElementById('filter-priority')?.value || '';
    this.filters.category = document.getElementById('filter-category')?.value || '';
    
    this.currentPage = 1;
    this.loadTickets();
  }

  clearFilters() {
    const statusFilter = document.getElementById('filter-status');
    const priorityFilter = document.getElementById('filter-priority'); 
    const categoryFilter = document.getElementById('filter-category');
    
    if (statusFilter) statusFilter.value = '';
    if (priorityFilter) priorityFilter.value = '';
    if (categoryFilter) categoryFilter.value = '';
    
    this.filters = { status: '', priority: '', category: '', search: '' };
    this.currentPage = 1;
    this.loadTickets();
  }

  onFilterChange() {
    clearTimeout(this.filterTimeout);
    this.filterTimeout = setTimeout(() => {
      this.applyFilters();
    }, 500);
  }

  goToPage(page) {
    const totalPages = Math.ceil(this.totalTickets / this.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    this.currentPage = page;
    this.loadTickets();
  }

  sortTable(column, headerElement) {
    this.log(`Ordenando por: ${column}`);
  }

  // Funções utilitárias mantidas do código original
  getCategoryDisplay(category) {
    const categories = {
      hardware: 'Hardware',
      software: 'Software', 
      rede: 'Rede',
      sistema: 'Sistema',
      email: 'Email'
    };
    return categories[category] || category || 'N/A';
  }

  getCategoryIcon(category) {
    const icons = {
      hardware: 'desktop',
      software: 'code',
      rede: 'wifi',
      sistema: 'server',
      email: 'envelope'
    };
    return icons[category] || 'question';
  }

  getPriorityDisplay(priority) {
    const priorities = {
      critica: 'Crítica',
      alta: 'Alta',
      media: 'Média',
      baixa: 'Baixa'
    };
    return priorities[priority] || priority || 'N/A';
  }

  getStatusDisplay(status) {
    const statuses = {
      aberto: 'Aberto',
      andamento: 'Em Andamento',
      resolvido: 'Resolvido',
      fechado: 'Fechado'
    };
    return statuses[status] || status || 'N/A';
  }

  formatRelativeDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} dia(s)`;
    if (diffHours > 0) return `${diffHours}h`;
    return 'Agora';
  }

  truncate(text, length) {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

window.TicketsModule = TicketsModule;