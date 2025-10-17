// src/services/UserService.js - Lógica de negócio para usuários
const { executeQuery } = require('../config/database');
const User = require('../models/User');

class UserService {
    // Listar usuários com filtros
    static async listUsers(filters = {}, requestingUser = null) {
        // Verificar permissões
        if (!requestingUser || requestingUser.role !== 'admin') {
            throw new Error('Apenas administradores podem listar usuários');
        }

        let query = `
            SELECT id, name, email, role, department, active, 
                   created_at, updated_at, last_login 
            FROM users WHERE 1=1
        `;
        let params = [];

        // Aplicar filtros
        if (filters.role) {
            query += ' AND role = ?';
            params.push(filters.role);
        }

        if (filters.department) {
            query += ' AND department LIKE ?';
            params.push(`%${filters.department}%`);
        }

        if (filters.active !== undefined) {
            query += ' AND active = ?';
            params.push(filters.active ? 1 : 0);
        }

        if (filters.search) {
            query += ' AND (name LIKE ? OR email LIKE ? OR department LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Ordenação
        const validSortFields = ['name', 'email', 'role', 'department', 'created_at', 'last_login'];
        const sortBy = validSortFields.includes(filters.sort_by) ? filters.sort_by : 'created_at';
        const sortOrder = filters.sort_order === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        // Paginação
        const limit = Math.min(parseInt(filters.limit) || 50, 100);
        const offset = parseInt(filters.offset) || 0;
        query += ` LIMIT ${limit} OFFSET ${offset}`;

        // Contar total
        let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
        let countParams = [];

        if (filters.role) {
            countQuery += ' AND role = ?';
            countParams.push(filters.role);
        }

        if (filters.department) {
            countQuery += ' AND department LIKE ?';
            countParams.push(`%${filters.department}%`);
        }

        if (filters.active !== undefined) {
            countQuery += ' AND active = ?';
            countParams.push(filters.active ? 1 : 0);
        }

        if (filters.search) {
            countQuery += ' AND (name LIKE ? OR email LIKE ? OR department LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }

        const [users, totalResult] = await Promise.all([
            executeQuery(query, params),
            executeQuery(countQuery, countParams)
        ]);

        const totalCount = totalResult[0].total || 0;

        return {
            users: users.map(user => User.formatForDisplay(user)),
            total_count: totalCount,
            filtered_count: users.length,
            pagination: {
                limit,
                offset,
                has_more: (offset + limit) < totalCount
            }
        };
    }

    // Buscar usuário por ID
    static async findById(userId, requestingUser = null) {
        // Verificar permissões (apenas admin ou o próprio usuário)
        if (!requestingUser || (requestingUser.role !== 'admin' && requestingUser.id !== userId)) {
            throw new Error('Acesso negado para visualizar dados do usuário');
        }

        const users = await executeQuery(`
            SELECT id, name, email, role, department, active, 
                   created_at, updated_at, last_login
            FROM users WHERE id = ?
        `, [userId]);

        if (users.length === 0) {
            return null;
        }

        const user = users[0];
        const stats = await User.calculateUserStats(userId, executeQuery);

        return {
            user: User.formatForDisplay(user),
            statistics: stats
        };
    }

    // Criar usuário
    static async createUser(userData, requestingUser) {
        // Verificar permissões
        if (!requestingUser || requestingUser.role !== 'admin') {
            throw new Error('Apenas administradores podem criar usuários');
        }

        // Validar dados
        const validation = User.validate(userData);
        if (!validation.isValid) {
            throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
        }

        // Sanitizar dados
        const sanitizedData = User.sanitize(userData);

        // Verificar se email já existe
        const existingUsers = await executeQuery(
            'SELECT id FROM users WHERE email = ?',
            [sanitizedData.email]
        );

        if (existingUsers.length > 0) {
            throw new Error('Email já está em uso');
        }

        // Preparar dados para criação
        const userToCreate = await User.prepareForCreation({
            ...sanitizedData,
            password: userData.password
        });

        // Inserir usuário
        await executeQuery(`
            INSERT INTO users (
                id, name, email, password_hash, role, department, 
                active, login_attempts, locked_until, refresh_token,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            userToCreate.id, userToCreate.name, userToCreate.email, 
            userToCreate.password_hash, userToCreate.role, userToCreate.department,
            userToCreate.active, userToCreate.login_attempts, userToCreate.locked_until, 
            userToCreate.refresh_token, userToCreate.created_at, userToCreate.updated_at
        ]);

        return User.formatForDisplay(userToCreate);
    }

    // Atualizar usuário
    static async updateUser(userId, updateData, requestingUser) {
        // Verificar permissões (admin ou próprio usuário para campos limitados)
        const isAdmin = requestingUser && requestingUser.role === 'admin';
        const isSelf = requestingUser && requestingUser.id === userId;

        if (!isAdmin && !isSelf) {
            throw new Error('Acesso negado para atualizar usuário');
        }

        // Verificar se usuário existe
        const existingUsers = await executeQuery('SELECT id, email FROM users WHERE id = ?', [userId]);
        if (existingUsers.length === 0) {
            throw new Error('Usuário não encontrado');
        }

        const updates = [];
        const params = [];

        // Campos que apenas admin pode alterar
        const adminOnlyFields = ['role', 'active'];
        // Campos que qualquer usuário pode alterar em si mesmo
        const selfEditableFields = ['name', 'department'];

        const allowedFields = isAdmin ? [...adminOnlyFields, ...selfEditableFields] : selfEditableFields;

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                if (field === 'role' && !User.getValidRoles().includes(updateData[field])) {
                    throw new Error('Role inválido');
                }

                if (field === 'active' && typeof updateData[field] !== 'boolean') {
                    throw new Error('Campo active deve ser booleano');
                }

                if (field === 'name' || field === 'department') {
                    if (!updateData[field] || updateData[field].trim().length < 2) {
                        throw new Error(`Campo ${field} deve ter pelo menos 2 caracteres`);
                    }
                    updates.push(`${field} = ?`);
                    params.push(updateData[field].trim());
                } else {
                    updates.push(`${field} = ?`);
                    params.push(updateData[field]);
                }
            }
        }

        if (updates.length === 0) {
            throw new Error('Nenhum campo válido para atualização');
        }

        // Adicionar updated_at
        updates.push('updated_at = ?');
        params.push(new Date());
        params.push(userId);

        // Executar update
        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        await executeQuery(query, params);

        // Retornar usuário atualizado
        const updatedUser = await this.findById(userId, requestingUser);
        return updatedUser;
    }

    // Desativar usuário (soft delete)
    static async deactivateUser(userId, requestingUser) {
        if (!requestingUser || requestingUser.role !== 'admin') {
            throw new Error('Apenas administradores podem desativar usuários');
        }

        if (requestingUser.id === userId) {
            throw new Error('Não é possível desativar a própria conta');
        }

        const user = await this.findById(userId, requestingUser);
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        await executeQuery(
            'UPDATE users SET active = 0, updated_at = ? WHERE id = ?',
            [new Date(), userId]
        );

        return { success: true };
    }

    // Reativar usuário
    static async reactivateUser(userId, requestingUser) {
        if (!requestingUser || requestingUser.role !== 'admin') {
            throw new Error('Apenas administradores podem reativar usuários');
        }

        const user = await this.findById(userId, requestingUser);
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        await executeQuery(
            'UPDATE users SET active = 1, updated_at = ? WHERE id = ?',
            [new Date(), userId]
        );

        return { success: true };
    }

    // Resetar senha de usuário
    static async resetUserPassword(userId, newPassword, requestingUser) {
        if (!requestingUser || requestingUser.role !== 'admin') {
            throw new Error('Apenas administradores podem resetar senhas');
        }

        if (!newPassword || newPassword.length < 6) {
            throw new Error('Nova senha deve ter pelo menos 6 caracteres');
        }

        const user = await this.findById(userId, requestingUser);
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        const passwordHash = await User.hashPassword(newPassword);

        await executeQuery(
            'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
            [passwordHash, new Date(), userId]
        );

        return { success: true };
    }

    // Desbloquear usuário
    static async unlockUser(userId, requestingUser) {
        if (!requestingUser || requestingUser.role !== 'admin') {
            throw new Error('Apenas administradores podem desbloquear usuários');
        }

        const user = await this.findById(userId, requestingUser);
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        const resetData = User.resetLockData();
        await executeQuery(
            'UPDATE users SET login_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?',
            [resetData.login_attempts, resetData.locked_until, new Date(), userId]
        );

        return { success: true };
    }

    // Obter estatísticas de usuários
    static async getUserStats(requestingUser) {
        if (!requestingUser || requestingUser.role !== 'admin') {
            throw new Error('Apenas administradores podem acessar estatísticas');
        }

        const stats = await executeQuery(`
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_users,
                SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END) as inactive_users,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
                SUM(CASE WHEN role = 'technician' THEN 1 ELSE 0 END) as technician_users,
                SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as regular_users,
                SUM(CASE WHEN locked_until IS NOT NULL AND locked_until > NOW() THEN 1 ELSE 0 END) as locked_users
            FROM users
        `);

        // Usuários por departamento
        const departmentStats = await executeQuery(`
            SELECT department, COUNT(*) as count 
            FROM users 
            WHERE active = 1
            GROUP BY department 
            ORDER BY count DESC
        `);

        return {
            overview: stats[0],
            by_department: departmentStats
        };
    }

    // Buscar usuários por departamento
    static async getUsersByDepartment(department, requestingUser) {
        if (!requestingUser || requestingUser.role !== 'admin') {
            throw new Error('Apenas administradores podem buscar por departamento');
        }

        const users = await executeQuery(`
            SELECT id, name, email, role, active, last_login
            FROM users 
            WHERE department = ? AND active = 1
            ORDER BY name ASC
        `, [department]);

        return users.map(user => User.formatForDisplay(user));
    }

    // Alterar role do usuário
    static async changeUserRole(userId, newRole, requestingUser) {
        if (!requestingUser || requestingUser.role !== 'admin') {
            throw new Error('Apenas administradores podem alterar roles');
        }

        if (!User.getValidRoles().includes(newRole)) {
            throw new Error('Role inválido');
        }

        if (requestingUser.id === userId && newRole !== 'admin') {
            throw new Error('Não é possível remover role de admin da própria conta');
        }

        const user = await this.findById(userId, requestingUser);
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        await executeQuery(
            'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
            [newRole, new Date(), userId]
        );

        return { success: true, old_role: user.user.role, new_role: newRole };
    }
}

module.exports = UserService;