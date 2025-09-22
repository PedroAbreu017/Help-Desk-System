// public/js/auth.js - Frontend de Autenticação CORRIGIDO
class AuthManager {
    constructor() {
        this.accessToken = localStorage.getItem('helpdesk_access_token');
        this.refreshToken = localStorage.getItem('helpdesk_refresh_token');
        this.user = JSON.parse(localStorage.getItem('helpdesk_user') || 'null');
        this.loginModalVisible = false;
        this.isRefreshing = false; // NOVO: Flag para evitar múltiplos refreshes
        
        this.init();
    }

    init() {
        // Verificar se usuário está logado
        if (this.accessToken) {
            this.verifyToken();
        } else {
            this.showLoginModal();
        }

        // Interceptar requisições para adicionar token
        this.setupRequestInterceptor();
        
        // Setup de refresh automático
        this.setupTokenRefresh();
    }

    async verifyToken() {
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.user = data.data.user;
                this.updateUserInfo();
                this.hideLoginModal();
            } else {
                throw new Error('Token inválido');
            }
        } catch (error) {
            console.log('Token inválido, tentando refresh...');
            await this.refreshTokens();
        }
    }

    async refreshTokens() {
        if (!this.refreshToken || this.isRefreshing) {
            if (!this.refreshToken) this.logout();
            return;
        }

        try {
            this.isRefreshing = true;
            
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh_token: this.refreshToken
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.accessToken = data.data.access_token;
                localStorage.setItem('helpdesk_access_token', this.accessToken);
                console.log('✅ Token renovado com sucesso');
            } else {
                throw new Error('Refresh token inválido');
            }
        } catch (error) {
            console.error('Erro ao renovar token:', error);
            this.logout();
        } finally {
            this.isRefreshing = false;
        }
    }

    async login(email, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.accessToken = data.data.tokens.access_token;
                this.refreshToken = data.data.tokens.refresh_token;
                this.user = data.data.user;

                // Salvar no localStorage
                localStorage.setItem('helpdesk_access_token', this.accessToken);
                localStorage.setItem('helpdesk_refresh_token', this.refreshToken);
                localStorage.setItem('helpdesk_user', JSON.stringify(this.user));

                this.updateUserInfo();
                this.hideLoginModal();
                this.showToast('Login realizado com sucesso!', 'success');
                
                // Refresh da página para carregar dados
                window.location.reload();
                
                return true;
            } else {
                throw new Error(data.message || 'Erro no login');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            this.showToast(error.message || 'Erro ao fazer login', 'error');
            return false;
        }
    }

    async logout() {
        try {
            if (this.accessToken) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Erro no logout:', error);
        } finally {
            // Limpar dados locais
            this.accessToken = null;
            this.refreshToken = null;
            this.user = null;
            this.isRefreshing = false;
            
            localStorage.removeItem('helpdesk_access_token');
            localStorage.removeItem('helpdesk_refresh_token');
            localStorage.removeItem('helpdesk_user');
            
            this.showLoginModal();
            this.showToast('Logout realizado com sucesso', 'info');
        }
    }

    updateUserInfo() {
        if (!this.user) return;

        // Atualizar header com informações do usuário
        const userInfoElement = document.querySelector('.user-info span');
        if (userInfoElement) {
            userInfoElement.textContent = this.user.name;
        }

        // Adicionar indicador de role se necessário
        const roleElement = document.querySelector('.user-role');
        if (roleElement) {
            roleElement.textContent = this.getRoleDisplay(this.user.role);
        } else {
            // Criar elemento de role se não existir
            const userInfo = document.querySelector('.user-info');
            if (userInfo) {
                const roleSpan = document.createElement('span');
                roleSpan.className = 'user-role';
                roleSpan.textContent = this.getRoleDisplay(this.user.role);
                roleSpan.style.fontSize = '0.8em';
                roleSpan.style.opacity = '0.8';
                userInfo.appendChild(roleSpan);
            }
        }
    }

    getRoleDisplay(role) {
        const roles = {
            'admin': 'Administrador',
            'technician': 'Técnico',
            'user': 'Usuário'
        };
        return roles[role] || role;
    }

    showLoginModal() {
        if (this.loginModalVisible) return;
        
        this.loginModalVisible = true;
        
        // Criar modal de login
        const modalHTML = `
            <div id="login-modal" class="auth-modal">
                <div class="auth-modal-content">
                    <div class="auth-header">
                        <i class="fas fa-headset"></i>
                        <h2>Help Desk Pro</h2>
                        <p>Sistema de Suporte Técnico</p>
                    </div>
                    
                    <form id="login-form" class="auth-form">
                        <div class="form-group">
                            <label for="login-email">Usuário:</label>
                            <input type="text" id="login-email" required placeholder="admin">
                        </div>
                        
                        <div class="form-group">
                            <label for="login-password">Senha:</label>
                            <input type="password" id="login-password" required placeholder="Sua senha">
                        </div>
                        
                        <button type="submit" class="btn-login">
                            <i class="fas fa-sign-in-alt"></i> Entrar
                        </button>
                        
                        <div class="auth-info">
                            <p><strong>Usuários padrão:</strong></p>
                            <small>Admin: admin / admin123</small><br>
                            <small>Suporte: suporte01 / suporte123</small><br>
                            <small>Usuário: user01 / user123</small>
                        </div>
                    </form>
                </div>
            </div>
            
            <style>
                .auth-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                }
                
                .auth-modal-content {
                    background: white;
                    padding: 2rem;
                    border-radius: 10px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    max-width: 400px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                }
                
                .auth-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                
                .auth-header i {
                    font-size: 3rem;
                    color: #007bff;
                    margin-bottom: 1rem;
                }
                
                .auth-header h2 {
                    margin: 0 0 0.5rem 0;
                    color: #333;
                }
                
                .auth-header p {
                    margin: 0;
                    color: #666;
                    font-size: 0.9rem;
                }
                
                .auth-form .form-group {
                    margin-bottom: 1.5rem;
                }
                
                .auth-form label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    color: #333;
                }
                
                .auth-form input {
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid #ddd;
                    border-radius: 5px;
                    font-size: 1rem;
                    transition: border-color 0.3s;
                }
                
                .auth-form input:focus {
                    outline: none;
                    border-color: #007bff;
                }
                
                .btn-login {
                    width: 100%;
                    padding: 0.75rem;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: background-color 0.3s;
                    margin-bottom: 1rem;
                }
                
                .btn-login:hover {
                    background: #0056b3;
                }
                
                .btn-login:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }
                
                .auth-info {
                    background: #f8f9fa;
                    padding: 1rem;
                    border-radius: 5px;
                    border-left: 4px solid #007bff;
                    font-size: 0.85rem;
                }
                
                .auth-info p {
                    margin: 0 0 0.5rem 0;
                    font-weight: 500;
                }
                
                .auth-info small {
                    display: block;
                    margin: 0.2rem 0;
                    color: #666;
                }
            </style>
        `;
        
        // Adicionar modal ao body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Setup do formulário
        this.setupLoginForm();
    }

    hideLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.remove();
            this.loginModalVisible = false;
        }
    }

    setupLoginForm() {
        const form = document.getElementById('login-form');
        const submitBtn = form.querySelector('.btn-login');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
            
            const success = await this.login(email, password);
            
            if (!success) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
            }
        });
    }

    setupRequestInterceptor() {
        // Interceptar todas as requisições fetch para adicionar token
        const originalFetch = window.fetch;
        
        window.fetch = async (url, options = {}) => {
            // Adicionar token se for requisição para API
            if (url.startsWith('/api/') && this.accessToken) {
                options.headers = {
                    ...options.headers,
                    'Authorization': `Bearer ${this.accessToken}`
                };
            }
            
            const response = await originalFetch(url, options);
            
            // CORREÇÃO DO BUG: Apenas tentar refresh uma vez e não recursivamente
            if (response.status === 401 && 
                url !== '/api/auth/login' && 
                url !== '/api/auth/refresh' && 
                this.refreshToken && 
                !this.isRefreshing) {
                
                console.log('Token expirado, tentando renovar...');
                
                try {
                    this.isRefreshing = true;
                    
                    // USAR originalFetch para evitar recursão
                    const refreshResponse = await originalFetch('/api/auth/refresh', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refresh_token: this.refreshToken })
                    });
                    
                    if (refreshResponse.ok) {
                        const refreshData = await refreshResponse.json();
                        this.accessToken = refreshData.data.access_token;
                        localStorage.setItem('helpdesk_access_token', this.accessToken);
                        
                        console.log('✅ Token renovado, repetindo requisição original');
                        
                        // Repetir requisição original com novo token
                        options.headers = {
                            ...options.headers,
                            'Authorization': `Bearer ${this.accessToken}`
                        };
                        
                        // USAR originalFetch para evitar loop
                        return originalFetch(url, options);
                    } else {
                        // Refresh falhou, fazer logout
                        console.log('❌ Refresh falhou, fazendo logout');
                        this.logout();
                    }
                } catch (error) {
                    console.error('❌ Erro no refresh:', error);
                    this.logout();
                } finally {
                    this.isRefreshing = false;
                }
            }
            
            return response;
        };
        
        console.log('Request interceptor configurado com sucesso');
    }

    setupTokenRefresh() {
        // Renovar token a cada 20 minutos (antes de expirar)
        setInterval(() => {
            if (this.refreshToken && this.accessToken && !this.isRefreshing) {
                this.refreshTokens();
            }
        }, 20 * 60 * 1000); // 20 minutos
    }

    showToast(message, type = 'info') {
        // Criar toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        // Estilos do toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: this.getToastColor(type),
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '5px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            zIndex: '10001',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            maxWidth: '400px',
            animation: 'slideInRight 0.3s ease-out'
        });
        
        document.body.appendChild(toast);
        
        // Remover após 5 segundos
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
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

    getToastColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        return colors[type] || '#17a2b8';
    }

    // Métodos públicos para uso no sistema
    isAuthenticated() {
        return !!this.accessToken && !!this.user;
    }

    getCurrentUser() {
        return this.user;
    }

    hasRole(role) {
        return this.user && this.user.role === role;
    }

    hasAnyRole(roles) {
        return this.user && roles.includes(this.user.role);
    }

    canManageTickets() {
        return this.hasAnyRole(['admin', 'technician']);
    }

    canViewReports() {
        return this.hasAnyRole(['admin', 'technician']);
    }

    canManageUsers() {
        return this.hasRole('admin');
    }

    getAuthHeaders() {
        return this.accessToken ? {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
        } : {
            'Content-Type': 'application/json'
        };
    }
}

// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Instanciar gerenciador de autenticação global
window.authManager = new AuthManager();

// Adicionar botão de logout no header se não existir
document.addEventListener('DOMContentLoaded', () => {
    if (window.authManager && window.authManager.isAuthenticated()) {
        const headerActions = document.querySelector('.header-actions');
        if (headerActions && !document.querySelector('.btn-logout')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'btn-logout';
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sair';
            logoutBtn.style.cssText = `
                background: #dc3545;
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                margin-left: 1rem;
                transition: background-color 0.3s;
            `;
            logoutBtn.addEventListener('mouseover', () => {
                logoutBtn.style.background = '#c82333';
            });
            logoutBtn.addEventListener('mouseout', () => {
                logoutBtn.style.background = '#dc3545';
            });
            logoutBtn.addEventListener('click', () => {
                if (confirm('Deseja realmente sair do sistema?')) {
                    window.authManager.logout();
                }
            });
            headerActions.appendChild(logoutBtn);
        }
    }
});