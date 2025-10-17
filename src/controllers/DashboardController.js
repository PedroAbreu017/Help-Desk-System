// src/controllers/DashboardController.js - Controller MVC para Dashboard - PARTE 1
const DashboardService = require('../services/DashboardService');
const { createError } = require('../middleware/errorHandler');
const { getDatabaseType } = require('../config/database');

class DashboardController {
    // GET /api/dashboard - Estatísticas principais do dashboard (CORRIGIDO)
    static async getMainDashboard(req, res, next) {
        try {
            const dashboardData = await DashboardService.getDashboardData();
            const kpis = DashboardService.calculateKPIs(dashboardData.statistics);
            const alerts = await DashboardService.getDashboardAlerts();

            res.json({
                success: true,
                data: {
                    ...dashboardData,
                    kpis,
                    alerts
                }
            });

            console.log(`📊 Dashboard acessado (${getDatabaseType()}) - ${dashboardData.statistics.total_tickets} tickets no sistema`);
        } catch (error) {
            console.error('❌ Erro ao carregar dashboard:', error.message);
            next(createError('Erro ao carregar dados do dashboard', 500, 'DASHBOARD_ERROR'));
        }
    }

    // GET /api/dashboard/metrics - Métricas detalhadas
    static async getMetrics(req, res, next) {
        try {
            const period = DashboardService.validatePeriod(req.query.period);
            const metrics = await DashboardService.getDetailedMetrics(period);

            res.json({
                success: true,
                data: metrics
            });

            console.log(`📈 Métricas detalhadas consultadas para período: ${period}`);
        } catch (error) {
            console.error('❌ Erro ao carregar métricas:', error.message);
            next(createError('Erro ao carregar métricas detalhadas', 500, 'METRICS_ERROR'));
        }
    }

    // GET /api/dashboard/stats - Estatísticas básicas (endpoint simplificado)
    static async getBasicStats(req, res, next) {
        try {
            const basicStats = await DashboardService.getBasicStats();
            const kpis = DashboardService.calculateKPIs(basicStats);

            res.json({
                success: true,
                data: {
                    statistics: basicStats,
                    kpis
                }
            });
        } catch (error) {
            console.error('❌ Erro ao carregar estatísticas básicas:', error.message);
            next(createError('Erro ao carregar estatísticas', 500, 'STATS_ERROR'));
        }
    }

    // GET /api/dashboard/recent - Atividade recente (CORRIGIDO)
    static async getRecentActivity(req, res, next) {
        try {
            const hours = Math.min(Math.max(parseInt(req.query.hours) || 24, 1), 168);
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 15, 1), 100);

            const [recentTickets, recentActivity] = await Promise.all([
                DashboardService.getRecentTickets(limit),
                DashboardService.getRecentActivity(hours, limit)
            ]);

            res.json({
                success: true,
                data: {
                    recent_tickets: recentTickets,
                    recent_activity: recentActivity,
                    parameters: {
                        hours_filter: hours,
                        limit_applied: limit
                    }
                }
            });
        } catch (error) {
            console.error('❌ Erro ao carregar atividade recente:', error.message);
            next(createError('Erro ao carregar atividade recente', 500, 'RECENT_ACTIVITY_ERROR'));
        }
    }

    // GET /api/dashboard/trends - Trends e gráficos (CORRIGIDO)
    static async getTrends(req, res, next) {
        try {
            const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 365);

            const [ticketTrends, categoryStats, departmentStats] = await Promise.all([
                DashboardService.getTicketTrends(days),
                DashboardService.getCategoryStats(),
                DashboardService.getDepartmentStats()
            ]);

            res.json({
                success: true,
                data: {
                    trends: {
                        tickets_per_day: ticketTrends,
                        period_days: days
                    },
                    distributions: {
                        por_categoria: categoryStats,
                        por_departamento: departmentStats
                    }
                }
            });
        } catch (error) {
            console.error('❌ Erro ao carregar trends:', error.message);
            next(createError('Erro ao carregar trends', 500, 'TRENDS_ERROR'));
        }
    }

    // GET /api/dashboard/alerts - Alertas e notificações
    static async getAlerts(req, res, next) {
        try {
            const alerts = await DashboardService.getDashboardAlerts();
            const topTechnicians = await DashboardService.getTopTechnicians();

            res.json({
                success: true,
                data: {
                    alerts,
                    top_performers: topTechnicians,
                    alert_summary: {
                        total_alerts: Object.values(alerts).reduce((sum, count) => sum + count, 0),
                        priority_level: this.calculateAlertPriority(alerts)
                    }
                }
            });
        } catch (error) {
            console.error('❌ Erro ao carregar alertas:', error.message);
            next(createError('Erro ao carregar alertas', 500, 'ALERTS_ERROR'));
        }
    }
    // Continuação do DashboardController - PARTE 2

    // GET /api/dashboard/performance - Performance de técnicos (CORRIGIDO)
    static async getPerformance(req, res, next) {
        try {
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

            const topTechnicians = await DashboardService.getTopTechnicians(limit);
            const avgResolutionTime = await DashboardService.getAverageResolutionTime();

            res.json({
                success: true,
                data: {
                    technicians: topTechnicians,
                    benchmarks: {
                        system_avg_resolution_time: avgResolutionTime,
                        top_performer: topTechnicians[0] || null
                    }
                }
            });
        } catch (error) {
            console.error('❌ Erro ao carregar performance:', error.message);
            next(createError('Erro ao carregar dados de performance', 500, 'PERFORMANCE_ERROR'));
        }
    }

    // GET /api/dashboard/summary - Resumo executivo
    static async getExecutiveSummary(req, res, next) {
        try {
            const period = DashboardService.validatePeriod(req.query.period || '30d');
            
            const [basicStats, metrics, alerts, trends] = await Promise.all([
                DashboardService.getBasicStats(),
                DashboardService.getDetailedMetrics(period),
                DashboardService.getDashboardAlerts(),
                DashboardService.getTicketTrends(30)
            ]);

            const kpis = DashboardService.calculateKPIs(basicStats);
            const summary = this.generateExecutiveSummary(basicStats, metrics, alerts, kpis);

            res.json({
                success: true,
                data: {
                    period,
                    summary,
                    key_metrics: {
                        total_tickets: basicStats.total_tickets,
                        resolution_rate: kpis.resolution_rate,
                        active_tickets: kpis.active_tickets,
                        critical_issues: alerts.critical_tickets
                    },
                    performance: metrics.performance,
                    alerts: alerts
                }
            });

            console.log(`📊 Resumo executivo gerado para período: ${period}`);
        } catch (error) {
            console.error('❌ Erro ao gerar resumo executivo:', error.message);
            next(createError('Erro ao gerar resumo executivo', 500, 'SUMMARY_ERROR'));
        }
    }

    // GET /api/dashboard/export - Exportar dados (para relatórios)
    static async exportDashboardData(req, res, next) {
        try {
            const format = req.query.format || 'json';
            const period = DashboardService.validatePeriod(req.query.period || '30d');

            if (!['json', 'csv'].includes(format)) {
                return next(createError('Formato deve ser json ou csv', 400, 'INVALID_FORMAT'));
            }

            const dashboardData = await DashboardService.getDashboardData();
            const metrics = await DashboardService.getDetailedMetrics(period);

            const exportData = {
                generated_at: new Date().toISOString(),
                period,
                statistics: dashboardData.statistics,
                performance: metrics.performance,
                recent_activity: dashboardData.recent_activity,
                trends: dashboardData.trends
            };

            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=dashboard-${period}.csv`);
                res.send('CSV export não implementado ainda');
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename=dashboard-${period}.json`);
                res.json({
                    success: true,
                    data: exportData
                });
            }

            console.log(`📁 Dashboard exportado em formato ${format} para período ${period}`);
        } catch (error) {
            console.error('❌ Erro ao exportar dashboard:', error.message);
            next(createError('Erro ao exportar dados', 500, 'EXPORT_ERROR'));
        }
    }

    // Métodos auxiliares
    static calculateAlertPriority(alerts) {
        const { critical_tickets, overdue_tickets, unassigned_tickets } = alerts;
        
        if (critical_tickets > 5) return 'high';
        if (overdue_tickets > 10 || critical_tickets > 0) return 'medium';
        if (unassigned_tickets > 20) return 'medium';
        return 'low';
    }

    static generateExecutiveSummary(stats, metrics, alerts, kpis) {
        const insights = [];

        // Análise de volume
        if (stats.total_tickets > 0) {
            insights.push(`Total de ${stats.total_tickets} tickets no sistema`);
        }

        // Análise de resolução
        if (kpis.resolution_rate >= 90) {
            insights.push(`Excelente taxa de resolução: ${kpis.resolution_rate}%`);
        } else if (kpis.resolution_rate >= 70) {
            insights.push(`Taxa de resolução satisfatória: ${kpis.resolution_rate}%`);
        } else {
            insights.push(`Taxa de resolução precisa melhorar: ${kpis.resolution_rate}%`);
        }

        // Análise de urgência
        if (alerts.critical_tickets > 0) {
            insights.push(`⚠️ ${alerts.critical_tickets} ticket(s) crítico(s) requer(em) atenção imediata`);
        }

        if (alerts.overdue_tickets > 0) {
            insights.push(`⏰ ${alerts.overdue_tickets} ticket(s) em atraso`);
        }

        // Análise de eficiência
        if (metrics.performance.avg_resolution_time > 0) {
            insights.push(`Tempo médio de resolução: ${metrics.performance.avg_resolution_time}h`);
        }

        return {
            insights,
            overall_health: this.calculateOverallHealth(kpis, alerts),
            recommendations: this.generateRecommendations(stats, metrics, alerts, kpis)
        };
    }

    static calculateOverallHealth(kpis, alerts) {
        let score = 100;

        // Penalizar por baixa taxa de resolução
        if (kpis.resolution_rate < 70) score -= 30;
        else if (kpis.resolution_rate < 90) score -= 10;

        // Penalizar por tickets críticos
        score -= alerts.critical_tickets * 10;

        // Penalizar por tickets em atraso
        score -= alerts.overdue_tickets * 5;

        // Penalizar por tickets não atribuídos
        score -= Math.min(alerts.unassigned_tickets * 2, 20);

        score = Math.max(0, score);

        if (score >= 90) return { status: 'excellent', score };
        if (score >= 70) return { status: 'good', score };
        if (score >= 50) return { status: 'fair', score };
        return { status: 'poor', score };
    }

    static generateRecommendations(stats, metrics, alerts, kpis) {
        const recommendations = [];

        if (alerts.critical_tickets > 0) {
            recommendations.push({
                priority: 'high',
                action: 'Resolver tickets críticos imediatamente',
                impact: 'Reduzir riscos operacionais'
            });
        }

        if (alerts.unassigned_tickets > 10) {
            recommendations.push({
                priority: 'medium', 
                action: 'Atribuir tickets pendentes a técnicos',
                impact: 'Melhorar tempo de resposta'
            });
        }

        if (kpis.resolution_rate < 80) {
            recommendations.push({
                priority: 'medium',
                action: 'Revisar processo de resolução de tickets',
                impact: 'Aumentar eficiência da equipe'
            });
        }

        if (metrics.performance.avg_resolution_time > 48) {
            recommendations.push({
                priority: 'low',
                action: 'Otimizar processos para reduzir tempo de resolução',
                impact: 'Melhorar satisfação do usuário'
            });
        }

        return recommendations;
    }
}

module.exports = DashboardController;