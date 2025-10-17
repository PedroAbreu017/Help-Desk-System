// src/controllers/AuthController.js - Controller MVC para Autenticação
const AuthService = require('../services/AuthService');
const { createError } = require('../middleware/errorHandler');

class AuthController {
    // POST /api/auth/login - Login do usuário
    static async login(req, res, next) {
        try {
            const result = await AuthService.login(req.body);

            res.json({
                success: true,
                message: 'Login realizado com sucesso',
                data: result
            });

            console.log(`🔐 Login bem-sucedido: ${result.user.email} (${result.user.role})`);
        } catch (error) {
            console.error('❌ Erro no login:', error.message);
            
            // Mapear erros específicos
            if (error.message.includes('Credenciais inválidas')) {
                return next(createError(error.message, 401, 'INVALID_CREDENTIALS'));
            }
            
            if (error.message.includes('Conta desativada')) {
                return next(createError(error.message, 401, 'ACCOUNT_DISABLED'));
            }
            
            if (error.message.includes('Conta bloqueada')) {
                return next(createError(error.message, 401, 'ACCOUNT_LOCKED'));
            }
            
            next(createError(error.message, 400, 'LOGIN_ERROR'));
        }
    }

    // POST /api/auth/logout - Logout do usuário
    static async logout(req, res, next) {
        try {
            await AuthService.logout(req.user.id);

            res.json({
                success: true,
                message: 'Logout realizado com sucesso'
            });

            console.log(`🚪 Logout: ${req.user.email}`);
        } catch (error) {
            console.error('❌ Erro no logout:', error.message);
            next(createError(error.message, 400, 'LOGOUT_ERROR'));
        }
    }

    // POST /api/auth/refresh - Renovar access token
    static async refreshToken(req, res, next) {
        try {
            const { refresh_token } = req.body;
            const result = await AuthService.refreshToken(refresh_token);

            res.json({
                success: true,
                message: 'Token renovado com sucesso',
                data: result
            });

            console.log(`🔄 Token renovado`);
        } catch (error) {
            console.error('❌ Erro ao renovar token:', error.message);
            
            if (error.message.includes('inválido') || error.message.includes('expirado')) {
                return next(createError(error.message, 401, 'INVALID_REFRESH_TOKEN'));
            }
            
            next(createError(error.message, 400, 'REFRESH_ERROR'));
        }
    }

    // POST /api/auth/register - Registrar novo usuário (apenas admins)
    static async register(req, res, next) {
        try {
            const user = await AuthService.register(req.body, req.user);

            res.status(201).json({
                success: true,
                message: 'Usuário registrado com sucesso',
                data: user
            });

            console.log(`👤 Usuário registrado: ${user.email} (${user.role}) por ${req.user.email}`);
        } catch (error) {
            console.error('❌ Erro no registro:', error.message);
            
            if (error.message.includes('Apenas administradores')) {
                return next(createError(error.message, 403, 'INSUFFICIENT_PERMISSIONS'));
            }
            
            if (error.message.includes('Email já cadastrado')) {
                return next(createError(error.message, 409, 'EMAIL_EXISTS'));
            }
            
            next(createError(error.message, 400, 'REGISTER_ERROR'));
        }
    }

    // GET /api/auth/profile - Obter perfil do usuário logado
    static async getProfile(req, res, next) {
        try {
            const profile = await AuthService.getProfile(req.user.id);

            res.json({
                success: true,
                data: profile
            });
        } catch (error) {
            console.error('❌ Erro ao buscar perfil:', error.message);
            
            if (error.message === 'Usuário não encontrado') {
                return next(createError(error.message, 404, 'USER_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'PROFILE_ERROR'));
        }
    }

    // PUT /api/auth/profile - Atualizar perfil
    static async updateProfile(req, res, next) {
        try {
            await AuthService.updateProfile(req.user.id, req.body);

            res.json({
                success: true,
                message: 'Perfil atualizado com sucesso'
            });

            console.log(`👤 Perfil atualizado: ${req.user.email}`);
        } catch (error) {
            console.error('❌ Erro ao atualizar perfil:', error.message);
            
            if (error.message === 'Usuário não encontrado') {
                return next(createError(error.message, 404, 'USER_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'UPDATE_PROFILE_ERROR'));
        }
    }

    // POST /api/auth/change-password - Alterar senha
    static async changePassword(req, res, next) {
        try {
            await AuthService.changePassword(req.user.id, req.body);

            res.json({
                success: true,
                message: 'Senha alterada com sucesso'
            });

            console.log(`🔑 Senha alterada: ${req.user.email}`);
        } catch (error) {
            console.error('❌ Erro ao alterar senha:', error.message);
            
            if (error.message === 'Usuário não encontrado') {
                return next(createError(error.message, 404, 'USER_NOT_FOUND'));
            }
            
            if (error.message === 'Senha atual incorreta') {
                return next(createError(error.message, 400, 'INVALID_CURRENT_PASSWORD'));
            }
            
            next(createError(error.message, 400, 'CHANGE_PASSWORD_ERROR'));
        }
    }

    // GET /api/auth/verify - Verificar se token é válido
    static async verifyToken(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return next(createError('Token não fornecido', 401, 'NO_TOKEN'));
            }

            const token = authHeader.substring(7);
            const result = await AuthService.verifyAccessToken(token);

            res.json({
                success: true,
                message: 'Token válido',
                data: result
            });
        } catch (error) {
            console.error('❌ Erro na verificação do token:', error.message);
            
            if (error.message.includes('inválido') || error.message.includes('expirado')) {
                return next(createError(error.message, 401, 'INVALID_TOKEN'));
            }
            
            next(createError(error.message, 400, 'VERIFY_ERROR'));
        }
    }

    // GET /api/auth/users - Listar usuários (apenas admins)
    static async listUsers(req, res, next) {
        try {
            const users = await AuthService.listUsers(req.user, req.query);

            res.json({
                success: true,
                data: {
                    users,
                    count: users.length,
                    filters_applied: req.query
                }
            });

            console.log(`👥 Lista de usuários consultada por ${req.user.email} - ${users.length} usuários`);
        } catch (error) {
            console.error('❌ Erro ao listar usuários:', error.message);
            
            if (error.message.includes('Apenas administradores')) {
                return next(createError(error.message, 403, 'INSUFFICIENT_PERMISSIONS'));
            }
            
            next(createError(error.message, 400, 'LIST_USERS_ERROR'));
        }
    }

    // GET /api/auth/users/:id - Buscar usuário específico (apenas admins)
    static async getUser(req, res, next) {
        try {
            // Verificar se é admin
            if (req.user.role !== 'admin') {
                return next(createError('Apenas administradores podem acessar dados de outros usuários', 403, 'INSUFFICIENT_PERMISSIONS'));
            }

            const user = await AuthService.findUserById(req.params.id);
            
            if (!user) {
                return next(createError('Usuário não encontrado', 404, 'USER_NOT_FOUND'));
            }

            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            console.error('❌ Erro ao buscar usuário:', error.message);
            next(createError(error.message, 400, 'GET_USER_ERROR'));
        }
    }

    // POST /api/auth/check-permissions - Verificar permissões
    static async checkPermissions(req, res, next) {
        try {
            const { action, resource } = req.body;
            
            if (!action || !resource) {
                return next(createError('Ação e recurso são obrigatórios', 400, 'MISSING_PERMISSION_DATA'));
            }

            const hasPermission = await AuthService.checkPermissions(req.user.id, action, resource);

            res.json({
                success: true,
                data: {
                    user_id: req.user.id,
                    action,
                    resource,
                    has_permission: hasPermission
                }
            });
        } catch (error) {
            console.error('❌ Erro ao verificar permissões:', error.message);
            next(createError(error.message, 400, 'PERMISSION_CHECK_ERROR'));
        }
    }

    // POST /api/auth/impersonate - Impersonar usuário (apenas super admin)
    static async impersonate(req, res, next) {
        try {
            // Funcionalidade para super admin impersonar outro usuário
            if (req.user.role !== 'admin' || req.user.email !== 'admin@helpdesk.com') {
                return next(createError('Acesso negado para impersonificação', 403, 'IMPERSONATE_DENIED'));
            }

            const { target_user_id } = req.body;
            
            if (!target_user_id) {
                return next(createError('ID do usuário alvo é obrigatório', 400, 'MISSING_TARGET_USER'));
            }

            const targetUser = await AuthService.findUserById(target_user_id);
            
            if (!targetUser) {
                return next(createError('Usuário alvo não encontrado', 404, 'TARGET_USER_NOT_FOUND'));
            }

            // Gerar token para o usuário alvo
            const { generateToken } = require('../middleware/auth');
            const tokenPayload = {
                userId: targetUser.id,
                email: targetUser.email,
                role: targetUser.role,
                impersonated_by: req.user.id
            };

            const impersonationToken = generateToken(tokenPayload, '1h'); // Token de 1 hora

            res.json({
                success: true,
                message: 'Impersonificação iniciada',
                data: {
                    target_user: targetUser,
                    impersonation_token: impersonationToken,
                    expires_in: 3600,
                    impersonated_by: req.user.email
                }
            });

            console.log(`👤 Impersonificação: ${req.user.email} → ${targetUser.email}`);
        } catch (error) {
            console.error('❌ Erro na impersonificação:', error.message);
            next(createError(error.message, 400, 'IMPERSONATE_ERROR'));
        }
    }

    // GET /api/auth/me - Informações básicas do usuário atual
    static async getCurrentUser(req, res, next) {
        try {
            res.json({
                success: true,
                data: {
                    id: req.user.id,
                    name: req.user.name,
                    email: req.user.email,
                    role: req.user.role,
                    department: req.user.department,
                    permissions: req.user.role === 'admin' ? ['*:*'] : []
                }
            });
        } catch (error) {
            console.error('❌ Erro ao obter usuário atual:', error.message);
            next(createError(error.message, 400, 'CURRENT_USER_ERROR'));
        }
    }
}

module.exports = AuthController;