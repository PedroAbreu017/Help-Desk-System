// src/services/DashboardService.js - PARTE 1 CORRIGIDA - Lógica de negócio para dashboard
const { executeQuery, getDatabaseType } = require('../config/database');

class DashboardService {
    // Obter estatísticas básicas do dashboard
    static async getBasicStats() {
        try {
            const dbType = getDatabaseType();
            
            const basicStatsQuery = `
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
            `;
            
            const basicStats = await executeQuery(this.adaptDashboardQuery(basicStatsQuery, dbType));
            return basicStats[0] || {};
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas básicas:', error.message);
            throw new Error('Erro ao obter estatísticas básicas');
        }
    }

    // Obter estatísticas por categoria
    static async getCategoryStats() {
        try {
            const categoryStats = await executeQuery(`
                SELECT category, COUNT(*) as count 
                FROM tickets 
                GROUP BY category
                ORDER BY count DESC
            `);

            return categoryStats.reduce((acc, item) => {
                acc[item.category] = item.count;
                return acc;
            }, {});
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas por categoria:', error.message);
            return {};
        }
    }

    // Obter estatísticas por departamento
    static async getDepartmentStats() {
        try {
            const departmentStats = await executeQuery(`
                SELECT department, COUNT(*) as count 
                FROM tickets 
                GROUP BY department
                ORDER BY count DESC
            `);

            return departmentStats.reduce((acc, item) => {
                acc[item.department] = item.count;
                return acc;
            }, {});
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas por departamento:', error.message);
            return {};
        }
    }

    // Obter tempo médio de resolução
    static async getAverageResolutionTime() {
        try {
            const dbType = getDatabaseType();
            
            let avgResolutionQuery;
            if (dbType === 'sqlite') {
                avgResolutionQuery = `
                    SELECT AVG(CAST((julianday(resolved_at) - julianday(created_at)) * 24 AS INTEGER)) as avg_hours
                    FROM tickets 
                    WHERE resolved_at IS NOT NULL
                `;
            } else {
                avgResolutionQuery = `
                    SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours
                    FROM tickets 
                    WHERE resolved_at IS NOT NULL
                `;
            }
            
            const result = await executeQuery(avgResolutionQuery);
            return Math.round(result[0]?.avg_hours || 0);
        } catch (error) {
            console.error('❌ Erro ao calcular tempo médio de resolução:', error.message);
            return 0;
        }
    }

    // Obter tickets recentes (CORRIGIDO)
    static async getRecentTickets(limit = 10) {
        try {
            // Usar query direta sem parâmetros para evitar erro do MySQL
            const limitValue = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
            const query = `
                SELECT id, title, priority, status, user_name, department, created_at
                FROM tickets 
                ORDER BY created_at DESC 
                LIMIT ${limitValue}
            `;
            
            const recentTickets = await executeQuery(query);
            return recentTickets || [];
        } catch (error) {
            console.error('❌ Erro ao obter tickets recentes:', error.message);
            return [];
        }
    }

    // Obter atividade recente (CORRIGIDO)
    static async getRecentActivity(hours = 24, limit = 15) {
        try {
            const dbType = getDatabaseType();
            const limitValue = Math.min(Math.max(parseInt(limit) || 15, 1), 100);
            const hoursValue = Math.min(Math.max(parseInt(hours) || 24, 1), 168);
            
            let recentActivityQuery;
            
            if (dbType === 'sqlite') {
                recentActivityQuery = `
                    SELECT 
                        al.action,
                        al.description,
                        al.user_name,
                        al.created_at,
                        t.title as ticket_title
                    FROM activity_logs al
                    LEFT JOIN tickets t ON al.ticket_id = t.id
                    WHERE al.created_at >= datetime('now', '-${hoursValue} hours')
                    ORDER BY al.created_at DESC
                    LIMIT ${limitValue}
                `;
            } else {
                recentActivityQuery = `
                    SELECT 
                        al.action,
                        al.description,
                        al.user_name,
                        al.created_at,
                        t.title as ticket_title
                    FROM activity_logs al
                    LEFT JOIN tickets t ON al.ticket_id = t.id
                    WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL ${hoursValue} HOUR)
                    ORDER BY al.created_at DESC
                    LIMIT ${limitValue}
                `;
            }
            
            const recentActivity = await executeQuery(recentActivityQuery);
            return recentActivity || [];
        } catch (error) {
            console.error('❌ Erro ao obter atividade recente:', error.message);
            return [];
        }
    }

    // Obter trends de tickets por dia (CORRIGIDO)
    static async getTicketTrends(days = 7) {
        try {
            const dbType = getDatabaseType();
            const daysValue = Math.min(Math.max(parseInt(days) || 7, 1), 365);
            
            let ticketsPerDayQuery;
            if (dbType === 'sqlite') {
                ticketsPerDayQuery = `
                    SELECT 
                        date(created_at) as date,
                        COUNT(*) as count
                    FROM tickets 
                    WHERE created_at >= datetime('now', '-${daysValue} days')
                    GROUP BY date(created_at)
                    ORDER BY date ASC
                `;
            } else {
                ticketsPerDayQuery = `
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as count
                    FROM tickets 
                    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${daysValue} DAY)
                    GROUP BY DATE(created_at)
                    ORDER BY date ASC
                `;
            }
            
            const ticketsPerDay = await executeQuery(ticketsPerDayQuery);

            return ticketsPerDay.reduce((acc, item) => {
                const dateKey = item.date instanceof Date 
                    ? item.date.toISOString().split('T')[0] 
                    : item.date;
                acc[dateKey] = item.count;
                return acc;
            }, {});
        } catch (error) {
            console.error('❌ Erro ao obter trends de tickets:', error.message);
            return {};
        }
    }

    // Obter dados completos do dashboard
    static async getDashboardData() {
        try {
            const [
                basicStats,
                categoryStats, 
                departmentStats,
                avgResolutionTime,
                recentTickets,
                recentActivity,
                ticketTrends
            ] = await Promise.all([
                this.getBasicStats(),
                this.getCategoryStats(),
                this.getDepartmentStats(),
                this.getAverageResolutionTime(),
                this.getRecentTickets(),
                this.getRecentActivity(),
                this.getTicketTrends()
            ]);

            return {
                statistics: {
                    total_tickets: basicStats.total_tickets || 0,
                    tickets_abertos: basicStats.tickets_abertos || 0,
                    tickets_andamento: basicStats.tickets_andamento || 0,
                    tickets_resolvidos: basicStats.tickets_resolvidos || 0,
                    tickets_fechados: basicStats.tickets_fechados || 0,
                    por_prioridade: {
                        critica: basicStats.critica || 0,
                        alta: basicStats.alta || 0,
                        media: basicStats.media || 0,
                        baixa: basicStats.baixa || 0
                    },
                    por_categoria: categoryStats,
                    por_departamento: departmentStats,
                    tempo_medio_resolucao: avgResolutionTime
                },
                recent_tickets: recentTickets,
                recent_activity: recentActivity,
                trends: {
                    tickets_per_day: ticketTrends
                }
            };
        } catch (error) {
            console.error('❌ Erro ao obter dados do dashboard:', error.message);
            throw new Error('Erro ao obter dados do dashboard');
        }
    }
    // Continuação do DashboardService - PARTE 2 CORRIGIDA

    // Obter métricas detalhadas por período (CORRIGIDO)
    static async getDetailedMetrics(period = '7d') {
        try {
            const dbType = getDatabaseType();
            
            // Definir filtro de data baseado no período
            let dateFilter = '';
            if (dbType === 'sqlite') {
                switch (period) {
                    case '24h':
                        dateFilter = "WHERE created_at >= datetime('now', '-24 hours')";
                        break;
                    case '7d':
                        dateFilter = "WHERE created_at >= datetime('now', '-7 days')";
                        break;
                    case '30d':
                        dateFilter = "WHERE created_at >= datetime('now', '-30 days')";
                        break;
                    case '90d':
                        dateFilter = "WHERE created_at >= datetime('now', '-90 days')";
                        break;
                    default:
                        dateFilter = "WHERE created_at >= datetime('now', '-7 days')";
                }
            } else {
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
            }

            // Métricas de performance
            let performanceQuery;
            if (dbType === 'sqlite') {
                performanceQuery = `
                    SELECT 
                        COUNT(*) as total_created,
                        SUM(CASE WHEN status = 'resolvido' THEN 1 ELSE 0 END) as resolved,
                        SUM(CASE WHEN status = 'fechado' THEN 1 ELSE 0 END) as closed,
                        AVG(CASE 
                            WHEN resolved_at IS NOT NULL 
                            THEN CAST((julianday(resolved_at) - julianday(created_at)) * 24 AS INTEGER)
                            ELSE NULL 
                        END) as avg_resolution_time,
                        MIN(CASE 
                            WHEN resolved_at IS NOT NULL 
                            THEN CAST((julianday(resolved_at) - julianday(created_at)) * 24 AS INTEGER)
                            ELSE NULL 
                        END) as min_resolution_time,
                        MAX(CASE 
                            WHEN resolved_at IS NOT NULL 
                            THEN CAST((julianday(resolved_at) - julianday(created_at)) * 24 AS INTEGER)
                            ELSE NULL 
                        END) as max_resolution_time
                    FROM tickets 
                    ${dateFilter}
                `;
            } else {
                performanceQuery = `
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
                `;
            }

            const [performanceMetrics, topCategories, topDepartments] = await Promise.all([
                executeQuery(performanceQuery),
                executeQuery(`
                    SELECT category, COUNT(*) as count
                    FROM tickets 
                    ${dateFilter}
                    GROUP BY category
                    ORDER BY count DESC
                `),
                executeQuery(`
                    SELECT department, COUNT(*) as count
                    FROM tickets 
                    ${dateFilter}
                    GROUP BY department
                    ORDER BY count DESC
                    LIMIT 5
                `)
            ]);

            const metrics = performanceMetrics[0] || {};

            return {
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
            };
        } catch (error) {
            console.error('❌ Erro ao obter métricas detalhadas:', error.message);
            throw new Error('Erro ao obter métricas detalhadas');
        }
    }

    // Obter alertas e notificações (CORRIGIDO)
    static async getDashboardAlerts() {
        try {
            const dbType = getDatabaseType();
            
            // Tickets críticos em aberto
            const criticalTickets = await executeQuery(`
                SELECT COUNT(*) as count
                FROM tickets 
                WHERE priority = 'critica' AND status NOT IN ('resolvido', 'fechado')
            `);

            // Tickets em atraso (mais de 24h para alta prioridade)
            let overdueQuery;
            if (dbType === 'sqlite') {
                overdueQuery = `
                    SELECT COUNT(*) as count
                    FROM tickets 
                    WHERE priority = 'alta' 
                    AND status NOT IN ('resolvido', 'fechado')
                    AND created_at <= datetime('now', '-24 hours')
                `;
            } else {
                overdueQuery = `
                    SELECT COUNT(*) as count
                    FROM tickets 
                    WHERE priority = 'alta' 
                    AND status NOT IN ('resolvido', 'fechado')
                    AND created_at <= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                `;
            }
            
            const overdueTickets = await executeQuery(overdueQuery);

            // Tickets não atribuídos
            const unassignedTickets = await executeQuery(`
                SELECT COUNT(*) as count
                FROM tickets 
                WHERE assigned_to IS NULL AND status = 'aberto'
            `);

            return {
                critical_tickets: criticalTickets[0]?.count || 0,
                overdue_tickets: overdueTickets[0]?.count || 0,
                unassigned_tickets: unassignedTickets[0]?.count || 0
            };
        } catch (error) {
            console.error('❌ Erro ao obter alertas do dashboard:', error.message);
            return {
                critical_tickets: 0,
                overdue_tickets: 0,
                unassigned_tickets: 0
            };
        }
    }

    // Obter top técnicos por resolução (CORRIGIDO)
    static async getTopTechnicians(limit = 5) {
        try {
            const limitValue = Math.min(Math.max(parseInt(limit) || 5, 1), 20);
            
            const topTechnicians = await executeQuery(`
                SELECT 
                    assigned_to as technician,
                    COUNT(*) as tickets_assigned,
                    SUM(CASE WHEN status = 'resolvido' THEN 1 ELSE 0 END) as tickets_resolved,
                    ROUND((SUM(CASE WHEN status = 'resolvido' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 1) as resolution_rate
                FROM tickets 
                WHERE assigned_to IS NOT NULL
                GROUP BY assigned_to
                HAVING COUNT(*) >= 5
                ORDER BY resolution_rate DESC, tickets_resolved DESC
                LIMIT ${limitValue}
            `);

            return topTechnicians || [];
        } catch (error) {
            console.error('❌ Erro ao obter top técnicos:', error.message);
            return [];
        }
    }

    // Adaptar queries para diferentes SGBDs
    static adaptDashboardQuery(query, dbType) {
        if (dbType === 'sqlite') {
            return query
                .replace(/TIMESTAMPDIFF\(HOUR,\s*([^,]+),\s*([^)]+)\)/g, "(CAST((julianday($2) - julianday($1)) * 24 AS INTEGER))")
                .replace(/DATE_SUB\(NOW\(\),\s*INTERVAL\s+(\d+)\s+HOUR\)/g, "datetime('now', '-$1 hours')")
                .replace(/DATE_SUB\(NOW\(\),\s*INTERVAL\s+(\d+)\s+DAY\)/g, "datetime('now', '-$1 days')")
                .replace(/DATE\(([^)]+)\)/g, "date($1)")
                .replace(/NOW\(\)/g, "datetime('now')");
        }
        return query;
    }

    // Validar período
    static validatePeriod(period) {
        const validPeriods = ['24h', '7d', '30d', '90d'];
        return validPeriods.includes(period) ? period : '7d';
    }

    // Calcular KPIs
    static calculateKPIs(stats) {
        const total = stats.total_tickets || 0;
        const resolved = stats.tickets_resolvidos || 0;
        const inProgress = stats.tickets_andamento || 0;
        const open = stats.tickets_abertos || 0;

        return {
            resolution_rate: total > 0 ? Math.round((resolved / total) * 100) : 0,
            active_tickets: open + inProgress,
            completion_rate: total > 0 ? Math.round(((resolved + (stats.tickets_fechados || 0)) / total) * 100) : 0,
            avg_resolution_time: stats.tempo_medio_resolucao || 0
        };
    }
}

module.exports = DashboardService;