// src/models/User.js - Model de User com validações
const bcrypt = require('bcryptjs');
const { isValidEmail } = require('../middleware/validation');

class User {
    // Validação para criação de usuário
    static validate(data) {
        const errors = [];
        
        // Campos obrigatórios
        const required = ['name', 'email', 'department'];
        required.forEach(field => {
            if (!data[field] || data[field].toString().trim() === '') {
                errors.push(`Campo obrigatório: ${field}`);
            }
        });

        // Validar email
        if (data.email && !isValidEmail(data.email)) {
            errors.push('Email inválido');
        }

        // Validar role
        if (data.role && !this.getValidRoles().includes(data.role)) {
            errors.push(`Role inválido. Use: ${this.getValidRoles().join(', ')}`);
        }

        // Validar comprimentos
        if (data.name && (data.name.length < 2 || data.name.length > 255)) {
            errors.push('Nome deve ter entre 2 e 255 caracteres');
        }

        if (data.department && (data.department.length < 2 || data.department.length > 100)) {
            errors.push('Departamento deve ter entre 2 e 100 caracteres');
        }

        // Validar senha se fornecida
        if (data.password && data.password.length < 6) {
            errors.push('Senha deve ter pelo menos 6 caracteres');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Validação para atualização de perfil
    static validateUpdate(data) {
        const errors = [];
        const allowedFields = ['name', 'department', 'password'];
        
        const updateFields = Object.keys(data).filter(key => allowedFields.includes(key));
        
        if (updateFields.length === 0) {
            errors.push('Nenhum campo válido para atualização');
        }

        // Validar campos específicos se fornecidos
        if (data.name && (data.name.length < 2 || data.name.length > 255)) {
            errors.push('Nome deve ter entre 2 e 255 caracteres');
        }

        if (data.department && (data.department.length < 2 || data.department.length > 100)) {
            errors.push('Departamento deve ter entre 2 e 100 caracteres');
        }

        if (data.password && data.password.length < 6) {
            errors.push('Senha deve ter pelo menos 6 caracteres');
        }

        return {
            isValid: errors.length === 0,
            errors,
            updateFields
        };
    }

    // Validação para mudança de senha
    static validatePasswordChange(data) {
        const errors = [];
        
        if (!data.current_password) {
            errors.push('Senha atual é obrigatória');
        }

        if (!data.new_password) {
            errors.push('Nova senha é obrigatória');
        }

        if (data.new_password && data.new_password.length < 6) {
            errors.push('Nova senha deve ter pelo menos 6 caracteres');
        }

        if (data.new_password === data.current_password) {
            errors.push('Nova senha deve ser diferente da atual');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Sanitizar dados de entrada
    static sanitize(data) {
        const sanitized = {};
        
        if (data.name) sanitized.name = data.name.trim();
        if (data.email) sanitized.email = data.email.trim().toLowerCase();
        if (data.department) sanitized.department = data.department.trim();
        if (data.role) sanitized.role = data.role.toLowerCase();

        return sanitized;
    }

    // Preparar dados para criação
    static async prepareForCreation(data) {
        const { generateId } = require('../utils/helpers');
        
        let passwordHash = null;
        if (data.password) {
            passwordHash = await bcrypt.hash(data.password, 12);
        }

        return {
            id: generateId(),
            name: data.name,
            email: data.email,
            password_hash: passwordHash,
            role: data.role || 'user',
            department: data.department,
            active: true,
            login_attempts: 0,
            locked_until: null,
            refresh_token: null,
            created_at: new Date(),
            updated_at: new Date()
        };
    }

    // Hash de senha
    static async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    // Verificar senha
    static async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    // Preparar dados seguros para resposta (sem senha)
    static sanitizeForResponse(user) {
        if (!user) return null;

        const { password_hash, refresh_token, login_attempts, locked_until, ...safeUser } = user;
        return safeUser;
    }

    // Verificar se usuário está bloqueado
    static isLocked(user) {
        if (!user.locked_until) return false;
        return new Date(user.locked_until) > new Date();
    }

    // Verificar se precisa bloquear por tentativas
    static shouldLock(user) {
        return (user.login_attempts || 0) >= 5;
    }

    // Calcular tempo de bloqueio
    static getLockDuration() {
        return 30 * 60 * 1000; // 30 minutos
    }

    // Gerar dados de bloqueio
    static generateLockData(attempts = 0) {
        const newAttempts = attempts + 1;
        const lockUntil = newAttempts >= 5 
            ? new Date(Date.now() + this.getLockDuration()) 
            : null;

        return {
            login_attempts: newAttempts,
            locked_until: lockUntil
        };
    }

    // Resetar dados de bloqueio
    static resetLockData() {
        return {
            login_attempts: 0,
            locked_until: null
        };
    }

    // Validar credenciais de login
    static validateLoginCredentials(data) {
        const errors = [];

        if (!data.email || data.email.trim() === '') {
            errors.push('Email/usuário é obrigatório');
        }

        if (!data.password || data.password.trim() === '') {
            errors.push('Senha é obrigatória');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Preparar token payload
    static prepareTokenPayload(user) {
        return {
            userId: user.id,
            email: user.email,
            role: user.role,
            department: user.department
        };
    }

    // Verificar permissões
    static hasPermission(user, action, resource) {
        const permissions = this.getRolePermissions(user.role);
        
        if (user.role === 'admin') {
            return true; // Admin tem todas as permissões
        }

        const key = `${action}:${resource}`;
        return permissions.includes(key) || permissions.includes(`${action}:*`);
    }

    // Obter permissões por role
    static getRolePermissions(role) {
        const permissions = {
            admin: ['*:*'], // Todas as permissões
            technician: [
                'read:tickets',
                'update:tickets', 
                'create:tickets',
                'read:users',
                'read:dashboard',
                'read:reports',
                'create:notes'
            ],
            user: [
                'create:tickets',
                'read:own_tickets',
                'read:dashboard'
            ]
        };

        return permissions[role] || permissions.user;
    }

    // Verificar se pode acessar ticket
    static canAccessTicket(user, ticket) {
        if (user.role === 'admin' || user.role === 'technician') {
            return true;
        }

        // Usuário comum só pode acessar seus próprios tickets
        return ticket.user_email === user.email;
    }

    // Verificar se pode modificar ticket
    static canModifyTicket(user, ticket) {
        if (user.role === 'admin') {
            return true;
        }

        if (user.role === 'technician') {
            return true; // Técnicos podem modificar qualquer ticket
        }

        return false; // Usuários comuns não podem modificar
    }

    // Validar dados do profile
    static validateProfile(data) {
        const errors = [];

        if (data.name && (data.name.length < 2 || data.name.length > 255)) {
            errors.push('Nome deve ter entre 2 e 255 caracteres');
        }

        if (data.department && (data.department.length < 2 || data.department.length > 100)) {
            errors.push('Departamento deve ter entre 2 e 100 caracteres');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Constantes de validação
    static getValidRoles() {
        return ['admin', 'technician', 'user'];
    }

    static getValidDepartments() {
        return [
            'Administração',
            'Financeiro', 
            'Vendas',
            'Marketing',
            'Produção',
            'Tecnologia da Informação',
            'Recursos Humanos'
        ];
    }

    // Métodos de análise
    static getRoleDisplay(role) {
        const displays = {
            admin: 'Administrador',
            technician: 'Técnico',
            user: 'Usuário'
        };
        return displays[role] || role;
    }

    static isActive(user) {
        return user.active === true || user.active === 1;
    }

    static getLastLoginFormatted(user) {
        if (!user.last_login) return 'Nunca';
        return new Date(user.last_login).toLocaleString('pt-BR');
    }

    static getCreatedAtFormatted(user) {
        return new Date(user.created_at).toLocaleString('pt-BR');
    }

    // Métodos para estatísticas
    static async calculateUserStats(userId, executeQuery) {
        const stats = await executeQuery(`
            SELECT 
                (SELECT COUNT(*) FROM tickets WHERE user_email = (SELECT email FROM users WHERE id = ?)) as tickets_created,
                (SELECT COUNT(*) FROM tickets WHERE assigned_to = ?) as tickets_assigned,
                (SELECT COUNT(*) FROM tickets WHERE assigned_to = ? AND status = 'resolvido') as tickets_resolved,
                (SELECT COUNT(*) FROM ticket_notes WHERE author = (SELECT name FROM users WHERE id = ?)) as notes_created
        `, [userId, userId, userId, userId]);

        return stats[0] || {
            tickets_created: 0,
            tickets_assigned: 0,
            tickets_resolved: 0,
            notes_created: 0
        };
    }

    // Formatação para display
    static formatForDisplay(user) {
        if (!user) return null;

        return {
            ...this.sanitizeForResponse(user),
            role_display: this.getRoleDisplay(user.role),
            active_display: this.isActive(user) ? 'Ativo' : 'Inativo',
            last_login_formatted: this.getLastLoginFormatted(user),
            created_at_formatted: this.getCreatedAtFormatted(user),
            is_locked: this.isLocked(user)
        };
    }

    // Verificar força da senha
    static checkPasswordStrength(password) {
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        const score = Object.values(checks).filter(Boolean).length;
        
        let strength = 'Muito Fraca';
        if (score >= 4) strength = 'Forte';
        else if (score >= 3) strength = 'Média';
        else if (score >= 2) strength = 'Fraca';

        return {
            score,
            strength,
            checks,
            isStrong: score >= 4
        };
    }
}

module.exports = User;