// src/services/AuthService.js - Lógica de negócio para autenticação
const { executeQuery } = require('../config/database');
const User = require('../models/User');
const { 
    generateToken, 
    generateRefreshToken, 
    verifyToken 
} = require('../middleware/auth');

class AuthService {
    // Login do usuário
    static async login(credentials) {
        // Validar credenciais
        const validation = User.validateLoginCredentials(credentials);
        if (!validation.isValid) {
            throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
        }

        const { email, password } = credentials;

        // Buscar usuário no banco
        const users = await executeQuery(
            'SELECT id, name, email, password_hash, role, department, active, login_attempts, locked_until FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        if (!users || users.length === 0) {
            throw new Error('Credenciais inválidas');
        }

        const user = users[0];

        // Verificar se conta está ativa
        if (!User.isActive(user)) {
            throw new Error('Conta desativada. Contate o administrador.');
        }

        // Verificar se conta está bloqueada
        if (User.isLocked(user)) {
            const unlockTime = new Date(user.locked_until).toLocaleString('pt-BR');
            throw new Error(`Conta bloqueada até ${unlockTime}`);
        }

        // Verificar senha
        const isValidPassword = await User.verifyPassword(password, user.password_hash);
        
        if (!isValidPassword) {
            // Incrementar tentativas de login falhadas
            const lockData = User.generateLockData(user.login_attempts || 0);
            
            await executeQuery(
                'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?',
                [lockData.login_attempts, lockData.locked_until, user.id]
            );

            if (lockData.locked_until) {
                throw new Error('Muitas tentativas falhadas. Conta bloqueada por 30 minutos.');
            }

            throw new Error('Credenciais inválidas');
        }

        // Login bem-sucedido - resetar tentativas e gerar tokens
        const resetData = User.resetLockData();
        await executeQuery(
            'UPDATE users SET login_attempts = ?, locked_until = ?, last_login = ? WHERE id = ?',
            [resetData.login_attempts, resetData.locked_until, new Date(), user.id]
        );

        // Gerar tokens
        const tokenPayload = User.prepareTokenPayload(user);
        const accessToken = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Salvar refresh token no banco
        await executeQuery(
            'UPDATE users SET refresh_token = ? WHERE id = ?',
            [refreshToken, user.id]
        );

        return {
            user: User.sanitizeForResponse(user),
            tokens: {
                access_token: accessToken,
                refresh_token: refreshToken,
                token_type: 'Bearer',
                expires_in: 24 * 60 * 60 // 24 horas
            }
        };
    }

    // Logout do usuário
    static async logout(userId) {
        if (!userId) {
            throw new Error('ID do usuário é obrigatório');
        }

        // Invalidar refresh token no banco
        await executeQuery(
            'UPDATE users SET refresh_token = NULL WHERE id = ?',
            [userId]
        );

        return { success: true };
    }

    // Renovar access token
    static async refreshToken(refreshToken) {
        if (!refreshToken) {
            throw new Error('Refresh token é obrigatório');
        }

        // Verificar refresh token
        const decoded = await verifyToken(refreshToken);
        if (!decoded) {
            throw new Error('Refresh token inválido ou expirado');
        }

        // Verificar se refresh token existe no banco
        const users = await executeQuery(
            'SELECT id, name, email, role, department, active, refresh_token FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!users || users.length === 0) {
            throw new Error('Usuário não encontrado');
        }

        const user = users[0];

        if (!User.isActive(user)) {
            throw new Error('Conta desativada');
        }

        if (user.refresh_token !== refreshToken) {
            throw new Error('Refresh token inválido');
        }

        // Gerar novo access token
        const newTokenPayload = User.prepareTokenPayload(user);
        const newAccessToken = generateToken(newTokenPayload);

        return {
            access_token: newAccessToken,
            token_type: 'Bearer',
            expires_in: 24 * 60 * 60
        };
    }

    // Registrar novo usuário (apenas admins)
    static async register(userData, requestingUser) {
        // Verificar permissões
        if (!requestingUser || requestingUser.role !== 'admin') {
            throw new Error('Apenas administradores podem registrar usuários');
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

        if (existingUsers && existingUsers.length > 0) {
            throw new Error('Email já cadastrado');
        }

        // Preparar dados para criação
        const userToCreate = await User.prepareForCreation({
            ...sanitizedData,
            password: userData.password
        });

        // Inserir usuário
        await executeQuery(
            `INSERT INTO users (
                id, name, email, password_hash, role, department, 
                active, login_attempts, locked_until, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userToCreate.id, userToCreate.name, userToCreate.email, 
                userToCreate.password_hash, userToCreate.role, userToCreate.department,
                userToCreate.active, userToCreate.login_attempts, userToCreate.locked_until,
                userToCreate.created_at, userToCreate.updated_at
            ]
        );

        return User.sanitizeForResponse(userToCreate);
    }

    // Obter perfil do usuário
    static async getProfile(userId) {
        if (!userId) {
            throw new Error('ID do usuário é obrigatório');
        }

        // Buscar dados completos do usuário
        const users = await executeQuery(
            `SELECT 
                id, name, email, role, department, active, 
                created_at, updated_at, last_login
            FROM users WHERE id = ?`,
            [userId]
        );

        if (!users || users.length === 0) {
            throw new Error('Usuário não encontrado');
        }

        const user = users[0];

        // Buscar estatísticas do usuário
        const stats = await User.calculateUserStats(userId, executeQuery);

        return {
            user: User.formatForDisplay(user),
            statistics: stats
        };
    }

    // Atualizar perfil
    static async updateProfile(userId, updateData) {
        if (!userId) {
            throw new Error('ID do usuário é obrigatório');
        }

        // Validar dados de atualização
        const validation = User.validateProfile(updateData);
        if (!validation.isValid) {
            throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
        }

        // Verificar se usuário existe
        const users = await executeQuery('SELECT id FROM users WHERE id = ?', [userId]);
        if (!users || users.length === 0) {
            throw new Error('Usuário não encontrado');
        }

        const updates = [];
        const params = [];

        // Atualizar campos permitidos
        if (updateData.name && updateData.name.trim() !== '') {
            updates.push('name = ?');
            params.push(updateData.name.trim());
        }

        if (updateData.department && updateData.department.trim() !== '') {
            updates.push('department = ?');
            params.push(updateData.department.trim());
        }

        if (updates.length === 0) {
            throw new Error('Nenhum campo para atualizar');
        }

        // Adicionar updated_at
        updates.push('updated_at = ?');
        params.push(new Date());
        params.push(userId);

        // Executar update
        await executeQuery(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        return { success: true };
    }

    // Alterar senha
    static async changePassword(userId, passwordData) {
        if (!userId) {
            throw new Error('ID do usuário é obrigatório');
        }

        // Validar dados da senha
        const validation = User.validatePasswordChange(passwordData);
        if (!validation.isValid) {
            throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
        }

        // Buscar senha atual
        const users = await executeQuery(
            'SELECT password_hash FROM users WHERE id = ?',
            [userId]
        );

        if (!users || users.length === 0) {
            throw new Error('Usuário não encontrado');
        }

        // Verificar senha atual
        const isValidPassword = await User.verifyPassword(
            passwordData.current_password, 
            users[0].password_hash
        );
        
        if (!isValidPassword) {
            throw new Error('Senha atual incorreta');
        }

        // Hash da nova senha
        const newPasswordHash = await User.hashPassword(passwordData.new_password);

        // Atualizar senha
        await executeQuery(
            'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
            [newPasswordHash, new Date(), userId]
        );

        return { success: true };
    }

    // Verificar se token é válido
    static async verifyAccessToken(token) {
        if (!token) {
            throw new Error('Token é obrigatório');
        }

        const decoded = await verifyToken(token);
        if (!decoded) {
            throw new Error('Token inválido ou expirado');
        }

        // Verificar se usuário ainda existe e está ativo
        const users = await executeQuery(
            'SELECT id, name, email, role, department, active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!users || users.length === 0) {
            throw new Error('Usuário não encontrado');
        }

        const user = users[0];
        
        if (!User.isActive(user)) {
            throw new Error('Conta desativada');
        }

        return {
            user: User.sanitizeForResponse(user),
            expires_in: 24 * 60 * 60 // Tempo fixo
        };
    }

    // Buscar usuário por ID
    static async findUserById(userId) {
        if (!userId) {
            throw new Error('ID do usuário é obrigatório');
        }

        const users = await executeQuery(
            'SELECT id, name, email, role, department, active, created_at, updated_at, last_login FROM users WHERE id = ?',
            [userId]
        );

        if (!users || users.length === 0) {
            return null;
        }

        return User.formatForDisplay(users[0]);
    }

    // Verificar permissões do usuário
    static async checkPermissions(userId, action, resource) {
        const user = await this.findUserById(userId);
        if (!user) {
            return false;
        }

        return User.hasPermission(user, action, resource);
    }

    // Listar usuários (para admins)
    static async listUsers(requestingUser, filters = {}) {
        if (!requestingUser || requestingUser.role !== 'admin') {
            throw new Error('Apenas administradores podem listar usuários');
        }

        let query = 'SELECT id, name, email, role, department, active, created_at, updated_at, last_login FROM users WHERE 1=1';
        let params = [];

        // Aplicar filtros
        if (filters.role) {
            query += ' AND role = ?';
            params.push(filters.role);
        }

        if (filters.department) {
            query += ' AND department = ?';
            params.push(filters.department);
        }

        if (filters.active !== undefined) {
            query += ' AND active = ?';
            params.push(filters.active ? 1 : 0);
        }

        query += ' ORDER BY created_at DESC';

        // Aplicar limite
        const limit = Math.min(parseInt(filters.limit || 50), 100);
        query += ` LIMIT ${limit}`;

        const users = await executeQuery(query, params);

        return users.map(user => User.formatForDisplay(user));
    }
}

module.exports = AuthService;