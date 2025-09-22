// src/routes/users.js - Rotas de Usuários
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { validateUser, validateQueryParams, validateId } = require('../middleware/validation');
const { executeQuery } = require('../config/database');
const { generateId, logActivity } = require('../utils/helpers');

// GET /api/users - Listar usuários
router.get('/', validateQueryParams, asyncHandler(async (req, res) => {
    const { role, department, search, limit, offset } = req.query;
    
    let query = 'SELECT id, name, email, role, department, created_at FROM users WHERE 1=1';
    let params = [];
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    let countParams = [];
    
    // Aplicar filtros
    if (role) {
        query += ' AND role = ?';
        countQuery += ' AND role = ?';
        params.push(role);
        countParams.push(role);
    }
    
    if (department) {
        query += ' AND department = ?';
        countQuery += ' AND department = ?';
        params.push(department);
        countParams.push(department);
    }
    
    if (search) {
        query += ' AND (name LIKE ? OR email LIKE ? OR department LIKE ?)';
        countQuery += ' AND (name LIKE ? OR email LIKE ? OR department LIKE ?)';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
        countParams.push(searchParam, searchParam, searchParam);
    }
    
    // Ordenar por nome
    query += ' ORDER BY name ASC';
    
    // Paginação
    if (limit) {
        query += ' LIMIT ?';
        params.push(parseInt(limit));
        
        if (offset) {
            query += ' OFFSET ?';
            params.push(parseInt(offset));
        }
    }
    
    // Executar queries
    const [users, totalResult] = await Promise.all([
        executeQuery(query, params),
        executeQuery(countQuery, countParams)
    ]);
    
    const totalCount = totalResult[0].total || totalResult[0]['COUNT(*)'] || 0;

    res.json({
        success: true,
        data: {
            users,
            total_count: totalCount,
            filtered_count: users.length,
            pagination: {
                limit: limit ? parseInt(limit) : null,
                offset: offset ? parseInt(offset) : null,
                has_more: limit && offset ? (parseInt(offset) + parseInt(limit)) < totalCount : false
            }
        }
    });

    console.log(`👥 Lista de usuários consultada - ${users.length}/${totalCount} usuários`);
}));

// GET /api/users/:id - Buscar usuário específico
router.get('/:id', validateId(), asyncHandler(async (req, res) => {
    const userId = req.params.id;
    
    // Buscar usuário
    const users = await executeQuery(
        'SELECT id, name, email, role, department, created_at, updated_at FROM users WHERE id = ?', 
        [userId]
    );
    
    if (users.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Usuário não encontrado'
        });
    }

    const user = users[0];

    // Buscar estatísticas do usuário (tickets criados/atribuídos)
    const [createdTickets, assignedTickets] = await Promise.all([
        executeQuery(
            'SELECT COUNT(*) as count FROM tickets WHERE user_email = ?',
            [user.email]
        ),
        executeQuery(
            'SELECT COUNT(*) as count FROM tickets WHERE assigned_to = ?',
            [userId]
        )
    ]);

    // Buscar tickets recentes criados pelo usuário
    const recentTickets = await executeQuery(
        'SELECT id, title, status, priority, created_at FROM tickets WHERE user_email = ? ORDER BY created_at DESC LIMIT 5',
        [user.email]
    );

    // Adicionar estatísticas ao usuário
    user.statistics = {
        tickets_created: createdTickets[0].count || createdTickets[0]['COUNT(*)'] || 0,
        tickets_assigned: assignedTickets[0].count || assignedTickets[0]['COUNT(*)'] || 0,
        recent_tickets: recentTickets
    };

    res.json({
        success: true,
        data: user
    });

    console.log(`👤 Usuário consultado: ${userId} - ${user.name}`);
}));

// POST /api/users - Criar novo usuário
router.post('/', validateUser, asyncHandler(async (req, res) => {
    const { name, email, role, department } = req.body;

    // Verificar se email já existe
    const existingUsers = await executeQuery('SELECT id FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
        return res.status(409).json({
            success: false,
            message: 'Email já está em uso',
            code: 'EMAIL_ALREADY_EXISTS'
        });
    }

    const newUser = {
        id: generateId(),
        name,
        email,
        role,
        department
    };

    // Inserir usuário
    await executeQuery(
        'INSERT INTO users (id, name, email, role, department) VALUES (?, ?, ?, ?, ?)',
        [newUser.id, newUser.name, newUser.email, newUser.role, newUser.department]
    );

    // Registrar atividade
    await logActivity(null, 'user_created', `Usuário ${name} criado com role ${role}`, 'Sistema');

    // Buscar usuário criado
    const createdUser = await executeQuery(
        'SELECT id, name, email, role, department, created_at FROM users WHERE id = ?',
        [newUser.id]
    );

    res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: createdUser[0]
    });

    console.log(`👤 Usuário criado: ${newUser.name} (${newUser.email}) - ${newUser.role}`);
}));

// PUT /api/users/:id - Atualizar usuário
router.put('/:id', validateId(), asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const updates = req.body;
    
    // Verificar se usuário existe
    const existingUsers = await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (existingUsers.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Usuário não encontrado'
        });
    }

    const currentUser = existingUsers[0];
    
    // Campos permitidos para atualização
    const allowedUpdates = ['name', 'email', 'role', 'department'];
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key) && updates[key] !== undefined) {
            // Validações específicas
            if (key === 'email' && updates[key] !== currentUser.email) {
                // Verificar se novo email já existe
                const emailCheck = executeQuery('SELECT id FROM users WHERE email = ? AND id != ?', [updates[key], userId]);
                if (emailCheck.length > 0) {
                    throw new Error('Email já está em uso');
                }
            }
            
            if (key === 'role' && !['admin', 'technician', 'user'].includes(updates[key])) {
                throw new Error('Role inválido');
            }
            
            updateFields.push(`${key} = ?`);
            updateValues.push(key === 'email' ? updates[key].toLowerCase().trim() : updates[key].toString().trim());
        }
    });

    if (updateFields.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Nenhum campo válido para atualização'
        });
    }

    // Adicionar updated_at
    updateFields.push('updated_at = ?');
    updateValues.push(new Date());

    // Executar update
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    updateValues.push(userId);
    
    await executeQuery(query, updateValues);

    // Registrar atividade
    const changedFields = Object.keys(updates).filter(key => allowedUpdates.includes(key));
    await logActivity(
        null, 
        'user_updated', 
        `Usuário ${currentUser.name} atualizado: ${changedFields.join(', ')}`, 
        updates.updated_by || 'Sistema'
    );

    // Buscar usuário atualizado
    const updatedUser = await executeQuery(
        'SELECT id, name, email, role, department, created_at, updated_at FROM users WHERE id = ?',
        [userId]
    );

    res.json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: updatedUser[0]
    });

    console.log(`✏️ Usuário atualizado: ${userId} - ${changedFields.join(', ')}`);
}));

// DELETE /api/users/:id - Deletar usuário
router.delete('/:id', validateId(), asyncHandler(async (req, res) => {
    const userId = req.params.id;
    
    // Verificar se usuário existe
    const existingUsers = await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (existingUsers.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Usuário não encontrado'
        });
    }

    const user = existingUsers[0];

    // Verificar se usuário tem tickets atribuídos
    const assignedTickets = await executeQuery(
        'SELECT COUNT(*) as count FROM tickets WHERE assigned_to = ? AND status NOT IN ("resolvido", "fechado")',
        [userId]
    );

    const activeTicketsCount = assignedTickets[0].count || assignedTickets[0]['COUNT(*)'] || 0;

    if (activeTicketsCount > 0) {
        return res.status(400).json({
            success: false,
            message: `Não é possível deletar usuário. Existem ${activeTicketsCount} tickets ativos atribuídos a ele.`,
            code: 'USER_HAS_ACTIVE_TICKETS'
        });
    }

    // Remover atribuições de tickets resolvidos/fechados (set NULL)
    await executeQuery('UPDATE tickets SET assigned_to = NULL WHERE assigned_to = ?', [userId]);

    // Deletar usuário
    await executeQuery('DELETE FROM users WHERE id = ?', [userId]);

    // Registrar atividade
    await logActivity(null, 'user_deleted', `Usuário ${user.name} (${user.email}) deletado`, 'Sistema');

    res.json({
        success: true,
        message: 'Usuário deletado com sucesso',
        data: user
    });

    console.log(`🗑️ Usuário deletado: ${userId} - ${user.name}`);
}));

// GET /api/users/role/:role - Usuários por role
router.get('/role/:role', validateQueryParams, asyncHandler(async (req, res) => {
    const { role } = req.params;
    const { limit = 50 } = req.query;
    
    const validRoles = ['admin', 'technician', 'user'];
    
    if (!validRoles.includes(role)) {
        return res.status(400).json({
            success: false,
            message: 'Role inválido',
            valid_roles: validRoles
        });
    }

    const users = await executeQuery(
        'SELECT id, name, email, role, department, created_at FROM users WHERE role = ? ORDER BY name ASC LIMIT ?',
        [role, parseInt(limit)]
    );

    res.json({
        success: true,
        data: {
            role,
            users,
            count: users.length
        }
    });
}));

// GET /api/users/department/:department - Usuários por departamento
router.get('/department/:department', validateQueryParams, asyncHandler(async (req, res) => {
    const { department } = req.params;
    const { limit = 50 } = req.query;

    const users = await executeQuery(
        'SELECT id, name, email, role, department, created_at FROM users WHERE department = ? ORDER BY name ASC LIMIT ?',
        [department, parseInt(limit)]
    );

    res.json({
        success: true,
        data: {
            department,
            users,
            count: users.length
        }
    });
}));

// GET /api/users/:id/tickets - Tickets do usuário
router.get('/:id/tickets', validateId(), validateQueryParams, asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const { type = 'all', limit = 20, offset = 0 } = req.query;
    
    // Verificar se usuário existe
    const existingUsers = await executeQuery('SELECT email FROM users WHERE id = ?', [userId]);
    
    if (existingUsers.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Usuário não encontrado'
        });
    }

    const userEmail = existingUsers[0].email;
    let query, params, countQuery, countParams;

    if (type === 'created') {
        // Tickets criados pelo usuário
        query = 'SELECT * FROM tickets WHERE user_email = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params = [userEmail, parseInt(limit), parseInt(offset)];
        countQuery = 'SELECT COUNT(*) as total FROM tickets WHERE user_email = ?';
        countParams = [userEmail];
    } else if (type === 'assigned') {
        // Tickets atribuídos ao usuário
        query = 'SELECT * FROM tickets WHERE assigned_to = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params = [userId, parseInt(limit), parseInt(offset)];
        countQuery = 'SELECT COUNT(*) as total FROM tickets WHERE assigned_to = ?';
        countParams = [userId];
    } else {
        // Todos os tickets relacionados ao usuário
        query = 'SELECT * FROM tickets WHERE user_email = ? OR assigned_to = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params = [userEmail, userId, parseInt(limit), parseInt(offset)];
        countQuery = 'SELECT COUNT(*) as total FROM tickets WHERE user_email = ? OR assigned_to = ?';
        countParams = [userEmail, userId];
    }

    const [tickets, totalResult] = await Promise.all([
        executeQuery(query, params),
        executeQuery(countQuery, countParams)
    ]);

    const totalCount = totalResult[0].total || totalResult[0]['COUNT(*)'] || 0;

    res.json({
        success: true,
        data: {
            user_id: userId,
            type,
            tickets,
            total_count: totalCount,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                has_more: (parseInt(offset) + parseInt(limit)) < totalCount
            }
        }
    });
}));

// GET /api/users/stats - Estatísticas gerais dos usuários
router.get('/stats/overview', asyncHandler(async (req, res) => {
    // Estatísticas por role
    const roleStats = await executeQuery(`
        SELECT 
            role,
            COUNT(*) as count
        FROM users 
        GROUP BY role
    `);

    // Estatísticas por departamento
    const departmentStats = await executeQuery(`
        SELECT 
            department,
            COUNT(*) as count
        FROM users 
        GROUP BY department
        ORDER BY count DESC
        LIMIT 10
    `);

    // Usuários mais ativos (que mais criam tickets)
    const activeUsers = await executeQuery(`
        SELECT 
            u.id,
            u.name,
            u.email,
            u.department,
            COUNT(t.id) as tickets_created
        FROM users u
        LEFT JOIN tickets t ON u.email = t.user_email
        GROUP BY u.id, u.name, u.email, u.department
        ORDER BY tickets_created DESC
        LIMIT 10
    `);

    // Técnicos com mais tickets atribuídos
    const busyTechnicians = await executeQuery(`
        SELECT 
            u.id,
            u.name,
            u.email,
            COUNT(t.id) as tickets_assigned,
            SUM(CASE WHEN t.status IN ('aberto', 'andamento') THEN 1 ELSE 0 END) as active_tickets
        FROM users u
        LEFT JOIN tickets t ON u.id = t.assigned_to
        WHERE u.role IN ('technician', 'admin')
        GROUP BY u.id, u.name, u.email
        ORDER BY tickets_assigned DESC
        LIMIT 10
    `);

    // Novos usuários (últimos 30 dias)
    const newUsers = await executeQuery(`
        SELECT COUNT(*) as count
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    res.json({
        success: true,
        data: {
            by_role: roleStats.reduce((acc, item) => {
                acc[item.role] = item.count;
                return acc;
            }, {}),
            by_department: departmentStats.reduce((acc, item) => {
                acc[item.department] = item.count;
                return acc;
            }, {}),
            most_active_users: activeUsers,
            busiest_technicians: busyTechnicians,
            new_users_30d: newUsers[0].count || newUsers[0]['COUNT(*)'] || 0,
            total_users: roleStats.reduce((sum, item) => sum + item.count, 0)
        }
    });
}));

module.exports = router;