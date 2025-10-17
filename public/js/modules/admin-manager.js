// public/js/modules/admin-manager.js - Gerenciador do Admin Panel CORRIGIDO
class AdminManager {
    constructor() {
        this.users = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.currentFilters = {};
        this.selectedUsers = new Set();
        this.isLoading = false;
        
        this.init();
    }
    // Função helper no admin-manager.js:
getAuthHeaders() {
    if (window.authManager && typeof window.authManager.getAuthHeaders === 'function') {
        return window.authManager.getAuthHeaders();
    }
    
    // Fallback para localStorage
    const token = localStorage.getItem('helpdesk_access_token');
    return token ? {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    } : { 'Content-Type': 'application/json' };
}

    init() {
    console.log('🔧 Inicializando Admin Panel...');
    
    // Verificar se estamos na seção admin
    const adminSection = document.getElementById('admin-panel-section');
    if (!adminSection) {
        console.log('📄 Admin panel não está ativo, carregando dados em background');
    }
    
    this.setupEventListeners();
    this.loadAdminStats();
    this.loadUsers();
}
    setupEventListeners() {
        // Botões principais
        document.getElementById('create-user-btn')?.addEventListener('click', () => this.showCreateUserModal());
        document.getElementById('bulk-actions-btn')?.addEventListener('click', () => this.showBulkActionsModal());
        document.getElementById('export-users-btn')?.addEventListener('click', () => this.exportUsers());

        // Busca
        document.getElementById('admin-search-btn')?.addEventListener('click', () => this.handleSearch());
        document.getElementById('admin-search')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Filtros
        document.getElementById('apply-admin-filters')?.addEventListener('click', () => this.applyFilters());
        document.getElementById('clear-admin-filters')?.addEventListener('click', () => this.clearFilters());

        // Select all checkbox
        document.getElementById('select-all-users')?.addEventListener('change', (e) => {
            this.handleSelectAll(e.target.checked);
        });

        // Modais
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        // User Modal
        document.getElementById('close-user-modal')?.addEventListener('click', () => this.hideUserModal());
        document.getElementById('cancel-user-btn')?.addEventListener('click', () => this.hideUserModal());
        document.getElementById('user-form')?.addEventListener('submit', (e) => this.handleUserSubmit(e));

        // User Details Modal
        document.getElementById('close-user-details-modal')?.addEventListener('click', () => this.hideUserDetailsModal());
        document.getElementById('close-details-btn')?.addEventListener('click', () => this.hideUserDetailsModal());
        document.getElementById('edit-user-btn')?.addEventListener('click', () => this.editUserFromDetails());
        document.getElementById('reset-password-btn')?.addEventListener('click', () => this.showResetPasswordModal());
        document.getElementById('unlock-user-btn')?.addEventListener('click', () => this.unlockUserFromDetails());

        // Bulk Actions Modal
        document.getElementById('close-bulk-modal')?.addEventListener('click', () => this.hideBulkActionsModal());
        document.getElementById('cancel-bulk-btn')?.addEventListener('click', () => this.hideBulkActionsModal());
        document.getElementById('bulk-action-select')?.addEventListener('change', (e) => this.handleBulkActionChange(e));
        document.getElementById('execute-bulk-btn')?.addEventListener('click', () => this.executeBulkAction());

        // Reset Password Modal
        document.getElementById('close-reset-modal')?.addEventListener('click', () => this.hideResetPasswordModal());
        document.getElementById('cancel-reset-btn')?.addEventListener('click', () => this.hideResetPasswordModal());
        document.getElementById('reset-password-form')?.addEventListener('submit', (e) => this.handlePasswordReset(e));
        document.getElementById('confirm-password')?.addEventListener('input', () => this.validatePasswordMatch());
    }

   // admin-manager.js - CORRIGIDO para ser compatível com o backend

async loadAdminStats() {
    try {
        const response = await fetch('/api/admin/stats', {
            headers: this.getAuthHeaders()
        });

        if (!response.ok) throw new Error('Erro ao carregar estatísticas');

        const result = await response.json();
        
        // CORRIGIDO: O backend retorna { success: true, stats: {...} }
        if (result.success && result.stats) {
            this.updateStatsDisplay(result.stats);
            console.log('📊 Estatísticas carregadas:', result.stats);
        } else {
            throw new Error('Formato de resposta inválido');
        }

    } catch (error) {
        console.error('❌ Erro ao carregar stats:', error);
        this.showNotification('Erro ao carregar estatísticas', 'error');
    }
}

updateStatsDisplay(stats) {
    try {
        // CORRIGIDO: Ajustando para a estrutura real do backend
        if (!stats || !stats.users || !stats.tickets) {
            console.warn('⚠️ Dados de estatísticas incompletos:', stats);
            return;
        }

        // Função helper para atualizar elemento se existir
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            } else {
                console.log(`📄 Elemento ${id} não encontrado no DOM (normal se admin panel não estiver ativo)`);
            }
        };

        // CORRIGIDO: Usando os nomes corretos do backend
        updateElement('total-users-count', stats.users.total_users || 0);
        updateElement('active-users-count', `${stats.users.active_users || 0} ativos`);
        updateElement('admin-users-count', stats.users.admin_users || 0);
        updateElement('tech-users-count', `${stats.users.technician_users || 0} técnicos`);
        updateElement('locked-users-count', stats.users.locked_users || 0);
        updateElement('inactive-users-count', `${stats.users.inactive_users || 0} inativas`);

        // Tickets stats
        updateElement('total-tickets-count', stats.tickets.total_tickets || 0);
        updateElement('open-tickets-count', stats.tickets.open_tickets || 0);

        // Activity stats
        updateElement('recent-logins-count', stats.activity?.active_logins_today || 0); 
        updateElement('new-users-count', stats.activity?.new_users_today || 0);

        console.log('✅ Stats display atualizado com sucesso');

    } catch (error) {
        console.error('❌ Erro ao atualizar display de stats:', error);
    }
}

async loadUsers(page = 1) {
    console.log('🔍 Auth headers:', window.authManager?.getAuthHeaders());
    console.log('🔍 User data:', window.authManager?.user);
    console.log('🔍 Window authManager exists:', !!window.authManager);
    

    if (this.isLoading) return;

    this.isLoading = true;
    this.showLoadingState();

    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '10',
            ...this.currentFilters
        });

        const response = await fetch(`/api/admin/users?${params}`, {
            headers: window.authManager?.getAuthHeaders() || {}
        });

        if (!response.ok) throw new Error('Erro ao carregar usuários');

        const result = await response.json();
        
        // CORRIGIDO: O backend retorna { success: true, users: [...], pagination: {...} }
        if (result.success && result.users) {
            this.users = result.users; // Array de usuários
            this.currentPage = result.pagination?.currentPage || page;
            this.totalPages = result.pagination?.totalPages || 1;

            this.renderUsersTable();
            this.renderPagination(result.pagination);
            this.updateBulkActionsButton();

            console.log(`📋 ${this.users.length} usuários carregados`);
        } else {
            throw new Error('Formato de resposta inválido');
        }

    } catch (error) {
        console.error('❌ Erro ao carregar usuários:', error);
        this.showNotification('Erro ao carregar usuários', 'error');
    } finally {
        this.isLoading = false;
        this.hideLoadingState();
    }
}

renderUsersTable() {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) {
        console.log('📄 Tabela de usuários não encontrada (normal se admin panel não estiver ativo)');
        return;
    }

    tbody.innerHTML = '';

    if (!Array.isArray(this.users) || this.users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="no-data">
                    <i class="fas fa-users-slash"></i>
                    <p>Nenhum usuário encontrado</p>
                </td>
            </tr>
        `;
        return;
    }

    this.users.forEach(user => {
        const row = this.createSimpleUserRow(user);
        tbody.appendChild(row);
    });

    console.log(`✅ Tabela de usuários renderizada: ${this.users.length} usuários`);
}


createSimpleUserRow(user) {
    const row = document.createElement('tr');
    row.dataset.userId = user.id;
    
    const statusClass = user.active ? 'status-active' : 'status-inactive';
    const statusText = user.active ? 'Ativo' : 'Inativo';
    const roleClass = `role-${user.role}`;

    row.innerHTML = `
        <td>
            <input type="checkbox" class="user-checkbox" value="${user.id}"
                   ${this.selectedUsers.has(user.id) ? 'checked' : ''}>
        </td>
        <td>
            <div class="user-cell">
                <strong>${this.escapeHtml(user.name)}</strong>
            </div>
        </td>
        <td>${this.escapeHtml(user.email)}</td>
        <td><span class="role-badge ${roleClass}">${user.role}</span></td>
        <td>${this.escapeHtml(user.department || 'N/A')}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>${user.last_login || 'Nunca'}</td>
        <td>${user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}</td>
        <td>
            <div class="action-buttons">
                <button class="btn-action btn-view" onclick="adminManager.viewUser('${user.id}')" 
                        title="Ver Detalhes">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-action btn-edit" onclick="adminManager.editUser('${user.id}')" 
                        title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                ${user.active ? 
                    `<button class="btn-action btn-deactivate" onclick="adminManager.toggleUserStatus('${user.id}', false)" 
                             title="Desativar">
                        <i class="fas fa-user-times"></i>
                     </button>` :
                    `<button class="btn-action btn-activate" onclick="adminManager.toggleUserStatus('${user.id}', true)" 
                             title="Ativar">
                        <i class="fas fa-user-check"></i>
                     </button>`
                }
            </div>
        </td>
    `;

    // Event listener for checkbox
    const checkbox = row.querySelector('.user-checkbox');
    checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            this.selectedUsers.add(user.id);
        } else {
            this.selectedUsers.delete(user.id);
        }
        this.updateSelectAllCheckbox();
        this.updateBulkActionsButton();
    });

    return row;
}

    renderPagination(pagination) {
        const container = document.getElementById('admin-pagination');
        if (!container) return;

        if (pagination.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination-controls">';
        
        // Previous button
        if (pagination.hasPrev) {
            paginationHTML += `<button class="btn-page" onclick="adminManager.loadUsers(${pagination.currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Anterior
            </button>`;
        }

        // Page numbers
        const startPage = Math.max(1, pagination.currentPage - 2);
        const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `<button class="btn-page" onclick="adminManager.loadUsers(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += '<span class="page-ellipsis">...</span>';
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === pagination.currentPage ? 'active' : '';
            paginationHTML += `<button class="btn-page ${activeClass}" onclick="adminManager.loadUsers(${i})">${i}</button>`;
        }

        if (endPage < pagination.totalPages) {
            if (endPage < pagination.totalPages - 1) {
                paginationHTML += '<span class="page-ellipsis">...</span>';
            }
            paginationHTML += `<button class="btn-page" onclick="adminManager.loadUsers(${pagination.totalPages})">${pagination.totalPages}</button>`;
        }

        // Next button
        if (pagination.hasNext) {
            paginationHTML += `<button class="btn-page" onclick="adminManager.loadUsers(${pagination.currentPage + 1})">
                Próximo <i class="fas fa-chevron-right"></i>
            </button>`;
        }

        paginationHTML += '</div>';
        
        paginationHTML += `
            <div class="pagination-info">
                Mostrando usuários ${((pagination.currentPage - 1) * 10) + 1} a ${Math.min(pagination.currentPage * 10, pagination.totalUsers)} 
                de ${pagination.totalUsers} total
            </div>
        `;

        container.innerHTML = paginationHTML;
    }

    handleSearch() {
        const searchTerm = document.getElementById('admin-search')?.value?.trim();
        this.currentFilters.search = searchTerm || '';
        this.currentPage = 1;
        this.loadUsers();
    }

    applyFilters() {
        this.currentFilters = {
            role: document.getElementById('admin-filter-role')?.value || '',
            status: document.getElementById('admin-filter-status')?.value || '',
            department: document.getElementById('admin-filter-department')?.value || '',
            search: document.getElementById('admin-search')?.value?.trim() || ''
        };
        this.currentPage = 1;
        this.loadUsers();
    }

    clearFilters() {
        this.currentFilters = {};
        document.getElementById('admin-filter-role').value = '';
        document.getElementById('admin-filter-status').value = '';
        document.getElementById('admin-filter-department').value = '';
        document.getElementById('admin-search').value = '';
        this.currentPage = 1;
        this.loadUsers();
    }

    handleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            if (checked) {
                this.selectedUsers.add(checkbox.value);
            } else {
                this.selectedUsers.delete(checkbox.value);
            }
        });
        this.updateBulkActionsButton();
    }

    updateSelectAllCheckbox() {
        const totalCheckboxes = document.querySelectorAll('.user-checkbox').length;
        const checkedCheckboxes = document.querySelectorAll('.user-checkbox:checked').length;
        const selectAllCheckbox = document.getElementById('select-all-users');
        
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = totalCheckboxes > 0 && checkedCheckboxes === totalCheckboxes;
            selectAllCheckbox.indeterminate = checkedCheckboxes > 0 && checkedCheckboxes < totalCheckboxes;
        }
    }

    updateBulkActionsButton() {
        const bulkBtn = document.getElementById('bulk-actions-btn');
        if (bulkBtn) {
            bulkBtn.disabled = this.selectedUsers.size === 0;
        }
    }

    // Modal Methods
    showCreateUserModal() {
        document.getElementById('user-modal-title').textContent = 'Criar Novo Usuário';
        document.getElementById('user-id').value = '';
        document.getElementById('user-form').reset();
        document.getElementById('password-row').style.display = 'flex';
        document.getElementById('user-password').required = true;
        document.getElementById('user-modal').style.display = 'flex';
    }

    hideUserModal() {
        document.getElementById('user-modal').style.display = 'none';
    }

    async viewUser(userId) {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                headers: window.authManager?.getAuthHeaders() || {}
            });

            if (!response.ok) throw new Error('Erro ao carregar usuário');

            const data = await response.json();
            this.populateUserDetailsModal(data.user);
            document.getElementById('user-details-modal').style.display = 'flex';

        } catch (error) {
            console.error('❌ Erro ao carregar usuário:', error);
            this.showNotification('Erro ao carregar detalhes do usuário', 'error');
        }
    }

    populateUserDetailsModal(user) {
        document.getElementById('user-details-title').textContent = `Detalhes - ${user.name}`;
        document.getElementById('detail-user-name').textContent = user.name;
        document.getElementById('detail-user-email').textContent = user.email;
        document.getElementById('detail-user-role').textContent = user.role_display;
        document.getElementById('detail-user-department').textContent = user.department || 'N/A';
        document.getElementById('detail-user-status').textContent = user.active_display;
        document.getElementById('detail-user-created').textContent = user.created_at_formatted;
        document.getElementById('detail-user-last-login').textContent = user.last_login_formatted || 'Nunca';

        // Stats
        if (user.detailed_stats) {
            document.getElementById('detail-tickets-assigned').textContent = user.detailed_stats.tickets_assigned || 0;
            document.getElementById('detail-tickets-created').textContent = user.detailed_stats.tickets_created || 0;
            document.getElementById('detail-tickets-resolved').textContent = user.detailed_stats.tickets_resolved || 0;
            document.getElementById('detail-efficiency').textContent = user.detailed_stats.efficiency + '%' || '0%';
        }

        // Security
        document.getElementById('detail-login-attempts').textContent = user.security?.login_attempts || 0;
        const lockStatus = document.getElementById('detail-lock-status');
        const unlockBtn = document.getElementById('unlock-user-btn');
        
        if (user.security?.is_locked) {
            lockStatus.textContent = 'Bloqueado';
            lockStatus.className = 'lock-status locked';
            unlockBtn.style.display = 'inline-block';
        } else {
            lockStatus.textContent = 'Desbloqueado';
            lockStatus.className = 'lock-status unlocked';
            unlockBtn.style.display = 'none';
        }

        // Store user ID for actions
        document.getElementById('edit-user-btn').dataset.userId = user.id;
        document.getElementById('reset-password-btn').dataset.userId = user.id;
        document.getElementById('unlock-user-btn').dataset.userId = user.id;
    }

    hideUserDetailsModal() {
        document.getElementById('user-details-modal').style.display = 'none';
    }

    async editUser(userId) {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                headers: window.authManager?.getAuthHeaders() || {}
            });

            if (!response.ok) throw new Error('Erro ao carregar usuário');

            const data = await response.json();
            const user = data.user;

            // Populate form
            document.getElementById('user-modal-title').textContent = 'Editar Usuário';
            document.getElementById('user-id').value = user.id;
            document.getElementById('user-name').value = user.name;
            document.getElementById('user-email').value = user.email;
            document.getElementById('user-role').value = user.role;
            document.getElementById('user-department').value = user.department || '';
            document.getElementById('user-active').value = user.active ? 'true' : 'false';
            
            // Hide password field for editing
            document.getElementById('password-row').style.display = 'none';
            document.getElementById('user-password').required = false;

            document.getElementById('user-modal').style.display = 'flex';

        } catch (error) {
            console.error('❌ Erro ao carregar usuário para edição:', error);
            this.showNotification('Erro ao carregar usuário', 'error');
        }
    }

    editUserFromDetails() {
        const userId = document.getElementById('edit-user-btn').dataset.userId;
        this.hideUserDetailsModal();
        this.editUser(userId);
    }

    async handleUserSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = {
            name: formData.get('name'),
            email: formData.get('email'),
            role: formData.get('role'),
            department: formData.get('department'),
            active: formData.get('active') === 'true'
        };

        const userId = document.getElementById('user-id').value;
        const isEdit = !!userId;

        if (!isEdit) {
            userData.password = formData.get('password');
        }

        try {
            const url = isEdit ? `/api/admin/users/${userId}` : '/api/admin/users';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: window.authManager?.getAuthHeaders() || { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao salvar usuário');
            }

            const result = await response.json();
            this.showNotification(result.message, 'success');
            this.hideUserModal();
            this.loadUsers(this.currentPage);
            this.loadAdminStats();

        } catch (error) {
            console.error('❌ Erro ao salvar usuário:', error);
            this.showNotification(error.message, 'error');
        }
    }

    async toggleUserStatus(userId, active) {
        const action = active ? 'ativar' : 'desativar';
        
        if (!confirm(`Tem certeza que deseja ${action} este usuário?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: window.authManager?.getAuthHeaders() || { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active })
            });

            if (!response.ok) throw new Error(`Erro ao ${action} usuário`);

            const result = await response.json();
            this.showNotification(result.message, 'success');
            this.loadUsers(this.currentPage);
            this.loadAdminStats();

        } catch (error) {
            console.error(`❌ Erro ao ${action} usuário:`, error);
            this.showNotification(error.message, 'error');
        }
    }

    // Utility Methods
    showLoadingState() {
        const tbody = document.getElementById('admin-users-tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Carregando usuários...</p>
                    </td>
                </tr>
            `;
        }
    }

    hideLoadingState() {
        // Loading state will be replaced by actual data
    }

    showNotification(message, type = 'info') {
        if (window.authManager && typeof window.authManager.showToast === 'function') {
            window.authManager.showToast(message, type);
        } else {
            // Fallback notification
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(message);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Refresh method for external calls
    refresh() {
        this.loadAdminStats();
        this.loadUsers(this.currentPage);
    }

    // Placeholder methods for missing functionality
    showBulkActionsModal() {
        this.showNotification('Funcionalidade de ações em lote em desenvolvimento', 'info');
    }

    exportUsers() {
        this.showNotification('Funcionalidade de exportação em desenvolvimento', 'info');
    }

    showResetPasswordModal() {
        this.showNotification('Funcionalidade de reset de senha em desenvolvimento', 'info');
    }

    hideBulkActionsModal() {
        // Implementation when modal is created
    }

    hideResetPasswordModal() {
        // Implementation when modal is created
    }

    handleBulkActionChange() {
        // Implementation when modal is created
    }

    executeBulkAction() {
        // Implementation when modal is created
    }

    handlePasswordReset() {
        // Implementation when modal is created
    }

    validatePasswordMatch() {
        // Implementation when modal is created
    }

    unlockUserFromDetails() {
        this.showNotification('Funcionalidade de desbloqueio em desenvolvimento', 'info');
    }
}

// Initialize Admin Manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're in admin panel
    if (document.getElementById('admin-panel-section')) {
        window.adminManager = new AdminManager();
        console.log('✅ Admin Manager inicializado');
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminManager;
}