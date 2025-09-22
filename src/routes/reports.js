// src/routes/reports.js - Rotas de Relatórios CORRIGIDAS
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { validateQueryParams } = require('../middleware/validation');
const { executeQuery } = require('../config/database');

// GET /api/reports/summary - Relatório resumido (CORRIGIDO)
router.get('/summary', validateQueryParams, asyncHandler(async (req, res) => {
    const { start_date, end_date, department, category, priority } = req.query;
    
    let params = [];
    let whereConditions = ['1=1'];
    
    // Filtro de período
    if (start_date && end_date) {
        whereConditions.push('created_at BETWEEN ? AND ?');
        params.push(start_date, end_date + ' 23:59:59');
    }
    
    // Filtros adicionais
    if (department) {
        whereConditions.push('department = ?');
        params.push(department);
    }
    
    if (category) {
        whereConditions.push('category = ?');
        params.push(category);
    }
    
    if (priority) {
        whereConditions.push('priority = ?');
        params.push(priority);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Estatísticas básicas (SEM MUDANÇAS - já está correto)
    const basicStats = await executeQuery(`
        SELECT 
            COUNT(*) as total_tickets,
            SUM(CASE WHEN status = 'aberto' THEN 1 ELSE 0 END) as aberto,
            SUM(CASE WHEN status = 'andamento' THEN 1 ELSE 0 END) as andamento,
            SUM(CASE WHEN status = 'resolvido' THEN 1 ELSE 0 END) as resolvido,
            SUM(CASE WHEN status = 'fechado' THEN 1 ELSE 0 END) as fechado,
            SUM(CASE WHEN priority = 'critica' THEN 1 ELSE 0 END) as critica,
            SUM(CASE WHEN priority = 'alta' THEN 1 ELSE 0 END) as alta,
            SUM(CASE WHEN priority = 'media' THEN 1 ELSE 0 END) as media,
            SUM(CASE WHEN priority = 'baixa' THEN 1 ELSE 0 END) as baixa
        FROM tickets 
        WHERE ${whereClause}
    `, params);

    // Por categoria (SEM MUDANÇAS - já está correto)
    const categoryStats = await executeQuery(`
        SELECT category, COUNT(*) as count 
        FROM tickets 
        WHERE ${whereClause}
        GROUP BY category
        ORDER BY count DESC
    `, params);

    // Por departamento (SEM MUDANÇAS - já está correto)
    const departmentStats = await executeQuery(`
        SELECT department, COUNT(*) as count 
        FROM tickets 
        WHERE ${whereClause}
        GROUP BY department
        ORDER BY count DESC
    `, params);

    // Tempo médio de resolução (SEM MUDANÇAS - já está correto)
    const avgTime = await executeQuery(`
        SELECT 
            AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours,
            MIN(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as min_hours,
            MAX(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as max_hours,
            COUNT(*) as resolved_count
        FROM tickets 
        WHERE resolved_at IS NOT NULL AND ${whereClause}
    `, params);

    // SLA - Tickets críticos/alta prioridade resolvidos em menos de 24h (SEM MUDANÇAS - já está correto)
    const slaCompliance = await executeQuery(`
        SELECT 
            COUNT(*) as total_high_priority,
            SUM(CASE 
                WHEN resolved_at IS NOT NULL 
                AND TIMESTAMPDIFF(HOUR, created_at, resolved_at) <= 24 
                THEN 1 ELSE 0 
            END) as resolved_within_24h
        FROM tickets 
        WHERE priority IN ('critica', 'alta') AND ${whereClause}
    `, params);

    // Tendência - tickets por semana (CORRIGIDO - adicionado DATE_SUB no GROUP BY)
    let trendQuery, trendParams;
    if (start_date && end_date) {
        trendQuery = `
            SELECT 
                YEAR(created_at) as year,
                WEEK(created_at) as week,
                DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY) as week_start,
                COUNT(*) as count
            FROM tickets 
            WHERE ${whereClause}
            GROUP BY YEAR(created_at), WEEK(created_at), DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY)
            ORDER BY year, week
        `;
        trendParams = params;
    } else {
        trendQuery = `
            SELECT 
                YEAR(created_at) as year,
                WEEK(created_at) as week,
                DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY) as week_start,
                COUNT(*) as count
            FROM tickets 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
            GROUP BY YEAR(created_at), WEEK(created_at), DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY)
            ORDER BY year, week
        `;
        trendParams = [];
    }
    
    const weeklyTrend = await executeQuery(trendQuery, trendParams);

    // Buscar tickets recentes para o relatório (ADICIONADO)
    const recentTickets = await executeQuery(`
        SELECT 
            id, title, category, priority, status, user_name, created_at 
        FROM tickets 
        WHERE ${whereClause}
        ORDER BY created_at DESC 
        LIMIT 10
    `, params);

    const stats = basicStats[0] || {};
    const avgStats = avgTime[0] || {};
    const slaStats = slaCompliance[0] || {};
    const totalTickets = stats.total_tickets || 0;
    const resolvedTickets = (stats.resolvido || 0) + (stats.fechado || 0);

    const report = {
        period: {
            start: start_date || 'Início',
            end: end_date || 'Presente',
            filters: {
                department: department || 'Todos',
                category: category || 'Todas',
                priority: priority || 'Todas'
            }
        },
        summary: {
            total_tickets: totalTickets,
            by_status: {
                aberto: stats.aberto || 0,
                andamento: stats.andamento || 0,
                resolvido: stats.resolvido || 0,
                fechado: stats.fechado || 0
            },
            by_priority: {
                critica: stats.critica || 0,
                alta: stats.alta || 0,
                media: stats.media || 0,
                baixa: stats.baixa || 0
            },
            by_category: categoryStats.reduce((acc, item) => {
                acc[item.category] = item.count;
                return acc;
            }, {}),
            by_department: departmentStats.reduce((acc, item) => {
                acc[item.department] = item.count;
                return acc;
            }, {}),
            resolution_rate: totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0
        },
        performance: {
            avg_resolution_time: Math.round(avgStats.avg_hours || 0),
            min_resolution_time: Math.round(avgStats.min_hours || 0),
            max_resolution_time: Math.round(avgStats.max_hours || 0),
            total_resolved: avgStats.resolved_count || 0,
            sla_compliance: {
                total_high_priority: slaStats.total_high_priority || 0,
                resolved_within_24h: slaStats.resolved_within_24h || 0,
                compliance_rate: slaStats.total_high_priority > 0 
                    ? Math.round((slaStats.resolved_within_24h / slaStats.total_high_priority) * 100)
                    : 0
            }
        },
        trends: {
            weekly_tickets: weeklyTrend.map(item => ({
                year: item.year,
                week: item.week,
                week_start: item.week_start,
                count: item.count
            }))
        },
        recent_tickets: recentTickets // ADICIONADO para o frontend
    };

    res.json({
        success: true,
        data: report
    });

    console.log(`📊 Relatório gerado - ${totalTickets} tickets no período`);
}));

// GET /api/reports/detailed - Relatório detalhado (CORRIGIDO)
router.get('/detailed', validateQueryParams, asyncHandler(async (req, res) => {
    const { start_date, end_date, format = 'json' } = req.query;
    
    let dateFilter = '';
    let params = [];
    
    if (start_date && end_date) {
        dateFilter = 'WHERE created_at BETWEEN ? AND ?';
        params = [start_date, end_date + ' 23:59:59'];
    } else {
        dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    // Buscar todos os tickets do período
    const tickets = await executeQuery(`
        SELECT 
            id,
            title,
            description,
            category,
            priority,
            status,
            user_name,
            user_email,
            department,
            assigned_to,
            created_at,
            updated_at,
            resolved_at,
            CASE 
                WHEN resolved_at IS NOT NULL 
                THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at)
                ELSE NULL
            END as resolution_time_hours
        FROM tickets 
        ${dateFilter}
        ORDER BY created_at DESC
    `, params);

    // Buscar informações dos usuários atribuídos
    const assignedUserIds = [...new Set(tickets.filter(t => t.assigned_to).map(t => t.assigned_to))];
    let assignedUsers = {};
    
    if (assignedUserIds.length > 0) {
        const users = await executeQuery(
            `SELECT id, name, email FROM users WHERE id IN (${assignedUserIds.map(() => '?').join(',')})`,
            assignedUserIds
        );
        
        assignedUsers = users.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
        }, {});
    }

    // Enriquecer tickets com informações do usuário atribuído
    const enrichedTickets = tickets.map(ticket => ({
        ...ticket,
        assigned_user: ticket.assigned_to ? assignedUsers[ticket.assigned_to] : null
    }));

    // Estatísticas do relatório detalhado (CORRIGIDO - tratamento para divisão por zero)
    const validResolutionTimes = tickets.filter(t => t.resolution_time_hours !== null);
    const avgResolutionTime = validResolutionTimes.length > 0 
        ? validResolutionTimes.reduce((sum, t) => sum + t.resolution_time_hours, 0) / validResolutionTimes.length 
        : 0;

    const stats = {
        total_tickets: tickets.length,
        avg_resolution_time: Math.round(avgResolutionTime),
        by_status: tickets.reduce((acc, ticket) => {
            acc[ticket.status] = (acc[ticket.status] || 0) + 1;
            return acc;
        }, {}),
        by_priority: tickets.reduce((acc, ticket) => {
            acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
            return acc;
        }, {}),
        by_category: tickets.reduce((acc, ticket) => {
            acc[ticket.category] = (acc[ticket.category] || 0) + 1;
            return acc;
        }, {}),
        by_department: tickets.reduce((acc, ticket) => {
            acc[ticket.department] = (acc[ticket.department] || 0) + 1;
            return acc;
        }, {})
    };

    const report = {
        generated_at: new Date().toISOString(),
        period: {
            start: start_date || '30 dias atrás',
            end: end_date || 'Agora'
        },
        statistics: stats,
        tickets: enrichedTickets
    };

    // Retornar em formato JSON ou CSV (CORRIGIDO - tratamento de campos null/undefined)
    if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="tickets-report.csv"');
        
        const csvHeader = 'ID,Título,Categoria,Prioridade,Status,Usuário,Email,Departamento,Atribuído a,Criado em,Resolvido em,Tempo de Resolução (h)\n';
        const csvRows = enrichedTickets.map(ticket => 
            [
                ticket.id,
                `"${(ticket.title || '').replace(/"/g, '""')}"`,
                ticket.category || '',
                ticket.priority || '',
                ticket.status || '',
                `"${ticket.user_name || ''}"`,
                ticket.user_email || '',
                `"${ticket.department || ''}"`,
                ticket.assigned_user ? `"${ticket.assigned_user.name}"` : '',
                ticket.created_at || '',
                ticket.resolved_at || '',
                ticket.resolution_time_hours || ''
            ].join(',')
        ).join('\n');
        
        res.send(csvHeader + csvRows);
    } else {
        res.json({
            success: true,
            data: report
        });
    }

    console.log(`📋 Relatório detalhado gerado - ${tickets.length} tickets`);
}));

// GET /api/reports/performance - Relatório de performance (CORRIGIDO)
router.get('/performance', validateQueryParams, asyncHandler(async (req, res) => {
    const { period = '30d' } = req.query;
    
    // Definir filtro de data baseado no período
    let dateFilter, dateInterval;
    switch (period) {
        case '7d':
            dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
            dateInterval = '7 DAY';
            break;
        case '30d':
            dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
            dateInterval = '30 DAY';
            break;
        case '90d':
            dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
            dateInterval = '90 DAY';
            break;
        case '1y':
            dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
            dateInterval = '1 YEAR';
            break;
        default:
            dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
            dateInterval = '30 DAY';
    }

    // Métricas de performance (SEM MUDANÇAS - já está correto)
    const performanceMetrics = await executeQuery(`
        SELECT 
            COUNT(*) as total_tickets,
            SUM(CASE WHEN status IN ('resolvido', 'fechado') THEN 1 ELSE 0 END) as resolved_tickets,
            AVG(CASE 
                WHEN resolved_at IS NOT NULL 
                THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) 
                ELSE NULL 
            END) as avg_resolution_hours,
            SUM(CASE 
                WHEN priority IN ('critica', 'alta') 
                AND resolved_at IS NOT NULL 
                AND TIMESTAMPDIFF(HOUR, created_at, resolved_at) <= 24 
                THEN 1 ELSE 0 
            END) as sla_compliant,
            SUM(CASE WHEN priority IN ('critica', 'alta') THEN 1 ELSE 0 END) as high_priority_total,
            COUNT(DISTINCT user_email) as unique_users,
            COUNT(DISTINCT department) as departments_served
        FROM tickets ${dateFilter}
    `);

    // Performance por técnico (CORRIGIDO - uso correto do dateInterval como string)
    const technicianPerformance = await executeQuery(`
        SELECT 
            u.id,
            u.name,
            u.email,
            COUNT(t.id) as tickets_assigned,
            SUM(CASE WHEN t.status IN ('resolvido', 'fechado') THEN 1 ELSE 0 END) as tickets_resolved,
            AVG(CASE 
                WHEN t.resolved_at IS NOT NULL 
                THEN TIMESTAMPDIFF(HOUR, t.created_at, t.resolved_at) 
                ELSE NULL 
            END) as avg_resolution_hours
        FROM users u
        LEFT JOIN tickets t ON u.id = t.assigned_to AND t.created_at >= DATE_SUB(NOW(), INTERVAL ${dateInterval})
        WHERE u.role IN ('technician', 'admin')
        GROUP BY u.id, u.name, u.email
        HAVING tickets_assigned > 0
        ORDER BY tickets_resolved DESC, avg_resolution_hours ASC
    `);

    // Tendência diária (CORRIGIDO - query mais robusta)
    const dailyTrend = await executeQuery(`
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as created,
            SUM(CASE 
                WHEN resolved_at IS NOT NULL 
                AND DATE(resolved_at) = DATE(created_at) 
                THEN 1 ELSE 0 
            END) as resolved_same_day
        FROM tickets ${dateFilter}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `);

    const metrics = performanceMetrics[0] || {};
    
    const report = {
        period: period,
        generated_at: new Date().toISOString(),
        overview: {
            total_tickets: metrics.total_tickets || 0,
            resolved_tickets: metrics.resolved_tickets || 0,
            resolution_rate: metrics.total_tickets > 0 
                ? Math.round((metrics.resolved_tickets / metrics.total_tickets) * 100) 
                : 0,
            avg_resolution_hours: Math.round(metrics.avg_resolution_hours || 0),
            sla_compliance_rate: metrics.high_priority_total > 0 
                ? Math.round((metrics.sla_compliant / metrics.high_priority_total) * 100)
                : 0,
            unique_users_served: metrics.unique_users || 0,
            departments_served: metrics.departments_served || 0
        },
        technician_performance: technicianPerformance.map(tech => ({
            id: tech.id,
            name: tech.name,
            email: tech.email,
            tickets_assigned: tech.tickets_assigned,
            tickets_resolved: tech.tickets_resolved,
            resolution_rate: tech.tickets_assigned > 0 
                ? Math.round((tech.tickets_resolved / tech.tickets_assigned) * 100)
                : 0,
            avg_resolution_hours: Math.round(tech.avg_resolution_hours || 0)
        })),
        daily_trend: dailyTrend.map(day => ({
            date: day.date,
            created: day.created,
            resolved_same_day: day.resolved_same_day,
            same_day_resolution_rate: day.created > 0 
                ? Math.round((day.resolved_same_day / day.created) * 100)
                : 0
        }))
    };

    res.json({
        success: true,
        data: report
    });

    console.log(`⚡ Relatório de performance gerado - Período: ${period}`);
}));

// GET /api/reports/export/:type - Exportar relatórios (CORRIGIDO)
router.get('/export/:type', validateQueryParams, asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { format = 'json', start_date, end_date } = req.query;
    
    const validTypes = ['summary', 'detailed', 'performance'];
    
    if (!validTypes.includes(type)) {
        return res.status(400).json({
            success: false,
            message: 'Tipo de relatório inválido',
            valid_types: validTypes
        });
    }

    // Criar nova requisição simulada para redirecionar
    const newReq = {
        ...req,
        query: {
            ...req.query,
            format
        }
    };

    // Chamar o handler apropriado
    try {
        if (type === 'summary') {
            return await router.stack.find(layer => 
                layer.route && layer.route.path === '/summary'
            ).route.stack[0].handle(newReq, res);
        } else if (type === 'detailed') {
            return await router.stack.find(layer => 
                layer.route && layer.route.path === '/detailed'
            ).route.stack[0].handle(newReq, res);
        } else if (type === 'performance') {
            return await router.stack.find(layer => 
                layer.route && layer.route.path === '/performance'
            ).route.stack[0].handle(newReq, res);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao processar exportação',
            error: error.message
        });
    }
}));

module.exports = router;