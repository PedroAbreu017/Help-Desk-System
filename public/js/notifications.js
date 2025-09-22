// === 5. public/js/notifications.js ===
class NotificationManager {
    constructor() {
        this.socket = null;
        this.notifications = [];
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    // Inicializar conexão WebSocket
    init() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('⚠️ Token não encontrado, WebSocket não será conectado');
            return;
        }

        try {
            this.socket = io({
                auth: {
                    token: token
                },
                transports: ['websocket', 'polling']
            });

            this.setupEventListeners();
            console.log('🔌 WebSocket inicializado');
        } catch (error) {
            console.error('❌ Erro ao conectar WebSocket:', error);
        }
    }

    setupEventListeners() {
        // Conexão estabelecida
        this.socket.on('connect', () => {
            console.log('✅ WebSocket conectado');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.showConnectionStatus(true);
        });

        // Desconexão
        this.socket.on('disconnect', (reason) => {
            console.log('🔌 WebSocket desconectado:', reason);
            this.isConnected = false;
            this.showConnectionStatus(false);
            
            // Tentar reconectar se não foi desconexão intencional
            if (reason === 'io server disconnect') {
                this.socket.connect();
            }
        });

        // Erro de conexão
        this.socket.on('connect_error', (error) => {
            console.error('❌ Erro de conexão WebSocket:', error.message);
            this.reconnectAttempts++;
            
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('❌ Máximo de tentativas de reconexão atingido');
                this.showConnectionError();
            }
        });

        // Receber notificação
        this.socket.on('notification', (notification) => {
            this.handleNotification(notification);
        });

        // Estatísticas de usuários
        this.socket.on('user_stats', (stats) => {
            this.updateUserStats(stats);
        });

        // Usuário digitando
        this.socket.on('user_typing', (data) => {
            this.showTypingIndicator(data);
        });
    }

    // Processar notificação recebida
    handleNotification(notification) {
        console.log('🔔 Notificação recebida:', notification);
        
        // Adicionar à lista
        this.notifications.unshift(notification);
        
        // Manter apenas últimas 50 notificações
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }

        // Mostrar notificação visual
        this.showToast(notification);
        
        // Atualizar contador no header
        this.updateNotificationBadge();
        
        // Tocar som se permitido
        this.playNotificationSound();

        // Emitir evento customizado para outros componentes
        document.dispatchEvent(new CustomEvent('newNotification', {
            detail: notification
        }));
    }

    // Mostrar toast notification
    showToast(notification) {
        const toast = document.createElement('div');
        toast.className = `notification-toast ${notification.type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            min-width: 300px;
            max-width: 400px;
            background: white;
            border-left: 4px solid ${notification.color || '#007bff'};
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 16px;
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
            cursor: pointer;
        `;

        toast.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <i class="${notification.icon || 'fas fa-bell'}" 
                   style="color: ${notification.color || '#007bff'}; margin-top: 2px;"></i>
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
                        ${notification.title}
                    </div>
                    <div style="font-size: 13px; color: #666; line-height: 1.4;">
                        ${notification.message}
                    </div>
                    <div style="font-size: 11px; color: #999; margin-top: 4px;">
                        ${this.formatTime(notification.timestamp)}
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: #999; cursor: pointer; padding: 0; font-size: 16px;">
                    ×
                </button>
            </div>
        `;

        // Click para navegar
        if (notification.url) {
            toast.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    window.location.href = notification.url;
                }
            });
        }

        document.body.appendChild(toast);

        // Auto-remove após 5 segundos
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    // Métodos de utilidade
    joinTicket(ticketId) {
        if (this.isConnected) {
            this.socket.emit('join_ticket', ticketId);
        }
    }

    leaveTicket(ticketId) {
        if (this.isConnected) {
            this.socket.emit('leave_ticket', ticketId);
        }
    }

    markAsRead(notificationId) {
        if (this.isConnected) {
            this.socket.emit('mark_notification_read', notificationId);
        }
    }

    showConnectionStatus(isConnected) {
        const indicator = document.getElementById('connection-status');
        if (indicator) {
            indicator.className = `connection-status ${isConnected ? 'connected' : 'disconnected'}`;
            indicator.title = isConnected ? 'WebSocket Conectado' : 'WebSocket Desconectado';
        }
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notification-badge');
        if (badge) {
            const unreadCount = this.notifications.filter(n => !n.read).length;
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    }

    playNotificationSound() {
        try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {
                // Silenciar erro se som não puder ser reproduzido
            });
        } catch (error) {
            // Ignorar erro de som
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'agora';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m atrás`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
        return date.toLocaleDateString();
    }
}

// Inicializar quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.notificationManager = new NotificationManager();
    window.notificationManager.init();
});

// CSS para animações (adicionar ao style.css)
const notificationStyles = `
@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}

.connection-status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    margin-left: 8px;
}

.connection-status.connected {
    background-color: #28a745;
    box-shadow: 0 0 4px #28a745;
}

.connection-status.disconnected {
    background-color: #dc3545;
    box-shadow: 0 0 4px #dc3545;
}
`;

// Adicionar estilos ao head
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);
