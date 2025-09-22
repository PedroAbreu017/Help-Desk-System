// src/routes/dashboard.js - Rotas do Dashboard
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { executeQuery } = require('../config/database');

// GET /api/dashboard - Estatísticas do dashboard
router.get('/', asyncHandler(async (req, res) => {
    // Estatísticas básicas
    const basicStats = await executeQuery(`
        SELECT 
            COUNT(*) as total_tickets,
            SUM(CASE WHEN status = 'aberto' THEN 1 ELSE 0 END) as tickets_abertos,
            SUM(CASE WHEN status = 'andamento' THEN 1 ELSE 0 END) as tickets_andamento,
            SUM(CASE WHEN status = 'resolvido' THEN 1 ELSE 0 END) as tickets_resolvidos,
            SUM(CASE WHEN status = 'fechado' THEN 1 ELSE 0 END) as tickets_fechados,
            SUM(CASE WHEN priority = 'critica' AND status NOT IN ('resolvido', 'fechado') THEN 1 ELSE 0 END) as critica,
            SUM(CASE WHEN priority = 'alta' AND status NOT IN ('resolvido', 'fechado') THEN 1 ELSE 0 END) as alta,
            SUM(CASE WHEN priority = 'media' AND status NOT IN ('resolvido', 'fechado') THEN 1 ELSE 0 END) as media,
            SUM(CASE WHEN priority = 'baixa' AND status NOT IN ('resolvido', 'fechado') THEN 1 ELSE 0 END) as baixa
        FROM tickets
    `);

    // Estatísticas por categoria
    const categoryStats = await executeQuery(`
        SELECT category, COUNT(*) as count 
        FROM tickets 
        GROUP BY category
    `);

    // Estatísticas por departamento
    const departmentStats = await executeQuery(`
        SELECT department, COUNT(*) as count 
        FROM tickets 
        GROUP BY department
        ORDER BY count DESC
        LIMIT 10
    `);

    // Tempo médio de resolução
    const avgResolutionTime = await executeQuery(`
        SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours
        FROM tickets 
        WHERE resolved_at IS NOT NULL
    `);

    // Tickets recentes (últimos 10)
    const recentTickets = await executeQuery(`
        SELECT id, title, priority, status, user_name, created_at
        FROM tickets 
        ORDER BY created_at DESC 
        LIMIT 10
    `);

    // Atividade das últimas 24 horas
    const recentActivity = await executeQuery(`
        SELECT 
            al.action,
            al.description,
            al.user_name,
            al.created_at,
            t.title as ticket_title
        FROM activity_logs al
        LEFT JOIN tickets t ON al.ticket_id = t.id
        WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY al.created_at DESC
        LIMIT 15
    `);

    // Tickets por dia (últimos 7 dias)
    const ticketsPerDay = await executeQuery(`
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as count
        FROM tickets 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `);

    const stats = basicStats[0] || {};

    const response = {
        statistics: {
            total_tickets: stats.total_tickets || 0,
            tickets_abertos: stats.tickets_abertos || 0,
            tickets_andamento: stats.tickets_andamento || 0,
            tickets_resolvidos: stats.tickets_resolvidos || 0,
            tickets_fechados: stats.tickets_fechados || 0,
            por_prioridade: {
                critica: stats.critica || 0,
                alta: stats.alta || 0,
                media: stats.media || 0,
                baixa: stats.baixa || 0
            },
            por_categoria: categoryStats.reduce((acc, item) => {
                acc[item.category] = item.count;
                return acc;
            }, {}),
            por_departamento: departmentStats.reduce((acc, item) => {
                acc[item.department] = item.count;
                return acc;
            }, {}),
            tempo_medio_resolucao: Math.round(avgResolutionTime[0]?.avg_hours || 0)
        },
        recent_tickets: recentTickets,
        recent_activity: recentActivity,
        trends: {
            tickets_per_day: ticketsPerDay.reduce((acc, item) => {
                // Formatar data para string ISO se for objeto Date
                const dateKey = item.date instanceof Date 
                    ? item.date.toISOString().split('T')[0] 
                    : item.date;
                acc[dateKey] = item.count;
                return acc;
            }, {})
        }
    };

    res.json({
        success: true,
        data: response
    });

    console.log(`📊 Dashboard acessado - ${stats.total_tickets || 0} tickets no sistema`);
}));

// GET /api/dashboard/metrics - Métricas detalhadas
router.get('/metrics', asyncHandler(async (req, res) => {
    const { period = '7d' } = req.query;
    
    // Definir período baseado no parâmetro
    let dateFilter = '';
    switch (period) {
        case '24h':
            dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
            break;
        case '7d':
            dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
            break;
        case '30d':
            dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
            break;
        case '90d':
            dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
            break;
        default:
            dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    }

    // Métricas de performance
    const performanceMetrics = await executeQuery(`
        SELECT 
            COUNT(*) as total_created,
            SUM(CASE WHEN status = 'resolvido' THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN status = 'fechado' THEN 1 ELSE 0 END) as closed,
            AVG(CASE 
                WHEN resolved_at IS NOT NULL 
                THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) 
                ELSE NULL 
            END) as avg_resolution_time,
            MIN(CASE 
                WHEN resolved_at IS NOT NULL 
                THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) 
                ELSE NULL 
            END) as min_resolution_time,
            MAX(CASE 
                WHEN resolved_at IS NOT NULL 
                THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) 
                ELSE NULL 
            END) as max_resolution_time
        FROM tickets 
        ${dateFilter}
    `);

    // Top categorias no período
    const topCategories = await executeQuery(`
        SELECT category, COUNT(*) as count
        FROM tickets 
        ${dateFilter}
        GROUP BY category
        ORDER BY count DESC
    `);

    // Top departamentos no período
    const topDepartments = await executeQuery(`
        SELECT department, COUNT(*) as count
        FROM tickets 
        ${dateFilter}
        GROUP BY department
        ORDER BY count DESC
        LIMIT 5
    `);

    const metrics = performanceMetrics[0] || {};

    res.json({
        success: true,
        data: {
            period: period,
            performance: {
                total_created: metrics.total_created || 0,
                resolved: metrics.resolved || 0,
                closed: metrics.closed || 0,
                resolution_rate: metrics.total_created > 0 
                    ? Math.round(((metrics.resolved + metrics.closed) / metrics.total_created) * 100) 
                    : 0,
                avg_resolution_time: Math.round(metrics.avg_resolution_time || 0),
                min_resolution_time: Math.round(metrics.min_resolution_time || 0),
                max_resolution_time: Math.round(metrics.max_resolution_time || 0)
            },
            top_categories: topCategories,
            top_departments: topDepartments
        }
    });
}));

module.exports = router;