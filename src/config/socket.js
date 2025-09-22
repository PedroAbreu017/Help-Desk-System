const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const NotificationService = require('../services/NotificationService');

function initializeSocket(server) {
    const io = socketIo(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    // Inicializar serviço de notificações
    const notificationService = new NotificationService(io);

    // Middleware de autenticação
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
            
            if (!token) {
                return next(new Error('Token não fornecido'));
            }

            const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
            socket.userId = decoded.id;
            socket.userRole = decoded.role;
            next();
        } catch (error) {
            console.error('❌ Erro de autenticação WebSocket:', error.message);
            next(new Error('Token inválido'));
        }
    });

    // Eventos de conexão
    io.on('connection', (socket) => {
        console.log(`🔌 Usuário conectado: ${socket.userId} (${socket.id})`);

        // Registrar usuário
        notificationService.registerUser(socket.id, socket.userId);

        // Enviar estatísticas atualizadas
        io.emit('user_stats', notificationService.getStats());

        // Evento: Entrar em sala específica (ticket)
        socket.on('join_ticket', (ticketId) => {
            socket.join(`ticket_${ticketId}`);
            console.log(`👥 Usuário ${socket.userId} entrou na sala do ticket ${ticketId}`);
        });

        // Evento: Sair de sala específica
        socket.on('leave_ticket', (ticketId) => {
            socket.leave(`ticket_${ticketId}`);
            console.log(`👋 Usuário ${socket.userId} saiu da sala do ticket ${ticketId}`);
        });

        // Evento: Marcar notificação como lida
        socket.on('mark_notification_read', (notificationId) => {
            // Implementar lógica de persistência se necessário
            console.log(`✅ Notificação ${notificationId} marcada como lida por ${socket.userId}`);
        });

        // Evento: Solicitar estatísticas
        socket.on('get_stats', () => {
            socket.emit('user_stats', notificationService.getStats());
        });

        // Evento: Typing indicator (futuro)
        socket.on('typing', (data) => {
            socket.to(`ticket_${data.ticketId}`).emit('user_typing', {
                userId: socket.userId,
                isTyping: data.isTyping
            });
        });

        // Desconexão
        socket.on('disconnect', (reason) => {
            console.log(`🔌 Usuário desconectado: ${socket.userId} - Motivo: ${reason}`);
            notificationService.unregisterUser(socket.userId);
            io.emit('user_stats', notificationService.getStats());
        });

        // Erro
        socket.on('error', (error) => {
            console.error(`❌ Erro WebSocket para usuário ${socket.userId}:`, error);
        });
    });

    // Disponibilizar globalmente
    global.notificationService = notificationService;
    global.io = io;

    return { io, notificationService };
}

module.exports = { initializeSocket };