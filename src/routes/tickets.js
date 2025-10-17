// src/routes/tickets.js - Rotas Refatoradas MVC
const express = require('express');
const router = express.Router();
const TicketController = require('../controllers/TicketController');
const { asyncHandler } = require('../middleware/errorHandler');
const { 
    validateTicket, 
    validateTicketUpdate, 
    validateTicketNote, 
    validateQueryParams, 
    validateId 
} = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Aplicar autenticação a todas as rotas (opcional)
// router.use(authenticateToken);

// Rotas principais de CRUD
router.get('/', validateQueryParams, asyncHandler(TicketController.list));
router.post('/', validateTicket, asyncHandler(TicketController.create));
router.get('/:id', validateId(), asyncHandler(TicketController.show));
router.put('/:id', validateId(), validateTicketUpdate, asyncHandler(TicketController.update));
router.delete('/:id', validateId(), asyncHandler(TicketController.delete));

// Rotas para notas
router.post('/:id/notes', validateId(), validateTicketNote, asyncHandler(TicketController.addNote));
router.get('/:id/notes', validateId(), asyncHandler(TicketController.getNotes));

// Rotas para atividades
router.get('/:id/activities', validateId(), asyncHandler(TicketController.getActivities));

// Rotas de busca
router.get('/category/:category', validateQueryParams, asyncHandler(TicketController.findByCategory));
router.get('/priority/:priority', validateQueryParams, asyncHandler(TicketController.findByPriority));
router.get('/user/:email', asyncHandler(TicketController.getUserTickets));
router.get('/assigned/:userId', asyncHandler(TicketController.getAssignedTickets));

// Rotas de ações específicas
router.post('/:id/assign', validateId(), asyncHandler(TicketController.assign));
router.put('/:id/status', validateId(), asyncHandler(TicketController.updateStatus));
router.put('/:id/priority', validateId(), asyncHandler(TicketController.updatePriority));
router.post('/:id/resolve', validateId(), asyncHandler(TicketController.resolve));
router.post('/:id/close', validateId(), asyncHandler(TicketController.close));
router.post('/:id/reopen', validateId(), asyncHandler(TicketController.reopen));

// Rotas de estatísticas e análise
router.get('/stats/overview', asyncHandler(TicketController.getStats));
router.get('/stats/overdue', asyncHandler(TicketController.getOverdue));

module.exports = router;