// public/js/modules/auth-module.js  
// Módulo que melhora o sistema de autenticação existente

class AuthModule extends BaseModule {
  constructor() {
    super('auth', {
      dependencies: ['fetch'],
      autoRefresh: false
    });
    
    this.user = null;
    this.sessionTimeout = null;
    this.inactivityTimeout = 15 * 60 * 1000; // 15 minutos
    this.lastActivity = Date.now();
  }

  async onInit() {
    this.log('Inicializando Auth Module...');
    
    // Integrar com sistema de auth existente
    this.integrateWithExistingAuth();
    
    // Melhorar monitoramento de sessão
    this.setupSessionMonitoring();
    
    // Adicionar melhorias de segurança
    this.setupSecurityEnhancements();
    
    // Atualizar UI com informações do usuário
    this.updateUserInterface();
    
    this.log('Auth Module inicializado');
  }

  onSetupEventListeners() {
    // Monitorar atividade do usuário
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      this.addEventListener(document, event, () => {
        this.updateLastActivity();
      }, true);
    });

    // Interceptar eventos de logout
    document.addEventListener('click', (e) => {
      if (e.target.matches('.logout-btn, .btn-logout')) {
        e.preventDefault();
        this.logout();
      }
    });

    // Monitorar mudanças na aba
    this.addEventListener(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.verifySessionOnFocus();
      }
    });
  }

  integrateWithExistingAuth() {
    // Integrar com authManager existente se disponível
    if (window.authManager) {
      this.log('Integrando com authManager existente');
      
      // Interceptar métodos do authManager para adicionar melhorias
      const originalLogin = window.authManager.login;
      if (originalLogin) {
        window.authManager.login = async (...args) => {
          const result = await originalLogin.apply(window.authManager, args);
          this.onLoginSuccess(result);
          return result;
        };
      }

      const originalLogout = window.authManager.logout;
      if (originalLogout) {
        window.authManager.logout = (...args) => {
          this.onLogoutStart();
          return originalLogout.apply(window.authManager, args);
        };
      }
    }

    // Carregar informações do usuário atual
    this.loadCurrentUser();
  }

  loadCurrentUser() {
    try {
      const userStr = localStorage.getItem('helpdesk_user');
      if (userStr) {
        this.user = JSON.parse(userStr);
        this.log(`Usuário carregado: ${this.user.name || this.user.email}`);
        this.emit('userLoaded', this.user);
      }
    } catch (error) {
      this.error('Erro ao carregar dados do usuário:', error);
    }
  }

  setupSessionMonitoring() {
    // Verificar token periodicamente
    this.sessionCheckInterval = setInterval(() => {
      this.verifyToken();
    }, 5 * 60 * 1000); // Verificar a cada 5 minutos

    // Monitorar inatividade
    this.inactivityCheckInterval = setInterval(() => {
      this.checkInactivity();
    }, 60 * 1000); // Verificar a cada minuto
  }

  setupSecurityEnhancements() {
    // Detectar múltiplas abas
    this.setupTabSyncronization();
    
    // Monitorar tentativas de acesso não autorizado
    this.setupUnauthorizedAccessDetection();
    
    // Limpar dados sensíveis em caso de fechamento
    this.setupDataCleanup();
  }

  setupTabSyncronization() {
    // Sincronizar logout entre abas
    this.addEventListener(window, 'storage', (e) => {
      if (e.key === 'helpdesk_access_token' && !e.newValue && e.oldValue) {
        this.log('Logout detectado em outra aba');
        this.handleLogoutFromOtherTab();
      }
      
      if (e.key === 'helpdesk_user' && e.newValue !== e.oldValue) {
        this.log('Mudança de usuário detectada em outra aba');
        this.loadCurrentUser();
        this.updateUserInterface();
      }
    });
  }

  setupUnauthorizedAccessDetection() {
    let failedAttempts = 0;
    const maxAttempts = 3;

    // Interceptar respostas 401
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      if (response.status === 401) {
        failedAttempts++;
        this.log(`Tentativa de acesso não autorizado detectada (${failedAttempts}/${maxAttempts})`);
        
        if (failedAttempts >= maxAttempts) {
          this.handleSuspiciousActivity();
        }
        
        this.emit('unauthorizedAccess', { attempts: failedAttempts, maxAttempts });
      } else if (response.ok) {
        failedAttempts = 0; // Reset contador em caso de sucesso
      }
      
      return response;
    };
  }

  setupDataCleanup() {
    // Limpar dados sensíveis ao fechar a página
    this.addEventListener(window, 'beforeunload', () => {
      // Não limpar completamente, apenas marcar para limpeza
      this.log('Preparando para limpeza de dados...');
    });

    this.addEventListener(window, 'unload', () => {
      // Limpeza final se necessário
      if (this.shouldCleanOnUnload) {
        this.cleanSensitiveData();
      }
    });
  }

  async verifyToken() {
    try {
      const token = localStorage.getItem('helpdesk_access_token');
      if (!token) {
        this.handleTokenExpired();
        return false;
      }

      // Verificar com o servidor se o token ainda é válido
      const response = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        this.handleTokenExpired();
        return false;
      }

      const data = await response.json();
      if (data.data?.user) {
        this.user = data.data.user;
        this.updateUserInterface();
      }

      return true;
    } catch (error) {
      this.error('Erro na verificação do token:', error);
      return false;
    }
  }

  verifySessionOnFocus() {
    // Verificar sessão quando usuário volta para a aba
    this.log('Verificando sessão após foco na aba');
    this.verifyToken();
  }

  updateLastActivity() {
    this.lastActivity = Date.now();
  }

  checkInactivity() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;

    if (timeSinceLastActivity >= this.inactivityTimeout) {
      this.log('Usuário inativo por muito tempo');
      this.handleInactiveUser();
    } else if (timeSinceLastActivity >= (this.inactivityTimeout - 2 * 60 * 1000)) {
      // Avisar 2 minutos antes do timeout
      this.showInactivityWarning();
    }
  }

  updateUserInterface() {
    if (!this.user) return;

    // Atualizar nome do usuário na interface
    const userNameElements = document.querySelectorAll('.user-info span, #user-name');
    userNameElements.forEach(element => {
      if (element) {
        element.textContent = this.user.name || this.user.email || 'Usuário';
      }
    });

    // Atualizar avatar se existir
    const avatarElements = document.querySelectorAll('.user-avatar, .avatar');
    avatarElements.forEach(avatar => {
      if (this.user.avatar) {
        avatar.src = this.user.avatar;
      }
    });

    // Adicionar informações extras se necessário
    this.addUserStats();
  }

  addUserStats() {
    const userStatsElement = document.getElementById('user-stats');
    if (userStatsElement && this.user) {
      const role = this.user.role || 'Usuário';
      const department = this.user.department || '';
      
      userStatsElement.innerHTML = `
        <span style="font-size: 0.8rem; color: #666;">
          ${role}${department ? ` - ${department}` : ''}
        </span>
      `;
    }
  }

  // Handlers de eventos
  onLoginSuccess(result) {
    this.log('Login bem-sucedido detectado');
    this.user = result?.user || result?.data?.user;
    this.lastActivity = Date.now();
    this.updateUserInterface();
    this.emit('loginSuccess', this.user);
  }

  onLogoutStart() {
    this.log('Processo de logout iniciado');
    this.cleanupIntervals();
    this.emit('logoutStart');
  }

  handleTokenExpired() {
    this.log('Token expirado detectado');
    
    // Tentar renovar automaticamente primeiro
    if (window.authManager && typeof window.authManager.refreshToken === 'function') {
      window.authManager.refreshToken().catch(() => {
        this.forceLogout('Sessão expirada');
      });
    } else {
      this.forceLogout('Sessão expirada');
    }
  }

  handleInactiveUser() {
    this.showNotification('Sessão encerrada por inatividade', 'warning');
    this.forceLogout('Inatividade');
  }

  handleLogoutFromOtherTab() {
    this.showNotification('Sessão encerrada em outra aba', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }

  handleSuspiciousActivity() {
    this.log('Atividade suspeita detectada - forçando logout');
    this.showNotification('Atividade suspeita detectada. Redirecionando...', 'error');
    this.shouldCleanOnUnload = true;
    this.forceLogout('Segurança');
  }

  showInactivityWarning() {
    if (this.inactivityWarningShown) return;
    
    this.inactivityWarningShown = true;
    this.showNotification('Sua sessão expirará em 2 minutos devido à inatividade', 'warning');
    
    // Reset warning after user activity
    setTimeout(() => {
      this.inactivityWarningShown = false;
    }, 30000);
  }

  showNotification(message, type = 'info') {
    // Usar sistema de notificações existente se disponível
    if (window.notificationManager && typeof window.notificationManager.show === 'function') {
      window.notificationManager.show(message, type);
    } else {
      // Fallback para alert simples
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  // Métodos públicos
  async logout() {
    this.log('Logout manual solicitado');
    
    try {
      // Usar método de logout existente se disponível
      if (window.authManager && typeof window.authManager.logout === 'function') {
        await window.authManager.logout();
      } else {
        // Implementação própria
        await this.performLogout();
      }
    } catch (error) {
      this.error('Erro durante logout:', error);
      // Forçar logout local mesmo se servidor falhar
      this.performLocalLogout();
    }
  }

  async performLogout() {
    const token = localStorage.getItem('helpdesk_access_token');
    
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (error) {
        this.warn('Erro no logout do servidor, continuando com logout local');
      }
    }
    
    this.performLocalLogout();
  }

  performLocalLogout() {
    // Limpar dados de autenticação
    localStorage.removeItem('helpdesk_access_token');
    localStorage.removeItem('helpdesk_refresh_token'); 
    localStorage.removeItem('helpdesk_user');
    
    this.user = null;
    this.cleanupIntervals();
    
    // Recarregar página para forçar tela de login
    window.location.reload();
  }

  forceLogout(reason) {
    this.log(`Logout forçado: ${reason}`);
    this.performLocalLogout();
  }

  getUserInfo() {
    return this.user;
  }

  isAuthenticated() {
    return !!localStorage.getItem('helpdesk_access_token') && !!this.user;
  }

  getSessionTimeRemaining() {
    // Estimar tempo restante baseado na última atividade
    const timeSinceActivity = Date.now() - this.lastActivity;
    const timeRemaining = Math.max(0, this.inactivityTimeout - timeSinceActivity);
    return Math.floor(timeRemaining / 1000 / 60); // em minutos
  }

  extendSession() {
    this.log('Sessão estendida pelo usuário');
    this.lastActivity = Date.now();
    this.inactivityWarningShown = false;
  }

  // Utilitários
  cleanupIntervals() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
      this.inactivityCheckInterval = null;
    }
  }

  cleanSensitiveData() {
    // Limpar dados sensíveis da memória
    this.user = null;
    
    // Limpar possíveis dados em cache
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }
  }

  // Integração com outros módulos
  onEnable() {
    this.log('Auth module habilitado');
    this.setupSessionMonitoring();
    this.updateUserInterface();
  }

  onDisable() {
    this.log('Auth module desabilitado');
    this.cleanupIntervals();
  }

  onDestroy() {
    this.cleanupIntervals();
    this.user = null;
  }

  // Debug e relatórios
  getAuthStatus() {
    return {
      isAuthenticated: this.isAuthenticated(),
      user: this.user,
      lastActivity: new Date(this.lastActivity).toLocaleString(),
      sessionTimeRemaining: this.getSessionTimeRemaining(),
      hasActiveIntervals: !!(this.sessionCheckInterval && this.inactivityCheckInterval)
    };
  }
}

// Disponibilizar globalmente
window.AuthModule = AuthModule;