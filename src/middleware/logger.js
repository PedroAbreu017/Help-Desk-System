// src/middleware/logger.js - Middleware de Logging Customizado

function requestLogger(req, res, next) {
    const startTime = Date.now();
    
    // Adicionar ID único à requisição
    req.id = generateRequestId();
    
    // Capturar informações da requisição
    const requestInfo = {
        id: req.id,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    };

    console.log(`📡 [${requestInfo.id}] ${requestInfo.method} ${requestInfo.url} - IP: ${requestInfo.ip}`);

    // Interceptar o final da resposta
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        const responseSize = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data || '', 'utf8');
        
        // Log da resposta
        const statusColor = getStatusColor(res.statusCode);
        console.log(`📤 [${req.id}] ${res.statusCode} ${statusColor} - ${duration}ms - ${formatBytes(responseSize)}`);
        
        // Chamar o send original
        originalSend.call(this, data);
    };

    next();
}

function generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getStatusColor(statusCode) {
    if (statusCode < 300) return '✅';
    if (statusCode < 400) return '🔄';
    if (statusCode < 500) return '⚠️';
    return '❌';
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Logger para diferentes níveis
const logger = {
    info: (message, data = null) => {
        console.log(`ℹ️ [${new Date().toISOString()}] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    
    warn: (message, data = null) => {
        console.warn(`⚠️ [${new Date().toISOString()}] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    
    error: (message, error = null) => {
        console.error(`❌ [${new Date().toISOString()}] ERROR: ${message}`);
        if (error) {
            console.error('Stack:', error.stack);
            console.error('Details:', JSON.stringify({
                name: error.name,
                message: error.message,
                code: error.code
            }, null, 2));
        }
    },
    
    debug: (message, data = null) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`🐛 [${new Date().toISOString()}] DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '');
        }
    },
    
    success: (message, data = null) => {
        console.log(`✅ [${new Date().toISOString()}] SUCCESS: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
};

module.exports = {
    requestLogger,
    logger
};