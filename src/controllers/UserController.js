// src/controllers/UserController.js - Controller MVC para Usuários
const UserService = require('../services/UserService');
const { createError } = require('../middleware/errorHandler');

class UserController {
    // GET /api/users - Listar usuários
    static async listUsers(req, res, next) {
        try {
            const result = await UserService.listUsers(req.query, req.user);

            res.json({
                success: true,
                data: result
            });

            console.log(`👥 Lista de usuários consultada por ${req.user.email} - ${result.users.length}/${result.total_count} usuários`);
        } catch (error) {
            console.error('❌ Erro ao listar usuários:', error.message);
            
            if (error.message.includes('Apenas administradores')) {
                return next(createError(error.message, 403, 'INSUFFICIENT_PERMISSIONS'));
            }
            
            next(createError(error.message, 400, 'USERS_LIST_ERROR'));
        }
    }

    // GET /api/users/:id - Buscar usuário específico
    static async getUser(req, res, next) {
        try {
            const user = await UserService.findById(req.params.id, req.user);
            
            if (!user) {
                return next(createError('Usuário não encontrado', 404, 'USER_NOT_FOUND'));
            }

            res.json({
                success: true,
                data: user
            });

            console.log(`👤 Usuário consultado: ${user.user.email}`);
        } catch (error) {
            console.error('❌ Erro ao buscar usuário:', error.message);
            
            if (error.message.includes('Acesso negado')) {
                return next(createError(error.message, 403, 'ACCESS_DENIED'));
            }
            
            next(createError(error.message, 400, 'USER_GET_ERROR'));
        }
    }

    // POST /api/users - Criar novo usuário
    static async createUser(req, res, next) {
        try {
            const user = await UserService.createUser(req.body, req.user);

            res.status(201).json({
                success: true,
                message: 'Usuário criado com sucesso',
                data: user
            });

            console.log(`👤 Usuário criado: ${user.email} (${user.role}) por ${req.user.email}`);
        } catch (error) {
            console.error('❌ Erro ao criar usuário:', error.message);
            
            if (error.message.includes('Apenas administradores')) {
                return next(createError(error.message, 403, 'INSUFFICIENT_PERMISSIONS'));
            }
            
            if (error.message.includes('Email já está em uso')) {
                return next(createError(error.message, 409, 'EMAIL_EXISTS'));
            }
            
            next(createError(error.message, 400, 'USER_CREATE_ERROR'));
        }
    }

    // PUT /api/users/:id - Atualizar usuário
    static async updateUser(req, res, next) {
        try {
            const user = await UserService.updateUser(req.params.id, req.body, req.user);

            res.json({
                success: true,
                message: 'Usuário atualizado com sucesso',
                data: user
            });

            console.log(`✏️ Usuário atualizado: ${req.params.id} por ${req.user.email}`);
        } catch (error) {
            console.error('❌ Erro ao atualizar usuário:', error.message);
            
            if (error.message.includes('Acesso negado')) {
                return next(createError(error.message, 403, 'ACCESS_DENIED'));
            }
            
            if (error.message === 'Usuário não encontrado') {
                return next(createError(error.message, 404, 'USER_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'USER_UPDATE_ERROR'));
        }
    }

    // POST /api/users/:id/deactivate - Desativar usuário
    static async deactivateUser(req, res, next) {
        try {
            await UserService.deactivateUser(req.params.id, req.user);

            res.json({
                success: true,
                message: 'Usuário desativado com sucesso'
            });

            console.log(`🔒 Usuário desativado: ${req.params.id} por ${req.user.email}`);
        } catch (error) {
            console.error('❌ Erro ao desativar usuário:', error.message);
            
            if (error.message.includes('Apenas administradores')) {
                return next(createError(error.message, 403, 'INSUFFICIENT_PERMISSIONS'));
            }
            
            if (error.message === 'Usuário não encontrado') {
                return next(createError(error.message, 404, 'USER_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'DEACTIVATE_ERROR'));
        }
    }

    // POST /api/users/:id/reactivate - Reativar usuário
    static async reactivateUser(req, res, next) {
        try {
            await UserService.reactivateUser(req.params.id, req.user);

            res.json({
                success: true,
                message: 'Usuário reativado com sucesso'
            });

            console.log(`🔓 Usuário reativado: ${req.params.id} por ${req.user.email}`);
        } catch (error) {
            console.error('❌ Erro ao reativar usuário:', error.message);
            
            if (error.message.includes('Apenas administradores')) {
                return next(createError(error.message, 403, 'INSUFFICIENT_PERMISSIONS'));
            }
            
            if (error.message === 'Usuário não encontrado') {
                return next(createError(error.message, 404, 'USER_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'REACTIVATE_ERROR'));
        }
    }

    // POST /api/users/:id/reset-password - Resetar senha
    static async resetPassword(req, res, next) {
        try {
            const { new_password } = req.body;
            
            if (!new_password) {
                return next(createError('Nova senha é obrigatória', 400, 'MISSING_PASSWORD'));
            }

            await UserService.resetUserPassword(req.params.id, new_password, req.user);

            res.json({
                success: true,
                message: 'Senha resetada com sucesso'
            });

            console.log(`🔑 Senha resetada para usuário ${req.params.id} por ${req.user.email}`);
        } catch (error) {
            console.error('❌ Erro ao resetar senha:', error.message);
            
            if (error.message.includes('Apenas administradores')) {
                return next(createError(error.message, 403, 'INSUFFICIENT_PERMISSIONS'));
            }
            
            if (error.message === 'Usuário não encontrado') {
                return next(createError(error.message, 404, 'USER_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'RESET_PASSWORD_ERROR'));
        }
    }

    // POST /api/users/:id/unlock - Desbloquear usuário
    static async unlockUser(req, res, next) {
        try {
            await UserService.unlockUser(req.params.id, req.user);

            res.json({
                success: true,
                message: 'Usuário desbloqueado com sucesso'
            });

            console.log(`🔓 Usuário desbloqueado: ${req.params.id} por ${req.user.email}`);
        } catch (error) {
            console.error('❌ Erro ao desbloquear usuário:', error.message);
            
            if (error.message.includes('Apenas administradores')) {
                return next(createError(error.message, 403, 'INSUFFICIENT_PERMISSIONS'));
            }
            
            if (error.message === 'Usuário não encontrado') {
                return next(createError(error.message, 404, 'USER_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'UNLOCK_ERROR'));
        }
    }

    // PUT /api/users/:id/role - Alterar role do usuário
    static async changeRole(req, res, next) {
        try {
            const { role } = req.body;
            
            if (!role) {
                return next(createError('Nova role é obrigatória', 400, 'MISSING_ROLE'));
            }

            const result = await UserService.changeUserRole(req.params.id, role, req.user);

            res.json({
                success: true,
                message: 'Role alterada com sucesso',
                data: result
            });

            console.log(`👤 Role alterada: ${req.params.id} de ${result.old_role} para ${result.new_role} por ${req.user.email}`);
        } catch (error) {
            console.error('❌ Erro ao alterar role:', error.message);
            
            if (error.message.includes('Apenas administradores')) {
                return next(createError(error.message, 403, 'INSUFFICIENT_PERMISSIONS'));
            }
            
            if (error.message === 'Usuário não encontrado') {
                return next(createError(error.message, 404, 'USER_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'CHANGE_ROLE_ERROR'));
        }
    }

    // GET /api/users/stats - Estatísticas de usuários
    static async getStats(req, res, next) {
        try {
            const stats = await UserService.getUserStats(req.user);

            res.json({
                success: true,
                data: stats
            });

            console.log(`📊 Estatísticas de usuários consultadas por ${req.user.email}`);
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error.message);
            
            if (error.message.includes('Apenas administradores')) {
                return next(createError(error.message, 403, 'INSUFFICIENT_PERMISSIONS'));
            }
            
            next(createError(error.message, 500, 'STATS_ERROR'));
        }
    }

    // GET /api/users/department/:department - Usuários por departamento
    static async getUsersByDepartment(req, res, next) {
        try {
            const users = await UserService.getUsersByDepartment(req.params.department, req.user);

            res.json({
                success: true,
                data: {
                    department: req.params.department,
                    users,
                    count: users.length
                }
            });

            console.log(`🏢 Usuários do departamento ${req.params.department}: ${users.length}`);
        } catch (error) {
            console.error('❌ Erro ao buscar usuários por departamento:', error.message);
            
            if (error.message.includes('Apenas administradores')) {
                return next(createError(error.message, 403, 'INSUFFICIENT_PERMISSIONS'));
            }
            
            next(createError(error.message, 400, 'DEPARTMENT_USERS_ERROR'));
        }
    }

    // GET /api/users/search - Buscar usuários
    static async searchUsers(req, res, next) {
        try {
            const { q } = req.query;
            
            if (!q || q.trim() === '') {
                return next(createError('Termo de busca é obrigatório', 400, 'MISSING_SEARCH_TERM'));
            }

            const result = await UserService.listUsers({
                search: q,
                ...req.query
            }, req.user);

            res.json({
                success: true,
                data: {
                    ...result,
                    search_term: q
                }
            });

            console.log(`🔍 Busca de usuários: "${q}" - ${result.users.length} resultados`);
        } catch (error) {
            console.error('❌ Erro na busca de usuários:', error.message);
            
            if (error.message.includes('Apenas administradores')) {
                return next(createError(error.message, 403, 'INSUFFICIENT_PERMISSIONS'));
            }
            
            next(createError(error.message, 400, 'SEARCH_ERROR'));
        }
    }

    // GET /api/users/roles - Listar roles disponíveis
    static async getRoles(req, res, next) {
        try {
            const roles = [
                { value: 'user', label: 'Usuário', description: 'Usuário padrão do sistema' },
                { value: 'technician', label: 'Técnico', description: 'Técnico de suporte' },
                { value: 'admin', label: 'Administrador', description: 'Administrador do sistema' }
            ];

            res.json({
                success: true,
                data: roles
            });
        } catch (error) {
            console.error('❌ Erro ao buscar roles:', error.message);
            next(createError(error.message, 500, 'ROLES_ERROR'));
        }
    }

    // GET /api/users/departments - Listar departamentos
    static async getDepartments(req, res, next) {
        try {
            const departments = [
                'Administração',
                'Financeiro',
                'Vendas',
                'Marketing',
                'Produção',
                'Tecnologia da Informação',
                'Recursos Humanos'
            ];

            res.json({
                success: true,
                data: departments.map(dept => ({
                    name: dept,
                    value: dept
                }))
            });
        } catch (error) {
            console.error('❌ Erro ao buscar departamentos:', error.message);
            next(createError(error.message, 500, 'DEPARTMENTS_ERROR'));
        }
    }

    // POST /api/users/bulk - Operações em lote
    static async bulkOperations(req, res, next) {
        try {
            const { action, user_ids, data } = req.body;

            if (!action || !user_ids || !Array.isArray(user_ids)) {
                return next(createError('Ação e IDs dos usuários são obrigatórios', 400, 'MISSING_BULK_DATA'));
            }

            if (user_ids.length > 20) {
                return next(createError('Máximo 20 usuários por operação', 400, 'TOO_MANY_USERS'));
            }

            const validActions = ['deactivate', 'reactivate', 'change_role', 'unlock'];
            if (!validActions.includes(action)) {
                return next(createError(`Ação inválida. Use: ${validActions.join(', ')}`, 400, 'INVALID_BULK_ACTION'));
            }

            const results = [];
            const errors = [];

            for (const userId of user_ids) {
                try {
                    let result;
                    switch (action) {
                        case 'deactivate':
                            result = await UserService.deactivateUser(userId, req.user);
                            break;
                        case 'reactivate':
                            result = await UserService.reactivateUser(userId, req.user);
                            break;
                        case 'change_role':
                            result = await UserService.changeUserRole(userId, data.role, req.user);
                            break;
                        case 'unlock':
                            result = await UserService.unlockUser(userId, req.user);
                            break;
                    }
                    results.push({ user_id: userId, success: true, data: result });
                } catch (error) {
                    errors.push({ user_id: userId, success: false, error: error.message });
                }
            }

            res.json({
                success: true,
                message: `Ação ${action} executada em lote`,
                data: {
                    action,
                    total_processed: user_ids.length,
                    successful: results.length,
                    failed: errors.length,
                    results,
                    errors
                }
            });

            console.log(`📦 Ação em lote ${action} executada em ${user_ids.length} usuários por ${req.user.email}`);
        } catch (error) {
            console.error('❌ Erro na operação em lote:', error.message);
            next(createError(error.message, 400, 'BULK_OPERATION_ERROR'));
        }
    }
}

module.exports = UserController;