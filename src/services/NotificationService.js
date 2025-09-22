class NotificationService {
    constructor(io) {
        this.io = io;
        this.connectedUsers = new Map(); // userId -> socketId
    }

    // Registrar usuário conectado
    registerUser(socketId, userId) {
        this.connectedUsers.set(userId, socketId);
        console.log(`📱 Usuário ${userId} conectado: ${socketId}`);
    }

    // Remover usuário desconectado
    unregisterUser(userId) {
        this.connectedUsers.delete(userId);
        console.log(`📱 Usuário ${userId} desconectado`);
    }

    // Notificação para usuário específico
    notifyUser(userId, notification) {
        const socketId = this.connectedUsers.get(userId);
        if (socketId) {
            this.io.to(socketId).emit('notification', {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                ...notification
            });
            console.log(`🔔 Notificação enviada para usuário ${userId}:`, notification.message);
        }
    }

    // Broadcast para todos os usuários conectados
    broadcast(notification) {
        this.io.emit('notification', {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...notification
        });
        console.log(`📢 Broadcast enviado:`, notification.message);
    }

    // Notificação para usuários específicos (array)
    notifyUsers(userIds, notification) {
        userIds.forEach(userId => {
            this.notifyUser(userId, notification);
        });
    }

    // Notificação para admins/técnicos
    notifyAdmins(notification) {
        // Implementar lógica para identificar admins
        this.broadcast({
            ...notification,
            role: 'admin'
        });
    }

    // Tipos de notificação predefinidos
    newTicket(ticket, assignedTo = null) {
        const notification = {
            type: 'new_ticket',
            title: 'Novo Ticket Criado',
            message: `Ticket #${ticket.id}: ${ticket.title}`,
            priority: ticket.priority,
            url: `/tickets/${ticket.id}`,
            icon: 'fas fa-ticket-alt',
            color: this.getPriorityColor(ticket.priority)
        };

        if (assignedTo) {
            this.notifyUser(assignedTo, notification);
        } else {
            this.notifyAdmins(notification);
        }
    }

    ticketStatusChanged(ticket, oldStatus, newStatus, userId = null) {
        const notification = {
            type: 'status_change',
            title: 'Status do Ticket Alterado',
            message: `Ticket #${ticket.id}: ${oldStatus} → ${newStatus}`,
            url: `/tickets/${ticket.id}`,
            icon: 'fas fa-exchange-alt',
            color: this.getStatusColor(newStatus)
        };

        if (userId) {
            this.notifyUser(userId, notification);
        } else {
            this.broadcast(notification);
        }
    }

    newComment(ticket, comment, userId = null) {
        const notification = {
            type: 'new_comment',
            title: 'Novo Comentário',
            message: `Ticket #${ticket.id}: ${comment.content.substring(0, 50)}...`,
            url: `/tickets/${ticket.id}#comment-${comment.id}`,
            icon: 'fas fa-comment',
            color: '#17a2b8'
        };

        if (userId) {
            this.notifyUser(userId, notification);
        } else {
            this.broadcast(notification);
        }
    }

    ticketAssigned(ticket, assignedTo, assignedBy) {
        const notification = {
            type: 'assignment',
            title: 'Ticket Atribuído',
            message: `Ticket #${ticket.id} foi atribuído a você`,
            url: `/tickets/${ticket.id}`,
            icon: 'fas fa-user-check',
            color: '#28a745'
        };

        this.notifyUser(assignedTo, notification);
    }

    systemAlert(message, level = 'info') {
        const notification = {
            type: 'system_alert',
            title: 'Alerta do Sistema',
            message: message,
            icon: 'fas fa-exclamation-triangle',
            color: this.getAlertColor(level),
            priority: level
        };

        this.broadcast(notification);
    }

    // Helpers para cores
    getPriorityColor(priority) {
        const colors = {
            'baixa': '#6c757d',
            'media': '#ffc107', 
            'alta': '#fd7e14',
            'critica': '#dc3545'
        };
        return colors[priority] || '#6c757d';
    }

    getStatusColor(status) {
        const colors = {
            'aberto': '#007bff',
            'em_progresso': '#ffc107',
            'pendente': '#fd7e14',
            'resolvido': '#28a745',
            'fechado': '#6c757d'
        };
        return colors[status] || '#007bff';
    }

    getAlertColor(level) {
        const colors = {
            'info': '#17a2b8',
            'warning': '#ffc107',
            'error': '#dc3545',
            'success': '#28a745'
        };
        return colors[level] || '#17a2b8';
    }

    // Estatísticas de conexões
    getStats() {
        return {
            connectedUsers: this.connectedUsers.size,
            users: Array.from(this.connectedUsers.keys())
        };
    }
}

module.exports = NotificationService;

