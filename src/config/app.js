// src/config/app.js - Configuração do Express
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

// Importar middlewares
const { errorHandler } = require('../middleware/errorHandler');
const { requestLogger } = require('../middleware/logger');

// Importar rotas
const routes = require('../routes');

function createApp() {
    const app = express();

    // =============================================
    // MIDDLEWARE DE SEGURANÇA E LOGS
    // =============================================
    
    // Helmet para segurança HTTP
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
    }));

    // Compressão gzip
    app.use(compression());

    // Logs de requisições
    app.use(morgan('combined'));

    // CORS
    app.use(cors({
        origin: process.env.NODE_ENV === 'production' 
            ? (process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [])
            : ['http://localhost:3000', 'http://127.0.0.1:3000'],
        credentials: true,
        optionsSuccessStatus: 200
    }));

    // =============================================
    // MIDDLEWARE DE PARSING
    // =============================================
    
    app.use(express.json({ 
        limit: '10mb',
        strict: true
    }));
    
    app.use(express.urlencoded({ 
        extended: true,
        limit: '10mb'
    }));

    // =============================================
    // MIDDLEWARE CUSTOMIZADO
    // =============================================
    
    // Logger personalizado
    app.use(requestLogger);

    // =============================================
    // ARQUIVOS ESTÁTICOS
    // =============================================
    
    app.use(express.static(path.join(__dirname, '../../public'), {
        maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
        etag: true,
        lastModified: true
    }));

    // =============================================
    // HEALTH CHECK
    // =============================================
    
    app.get('/health', (req, res) => {
        const { getDatabaseType } = require('../config/database');
        
        res.json({
            success: true,
            message: 'Help Desk API está funcionando!',
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            database: getDatabaseType() || 'Desconectado',
            environment: process.env.NODE_ENV || 'development',
            uptime: Math.floor(process.uptime()),
            memory: process.memoryUsage(),
            pid: process.pid
        });
    });

    // =============================================
    // ROTAS DA API
    // =============================================
    
    app.use('/api', routes);

    // =============================================
    // ROTA CATCH-ALL PARA SPA
    // =============================================
    
    app.get('*', (req, res, next) => {
        // Se for requisição de API que não existe, retornar 404
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({
                success: false,
                message: `Endpoint não encontrado: ${req.method} ${req.path}`,
                timestamp: new Date().toISOString()
            });
        }
        
        // Para outras rotas, servir o index.html (SPA)
        res.sendFile(path.join(__dirname, '../../public/index.html'));
    });

    // =============================================
    // MIDDLEWARE DE TRATAMENTO DE ERROS
    // =============================================
    
    app.use(errorHandler);

    return app;
}

module.exports = { createApp };