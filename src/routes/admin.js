// src/routes/admin.js - Versão Final Simplificada (SEM parâmetros problemáticos)
const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const { authenticateToken, requireAdmin, auditLog } = require('../middleware/auth');
const { createError, asyncHandler } = require('../middleware/errorHandler');

// Middleware: todas as rotas admin requerem autenticação e role admin
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/stats - Estatísticas funcionando
router.get('/stats', auditLog('admin:view_stats'), asyncHandler(async (req, res) => {
    console.log('Admin acessando estatísticas do sistema');
    
    try {
        const userStats = await executeQuery(`
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_users,
                SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END) as inactive_users
            FROM users
        `);

        const ticketStats = await executeQuery(`
            SELECT 
                COUNT(*) as total_tickets,
                SUM(CASE WHEN status = 'aberto' THEN 1 ELSE 0 END) as open_tickets,
                SUM(CASE WHEN status = 'resolvido' THEN 1 ELSE 0 END) as resolved_tickets
            FROM tickets
        `);

        const roleStats = await executeQuery(`
            SELECT role, COUNT(*) as count FROM users GROUP BY role
        `);

        const departmentStats = await executeQuery(`
            SELECT department, COUNT(*) as user_count
            FROM users 
            WHERE department IS NOT NULL
            GROUP BY department
        `);

        res.json({
            success: true,
            stats: {
                users: {
                    total_users: userStats[0]?.total_users || 0,
                    active_users: userStats[0]?.active_users || 0,
                    inactive_users: userStats[0]?.inactive_users || 0,
                    admin_users: roleStats.find(r => r.role === 'admin')?.count || 0,
                    technician_users: roleStats.find(r => r.role === 'technician')?.count || 0,
                    regular_users: roleStats.find(r => r.role === 'user')?.count || 0,
                    locked_users: 0
                },
                tickets: {
                    total_tickets: ticketStats[0]?.total_tickets || 0,
                    open_tickets: ticketStats[0]?.open_tickets || 0,
                    in_progress_tickets: 0,
                    resolved_tickets: ticketStats[0]?.resolved_tickets || 0,
                    closed_tickets: 0,
                    tickets_last_week: 0,
                    tickets_today: 0
                },
                departments: departmentStats || [],
                activity: {
                    new_users_today: 0,
                    active_logins_today: 0
                }
            }
        });

        console.log(`Estatísticas enviadas: ${userStats[0]?.total_users || 0} usuários, ${ticketStats[0]?.total_tickets || 0} tickets`);
        
    } catch (error) {
        console.error('Erro nas estatísticas:', error);
        throw createError('Erro ao carregar estatísticas', 500);
    }
}));

// GET /api/admin/users - VERSÃO ULTRA-SIMPLIFICADA (sem parâmetros que causam problemas)
router.get('/users', asyncHandler(async (req, res) => {
    console.log('Rota admin/users acessada');
    
    try {
        // Query ultra-simples sem parâmetros problemáticos
        const users = await executeQuery('SELECT id, name, email, role, department, active, created_at FROM users ORDER BY created_at DESC LIMIT 10');
        
        console.log(`Usuários carregados: ${users.length}`);
        
        res.json({
            success: true,
            users: users.map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                role_display: user.role === 'admin' ? 'Administrador' : user.role === 'technician' ? 'Técnico' : 'Usuário',
                department: user.department,
                active: Boolean(user.active),
                active_display: user.active ? 'Ativo' : 'Inativo',
                created_at: user.created_at,
                created_at_formatted: new Date(user.created_at).toLocaleString('pt-BR'),
                updated_at: user.created_at,
                last_login: null,
                last_login_formatted: null,
                stats: { assigned_tickets: 0, created_tickets: 0 },
                security: { login_attempts: 0, is_locked: false, locked_until: null }
            })),
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalUsers: users.length,
                hasNext: false,
                hasPrev: false
            }
        });
        
    } catch (error) {
        console.error('Erro na rota admin/users:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}));

// GET /api/admin/users/:id - Detalhes de usuário simples
router.get('/users/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const users = await executeQuery('SELECT * FROM users WHERE id = ?', [id]);

        if (users.length === 0) {
            throw createError('Usuário não encontrado', 404);
        }

        const user = users[0];
        const roleDisplay = {
            'admin': 'Administrador',
            'technician': 'Técnico', 
            'user': 'Usuário'
        };

        const formattedUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            role_display: roleDisplay[user.role] || user.role,
            department: user.department,
            active: Boolean(user.active),
            active_display: user.active ? 'Ativo' : 'Inativo',
            created_at: user.created_at,
            created_at_formatted: new Date(user.created_at).toLocaleString('pt-BR'),
            last_login: user.last_login,
            last_login_formatted: user.last_login ? new Date(user.last_login).toLocaleString('pt-BR') : null,
            detailed_stats: {
                tickets_assigned: 0,
                tickets_created: 0,
                tickets_resolved: 0,
                efficiency: '0'
            },
            security: {
                login_attempts: user.login_attempts || 0,
                is_locked: false,
                locked_until: user.locked_until
            }
        };

        res.json({
            success: true,
            user: formattedUser
        });
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}));

// POST /api/admin/users - Criar novo usuário
router.post('/users', auditLog('admin:create_user'), asyncHandler(async (req, res) => {
    const { name, email, role = 'user', department, password, active = true } = req.body;

    // Validações básicas
    if (!name || !email || !password) {
        throw createError('Nome, email e senha são obrigatórios', 400);
    }

    if (password.length < 6) {
        throw createError('Senha deve ter pelo menos 6 caracteres', 400);
    }

    const validRoles = ['admin', 'technician', 'user'];
    if (!validRoles.includes(role)) {
        throw createError(`Role inválido. Use: ${validRoles.join(', ')}`, 400);
    }

    try {
        // Verificar se email já existe
        const existingUser = await executeQuery('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            throw createError('Email já cadastrado no sistema', 409);
        }

        // Hash da senha
        const bcrypt = require('bcryptjs');
        const password_hash = await bcrypt.hash(password, 12);
        
        // Gerar ID único
        const userId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

        // Inserir usuário
        await executeQuery(`
            INSERT INTO users (id, name, email, password_hash, role, department, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [userId, name.trim(), email.trim().toLowerCase(), password_hash, role, department?.trim(), active]);

        // Buscar usuário criado para resposta
        const newUser = await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
        
        const roleDisplay = {
            'admin': 'Administrador',
            'technician': 'Técnico',
            'user': 'Usuário'
        };

        res.status(201).json({
            success: true,
            message: 'Usuário criado com sucesso',
            user: {
                id: newUser[0].id,
                name: newUser[0].name,
                email: newUser[0].email,
                role: newUser[0].role,
                role_display: roleDisplay[newUser[0].role],
                department: newUser[0].department,
                active: Boolean(newUser[0].active),
                active_display: newUser[0].active ? 'Ativo' : 'Inativo',
                created_at_formatted: new Date(newUser[0].created_at).toLocaleString('pt-BR')
            }
        });

        console.log(`Novo usuário criado: ${name} (${email}) - Role: ${role}`);
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}));

// PUT /api/admin/users/:id - Atualizar usuário
router.put('/users/:id', auditLog('admin:update_user'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, department, role, active } = req.body;

    try {
        // Verificar se usuário existe
        const existingUser = await executeQuery('SELECT * FROM users WHERE id = ?', [id]);
        if (existingUser.length === 0) {
            throw createError('Usuário não encontrado', 404);
        }

        const user = existingUser[0];

        // Não permitir que admin altere seu próprio role
        if (user.role === 'admin' && user.id === req.user.id && role && role !== 'admin') {
            throw createError('Você não pode alterar seu próprio role de admin', 403);
        }

        // Construir campos de atualização
        const updateFields = [];
        const params = [];
        
        if (name !== undefined && name.trim() !== '') {
            updateFields.push('name = ?');
            params.push(name.trim());
        }
        
        if (department !== undefined) {
            updateFields.push('department = ?');
            params.push(department?.trim() || null);
        }
        
        if (role !== undefined) {
            const validRoles = ['admin', 'technician', 'user'];
            if (validRoles.includes(role)) {
                updateFields.push('role = ?');
                params.push(role);
            }
        }
        
        if (active !== undefined) {
            updateFields.push('active = ?');
            params.push(active);
        }

        if (updateFields.length === 0) {
            throw createError('Nenhum campo válido para atualização', 400);
        }

        // Atualizar usuário
        updateFields.push('updated_at = NOW()');
        params.push(id);

        await executeQuery(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, params);

        // Buscar usuário atualizado
        const updatedUser = await executeQuery('SELECT * FROM users WHERE id = ?', [id]);
        const updated = updatedUser[0];

        const roleDisplay = {
            'admin': 'Administrador',
            'technician': 'Técnico',
            'user': 'Usuário'
        };

        res.json({
            success: true,
            message: 'Usuário atualizado com sucesso',
            user: {
                id: updated.id,
                name: updated.name,
                email: updated.email,
                role: updated.role,
                role_display: roleDisplay[updated.role],
                department: updated.department,
                active: Boolean(updated.active),
                active_display: updated.active ? 'Ativo' : 'Inativo'
            }
        });

        console.log(`Usuário atualizado: ${updated.name} (${updated.email})`);
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}));

// POST /api/admin/users/:id/reset-password - Reset de senha
router.post('/users/:id/reset-password', auditLog('admin:reset_password'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
        throw createError('Nova senha deve ter pelo menos 6 caracteres', 400);
    }

    try {
        const users = await executeQuery('SELECT id, name FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            throw createError('Usuário não encontrado', 404);
        }

        const bcrypt = require('bcryptjs');
        const password_hash = await bcrypt.hash(new_password, 12);

        await executeQuery(`
            UPDATE users 
            SET password_hash = ?, 
                login_attempts = 0, 
                locked_until = NULL,
                updated_at = NOW()
            WHERE id = ?
        `, [password_hash, id]);

        res.json({
            success: true,
            message: `Senha do usuário ${users[0].name} resetada com sucesso`
        });

        console.log(`Senha resetada para usuário: ${users[0].name} (ID: ${id})`);
    } catch (error) {
        console.error('Erro ao resetar senha:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}));

// DELETE /api/admin/users/:id - Desativar usuário
router.delete('/users/:id', auditLog('admin:deactivate_user'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const users = await executeQuery('SELECT * FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            throw createError('Usuário não encontrado', 404);
        }

        const user = users[0];

        // Não permitir desativar próprio usuário admin
        if (user.role === 'admin' && user.id === req.user.id) {
            throw createError('Você não pode desativar sua própria conta de admin', 403);
        }

        await executeQuery('UPDATE users SET active = 0, updated_at = NOW() WHERE id = ?', [id]);

        res.json({
            success: true,
            message: `Usuário ${user.name} desativado com sucesso`
        });

        console.log(`Usuário desativado: ${user.name} (ID: ${id})`);
    } catch (error) {
        console.error('Erro ao desativar usuário:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;