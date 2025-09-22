// src/routes/auth.js - Rotas de Autenticação (CORRIGIDO)
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { executeQuery } = require('../config/database');
const { 
    generateToken, 
    generateRefreshToken, 
    verifyToken,
    authenticateToken,
    rateLimitLogin,
    clearLoginAttempts,
    auditLog
} = require('../middleware/auth');
const { isValidEmail } = require('../utils/helpers');

// POST /api/auth/login - Login do usuário
router.post('/login', 
    rateLimitLogin,
    auditLog('login_attempt'),
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        // Validações básicas
        if (!email || !password) {
            throw createError('Usuário e senha são obrigatórios', 400, 'MISSING_CREDENTIALS');
        }

        // REMOVIDA VALIDAÇÃO DE EMAIL PARA ACEITAR USERNAMES
        // if (!isValidEmail(email)) {
        //     throw createError('Email inválido', 400, 'INVALID_EMAIL');
        // }

        // Buscar usuário
        const users = await executeQuery(
            'SELECT id, name, email, password_hash, role, department, active, login_attempts, locked_until FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        if (!users || users.length === 0) {
            throw createError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
        }

        const user = users[0];

        // Verificar se conta está ativa
        if (!user.active) {
            throw createError('Conta desativada. Contate o administrador.', 401, 'ACCOUNT_DISABLED');
        }

        // Verificar se conta está bloqueada
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const unlockTime = new Date(user.locked_until).toLocaleString('pt-BR');
            throw createError(`Conta bloqueada até ${unlockTime}`, 401, 'ACCOUNT_LOCKED');
        }

        // Verificar senha
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            // Incrementar tentativas de login falhadas
            const newAttempts = (user.login_attempts || 0) + 1;
            const lockUntil = newAttempts >= 5 
                ? new Date(Date.now() + 30 * 60 * 1000) // 30 minutos
                : null;

            await executeQuery(
                'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?',
                [newAttempts, lockUntil, user.id]
            );

            if (lockUntil) {
                throw createError('Muitas tentativas falhadas. Conta bloqueada por 30 minutos.', 401, 'ACCOUNT_LOCKED');
            }

            throw createError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
        }

        // Login bem-sucedido - resetar tentativas e gerar tokens
        await executeQuery(
            'UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // Limpar rate limiting
        clearLoginAttempts(req.ip, email);

        // Gerar tokens
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role
        };

        const accessToken = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Salvar refresh token no banco (opcional, para revogação)
        await executeQuery(
            'UPDATE users SET refresh_token = ? WHERE id = ?',
            [refreshToken, user.id]
        );

        console.log(`🔐 Login bem-sucedido: ${user.email} (${user.role})`);

        res.json({
            success: true,
            message: 'Login realizado com sucesso',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    department: user.department
                },
                tokens: {
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    token_type: 'Bearer',
                    expires_in: 24 * 60 * 60 // 24 horas em segundos
                }
            }
        });
    })
);

// POST /api/auth/logout - Logout do usuário
router.post('/logout', 
    authenticateToken,
    auditLog('logout'),
    asyncHandler(async (req, res) => {
        // Invalidar refresh token no banco
        await executeQuery(
            'UPDATE users SET refresh_token = NULL WHERE id = ?',
            [req.user.id]
        );

        console.log(`🚪 Logout: ${req.user.email}`);

        res.json({
            success: true,
            message: 'Logout realizado com sucesso'
        });
    })
);

// POST /api/auth/refresh - Renovar access token
router.post('/refresh', asyncHandler(async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        throw createError('Refresh token é obrigatório', 400, 'MISSING_REFRESH_TOKEN');
    }

    // Verificar refresh token
    const decoded = await verifyToken(refresh_token);
    if (!decoded) {
        throw createError('Refresh token inválido ou expirado', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Verificar se refresh token existe no banco
    const users = await executeQuery(
        'SELECT id, name, email, role, department, active, refresh_token FROM users WHERE id = ?',
        [decoded.userId]
    );

    if (!users || users.length === 0) {
        throw createError('Usuário não encontrado', 401, 'USER_NOT_FOUND');
    }

    const user = users[0];

    if (!user.active) {
        throw createError('Conta desativada', 401, 'ACCOUNT_DISABLED');
    }

    if (user.refresh_token !== refresh_token) {
        throw createError('Refresh token inválido', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Gerar novo access token
    const newTokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
    };

    const newAccessToken = generateToken(newTokenPayload);

    console.log(`🔄 Token renovado: ${user.email}`);

    res.json({
        success: true,
        message: 'Token renovado com sucesso',
        data: {
            access_token: newAccessToken,
            token_type: 'Bearer',
            expires_in: 24 * 60 * 60
        }
    });
}));

// POST /api/auth/register - Registrar novo usuário (apenas admins)
router.post('/register', 
    authenticateToken,
    auditLog('user_registration'),
    asyncHandler(async (req, res) => {
        // Apenas admins podem registrar novos usuários
        if (req.user.role !== 'admin') {
            throw createError('Apenas administradores podem registrar usuários', 403, 'INSUFFICIENT_PERMISSIONS');
        }

        const { name, email, password, role = 'user', department } = req.body;

        // Validações
        if (!name || !email || !password || !department) {
            throw createError('Nome, email, senha e departamento são obrigatórios', 400, 'MISSING_FIELDS');
        }

        // Validar email apenas para registro (novos usuários devem ter email válido)
        if (!isValidEmail(email)) {
            throw createError('Email inválido', 400, 'INVALID_EMAIL');
        }

        if (password.length < 6) {
            throw createError('Senha deve ter pelo menos 6 caracteres', 400, 'PASSWORD_TOO_SHORT');
        }

        if (!['admin', 'technician', 'user'].includes(role)) {
            throw createError('Role inválido', 400, 'INVALID_ROLE');
        }

        // Verificar se email já existe
        const existingUsers = await executeQuery(
            'SELECT id FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        if (existingUsers && existingUsers.length > 0) {
            throw createError('Email já cadastrado', 409, 'EMAIL_EXISTS');
        }

        // Hash da senha
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Gerar ID único
        const { generateId } = require('../utils/helpers');
        const userId = generateId();

        // Inserir usuário
        await executeQuery(
            `INSERT INTO users (
                id, name, email, password_hash, role, department, 
                active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
            [userId, name.trim(), email.toLowerCase(), passwordHash, role, department.trim()]
        );

        console.log(`👤 Usuário registrado: ${email} (${role}) por ${req.user.email}`);

        res.status(201).json({
            success: true,
            message: 'Usuário registrado com sucesso',
            data: {
                id: userId,
                name: name.trim(),
                email: email.toLowerCase(),
                role,
                department: department.trim()
            }
        });
    })
);

// GET /api/auth/profile - Obter perfil do usuário logado
router.get('/profile', 
    authenticateToken,
    asyncHandler(async (req, res) => {
        // Buscar dados completos do usuário
        const users = await executeQuery(
            `SELECT 
                id, name, email, role, department, active, 
                created_at, updated_at, last_login
            FROM users WHERE id = ?`,
            [req.user.id]
        );

        if (!users || users.length === 0) {
            throw createError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
        }

        const user = users[0];

        // Estatísticas do usuário (tickets criados/atribuídos)
        const userStats = await executeQuery(`
            SELECT 
                (SELECT COUNT(*) FROM tickets WHERE user_email = ?) as tickets_created,
                (SELECT COUNT(*) FROM tickets WHERE assigned_to = ?) as tickets_assigned,
                (SELECT COUNT(*) FROM tickets WHERE assigned_to = ? AND status = 'resolvido') as tickets_resolved
        `, [user.email, user.id, user.id]);

        const stats = userStats[0] || {};

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    department: user.department,
                    active: user.active,
                    created_at: user.created_at,
                    updated_at: user.updated_at,
                    last_login: user.last_login
                },
                statistics: {
                    tickets_created: stats.tickets_created || 0,
                    tickets_assigned: stats.tickets_assigned || 0,
                    tickets_resolved: stats.tickets_resolved || 0
                }
            }
        });
    })
);

// PUT /api/auth/profile - Atualizar perfil
router.put('/profile', 
    authenticateToken,
    auditLog('profile_update'),
    asyncHandler(async (req, res) => {
        const { name, department, current_password, new_password } = req.body;

        const updates = [];
        const params = [];

        // Atualizar nome se fornecido
        if (name && name.trim() !== '') {
            if (name.length < 2 || name.length > 255) {
                throw createError('Nome deve ter entre 2 e 255 caracteres', 400, 'INVALID_NAME_LENGTH');
            }
            updates.push('name = ?');
            params.push(name.trim());
        }

        // Atualizar departamento se fornecido
        if (department && department.trim() !== '') {
            if (department.length < 2 || department.length > 100) {
                throw createError('Departamento deve ter entre 2 e 100 caracteres', 400, 'INVALID_DEPARTMENT_LENGTH');
            }
            updates.push('department = ?');
            params.push(department.trim());
        }

        // Alterar senha se fornecida
        if (new_password) {
            if (!current_password) {
                throw createError('Senha atual é obrigatória para alterar senha', 400, 'CURRENT_PASSWORD_REQUIRED');
            }

            if (new_password.length < 6) {
                throw createError('Nova senha deve ter pelo menos 6 caracteres', 400, 'PASSWORD_TOO_SHORT');
            }

            // Verificar senha atual
            const users = await executeQuery(
                'SELECT password_hash FROM users WHERE id = ?',
                [req.user.id]
            );

            if (!users || users.length === 0) {
                throw createError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
            }

            const isValidPassword = await bcrypt.compare(current_password, users[0].password_hash);
            if (!isValidPassword) {
                throw createError('Senha atual incorreta', 400, 'INVALID_CURRENT_PASSWORD');
            }

            // Hash da nova senha
            const saltRounds = 12;
            const newPasswordHash = await bcrypt.hash(new_password, saltRounds);
            
            updates.push('password_hash = ?');
            params.push(newPasswordHash);
        }

        if (updates.length === 0) {
            throw createError('Nenhum campo para atualizar', 400, 'NO_UPDATES');
        }

        // Adicionar updated_at
        updates.push('updated_at = NOW()');
        params.push(req.user.id);

        // Executar update
        await executeQuery(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        console.log(`👤 Perfil atualizado: ${req.user.email}`);

        res.json({
            success: true,
            message: 'Perfil atualizado com sucesso'
        });
    })
);

// POST /api/auth/change-password - Alterar senha (rota dedicada)
router.post('/change-password', 
    authenticateToken,
    auditLog('password_change'),
    asyncHandler(async (req, res) => {
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            throw createError('Senha atual e nova senha são obrigatórias', 400, 'MISSING_PASSWORDS');
        }

        if (new_password.length < 6) {
            throw createError('Nova senha deve ter pelo menos 6 caracteres', 400, 'PASSWORD_TOO_SHORT');
        }

        // Buscar senha atual
        const users = await executeQuery(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!users || users.length === 0) {
            throw createError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
        }

        // Verificar senha atual
        const isValidPassword = await bcrypt.compare(current_password, users[0].password_hash);
        if (!isValidPassword) {
            throw createError('Senha atual incorreta', 400, 'INVALID_CURRENT_PASSWORD');
        }

        // Hash da nova senha
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

        // Atualizar senha
        await executeQuery(
            'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
            [newPasswordHash, req.user.id]
        );

        console.log(`🔑 Senha alterada: ${req.user.email}`);

        res.json({
            success: true,
            message: 'Senha alterada com sucesso'
        });
    })
);

// GET /api/auth/verify - Verificar se token é válido
router.get('/verify', 
    authenticateToken,
    asyncHandler(async (req, res) => {
        res.json({
            success: true,
            message: 'Token válido',
            data: {
                user: req.user,
                expires_in: 24 * 60 * 60 // Tempo fixo, pode calcular real se necessário
            }
        });
    })
);

module.exports = router;