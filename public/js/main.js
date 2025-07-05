// main.js - Arquivo principal do frontend
class HelpDeskApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.tickets = [];
        this.users = [];
        this.stats = {};
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando Help Desk App...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup navigation
        this.setupNavigation();
        
        // Load initial data
        await this.loadInitialData();
        
        // Hide loading
        this.hideLoading();
        
        console.log('✅ App inicializado com sucesso!');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
            });
        });

        // New ticket form
        const newTicketForm = document.getElementById('new-ticket-form');
        if (newTicketForm) {
            newTicketForm.addEventListener('submit', (e) => this.handleNewTicket(e));
        }

        // Filters
        document.getElementById('filter-status')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-priority')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-category')?.addEventListener('change', () => this.applyFilters());

        // Modal close
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('ticket-modal');
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Auto-refresh every 30 seconds
        setInterval(() => {
            if (this.currentSection === 'dashboard') {
                this.refreshDashboard();
            }
        }, 30000);
    }

    setupNavigation() {
        // Update active navigation item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${this.currentSection}"]`)?.classList.add('active');
    }

    async loadInitialData() {
        try {
            this.showLoading();
            
            // Load dashboard data
            await this.loadDashboardData();
            
            // Load tickets
            await this.loadTickets();
            
            // Load users
            await this.loadUsers();
            
            // Initialize knowledge base
            this.initializeKnowledgeBase();
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados iniciais:', error);
            this.showToast('Erro ao carregar dados do sistema', 'error');
        }
    }

    async loadDashboardData() {
        try {
            const response = await fetch(`${API_BASE_URL}/dashboard`);
            if (!response.ok) throw new Error('Erro ao carregar dashboard');
            
            const data = await response.json();
            if (data.success) {
                this.stats = data.data.statistics;
                this.updateDashboard(data.data);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar dashboard:', error);
        }
    }

    async loadTickets(filters = {}) {
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const url = `${API_BASE_URL}/tickets${queryParams ? '?' + queryParams : ''}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Erro ao carregar tickets');
            
            const data = await response.json();
            if (data.success) {
                this.tickets = data.data.tickets;
                this.updateTicketsTable();
                this.updateTicketsCount();
            }
        } catch (error) {
            console.error('❌ Erro ao carregar tickets:', error);
            this.showToast('Erro ao carregar tickets', 'error');
        }
    }

    async loadUsers() {
        try {
            const response = await fetch(`${API_BASE_URL}/users`);
            if (!response.ok) throw new Error('Erro ao carregar usuários');
            
            const data = await response.json();
            if (data.success) {
                this.users = data.data;
            }
        } catch (error) {
            console.error('❌ Erro ao carregar usuários:', error);
        }
    }

    updateDashboard(data) {
        const stats = data.statistics;
        
        // Update stat cards
        document.getElementById('total-tickets').textContent = stats.total_tickets;
        document.getElementById('open-tickets').textContent = stats.tickets_abertos + stats.tickets_andamento;
        document.getElementById('progress-tickets').textContent = stats.tickets_andamento;
        document.getElementById('resolved-tickets').textContent = stats.tickets_resolvidos;

        // Update priority chart
        const maxPriority = Math.max(
            stats.por_prioridade.critica,
            stats.por_prioridade.alta,
            stats.por_prioridade.media,
            stats.por_prioridade.baixa
        );

        Object.keys(stats.por_prioridade).forEach(priority => {
            const count = stats.por_prioridade[priority];
            const percentage = maxPriority > 0 ? (count / maxPriority) * 100 : 0;
            
            document.getElementById(`priority-${priority}`).textContent = count;
            document.querySelector(`[data-priority="${priority}"]`).style.width = `${percentage}%`;
        });

        // Update category chart
        this.updateCategoryChart(stats.por_categoria);

        // Update recent tickets
        this.updateRecentTickets(data.recent_tickets);
    }

    updateCategoryChart(categories) {
        const chartContainer = document.getElementById('category-chart');
        chartContainer.innerHTML = '';

        Object.keys(categories).forEach(category => {
            const count = categories[category];
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-item';
            categoryDiv.innerHTML = `
                <div class="category-icon">
                    <i class="fas fa-${this.getCategoryIcon(category)}"></i>
                </div>
                <div class="category-info">
                    <span class="category-name">${this.getCategoryName(category)}</span>
                    <span class="category-count">${count}</span>
                </div>
            `;
            chartContainer.appendChild(categoryDiv);
        });
    }

    updateRecentTickets(tickets) {
        const container = document.getElementById('recent-tickets');
        if (!tickets || tickets.length === 0) {
            container.innerHTML = '<p class="no-tickets">Nenhum ticket recente</p>';
            return;
        }

        container.innerHTML = tickets.map(ticket => `
            <div class="recent-ticket-item" onclick="app.showTicketDetails('${ticket.id}')">
                <div class="ticket-info">
                    <h4>#${ticket.id.substring(0, 8)} - ${ticket.title}</h4>
                    <p><i class="fas fa-user"></i> ${ticket.user_name} - ${ticket.department}</p>
                    <p><i class="fas fa-clock"></i> ${this.formatDate(ticket.created_at)}</p>
                </div>
                <div class="ticket-meta">
                    <span class="priority priority-${ticket.priority}">${this.getPriorityName(ticket.priority)}</span>
                    <span class="status status-${ticket.status}">${this.getStatusName(ticket.status)}</span>
                </div>
            </div>
        `).join('');
    }

    updateTicketsTable() {
        const tbody = document.getElementById('tickets-tbody');
        if (!this.tickets || this.tickets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-tickets">Nenhum ticket encontrado</td></tr>';
            return;
        }

        tbody.innerHTML = this.tickets.map(ticket => `
            <tr class="ticket-row" onclick="app.showTicketDetails('${ticket.id}')">
                <td class="ticket-id">#${ticket.id.substring(0, 8)}</td>
                <td class="ticket-title">${ticket.title}</td>
                <td class="ticket-user">${ticket.user_name}</td>
                <td class="ticket-category">
                    <i class="fas fa-${this.getCategoryIcon(ticket.category)}"></i>
                    ${this.getCategoryName(ticket.category)}
                </td>
                <td class="ticket-priority">
                    <span class="priority priority-${ticket.priority}">
                        ${this.getPriorityName(ticket.priority)}
                    </span>
                </td>
                <td class="ticket-status">
                    <span class="status status-${ticket.status}">
                        ${this.getStatusName(ticket.status)}
                    </span>
                </td>
                <td class="ticket-date">${this.formatDate(ticket.created_at)}</td>
                <td class="ticket-actions">
                    <button class="btn-action" onclick="event.stopPropagation(); app.editTicket('${ticket.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action" onclick="event.stopPropagation(); app.deleteTicket('${ticket.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateTicketsCount() {
        const badge = document.getElementById('tickets-count');
        const openTickets = this.tickets.filter(t => ['aberto', 'andamento'].includes(t.status)).length;
        badge.textContent = openTickets;
        badge.style.display = openTickets > 0 ? 'inline' : 'none';
    }

    async handleNewTicket(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const ticketData = {
                title: formData.get('title'),
                description: formData.get('description'),
                category: formData.get('category'),
                priority: formData.get('priority'),
                user_name: formData.get('user_name'),
                user_email: formData.get('user_email'),
                department: formData.get('department')
            };

            this.showLoading();

            const response = await fetch(`${API_BASE_URL}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ticketData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Ticket criado com sucesso!', 'success');
                e.target.reset();
                await this.loadTickets();
                await this.loadDashboardData();
                this.showSection('tickets');
            } else {
                throw new Error(result.message || 'Erro ao criar ticket');
            }

        } catch (error) {
            console.error('❌ Erro ao criar ticket:', error);
            this.showToast('Erro ao criar ticket: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async showTicketDetails(ticketId) {
        try {
            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`);
            const data = await response.json();

            if (data.success) {
                const ticket = data.data;
                this.openTicketModal(ticket);
            } else {
                throw new Error('Ticket não encontrado');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar detalhes do ticket:', error);
            this.showToast('Erro ao carregar detalhes do ticket', 'error');
        }
    }

    openTicketModal(ticket) {
        const modal = document.getElementById('ticket-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        const modalFooter = document.getElementById('modal-footer');

        modalTitle.textContent = `Ticket #${ticket.id.substring(0, 8)} - ${ticket.title}`;
        
        modalBody.innerHTML = `
            <div class="ticket-details">
                <div class="detail-row">
                    <div class="detail-group">
                        <label>Status:</label>
                        <span class="status status-${ticket.status}">${this.getStatusName(ticket.status)}</span>
                    </div>
                    <div class="detail-group">
                        <label>Prioridade:</label>
                        <span class="priority priority-${ticket.priority}">${this.getPriorityName(ticket.priority)}</span>
                    </div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-group">
                        <label>Categoria:</label>
                        <span><i class="fas fa-${this.getCategoryIcon(ticket.category)}"></i> ${this.getCategoryName(ticket.category)}</span>
                    </div>
                    <div class="detail-group">
                        <label>Departamento:</label>
                        <span>${ticket.department}</span>
                    </div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-group">
                        <label>Usuário:</label>
                        <span>${ticket.user_name}</span>
                    </div>
                    <div class="detail-group">
                        <label>Email:</label>
                        <span>${ticket.user_email}</span>
                    </div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-group">
                        <label>Criado em:</label>
                        <span>${this.formatDateTime(ticket.created_at)}</span>
                    </div>
                    <div class="detail-group">
                        <label>Atualizado em:</label>
                        <span>${this.formatDateTime(ticket.updated_at)}</span>
                    </div>
                </div>
                
                ${ticket.assigned_to ? `
                    <div class="detail-row">
                        <div class="detail-group">
                            <label>Técnico Responsável:</label>
                            <span>${ticket.assigned_to}</span>
                        </div>
                        ${ticket.resolved_at ? `
                            <div class="detail-group">
                                <label>Resolvido em:</label>
                                <span>${this.formatDateTime(ticket.resolved_at)}</span>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                <div class="detail-group full-width">
                    <label>Descrição:</label>
                    <div class="description-box">${ticket.description}</div>
                </div>
                
                ${ticket.solution ? `
                    <div class="detail-group full-width">
                        <label>Solução:</label>
                        <div class="solution-box">${ticket.solution}</div>
                    </div>
                ` : ''}
                
                ${ticket.internal_notes && ticket.internal_notes.length > 0 ? `
                    <div class="detail-group full-width">
                        <label>Notas Internas:</label>
                        <div class="notes-container">
                            ${ticket.internal_notes.map(note => `
                                <div class="note-item">
                                    <div class="note-header">
                                        <strong>${note.author}</strong>
                                        <span class="note-date">${this.formatDateTime(note.created_at)}</span>
                                    </div>
                                    <div class="note-content">${note.content}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="update-section">
                    <div class="update-row">
                        <div class="update-group">
                            <label for="modal-status">Atualizar Status:</label>
                            <select id="modal-status" class="form-control">
                                <option value="aberto" ${ticket.status === 'aberto' ? 'selected' : ''}>Aberto</option>
                                <option value="andamento" ${ticket.status === 'andamento' ? 'selected' : ''}>Em Andamento</option>
                                <option value="resolvido" ${ticket.status === 'resolvido' ? 'selected' : ''}>Resolvido</option>
                                <option value="fechado" ${ticket.status === 'fechado' ? 'selected' : ''}>Fechado</option>
                            </select>
                        </div>
                        <div class="update-group">
                            <label for="modal-priority">Atualizar Prioridade:</label>
                            <select id="modal-priority" class="form-control">
                                <option value="baixa" ${ticket.priority === 'baixa' ? 'selected' : ''}>Baixa</option>
                                <option value="media" ${ticket.priority === 'media' ? 'selected' : ''}>Média</option>
                                <option value="alta" ${ticket.priority === 'alta' ? 'selected' : ''}>Alta</option>
                                <option value="critica" ${ticket.priority === 'critica' ? 'selected' : ''}>Crítica</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="update-group">
                        <label for="modal-assigned">Técnico Responsável:</label>
                        <input type="text" id="modal-assigned" class="form-control" 
                               value="${ticket.assigned_to || ''}" placeholder="Nome do técnico">
                    </div>
                    
                    <div class="update-group">
                        <label for="modal-solution">Solução:</label>
                        <textarea id="modal-solution" class="form-control" rows="3" 
                                  placeholder="Descreva a solução aplicada...">${ticket.solution || ''}</textarea>
                    </div>
                    
                    <div class="update-group">
                        <label for="modal-note">Adicionar Nota Interna:</label>
                        <textarea id="modal-note" class="form-control" rows="2" 
                                  placeholder="Nota para a equipe técnica..."></textarea>
                    </div>
                </div>
            </div>
        `;

        modalFooter.innerHTML = `
            <button class="btn btn-primary" onclick="app.updateTicket('${ticket.id}')">
                <i class="fas fa-save"></i> Salvar Alterações
            </button>
            <button class="btn btn-secondary" onclick="app.addTicketNote('${ticket.id}')">
                <i class="fas fa-comment"></i> Adicionar Nota
            </button>
            <button class="btn btn-outline" onclick="app.closeModal()">
                <i class="fas fa-times"></i> Fechar
            </button>
        `;

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    async updateTicket(ticketId) {
        try {
            const updates = {
                status: document.getElementById('modal-status').value,
                priority: document.getElementById('modal-priority').value,
                assigned_to: document.getElementById('modal-assigned').value,
                solution: document.getElementById('modal-solution').value
            };

            this.showLoading();

            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Ticket atualizado com sucesso!', 'success');
                this.closeModal();
                await this.loadTickets();
                await this.loadDashboardData();
            } else {
                throw new Error(result.message || 'Erro ao atualizar ticket');
            }

        } catch (error) {
            console.error('❌ Erro ao atualizar ticket:', error);
            this.showToast('Erro ao atualizar ticket: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async addTicketNote(ticketId) {
        try {
            const noteContent = document.getElementById('modal-note').value.trim();
            if (!noteContent) {
                this.showToast('Digite uma nota para adicionar', 'warning');
                return;
            }

            const noteData = {
                note: noteContent,
                author: 'Suporte TI' // Em um sistema real, isso viria da autenticação
            };

            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(noteData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Nota adicionada com sucesso!', 'success');
                document.getElementById('modal-note').value = '';
                // Recarregar detalhes do ticket
                await this.showTicketDetails(ticketId);
            } else {
                throw new Error(result.message || 'Erro ao adicionar nota');
            }

        } catch (error) {
            console.error('❌ Erro ao adicionar nota:', error);
            this.showToast('Erro ao adicionar nota: ' + error.message, 'error');
        }
    }

    async deleteTicket(ticketId) {
        if (!confirm('Tem certeza que deseja excluir este ticket? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            this.showLoading();

            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Ticket excluído com sucesso!', 'success');
                await this.loadTickets();
                await this.loadDashboardData();
            } else {
                throw new Error(result.message || 'Erro ao excluir ticket');
            }

        } catch (error) {
            console.error('❌ Erro ao excluir ticket:', error);
            this.showToast('Erro ao excluir ticket: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    applyFilters() {
        const filters = {
            status: document.getElementById('filter-status').value,
            priority: document.getElementById('filter-priority').value,
            category: document.getElementById('filter-category').value
        };

        // Remove empty filters
        Object.keys(filters).forEach(key => {
            if (!filters[key]) delete filters[key];
        });

        this.loadTickets(filters);
    }

    clearFilters() {
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-priority').value = '';
        document.getElementById('filter-category').value = '';
        this.loadTickets();
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show selected section
        document.getElementById(`${sectionName}-section`).classList.add('active');
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        this.currentSection = sectionName;

        // Load section-specific data
        if (sectionName === 'dashboard') {
            this.refreshDashboard();
        } else if (sectionName === 'tickets') {
            this.loadTickets();
        } else if (sectionName === 'reports') {
            this.loadReports();
        }
    }

    async refreshDashboard() {
        await this.loadDashboardData();
    }

    async refreshData() {
        this.showLoading();
        await this.loadInitialData();
        this.hideLoading();
        this.showToast('Dados atualizados!', 'success');
    }

    closeModal() {
        const modal = document.getElementById('ticket-modal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    showLoading() {
        document.getElementById('loading').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        const container = document.getElementById('toast-container');
        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 100);
    }

    initializeKnowledgeBase() {
        const articles = [
            {
                id: 1,
                title: 'Computador não liga',
                category: 'hardware',
                content: 'Verificar cabo de energia, testar tomada, verificar conexões internas.',
                steps: [
                    'Verificar se o cabo de energia está conectado',
                    'Testar a tomada com outro equipamento',
                    'Verificar botão liga/desliga',
                    'Verificar fonte de alimentação',
                    'Contatar suporte se persistir'
                ]
            },
            {
                id: 2,
                title: 'Sem conexão com internet',
                category: 'rede',
                content: 'Reiniciar modem/roteador, verificar cabos, testar configurações.',
                steps: [
                    'Reiniciar modem e roteador',
                    'Verificar cabos de rede',
                    'Testar ping para gateway',
                    'Verificar configurações IP',
                    'Contatar provedor se necessário'
                ]
            },
            {
                id: 3,
                title: 'Impressora não funciona',
                category: 'hardware',
                content: 'Verificar drivers, papel, tinta e conexões.',
                steps: [
                    'Verificar se há papel na bandeja',
                    'Verificar nível de tinta/toner',
                    'Reinstalar drivers da impressora',
                    'Verificar conexão USB/rede',
                    'Executar limpeza dos cabeçotes'
                ]
            },
            {
                id: 4,
                title: 'Email não recebe/envia',
                category: 'software',
                content: 'Verificar configurações de servidor, senha e conectividade.',
                steps: [
                    'Verificar configurações SMTP/POP3',
                    'Testar senha do email',
                    'Verificar conexão com internet',
                    'Limpar cache do cliente de email',
                    'Verificar filtros de spam'
                ]
            },
            {
                id: 5,
                title: 'Sistema lento',
                category: 'sistema',
                content: 'Verificar uso de recursos, executar limpeza e otimização.',
                steps: [
                    'Verificar uso de CPU e memória',
                    'Executar limpeza de disco',
                    'Desabilitar programas de inicialização',
                    'Executar antivírus',
                    'Verificar fragmentação do disco'
                ]
            }
        ];

        this.knowledgeBase = articles;
        this.renderKnowledgeBase();
    }

    renderKnowledgeBase(filter = 'all') {
        const container = document.getElementById('kb-articles');
        const filteredArticles = filter === 'all' ? 
            this.knowledgeBase : 
            this.knowledgeBase.filter(article => article.category === filter);

        container.innerHTML = filteredArticles.map(article => `
            <div class="kb-article">
                <div class="kb-article-header">
                    <h4><i class="fas fa-${this.getCategoryIcon(article.category)}"></i> ${article.title}</h4>
                    <span class="kb-category">${this.getCategoryName(article.category)}</span>
                </div>
                <div class="kb-article-content">
                    <p>${article.content}</p>
                    <div class="kb-steps">
                        <strong>Passos para resolução:</strong>
                        <ol>
                            ${article.steps.map(step => `<li>${step}</li>`).join('')}
                        </ol>
                    </div>
                </div>
            </div>
        `).join('');

        // Update category buttons
        document.querySelectorAll('.kb-category').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${filter}"]`).classList.add('active');

        // Add category click handlers
        document.querySelectorAll('.kb-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.renderKnowledgeBase(category);
            });
        });
    }

    // Utility methods
    getCategoryIcon(category) {
        const icons = {
            hardware: 'desktop',
            software: 'code',
            rede: 'wifi',
            email: 'envelope',
            impressora: 'print',
            sistema: 'cog',
            acesso: 'key'
        };
        return icons[category] || 'question';
    }

    getCategoryName(category) {
        const names = {
            hardware: 'Hardware',
            software: 'Software',
            rede: 'Rede',
            email: 'Email',
            impressora: 'Impressora',
            sistema: 'Sistema',
            acesso: 'Acesso'
        };
        return names[category] || category;
    }

    getPriorityName(priority) {
        const names = {
            baixa: 'Baixa',
            media: 'Média',
            alta: 'Alta',
            critica: 'Crítica'
        };
        return names[priority] || priority;
    }

    getStatusName(status) {
        const names = {
            aberto: 'Aberto',
            andamento: 'Em Andamento',
            resolvido: 'Resolvido',
            fechado: 'Fechado'
        };
        return names[status] || status;
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-BR');
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('pt-BR');
    }
}

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Global functions
window.refreshData = () => app.refreshData();
window.applyFilters = () => app.applyFilters();
window.clearFilters = () => app.clearFilters();
window.closeModal = () => app.closeModal();

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new HelpDeskApp();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    console.log('👋 Help Desk App finalizando...');
});