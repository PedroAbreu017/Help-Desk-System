// src/middleware/auth.js - Middleware de Autenticação JWT
const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');
const { createError } = require('./errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'helpdesk-super-secret-key-2024-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Middleware de autenticação JWT obrigatória
 * Verifica se o usuário está autenticado
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return next(createError('Token de acesso obrigatório', 401, 'MISSING_TOKEN'));
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            const errorMessage = err.name === 'TokenExpiredError' 
                ? 'Token expirado' 
                : 'Token inválido';
            return next(createError(errorMessage, 401, 'INVALID_TOKEN'));
        }

        try {
            // Verificar se usuário ainda existe e está ativo
            const users = await executeQuery(
                'SELECT id, name, email, role, department, active FROM users WHERE id = ?',
                [decoded.userId]
            );

            if (!users || users.length === 0) {
                return next(createError('Usuário não encontrado', 401, 'USER_NOT_FOUND'));
            }

            const user = users[0];

            if (!user.active) {
                return next(createError('Usuário desativado', 401, 'USER_INACTIVE'));
            }

            // Adicionar informações do usuário na requisição
            req.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department
            };

            next();
        } catch (error) {
            console.error('❌ Erro ao verificar usuário:', error);
            next(createError('Erro interno de autenticação', 500, 'AUTH_ERROR'));
        }
    });
}

/**
 * Middleware de autenticação opcional
 * Se token válido, adiciona usuário; senão continua sem usuário
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            req.user = null;
            return next();
        }

        try {
            const users = await executeQuery(
                'SELECT id, name, email, role, department FROM users WHERE id = ? AND active = 1',
                [decoded.userId]
            );

            if (users && users.length > 0) {
                const user = users[0];
                req.user = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    department: user.department
                };
            } else {
                req.user = null;
            }
        } catch (error) {
            console.error('❌ Erro em autenticação opcional:', error);
            req.user = null;
        }

        next();
    });
}

/**
 * Middleware de autorização por roles
 * @param {string[]} allowedRoles - Roles permitidos (ex: ['admin', 'technician'])
 */
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(createError('Autenticação obrigatória', 401, 'AUTHENTICATION_REQUIRED'));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(createError(
                `Acesso negado. Roles necessários: ${allowedRoles.join(', ')}`, 
                403, 
                'INSUFFICIENT_PERMISSIONS'
            ));
        }

        next();
    };
}

/**
 * Middleware para admin apenas
 */
function requireAdmin(req, res, next) {
    return requireRole(['admin'])(req, res, next);
}

/**
 * Middleware para admin ou technician
 */
function requireTechnician(req, res, next) {
    return requireRole(['admin', 'technician'])(req, res, next);
}

/**
 * Middleware para verificar se o usuário pode acessar tickets de outros
 * Admins e técnicos podem ver todos, usuários comuns só os seus
 */
function checkTicketAccess(req, res, next) {
    if (!req.user) {
        return next(createError('Autenticação obrigatória', 401, 'AUTHENTICATION_REQUIRED'));
    }

    // Admin e technician podem acessar qualquer ticket
    if (['admin', 'technician'].includes(req.user.role)) {
        return next();
    }

    // Para users comuns, verificar se o ticket pertence a eles
    const ticketId = req.params.id;
    if (ticketId) {
        // Esta verificação será feita na rota específica
        // Aqui apenas garantimos que o usuário está autenticado
        return next();
    }

    next();
}

/**
 * Gerar JWT token
 * @param {Object} payload - Dados para incluir no token
 * @returns {string} JWT token
 */
function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { 
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'helpdesk-system',
        audience: 'helpdesk-users'
    });
}

/**
 * Gerar refresh token
 * @param {Object} payload - Dados para incluir no token
 * @returns {string} Refresh token
 */
function generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { 
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'helpdesk-system',
        audience: 'helpdesk-refresh'
    });
}

/**
 * Verificar token sem middleware (função utilitária)
 * @param {string} token - Token para verificar
 * @returns {Promise<Object|null>} Dados decodificados ou null
 */
async function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Extrair token do header Authorization
 * @param {Object} req - Request object
 * @returns {string|null} Token ou null
 */
function extractToken(req) {
    const authHeader = req.headers['authorization'];
    return authHeader && authHeader.split(' ')[1];
}

/**
 * Middleware para rate limiting de login
 * Previne ataques de força bruta
 */
const loginAttempts = new Map();

function rateLimitLogin(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const email = req.body.email;
    const key = `${ip}:${email}`;
    
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutos
    const maxAttempts = 5;

    if (!loginAttempts.has(key)) {
        loginAttempts.set(key, { count: 1, firstAttempt: now });
        return next();
    }

    const attempts = loginAttempts.get(key);
    
    // Reset se janela de tempo passou
    if (now - attempts.firstAttempt > windowMs) {
        loginAttempts.set(key, { count: 1, firstAttempt: now });
        return next();
    }

    // Incrementar tentativas
    attempts.count++;

    if (attempts.count > maxAttempts) {
        const remainingTime = Math.ceil((windowMs - (now - attempts.firstAttempt)) / 1000);
        return next(createError(
            `Muitas tentativas de login. Tente novamente em ${remainingTime} segundos.`,
            429,
            'TOO_MANY_ATTEMPTS'
        ));
    }

    next();
}

/**
 * Limpar tentativas de login bem-sucedidas
 * @param {string} ip - IP do usuário
 * @param {string} email - Email do usuário
 */
function clearLoginAttempts(ip, email) {
    const key = `${ip}:${email}`;
    loginAttempts.delete(key);
}

/**
 * Middleware para logs de auditoria
 */
function auditLog(action) {
    return (req, res, next) => {
        const originalSend = res.send;
        res.send = function(data) {
            // Log da ação após resposta
            const logData = {
                action,
                user: req.user ? req.user.id : 'anonymous',
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString(),
                success: res.statusCode < 400
            };

            console.log('🔍 Audit Log:', logData);
            
            // Aqui você pode salvar no banco de dados se necessário
            
            return originalSend.call(this, data);
        };
        next();
    };
}

module.exports = {
    authenticateToken,
    optionalAuth,
    requireRole,
    requireAdmin,
    requireTechnician,
    checkTicketAccess,
    generateToken,
    generateRefreshToken,
    verifyToken,
    extractToken,
    rateLimitLogin,
    clearLoginAttempts,
    auditLog,
    JWT_SECRET,
    JWT_EXPIRES_IN
};