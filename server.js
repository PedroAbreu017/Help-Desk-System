// server.js - Help Desk System com WebSocket
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');

// Middlewares locais
const { logger } = require('./src/middleware/logger');
const { errorHandler } = require('./src/middleware/errorHandler');
const { authenticateToken } = require('./src/middleware/auth');

<<<<<<< HEAD
// Configuração do banco de dados
const { initDatabase, executeQuery } = require('./src/config/database');
=======
// Middleware de segurança e logs
app.use(helmet({
    contentSecurityPolicy: false, // Desabilitar para desenvolvimento
    crossOriginEmbedderPolicy: false
}));
app.use(morgan('combined'));
app.use(cors({
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
>>>>>>> b04799c092ae4d0aefb96551a895a12bf0624af2

// Routes
const authRoutes = require('./src/routes/auth');
const ticketsRoutes = require('./src/routes/tickets');
const usersRoutes = require('./src/routes/users');
const dashboardRoutes = require('./src/routes/dashboard');
const reportsRoutes = require('./src/routes/reports');
const knowledgeBaseRoutes = require('./src/routes/knowledge-base');

// WebSocket configuration
console.log('🔍 Tentando importar socket config...');
let initializeSocket;
try {
    const socketConfig = require('./src/config/socket');
    initializeSocket = socketConfig.initializeSocket;
} catch (error) {
    console.log('⚠️ WebSocket não configurado ainda. Sistema funcionará sem notificações em tempo real.');
    initializeSocket = null;
}

async function startServer() {
    try {
        console.log('🚀 Iniciando Help Desk System v2.0...');
        console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        console.log(`👷 PID: ${process.pid}`);
        
        // Inicializar banco de dados
        console.log('🔗 Inicializando banco de dados...');
        await initDatabase();
        
        // Criar aplicação Express
        console.log('⚙️ Configurando aplicação...');
        const app = createApp();
        
        // Criar servidor HTTP
        const server = require('http').createServer(app);
        
        // Inicializar WebSocket
        if (initializeSocket) {
        console.log('🔌 Configurando WebSocket...');
        const { io, notificationService } = initializeSocket(server);
        console.log('✅ WebSocket configurado');
        }
        
        // Iniciar servidor
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log('');
            console.log('🎉 ================================');
            console.log('✅ HELP DESK SYSTEM ONLINE! v2.0');
            console.log('🎉 ================================');
            console.log('');
            console.log(`🌐 Servidor: http://localhost:${PORT}`);
            console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
            console.log(`💚 Health: http://localhost:${PORT}/health`);
            console.log('');
        });
        
        // Configurar graceful shutdown
        setupGracefulShutdown(server);

    } catch (error) {
        console.error('💥 Erro fatal ao iniciar servidor:', error);
        process.exit(1);
    }
}

function createApp() {
    const app = express();

    // Configurar CORS
    app.use(cors({
        origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://127.0.0.1:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Security headers (CSP CORRIGIDO para desenvolvimento)
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
                scriptSrcAttr: ["'unsafe-inline'"], // ADICIONADO para eventos onclick
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
                fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false
    }));

    // Middlewares básicos
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

<<<<<<< HEAD
    // Logging
    if (process.env.NODE_ENV !== 'test') {
        app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
    }

    // Arquivos estáticos
    app.use(express.static(path.join(__dirname, 'public')));

    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            environment: process.env.NODE_ENV || 'development',
            websocket: !!global.io ? 'connected' : 'disconnected',
            database: 'connected' // Assumindo que chegou até aqui, DB está OK
        });
    });

    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/tickets', authenticateToken, ticketsRoutes);
    app.use('/api/users', authenticateToken, usersRoutes);
    app.use('/api/dashboard', authenticateToken, dashboardRoutes);
    app.use('/api/reports', authenticateToken, reportsRoutes);
    app.use('/api/knowledge-base', knowledgeBaseRoutes);

    // Servir index.html para todas as rotas SPA
    app.get('*', (req, res) => {
        // Não servir index.html para rotas da API
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ 
                success: false, 
                message: 'Endpoint da API não encontrado' 
            });
        }
        
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Error handling middleware
    app.use(errorHandler);

    return app;
}

function setupGracefulShutdown(server) {
    const gracefulShutdown = (signal) => {
        console.log(`📴 Recebido ${signal}. Encerrando graciosamente...`);
        
        server.close(async () => {
            console.log('🔌 Servidor HTTP encerrado');
            
            // Fechar WebSocket se existir
            if (global.io) {
                global.io.close();
                console.log('🔌 WebSocket encerrado');
            }
            
            // Fechar conexões de banco se necessário
            try {
                const { closeDatabase } = require('./src/config/database');
                if (typeof closeDatabase === 'function') {
                    await closeDatabase();
                    console.log('🗄️ Banco de dados desconectado');
                }
            } catch (error) {
                console.log('⚠️ Erro ao fechar banco:', error.message);
            }
            
            console.log('✅ Shutdown completo');
            process.exit(0);
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
            console.error('⏰ Forçando encerramento...');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Capturar erros não tratados
    process.on('uncaughtException', (error) => {
        console.error('💥 Erro não capturado:', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
        console.error('💥 Promise rejeitada:', reason);
        process.exit(1);
    });
}

// Iniciar servidor
if (require.main === module) {
    startServer();
}

module.exports = { startServer, createApp };
=======
// Iniciar o servidor
startServer();
>>>>>>> b04799c092ae4d0aefb96551a895a12bf0624af2
