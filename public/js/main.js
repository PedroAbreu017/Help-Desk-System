// main.js - Arquivo principal COMPATÍVEL com sistema modular + Chart.js + ReportsManager + Admin Panel
class HelpDeskApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.tickets = [];
        this.users = [];
        this.stats = {};
        this.charts = {}; // Armazenar instâncias Chart.js
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
        
        // Initialize ReportsManager if available
        this.initializeReportsManager();
        
        // NOVO: Setup admin panel integration
        this.setupAdminIntegration();
        
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

        // Filters - verificar se existem antes de adicionar eventos
        const filterStatus = document.getElementById('filter-status');
        const filterPriority = document.getElementById('filter-priority');
        const filterCategory = document.getElementById('filter-category');
        
        if (filterStatus) filterStatus.addEventListener('change', () => this.applyFilters());
        if (filterPriority) filterPriority.addEventListener('change', () => this.applyFilters());
        if (filterCategory) filterCategory.addEventListener('change', () => this.applyFilters());

        // Modal close
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('ticket-modal');
            if (modal && e.target === modal) {
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
        const activeNav = document.querySelector(`[data-section="${this.currentSection}"]`);
        if (activeNav) activeNav.classList.add('active');
    }

    // NOVO: Setup admin panel integration
    setupAdminIntegration() {
        // Aguardar um pouco para auth manager estar pronto
        setTimeout(() => {
            this.updateUIForUserRole();
            
            // Escutar mudanças no usuário
            document.addEventListener('user-changed', () => {
                this.updateUIForUserRole();
            });
            
            // Escutar quando sistema modular estiver pronto
            document.addEventListener('modularSystemReady', () => {
                this.updateUIForUserRole();
            });
            
        }, 1000);
    }

    // NOVO: Atualizar UI baseada no role do usuário
    updateUIForUserRole() {
        const user = window.authManager?.getCurrentUser();
        console.log('🔐 Atualizando UI para role:', user?.role);
        
        const adminOnlyElements = document.querySelectorAll('.admin-only');
        const userInfo = document.querySelector('.user-details, .user-info');
        
        if (user && user.role === 'admin') {
            // Mostrar elementos admin
            adminOnlyElements.forEach(el => {
                el.style.display = 'block';
                el.classList.add('admin-visible');
            });
            
            // Atualizar info do usuário
            this.updateUserDisplay(user, 'Administrador');
            
            console.log('✅ Elementos admin habilitados');
            
            // Mostrar notificação de acesso admin (apenas uma vez)
            if (!sessionStorage.getItem('admin-welcome-shown')) {
                setTimeout(() => {
                    this.showNotification('Acesso administrativo habilitado', 'success');
                    sessionStorage.setItem('admin-welcome-shown', 'true');
                }, 1500);
            }
            
        } else {
            // Ocultar elementos admin
            adminOnlyElements.forEach(el => {
                el.style.display = 'none';
                el.classList.remove('admin-visible');
            });
            
            // Atualizar info do usuário
            if (user) {
                const roleDisplay = {
                    'technician': 'Técnico',
                    'user': 'Usuário'
                };
                this.updateUserDisplay(user, roleDisplay[user.role] || 'Usuário');
            }
            
            // Se estiver na seção admin, voltar para dashboard
            if (this.currentSection === 'admin-panel') {
                this.showSection('dashboard');
            }
            
            console.log('🚫 Elementos admin ocultos');
        }
        
        // Salvar usuário atual globalmente
        window.currentUser = user;
    }

    // NOVO: Atualizar display do usuário na sidebar/header
    updateUserDisplay(user, roleDisplay) {
        const userNameElements = document.querySelectorAll('.user-name, .user-info span');
        const userRoleElements = document.querySelectorAll('.user-role');
        
        userNameElements.forEach(el => {
            if (el) el.textContent = user.name || 'Usuário';
        });
        
        userRoleElements.forEach(el => {
            if (el) {
                el.textContent = roleDisplay;
                // Adicionar classe baseada no role
                el.className = `user-role role-${user.role}`;
            }
        });
        
        // Criar elemento de role se não existir
        if (userRoleElements.length === 0) {
            const userInfo = document.querySelector('.user-details, .user-info');
            if (userInfo && !userInfo.querySelector('.user-role')) {
                const roleSpan = document.createElement('span');
                roleSpan.className = `user-role role-${user.role}`;
                roleSpan.textContent = roleDisplay;
                roleSpan.style.cssText = 'font-size: 0.8em; opacity: 0.8; display: block;';
                userInfo.appendChild(roleSpan);
            }
        }
    }

    async loadInitialData() {
        try {
            this.showLoading();
            
            // Load dashboard data
            await this.loadDashboardData();
            
            // Load tickets - deixar módulo fazer isso se existir
            if (!window.modularManager?.modules.tickets) {
                await this.loadTickets();
            }
            
            // Load users
            await this.loadUsers();
            
            // Initialize knowledge base
            this.initializeKnowledgeBase();
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados iniciais:', error);
            this.showToast('Erro ao carregar dados do sistema', 'error');
        }
    }

    // NOVO: Inicializar ReportsManager se disponível
    initializeReportsManager() {
        // Aguardar um pouco para scripts carregarem
        setTimeout(() => {
            if (typeof ReportsManager !== 'undefined' && !window.reportsManager) {
                try {
                    window.reportsManager = new ReportsManager();
                    console.log('📊 ReportsManager inicializado pelo HelpDeskApp');
                } catch (error) {
                    console.error('❌ Erro ao inicializar ReportsManager:', error);
                }
            }
        }, 1000);
    }

    async loadDashboardData() {
        try {
            const response = await fetch(`${API_BASE_URL}/dashboard`, {
                headers: window.authManager?.getAuthHeaders() || {}
            });
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
        // Se módulo de tickets existe, deixar ele controlar
        if (window.modularManager?.modules.tickets) {
            console.log('🔧 Módulo de tickets detectado - delegando controle');
            return;
        }

        try {
            const queryParams = new URLSearchParams(filters).toString();
            const url = `${API_BASE_URL}/tickets${queryParams ? '?' + queryParams : ''}`;
            
            const response = await fetch(url, {
                headers: window.authManager?.getAuthHeaders() || {}
            });
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
            const response = await fetch(`${API_BASE_URL}/users`, {
                headers: window.authManager?.getAuthHeaders() || {}
            });
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
        
        // Update stat cards - verificar se existem
        const totalTickets = document.getElementById('total-tickets');
        const openTickets = document.getElementById('open-tickets');
        const progressTickets = document.getElementById('progress-tickets');
        const resolvedTickets = document.getElementById('resolved-tickets');

        if (totalTickets) totalTickets.textContent = stats.total_tickets || 0;
        if (openTickets) openTickets.textContent = (parseInt(stats.tickets_abertos) || 0) + (parseInt(stats.tickets_andamento) || 0);
        if (progressTickets) progressTickets.textContent = stats.tickets_andamento || 0;
        if (resolvedTickets) resolvedTickets.textContent = stats.tickets_resolvidos || 0;

        // Criar gráficos Chart.js
        this.createCategoryChart(stats.por_categoria);
        this.createPriorityChart(stats.por_prioridade);
        this.createStatusChart(stats);
        this.createTimelineChart(data.trends?.tickets_per_day);

        // Update recent tickets
        this.updateRecentTickets(data.recent_tickets);
        
        // Update metrics adicionais
        this.updateMetrics(stats);
    }

    // Criar gráfico de categorias com Chart.js
    createCategoryChart(categoryData) {
        const canvas = document.getElementById('categoryChartCanvas');
        if (!canvas || !categoryData) return;

        // Destruir chart existente se houver
        if (this.charts.category) {
            this.charts.category.destroy();
        }

        const ctx = canvas.getContext('2d');
        this.charts.category = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(categoryData).map(this.getCategoryName.bind(this)),
                datasets: [{
                    data: Object.values(categoryData),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                        '#9966FF', '#FF9F40', '#FF6384'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    // Criar gráfico de prioridades com Chart.js
    createPriorityChart(priorityData) {
        const canvas = document.getElementById('priorityChartCanvas');
        if (!canvas || !priorityData) return;

        // Destruir chart existente se houver
        if (this.charts.priority) {
            this.charts.priority.destroy();
        }

        const ctx = canvas.getContext('2d');
        this.charts.priority = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(priorityData).map(this.getPriorityName.bind(this)),
                datasets: [{
                    label: 'Quantidade',
                    data: Object.values(priorityData),
                    backgroundColor: [
                        '#dc3545', // crítica - vermelho
                        '#fd7e14', // alta - laranja
                        '#ffc107', // média - amarelo
                        '#28a745'  // baixa - verde
                    ],
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // Criar gráfico de status
    createStatusChart(stats) {
        const canvas = document.getElementById('statusChartCanvas');
        if (!canvas) return;

        // Destruir chart existente se houver
        if (this.charts.status) {
            this.charts.status.destroy();
        }

        const statusData = {
            'Aberto': parseInt(stats.tickets_abertos) || 0,
            'Em Andamento': parseInt(stats.tickets_andamento) || 0,
            'Resolvido': parseInt(stats.tickets_resolvidos) || 0,
            'Fechado': parseInt(stats.tickets_fechados) || 0
        };

        const ctx = canvas.getContext('2d');
        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData),
                    backgroundColor: ['#17a2b8', '#ffc107', '#28a745', '#6c757d'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '50%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    // Criar gráfico timeline
    createTimelineChart(timelineData) {
        const canvas = document.getElementById('timelineChartCanvas');
        if (!canvas || !timelineData) return;

        // Destruir chart existente se houver
        if (this.charts.timeline) {
            this.charts.timeline.destroy();
        }

        const labels = Object.keys(timelineData);
        const data = Object.values(timelineData);

        const ctx = canvas.getContext('2d');
        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tickets Criados',
                    data: data,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#007bff',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // Atualizar métricas adicionais
    updateMetrics(stats) {
        const avgTime = document.getElementById('avg-resolution-time');
        const todayTickets = document.getElementById('today-tickets');
        
        if (avgTime) avgTime.textContent = '2.5h'; // Pode vir da API futuramente
        if (todayTickets) todayTickets.textContent = stats.total_tickets || 0;
    }

    updateRecentTickets(tickets) {
        const container = document.getElementById('recent-tickets');
        if (!container) return;

        if (!tickets || tickets.length === 0) {
            container.innerHTML = '<p class="no-tickets">Nenhum ticket recente</p>';
            return;
        }

        container.innerHTML = tickets.map(ticket => `
            <div class="recent-ticket-item" onclick="app.showTicketDetails('${ticket.id}')">
                <div class="ticket-info">
                    <h4>#${ticket.id.substring(0, 8)} - ${ticket.title}</h4>
                    <p><i class="fas fa-user"></i> ${ticket.user_name} - ${ticket.department || 'N/A'}</p>
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
        if (!tbody) {
            console.log('🔧 Elemento tickets-tbody não encontrado - módulo deve controlar tabela');
            return;
        }

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
        if (!badge) return;

        const openTickets = this.tickets.filter(t => ['aberto', 'andamento'].includes(t.status)).length;
        badge.textContent = openTickets;
        badge.style.display = openTickets > 0 ? 'inline' : 'none';
    }

    // MODIFICADO: Adicionar verificação de acesso admin
    showSection(sectionName) {
        // NOVO: Verificar acesso admin
        if (sectionName === 'admin-panel') {
            const currentUser = window.currentUser || (window.authManager && window.authManager.getCurrentUser());
            if (!currentUser || currentUser.role !== 'admin') {
                this.showNotification('Acesso negado: apenas administradores', 'error');
                return;
            }
        }

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        const targetNav = document.querySelector(`[data-section="${sectionName}"]`);

        if (targetSection) targetSection.classList.add('active');
        if (targetNav) targetNav.classList.add('active');

        this.currentSection = sectionName;

        // Load section-specific data
        if (sectionName === 'dashboard') {
            this.refreshDashboard();
        } else if (sectionName === 'tickets') {
            // Só carregar se módulo não estiver presente
            if (!window.modularManager?.modules.tickets) {
                this.loadTickets();
            }
        } else if (sectionName === 'reports') {
            this.loadReports();
        } else if (sectionName === 'admin-panel') {
            // NOVO: Refresh admin stats se necessário
            if (window.adminManager && typeof window.adminManager.refresh === 'function') {
                setTimeout(() => window.adminManager.refresh(), 500);
            }
        }
    }

    // Safe methods - verificam se elementos existem
    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'flex';
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }

    closeModal() {
        const modal = document.getElementById('ticket-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // MODIFICADO: Usar showNotification em vez de showToast para consistência
    showNotification(message, type = 'info') {
        // Usar o método do authManager se disponível
        if (window.authManager && window.authManager.showToast) {
            window.authManager.showToast(message, type);
            return;
        }

        // Fallback para console se não tiver sistema de notificação
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    showToast(message, type = 'info') {
        // Alias para showNotification para compatibilidade
        this.showNotification(message, type);
    }

    renderKnowledgeBase(filter = 'all') {
        const container = document.getElementById('kb-articles');
        if (!container) return;

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
        const activeCategory = document.querySelector(`[data-category="${filter}"]`);
        if (activeCategory) activeCategory.classList.add('active');
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
                headers: window.authManager?.getAuthHeaders() || { 'Content-Type': 'application/json' },
                body: JSON.stringify(ticketData)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Ticket criado com sucesso!', 'success');
                e.target.reset();
                await this.loadTickets();
                await this.loadDashboardData();
                this.showSection('tickets');
            } else {
                throw new Error(result.message || 'Erro ao criar ticket');
            }

        } catch (error) {
            console.error('❌ Erro ao criar ticket:', error);
            this.showNotification('Erro ao criar ticket: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
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

    initializeKnowledgeBase() {
        this.knowledgeBase = [];
    }

    async refreshDashboard() {
        await this.loadDashboardData();
    }

    applyFilters() {
        // Implementar se filtros existirem
    }

    clearFilters() {
        // Implementar se filtros existirem  
    }

    async loadReports() {
        
    }
}

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Global functions
window.refreshData = () => app.refreshData();

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new HelpDeskApp();
});

window.addEventListener('beforeunload', () => {
    console.log('👋 Help Desk App finalizando...');
});

// Funções globais para botões de refresh dos gráficos
window.refreshCategoryChart = () => {
    if (window.app) window.app.refreshDashboard();
};

window.refreshPriorityChart = () => {
    if (window.app) window.app.refreshDashboard();
};

window.refreshStatusChart = () => {
    if (window.app) window.app.refreshDashboard();
};

window.refreshTimelineChart = () => {
    if (window.app) window.app.refreshDashboard();
};

// NOVO: Função global para logout
window.logout = () => {
    if (window.authManager && confirm('Deseja realmente sair do sistema?')) {
        window.authManager.logout();
    }
};

console.log('📦 Main.js com ReportsManager e Admin Panel Integration carregado!');