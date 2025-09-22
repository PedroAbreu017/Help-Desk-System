// src/middleware/errorHandler.js - Middleware de Tratamento de Erros

function errorHandler(err, req, res, next) {
    // Log do erro
    console.error('❌ Erro não tratado:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Status code padrão
    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Erro interno do servidor';

    // Tratar erros específicos
    if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        statusCode = 409;
        message = 'Recurso já existe (duplicata)';
    } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        statusCode = 400;
        message = 'Referência inválida (chave estrangeira)';
    } else if (err.code === 'ECONNREFUSED') {
        statusCode = 503;
        message = 'Serviço temporariamente indisponível';
    } else if (err.name === 'ValidationError') {
        statusCode = 400;
        message = err.message;
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Não autorizado';
    } else if (err.name === 'ForbiddenError') {
        statusCode = 403;
        message = 'Acesso negado';
    } else if (err.type === 'entity.parse.failed') {
        statusCode = 400;
        message = 'Formato JSON inválido';
    } else if (err.type === 'entity.too.large') {
        statusCode = 413;
        message = 'Payload muito grande';
    }

    // Resposta de erro estruturada
    const errorResponse = {
        success: false,
        message: message,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
    };

    // Adicionar detalhes do erro em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error = {
            name: err.name,
            code: err.code,
            stack: err.stack
        };
    }

    // Adicionar ID da requisição se disponível
    if (req.id) {
        errorResponse.requestId = req.id;
    }

    res.status(statusCode).json(errorResponse);
}

// Middleware para capturar erros assíncronos
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// Middleware para erros 404
function notFoundHandler(req, res, next) {
    const error = new Error(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
}

// Criar erro personalizado
function createError(message, statusCode = 500, code = null) {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (code) error.code = code;
    return error;
}

module.exports = {
    errorHandler,
    asyncHandler,
    notFoundHandler,
    createError
};


