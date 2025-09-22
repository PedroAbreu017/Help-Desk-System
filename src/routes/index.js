// src/routes/index.js - Router Principal da API com Autenticação
const express = require('express');
const router = express.Router();

// Importar middleware de autenticação
const { authenticateToken, requireAdmin, requireTechnician, optionalAuth } = require('../middleware/auth');

// Importar rotas específicas
const authRoutes = require('./auth');
const dashboardRoutes = require('./dashboard');
const ticketRoutes = require('./tickets');
const userRoutes = require('./users');
const reportRoutes = require('./reports');
const knowledgeBaseRoutes = require('./knowledge-base');

// Middleware de log para API
router.use((req, res, next) => {
    console.log(`🔌 API ${req.method} ${req.originalUrl} - User: ${req.user?.email || 'anonymous'}`);
    next();
});

// Rotas públicas (sem autenticação)
router.use('/auth', authRoutes);

// Rotas protegidas - Dashboard (autenticação obrigatória)
router.use('/dashboard', authenticateToken, dashboardRoutes);

// Rotas protegidas - Tickets (autenticação obrigatória)
router.use('/tickets', authenticateToken, ticketRoutes);

// Rotas protegidas - Users (apenas admin e technician)
router.use('/users', authenticateToken, requireTechnician, userRoutes);

// Rotas protegidas - Reports (apenas admin e technician)
router.use('/reports', authenticateToken, requireTechnician, reportRoutes);

// Rotas semi-protegidas - Knowledge Base (autenticação opcional)
router.use('/knowledge-base', optionalAuth, knowledgeBaseRoutes);

// Rota de informações da API
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Help Desk API v2.0 with JWT Authentication',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        authentication: {
            required: true,
            type: 'JWT Bearer Token',
            login_endpoint: '/api/auth/login',
            refresh_endpoint: '/api/auth/refresh'
        },
        endpoints: {
            // Públicos
            auth: {
                login: 'POST /api/auth/login',
                logout: 'POST /api/auth/logout',
                refresh: 'POST /api/auth/refresh',
                profile: 'GET /api/auth/profile',
                verify: 'GET /api/auth/verify'
            },
            // Protegidos - Todos usuários autenticados
            dashboard: {
                stats: 'GET /api/dashboard',
                metrics: 'GET /api/dashboard/metrics'
            },
            tickets: {
                list: 'GET /api/tickets',
                create: 'POST /api/tickets',
                get: 'GET /api/tickets/:id',
                update: 'PUT /api/tickets/:id',
                delete: 'DELETE /api/tickets/:id',
                add_note: 'POST /api/tickets/:id/notes',
                get_activities: 'GET /api/tickets/:id/activities'
            },
            // Protegidos - Admin e Technician apenas
            users: {
                list: 'GET /api/users',
                create: 'POST /api/users',
                get: 'GET /api/users/:id',
                update: 'PUT /api/users/:id',
                delete: 'DELETE /api/users/:id'
            },
            reports: {
                summary: 'GET /api/reports/summary',
                detailed: 'GET /api/reports/detailed',
                performance: 'GET /api/reports/performance'
            },
            // Semi-protegidos - Funciona com ou sem auth
            knowledge_base: {
                list: 'GET /api/knowledge-base',
                get: 'GET /api/knowledge-base/:id',
                categories: 'GET /api/knowledge-base/categories',
                popular: 'GET /api/knowledge-base/popular'
            }
        }
    });
});

// Rota de estatísticas gerais do sistema
router.get('/stats', authenticateToken, async (req, res, next) => {
    try {
        const { executeQuery } = require('../config/database');
        
        const stats = await executeQuery(`
            SELECT 
                (SELECT COUNT(*) FROM tickets) as total_tickets,
                (SELECT COUNT(*) FROM users WHERE active = 1) as total_users,
                (SELECT COUNT(*) FROM tickets WHERE status IN ('aberto', 'andamento')) as active_tickets,
                (SELECT COUNT(*) FROM tickets WHERE DATE(created_at) = CURDATE()) as tickets_today,
                (SELECT COUNT(*) FROM tickets WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as tickets_week,
                (SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) FROM tickets WHERE resolved_at IS NOT NULL) as avg_resolution_hours
        `);
        
        const systemStats = stats[0] || {};
        
        // Estatísticas por role (apenas para admin)
        let userStats = null;
        if (req.user.role === 'admin') {
            const userStatsResult = await executeQuery(`
                SELECT 
                    role,
                    COUNT(*) as count,
                    SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_count
                FROM users 
                GROUP BY role
            `);
            
            userStats = userStatsResult.reduce((acc, stat) => {
                acc[stat.role] = {
                    total: stat.count,
                    active: stat.active_count
                };
                return acc;
            }, {});
        }
        
        res.json({
            success: true,
            data: {
                tickets: {
                    total: systemStats.total_tickets || 0,
                    active: systemStats.active_tickets || 0,
                    today: systemStats.tickets_today || 0,
                    week: systemStats.tickets_week || 0,
                    avg_resolution_hours: Math.round(systemStats.avg_resolution_hours || 0)
                },
                users: {
                    total: systemStats.total_users || 0,
                    by_role: userStats
                },
                system: {
                    uptime: Math.floor(process.uptime()),
                    memory_usage: process.memoryUsage(),
                    node_version: process.version,
                    platform: process.platform,
                    pid: process.pid
                },
                user_info: {
                    id: req.user.id,
                    name: req.user.name,
                    role: req.user.role,
                    department: req.user.department
                }
            }
        });
        
    } catch (error) {
        next(error);
    }
});

// Rota para verificar permissões do usuário
router.get('/permissions', authenticateToken, (req, res) => {
    const permissions = {
        can_view_dashboard: true, // Todos autenticados
        can_manage_tickets: ['admin', 'technician'].includes(req.user.role),
        can_view_all_tickets: ['admin', 'technician'].includes(req.user.role),
        can_manage_users: req.user.role === 'admin',
        can_view_reports: ['admin', 'technician'].includes(req.user.role),
        can_manage_knowledge_base: ['admin', 'technician'].includes(req.user.role),
        can_delete_tickets: req.user.role === 'admin',
        can_assign_tickets: ['admin', 'technician'].includes(req.user.role)
    };

    res.json({
        success: true,
        data: {
            user: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
                department: req.user.department
            },
            permissions
        }
    });
});

module.exports = router;