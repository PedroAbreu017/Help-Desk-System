// src/routes/users.js - Rotas de Usuários Refatoradas MVC
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

// Aplicar autenticação a todas as rotas de usuários
router.use(authenticateToken);

// Rotas principais de usuários
router.get('/', asyncHandler(UserController.listUsers));
router.post('/', asyncHandler(UserController.createUser));
router.get('/search', asyncHandler(UserController.searchUsers));
router.get('/stats', asyncHandler(UserController.getStats));
router.get('/roles', asyncHandler(UserController.getRoles));
router.get('/departments', asyncHandler(UserController.getDepartments));
router.get('/department/:department', asyncHandler(UserController.getUsersByDepartment));
router.post('/bulk', asyncHandler(UserController.bulkOperations));

// Rotas específicas de usuário
router.get('/:id', asyncHandler(UserController.getUser));
router.put('/:id', asyncHandler(UserController.updateUser));
router.post('/:id/deactivate', asyncHandler(UserController.deactivateUser));
router.post('/:id/reactivate', asyncHandler(UserController.reactivateUser));
router.post('/:id/reset-password', asyncHandler(UserController.resetPassword));
router.post('/:id/unlock', asyncHandler(UserController.unlockUser));
router.put('/:id/role', asyncHandler(UserController.changeRole));

module.exports = router;