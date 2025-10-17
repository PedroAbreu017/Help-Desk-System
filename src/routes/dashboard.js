// src/routes/dashboard.js - Rotas do Dashboard Refatoradas MVC
const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

// Aplicar autenticação a todas as rotas do dashboard
router.use(authenticateToken);

// Rotas principais do dashboard
router.get('/', asyncHandler(DashboardController.getMainDashboard));
router.get('/metrics', asyncHandler(DashboardController.getMetrics));
router.get('/stats', asyncHandler(DashboardController.getBasicStats));
router.get('/recent', asyncHandler(DashboardController.getRecentActivity));
router.get('/trends', asyncHandler(DashboardController.getTrends));
router.get('/alerts', asyncHandler(DashboardController.getAlerts));
router.get('/performance', asyncHandler(DashboardController.getPerformance));
router.get('/summary', asyncHandler(DashboardController.getExecutiveSummary));
router.get('/export', asyncHandler(DashboardController.exportDashboardData));

module.exports = router;