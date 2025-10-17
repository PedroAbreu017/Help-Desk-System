// src/routes/auth.js - Rotas de Autenticação Refatoradas MVC
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, rateLimitLogin, auditLog } = require('../middleware/auth');

// Rotas públicas (sem autenticação)
router.post('/login', rateLimitLogin, auditLog('login_attempt'), asyncHandler(AuthController.login));
router.post('/refresh', asyncHandler(AuthController.refreshToken));
router.get('/verify', asyncHandler(AuthController.verifyToken));

// Rotas protegidas (com autenticação)
router.use(authenticateToken);

router.post('/logout', auditLog('logout'), asyncHandler(AuthController.logout));
router.get('/profile', asyncHandler(AuthController.getProfile));
router.put('/profile', auditLog('profile_update'), asyncHandler(AuthController.updateProfile));
router.post('/change-password', auditLog('password_change'), asyncHandler(AuthController.changePassword));
router.get('/me', asyncHandler(AuthController.getCurrentUser));

// Rotas administrativas (apenas admins)
router.post('/register', auditLog('user_registration'), asyncHandler(AuthController.register));
router.get('/users', asyncHandler(AuthController.listUsers));
router.get('/users/:id', asyncHandler(AuthController.getUser));
router.post('/check-permissions', asyncHandler(AuthController.checkPermissions));

// Rota especial para super admin
router.post('/impersonate', auditLog('impersonate'), asyncHandler(AuthController.impersonate));

module.exports = router;