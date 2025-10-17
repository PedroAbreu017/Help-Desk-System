// public/js/modules/tickets-module.js - COMPLETO COM FUNCIONALIDADE DE EDIÇÃO
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
class TicketsModule extends BaseModule {
  constructor() {
    super('tickets', {
      dependencies: ['fetch'],
      autoRefresh: false
    });
    
    this.filters = {
      status: '',
      priority: '',
      category: '',
      search: ''
    };
    
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.tickets = [];
    this.totalTickets = 0;
  }

  async onInit() {
    this.log('Inicializando Tickets Module...');
    
    this.ticketsSection = document.getElementById('tickets-section');
    
    if (!this.ticketsSection) {
      this.error('Seção tickets-section não encontrada no HTML');
      return;
    }

    this.createCompleteTicketsStructure();
    
    this.ticketsTable = document.getElementById('tickets-table');
    this.ticketsTableBody = document.getElementById('tickets-tbody');
    this.pagination = document.getElementById('pagination');
    
    this.setupEventListeners();
    
    if (this.ticketsSection.classList.contains('active')) {
      await this.loadTickets();
    }
    
    this.log('Tickets Module inicializado - controle total assumido');
  }

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

    const filterSelects = document.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
      select.addEventListener('change', () => {
        this.onFilterChange();
      });
    });

    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce(() => {
        this.onSearchChange();
      }, 300));
    }

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
      
      const params = new URLSearchParams();
      
      if (this.filters.status) params.append('status', this.filters.status);
      if (this.filters.priority) params.append('priority', this.filters.priority);
      if (this.filters.category) params.append('category', this.filters.category);
      if (this.filters.search) params.append('search', this.filters.search);
      
      params.append('page', this.currentPage);
      params.append('limit', this.itemsPerPage);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tickets?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
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
          <button class="btn-action btn-view" onclick="window.ticketsModule?.viewTicket('${ticket.id}')" title="Visualizar">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-action btn-edit" onclick="window.ticketsModule?.editTicket('${ticket.id}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          ${ticket.status !== 'fechado' ? `
            <button class="btn-action btn-close" onclick="window.ticketsModule?.closeTicket('${ticket.id}')" title="Fechar">
              <i class="fas fa-times-circle"></i>
            </button>
          ` : ''}
        </td>
      </tr>
    `).join('');

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
    
    paginationHTML += `
      <button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
              onclick="window.ticketsModule?.goToPage(${this.currentPage - 1})" 
              ${this.currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
      </button>
    `;

    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(totalPages, this.currentPage + 2);

    if (startPage > 1) {
      paginationHTML += `<button class="page-btn" onclick="window.ticketsModule?.goToPage(1)">1</button>`;
      if (startPage > 2) paginationHTML += '<span class="page-ellipsis">...</span>';
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                onclick="window.ticketsModule?.goToPage(${i})">
          ${i}
        </button>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) paginationHTML += '<span class="page-ellipsis">...</span>';
      paginationHTML += `<button class="page-btn" onclick="window.ticketsModule?.goToPage(${totalPages})">${totalPages}</button>`;
    }

    paginationHTML += `
      <button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
              onclick="window.ticketsModule?.goToPage(${this.currentPage + 1})" 
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

  // FUNCIONALIDADE COMPLETA DE EDIÇÃO
  async editTicket(ticketId) {
    this.log(`Editando ticket ${ticketId}`);
    
    try {
      const ticket = await this.fetchTicketDetails(ticketId);
      
      if (ticket) {
        this.showEditTicketModal(ticket);
      } else {
        this.showToast('Ticket não encontrado', 'error');
      }
    } catch (error) {
      this.error('Erro ao editar ticket:', error);
      this.showToast('Erro ao carregar dados do ticket', 'error');
    }
  }

  // MODAL DE EDIÇÃO COMPLETO
  showEditTicketModal(ticket) {
    // Remover modal existente
    const existingModal = document.getElementById('edit-ticket-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'edit-ticket-modal';
    modal.className = 'modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;
    
    modal.innerHTML = `
      <div class="modal-content" style="
        background: white;
        border-radius: 8px;
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      ">
        <div class="modal-header" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        ">
          <h2 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-edit"></i> 
            Editar Ticket #${ticket.id.substring(0, 8)}
          </h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()" style="
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.5rem;
          ">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body" style="padding: 1.5rem;">
          <form id="edit-ticket-form">
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Título *</label>
              <input 
                type="text" 
                id="edit-title" 
                name="title" 
                value="${this.escapeHtml(ticket.title)}" 
                required 
                style="
                  width: 100%;
                  padding: 0.75rem;
                  border: 1px solid #d1d5db;
                  border-radius: 4px;
                  font-size: 1rem;
                "
              >
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Descrição *</label>
              <textarea 
                id="edit-description" 
                name="description" 
                required 
                rows="4"
                style="
                  width: 100%;
                  padding: 0.75rem;
                  border: 1px solid #d1d5db;
                  border-radius: 4px;
                  font-size: 1rem;
                  resize: vertical;
                "
              >${this.escapeHtml(ticket.description)}</textarea>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
              <div>
                <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Categoria</label>
                <select id="edit-category" name="category" style="
                  width: 100%;
                  padding: 0.75rem;
                  border: 1px solid #d1d5db;
                  border-radius: 4px;
                  font-size: 1rem;
                ">
                  <option value="hardware" ${ticket.category === 'hardware' ? 'selected' : ''}>Hardware</option>
                  <option value="software" ${ticket.category === 'software' ? 'selected' : ''}>Software</option>
                  <option value="rede" ${ticket.category === 'rede' ? 'selected' : ''}>Rede</option>
                  <option value="sistema" ${ticket.category === 'sistema' ? 'selected' : ''}>Sistema</option>
                  <option value="email" ${ticket.category === 'email' ? 'selected' : ''}>Email</option>
                </select>
              </div>
              
              <div>
                <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Prioridade</label>
                <select id="edit-priority" name="priority" style="
                  width: 100%;
                  padding: 0.75rem;
                  border: 1px solid #d1d5db;
                  border-radius: 4px;
                  font-size: 1rem;
                ">
                  <option value="baixa" ${ticket.priority === 'baixa' ? 'selected' : ''}>Baixa</option>
                  <option value="media" ${ticket.priority === 'media' ? 'selected' : ''}>Média</option>
                  <option value="alta" ${ticket.priority === 'alta' ? 'selected' : ''}>Alta</option>
                  <option value="critica" ${ticket.priority === 'critica' ? 'selected' : ''}>Crítica</option>
                </select>
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
              <div>
                <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Status</label>
                <select id="edit-status" name="status" style="
                  width: 100%;
                  padding: 0.75rem;
                  border: 1px solid #d1d5db;
                  border-radius: 4px;
                  font-size: 1rem;
                ">
                  <option value="aberto" ${ticket.status === 'aberto' ? 'selected' : ''}>Aberto</option>
                  <option value="andamento" ${ticket.status === 'andamento' ? 'selected' : ''}>Em Andamento</option>
                  <option value="resolvido" ${ticket.status === 'resolvido' ? 'selected' : ''}>Resolvido</option>
                  <option value="fechado" ${ticket.status === 'fechado' ? 'selected' : ''}>Fechado</option>
                </select>
              </div>
              
              <div>
                <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Atribuído para</label>
                <input 
                  type="text" 
                  id="edit-assigned-to" 
                  name="assigned_to" 
                  value="${this.escapeHtml(ticket.assigned_to || '')}"
                  placeholder="Nome do técnico"
                  style="
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    font-size: 1rem;
                  "
                >
              </div>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
              <button 
                type="button" 
                onclick="this.closest('.modal').remove()"
                style="
                  padding: 0.75rem 1.5rem;
                  border: 1px solid #d1d5db;
                  background: white;
                  border-radius: 4px;
                  cursor: pointer;
                "
              >
                Cancelar
              </button>
              <button 
                type="submit"
                style="
                  padding: 0.75rem 1.5rem;
                  background: #3b82f6;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                "
              >
                <i class="fas fa-save"></i> Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Configurar evento do formulário
    const form = modal.querySelector('#edit-ticket-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleEditTicketSubmit(ticket.id, form);
    });

    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // SALVAR ALTERAÇÕES DO TICKET
  async handleEditTicketSubmit(ticketId, form) {
    try {
      const formData = new FormData(form);
      const ticketData = {
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        priority: formData.get('priority'),
        status: formData.get('status'),
        assigned_to: formData.get('assigned_to')
      };

      // Mostrar loading no botão
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
      submitBtn.disabled = true;

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ticketData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.showToast('Ticket atualizado com sucesso!', 'success');
        
        // Fechar modal
        document.getElementById('edit-ticket-modal').remove();
        
        // Recarregar lista de tickets
        await this.loadTickets();
        
        // Atualizar dashboard se necessário
        if (window.app && typeof window.app.refreshDashboard === 'function') {
          window.app.refreshDashboard();
        }
      } else {
        throw new Error(result.message || 'Erro ao salvar alterações');
      }

    } catch (error) {
      this.error('Erro ao salvar ticket:', error);
      this.showToast('Erro ao salvar alterações: ' + error.message, 'error');
      
      // Restaurar botão
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
      submitBtn.disabled = false;
    }
  }

  // VISUALIZAR TICKET
  async viewTicket(ticketId) {
    this.log(`Visualizando ticket ${ticketId}`);
    
    try {
      const ticket = await this.fetchTicketDetails(ticketId);
      
      if (ticket) {
        this.showTicketDetailsModal(ticket);
      } else {
        this.showToast('Ticket não encontrado', 'error');
      }
    } catch (error) {
      this.error('Erro ao visualizar ticket:', error);
      this.showToast('Erro ao carregar ticket', 'error');
    }
  }

  // MODAL DE VISUALIZAÇÃO
  showTicketDetailsModal(ticket) {
    const existingModal = document.getElementById('view-ticket-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'view-ticket-modal';
    modal.className = 'modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;
    
    modal.innerHTML = `
      <div class="modal-content" style="
        background: white;
        border-radius: 8px;
        width: 90%;
        max-width: 700px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      ">
        <div class="modal-header" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          background: #f8fafc;
        ">
          <h2 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-eye"></i> 
            Ticket #${ticket.id.substring(0, 8)}
          </h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()" style="
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.5rem;
          ">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body" style="padding: 1.5rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
            <div>
              <h3 style="margin: 0 0 0.5rem 0; color: #374151;">Informações Básicas</h3>
              <p><strong>ID:</strong> ${ticket.id}</p>
              <p><strong>Título:</strong> ${this.escapeHtml(ticket.title)}</p>
              <p><strong>Status:</strong> 
                <span class="badge badge-status status-${ticket.status.toLowerCase()}" style="
                  padding: 0.25rem 0.5rem;
                  border-radius: 4px;
                  font-size: 0.875rem;
                  font-weight: bold;
                ">
                  ${this.getStatusDisplay(ticket.status)}
                </span>
              </p>
              <p><strong>Prioridade:</strong> 
                <span class="badge badge-priority priority-${ticket.priority.toLowerCase()}" style="
                  padding: 0.25rem 0.5rem;
                  border-radius: 4px;
                  font-size: 0.875rem;
                  font-weight: bold;
                ">
                  ${this.getPriorityDisplay(ticket.priority)}
                </span>
              </p>
            </div>
            
            <div>
              <h3 style="margin: 0 0 0.5rem 0; color: #374151;">Detalhes do Usuário</h3>
              <p><strong>Nome:</strong> ${this.escapeHtml(ticket.user_name)}</p>
              <p><strong>Email:</strong> ${this.escapeHtml(ticket.user_email || 'N/A')}</p>
              <p><strong>Departamento:</strong> ${this.escapeHtml(ticket.department || 'N/A')}</p>
              <p><strong>Categoria:</strong> 
                <span class="badge badge-category" style="
                  padding: 0.25rem 0.5rem;
                  border-radius: 4px;
                  font-size: 0.875rem;
                  background: #e5e7eb;
                  color: #374151;
                ">
                  <i class="fas fa-${this.getCategoryIcon(ticket.category)}"></i>
                  ${this.getCategoryDisplay(ticket.category)}
                </span>
              </p>
            </div>
          </div>
          
          <div style="margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 0.5rem 0; color: #374151;">Descrição</h3>
            <div style="
              background: #f9fafb;
              padding: 1rem;
              border-radius: 4px;
              border: 1px solid #e5e7eb;
              white-space: pre-wrap;
            ">
              ${this.escapeHtml(ticket.description)}
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
            <div>
              <p><strong>Data de Criação:</strong> ${new Date(ticket.created_at).toLocaleString('pt-BR')}</p>
              <p><strong>Última Atualização:</strong> ${new Date(ticket.updated_at || ticket.created_at).toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <p><strong>Atribuído para:</strong> ${this.escapeHtml(ticket.assigned_to || 'Não atribuído')}</p>
              ${ticket.resolved_at ? `<p><strong>Resolvido em:</strong> ${new Date(ticket.resolved_at).toLocaleString('pt-BR')}</p>` : ''}
            </div>
          </div>
          
          <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
            <button 
              onclick="this.closest('.modal').remove(); window.ticketsModule.editTicket('${ticket.id}')"
              style="
                padding: 0.75rem 1.5rem;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
              "
            >
              <i class="fas fa-edit"></i> Editar Ticket
            </button>
            <button 
              onclick="this.closest('.modal').remove()"
              style="
                padding: 0.75rem 1.5rem;
                border: 1px solid #d1d5db;
                background: white;
                border-radius: 4px;
                cursor: pointer;
              "
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // FUNÇÃO SHOWTICKETDETAILS (compatibilidade)
  showTicketDetails(ticket) {
    if (typeof ticket === 'string') {
      // Se receber apenas ID, buscar dados completos
      this.viewTicket(ticket);
    } else {
      // Se receber objeto completo, mostrar modal
      this.showTicketDetailsModal(ticket);
    }
  }

  async closeTicket(ticketId) {
    this.log(`Fechando ticket ${ticketId}`);
    
    if (!confirm('Tem certeza que deseja fechar este ticket?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'fechado' })
      });

      if (response.ok) {
        this.showToast('Ticket fechado com sucesso', 'success');
        await this.loadTickets();
      } else {
        this.showToast('Erro ao fechar ticket', 'error');
      }
    } catch (error) {
      this.error('Erro ao fechar ticket:', error);
      this.showToast('Erro ao fechar ticket', 'error');
    }
  }

  async fetchTicketDetails(ticketId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      this.error('Erro ao buscar detalhes do ticket:', error);
      return null;
    }
  }

  showToast(message, type = 'info') {
    if (window.app && typeof window.app.showToast === 'function') {
      window.app.showToast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  // MÉTODOS DE FILTROS E PAGINAÇÃO
  applyFilters() {
    this.filters.status = document.getElementById('filter-status')?.value || '';
    this.filters.priority = document.getElementById('filter-priority')?.value || '';
    this.filters.category = document.getElementById('filter-category')?.value || '';
    this.filters.search = document.getElementById('filter-search')?.value || '';
    
    this.currentPage = 1;
    this.loadTickets();
  }

  clearFilters() {
    const statusFilter = document.getElementById('filter-status');
    const priorityFilter = document.getElementById('filter-priority'); 
    const categoryFilter = document.getElementById('filter-category');
    const searchFilter = document.getElementById('filter-search');
    
    if (statusFilter) statusFilter.value = '';
    if (priorityFilter) priorityFilter.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (searchFilter) searchFilter.value = '';
    
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

  onSearchChange() {
    this.applyFilters();
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

  // FUNÇÕES UTILITÁRIAS
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
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Instanciar e disponibilizar globalmente
const ticketsModuleInstance = new TicketsModule();
window.TicketsModule = TicketsModule;
window.ticketsModule = ticketsModuleInstance;

// Registrar no component-loader se disponível
if (window.modularSystem?.loader) {
  window.modularSystem.loader.registerModule('tickets', ticketsModuleInstance, 
    ['editTicket', 'viewTicket', 'showTicketDetails', 'deleteTicket', 'closeTicket']
  );
}

console.log('🎫 TicketsModule com funcionalidade completa de edição carregado!');

});