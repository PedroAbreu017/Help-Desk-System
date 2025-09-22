// src/routes/tickets.js - Rotas de Tickets CORRIGIDAS
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { 
    validateTicket, 
    validateTicketUpdate, 
    validateTicketNote, 
    validateQueryParams, 
    validateId 
} = require('../middleware/validation');
const { executeQuery } = require('../config/database');
const { generateId, logActivity } = require('../utils/helpers');

// GET /api/tickets - Listar tickets com filtros
router.get('/', validateQueryParams, asyncHandler(async (req, res) => {
    const { 
        status, 
        priority, 
        category, 
        limit: rawLimit, 
        offset: rawOffset, 
        page: rawPage,
        search, 
        assigned_to, 
        department 
    } = req.query;
    
    // VALIDAÇÃO E CONVERSÃO DE PARÂMETROS
    let limit = null;
    let offset = null;
    
    if (rawLimit) {
        limit = parseInt(rawLimit, 10);
        if (isNaN(limit) || limit < 1 || limit > 100) {
            return res.status(400).json({
                success: false,
                message: 'Parâmetro limit deve ser entre 1 e 100'
            });
        }
    }
    
    // Calcular offset baseado em page ou offset direto
    if (rawPage && !rawOffset) {
        const page = parseInt(rawPage, 10);
        if (isNaN(page) || page < 1) {
            return res.status(400).json({
                success: false,
                message: 'Parâmetro page deve ser um número positivo'
            });
        }
        const limitForCalc = limit || 10;
        offset = (page - 1) * limitForCalc;
    } else if (rawOffset) {
        offset = parseInt(rawOffset, 10);
        if (isNaN(offset) || offset < 0) {
            return res.status(400).json({
                success: false,
                message: 'Parâmetro offset deve ser não-negativo'
            });
        }
    }
    
    let query = 'SELECT * FROM tickets WHERE 1=1';
    let params = [];
    let countQuery = 'SELECT COUNT(*) as total FROM tickets WHERE 1=1';
    let countParams = [];
    
    // Aplicar filtros
    if (status) {
        query += ' AND status = ?';
        countQuery += ' AND status = ?';
        params.push(status);
        countParams.push(status);
    }
    
    if (priority) {
        query += ' AND priority = ?';
        countQuery += ' AND priority = ?';
        params.push(priority);
        countParams.push(priority);
    }
    
    if (category) {
        query += ' AND category = ?';
        countQuery += ' AND category = ?';
        params.push(category);
        countParams.push(category);
    }

    if (assigned_to) {
        query += ' AND assigned_to = ?';
        countQuery += ' AND assigned_to = ?';
        params.push(assigned_to);
        countParams.push(assigned_to);
    }

    if (department) {
        query += ' AND department = ?';
        countQuery += ' AND department = ?';
        params.push(department);
        countParams.push(department);
    }
    
    if (search) {
        query += ' AND (title LIKE ? OR description LIKE ? OR user_name LIKE ?)';
        countQuery += ' AND (title LIKE ? OR description LIKE ? OR user_name LIKE ?)';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
        countParams.push(searchParam, searchParam, searchParam);
    }
    
    // Ordenar por data de criação (mais recentes primeiro)
    query += ' ORDER BY created_at DESC';
    
    // Paginação - USAR QUERY DIRETA (MySQL não suporta LIMIT em prepared statements)
    if (limit) {
        query += ` LIMIT ${limit}`;  // ← Query direta, não prepared
        
        if (offset && offset > 0) {
            query += ` OFFSET ${offset}`;  // ← Query direta, não prepared
        }
    }
    
    // Debug log
    console.log('🔍 Query params:', { 
        limit, 
        offset, 
        page: rawPage,
        paramsCount: params.length,
        paramsTypes: params.map(p => typeof p) 
    });
    
    try {
        // Executar queries
        const [tickets, totalResult] = await Promise.all([
            executeQuery(query, params),
            executeQuery(countQuery, countParams)
        ]);
        
        const totalCount = totalResult[0].total || totalResult[0]['COUNT(*)'] || 0;

        res.json({
            success: true,
            data: {
                tickets,
                total_count: totalCount,
                filtered_count: tickets.length,
                pagination: {
                    limit: limit || null,
                    offset: offset || null,
                    page: rawPage ? parseInt(rawPage, 10) : null,
                    has_more: limit && offset ? (offset + limit) < totalCount : false
                }
            }
        });

        console.log(`📋 Listagem de tickets - ${tickets.length}/${totalCount} retornados`);
        
    } catch (error) {
        console.error('❌ Erro na consulta de tickets:', {
            error: error.message,
            query: query.substring(0, 200),
            params,
            paramsTypes: params.map(p => typeof p)
        });
        throw error;
    }
}));

// GET /api/tickets/:id - Buscar ticket específico
router.get('/:id', validateId(), asyncHandler(async (req, res) => {
    const ticketId = req.params.id;
    
    // Buscar ticket
    const tickets = await executeQuery('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    
    if (tickets.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Ticket não encontrado'
        });
    }

    const ticket = tickets[0];

    // Buscar notas do ticket
    const notes = await executeQuery(
        'SELECT * FROM ticket_notes WHERE ticket_id = ? ORDER BY created_at ASC',
        [ticketId]
    );

    // Buscar atividades do ticket
    const activities = await executeQuery(
        'SELECT * FROM activity_logs WHERE ticket_id = ? ORDER BY created_at DESC LIMIT 20',
        [ticketId]
    );

    // Adicionar dados relacionados ao ticket
    ticket.internal_notes = notes;
    ticket.activities = activities;

    res.json({
        success: true,
        data: ticket
    });

    console.log(`🔍 Ticket consultado: ${ticketId}`);
}));

// POST /api/tickets - Criar novo ticket
router.post('/', validateTicket, asyncHandler(async (req, res) => {
    const {
        title,
        description,
        category,
        priority,
        user_name,
        user_email,
        department
    } = req.body;

    const newTicket = {
        id: generateId(),
        title,
        description,
        category,
        priority,
        status: 'aberto',
        user_name,
        user_email,
        department,
        assigned_to: null,
        solution: null
    };

    // Inserir ticket
    await executeQuery(`
        INSERT INTO tickets (
            id, title, description, category, priority, status,
            user_name, user_email, department, assigned_to, solution
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        newTicket.id, newTicket.title, newTicket.description, newTicket.category,
        newTicket.priority, newTicket.status, newTicket.user_name, 
        newTicket.user_email, newTicket.department, newTicket.assigned_to, 
        newTicket.solution
    ]);

    // Registrar atividade
    await logActivity(newTicket.id, 'created', `Ticket criado por ${newTicket.user_name}`, newTicket.user_name);

    // Buscar ticket completo para retornar
    const createdTicket = await executeQuery('SELECT * FROM tickets WHERE id = ?', [newTicket.id]);
    const ticket = createdTicket[0];

    // NOTIFICAÇÃO WEBSOCKET - Novo Ticket
    if (global.notificationService) {
        global.notificationService.newTicket(ticket);
        console.log(`🔔 Notificação WebSocket enviada: Novo ticket ${ticket.id}`);
    }

    res.status(201).json({
        success: true,
        message: 'Ticket criado com sucesso',
        data: ticket
    });

    console.log(`🎫 Ticket criado: ${newTicket.id} - ${newTicket.title} (${newTicket.priority})`);
}));

// PUT /api/tickets/:id - Atualizar ticket
router.put('/:id', validateId(), validateTicketUpdate, asyncHandler(async (req, res) => {
    const ticketId = req.params.id;
    const updates = req.body;
    
    // Verificar se ticket existe
    const existingTickets = await executeQuery('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    
    if (existingTickets.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Ticket não encontrado'
        });
    }

    const currentTicket = existingTickets[0];
    
    // Campos permitidos para atualização
    const allowedUpdates = ['status', 'priority', 'assigned_to', 'solution', 'title', 'description', 'category'];
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key) && updates[key] !== undefined) {
            updateFields.push(`${key} = ?`);
            updateValues.push(updates[key]);
        }
    });

    if (updateFields.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Nenhum campo válido para atualização'
        });
    }

    // Se status mudou para resolvido, adicionar timestamp
    if (updates.status === 'resolvido' && currentTicket.status !== 'resolvido') {
        updateFields.push('resolved_at = ?');
        updateValues.push(new Date());
    }

    // Se status mudou de resolvido para outro, remover timestamp
    if (updates.status && updates.status !== 'resolvido' && currentTicket.status === 'resolvido') {
        updateFields.push('resolved_at = ?');
        updateValues.push(null);
    }

    // Adicionar updated_at
    updateFields.push('updated_at = ?');
    updateValues.push(new Date());

    // Executar update
    const query = `UPDATE tickets SET ${updateFields.join(', ')} WHERE id = ?`;
    updateValues.push(ticketId);
    
    await executeQuery(query, updateValues);

    // Registrar atividades das mudanças
    const changedFields = Object.keys(updates).filter(key => allowedUpdates.includes(key));
    const changeDescriptions = [];
    
    changedFields.forEach(field => {
        const oldValue = currentTicket[field];
        const newValue = updates[field];
        if (oldValue !== newValue) {
            changeDescriptions.push(`${field}: ${oldValue || 'vazio'} → ${newValue || 'vazio'}`);
        }
    });

    if (changeDescriptions.length > 0) {
        await logActivity(
            ticketId, 
            'updated', 
            `Ticket atualizado: ${changeDescriptions.join(', ')}`, 
            updates.updated_by || 'Sistema'
        );
    }

    // Buscar ticket atualizado
    const updatedTicket = await executeQuery('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    const ticket = updatedTicket[0];

    // NOTIFICAÇÕES WEBSOCKET - Mudanças de Status/Atribuição
    if (global.notificationService) {
        // Notificação de mudança de status
        if (updates.status && updates.status !== currentTicket.status) {
            global.notificationService.ticketStatusChanged(
                ticket, 
                currentTicket.status, 
                updates.status
            );
            console.log(`🔔 Notificação WebSocket: Status alterado ${ticketId}`);
        }

        // Notificação de atribuição
        if (updates.assigned_to && updates.assigned_to !== currentTicket.assigned_to) {
            global.notificationService.ticketAssigned(
                ticket, 
                updates.assigned_to, 
                updates.updated_by || 'Sistema'
            );
            console.log(`🔔 Notificação WebSocket: Ticket atribuído ${ticketId}`);
        }
    }

    res.json({
        success: true,
        message: 'Ticket atualizado com sucesso',
        data: ticket
    });

    console.log(`✏️ Ticket atualizado: ${ticketId} - ${changedFields.join(', ')}`);
}));

// DELETE /api/tickets/:id - Deletar ticket
router.delete('/:id', validateId(), asyncHandler(async (req, res) => {
    const ticketId = req.params.id;
    
    // Verificar se ticket existe
    const existingTickets = await executeQuery('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    
    if (existingTickets.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Ticket não encontrado'
        });
    }

    const ticket = existingTickets[0];

    // Deletar ticket (cascade vai deletar notas e atividades)
    await executeQuery('DELETE FROM tickets WHERE id = ?', [ticketId]);

    // Registrar atividade de deleção (sem foreign key)
    await logActivity(null, 'ticket_deleted', `Ticket "${ticket.title}" deletado`, 'Sistema');

    // NOTIFICAÇÃO WEBSOCKET - Ticket Deletado
    if (global.notificationService) {
        global.notificationService.broadcast({
            type: 'ticket_deleted',
            title: 'Ticket Deletado',
            message: `Ticket #${ticket.id} foi removido do sistema`,
            icon: 'fas fa-trash',
            color: '#dc3545'
        });
        console.log(`🔔 Notificação WebSocket: Ticket deletado ${ticketId}`);
    }

    res.json({
        success: true,
        message: 'Ticket deletado com sucesso',
        data: ticket
    });

    console.log(`🗑️ Ticket deletado: ${ticketId} - ${ticket.title}`);
}));

// POST /api/tickets/:id/notes - Adicionar nota interna
router.post('/:id/notes', validateId(), validateTicketNote, asyncHandler(async (req, res) => {
    const ticketId = req.params.id;
    const { note, author } = req.body;
    
    // Verificar se ticket existe
    const existingTickets = await executeQuery('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    
    if (existingTickets.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Ticket não encontrado'
        });
    }

    const ticket = existingTickets[0];
    const newNote = {
        id: generateId(),
        ticket_id: ticketId,
        content: note,
        author: author
    };

    // Inserir nota
    await executeQuery(
        'INSERT INTO ticket_notes (id, ticket_id, content, author) VALUES (?, ?, ?, ?)',
        [newNote.id, newNote.ticket_id, newNote.content, newNote.author]
    );

    // Atualizar timestamp do ticket
    await executeQuery('UPDATE tickets SET updated_at = ? WHERE id = ?', [new Date(), ticketId]);

    // Registrar atividade
    await logActivity(ticketId, 'note_added', `Nota interna adicionada por ${author}`, author);

    // Buscar nota criada
    const createdNote = await executeQuery('SELECT * FROM ticket_notes WHERE id = ?', [newNote.id]);

    // NOTIFICAÇÃO WEBSOCKET - Nova Nota
    if (global.notificationService) {
        global.notificationService.newComment(
            ticket, 
            { id: newNote.id, content: newNote.content }
        );
        console.log(`🔔 Notificação WebSocket: Nova nota no ticket ${ticketId}`);
    }

    res.status(201).json({
        success: true,
        message: 'Nota adicionada com sucesso',
        data: createdNote[0]
    });

    console.log(`📝 Nota adicionada ao ticket ${ticketId} por ${author}`);
}));

// GET /api/tickets/:id/notes - Listar notas do ticket
router.get('/:id/notes', validateId(), asyncHandler(async (req, res) => {
    const ticketId = req.params.id;
    
    // Verificar se ticket existe
    const existingTickets = await executeQuery('SELECT id FROM tickets WHERE id = ?', [ticketId]);
    
    if (existingTickets.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Ticket não encontrado'
        });
    }

    // Buscar notas
    const notes = await executeQuery(
        'SELECT * FROM ticket_notes WHERE ticket_id = ? ORDER BY created_at ASC',
        [ticketId]
    );

    res.json({
        success: true,
        data: notes
    });
}));

// GET /api/tickets/:id/activities - Log de atividades do ticket
router.get('/:id/activities', validateId(), asyncHandler(async (req, res) => {
    const ticketId = req.params.id;
    const { limit = 50 } = req.query;
    
    // Verificar se ticket existe
    const existingTickets = await executeQuery('SELECT id FROM tickets WHERE id = ?', [ticketId]);
    
    if (existingTickets.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Ticket não encontrado'
        });
    }

    // Buscar atividades com validação
    const limitNum = parseInt(limit, 10);
    const validLimit = isNaN(limitNum) ? 50 : Math.min(limitNum, 100);
    
    const activities = await executeQuery(
        'SELECT * FROM activity_logs WHERE ticket_id = ? ORDER BY created_at DESC LIMIT ?',
        [ticketId, validLimit]
    );

    res.json({
        success: true,
        data: activities
    });
}));

// GET /api/tickets/category/:category - Tickets por categoria
router.get('/category/:category', validateQueryParams, asyncHandler(async (req, res) => {
    const { category } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const validCategories = ['hardware', 'software', 'rede', 'email', 'impressora', 'sistema', 'acesso'];
    
    if (!validCategories.includes(category)) {
        return res.status(400).json({
            success: false,
            message: 'Categoria inválida',
            valid_categories: validCategories
        });
    }

    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
            success: false,
            message: 'Limit deve ser entre 1 e 100'
        });
    }
    
    if (isNaN(offsetNum) || offsetNum < 0) {
        return res.status(400).json({
            success: false,
            message: 'Offset deve ser não-negativo'
        });
    }

    const tickets = await executeQuery(
        'SELECT * FROM tickets WHERE category = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [category, limitNum, offsetNum]
    );

    const totalCount = await executeQuery(
        'SELECT COUNT(*) as total FROM tickets WHERE category = ?',
        [category]
    );

    res.json({
        success: true,
        data: {
            category,
            tickets,
            total_count: totalCount[0].total || totalCount[0]['COUNT(*)'] || 0
        }
    });
}));

// GET /api/tickets/priority/:priority - Tickets por prioridade
router.get('/priority/:priority', validateQueryParams, asyncHandler(async (req, res) => {
    const { priority } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const validPriorities = ['baixa', 'media', 'alta', 'critica'];
    
    if (!validPriorities.includes(priority)) {
        return res.status(400).json({
            success: false,
            message: 'Prioridade inválida',
            valid_priorities: validPriorities
        });
    }

    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
            success: false,
            message: 'Limit deve ser entre 1 e 100'
        });
    }
    
    if (isNaN(offsetNum) || offsetNum < 0) {
        return res.status(400).json({
            success: false,
            message: 'Offset deve ser não-negativo'
        });
    }

    const tickets = await executeQuery(
        'SELECT * FROM tickets WHERE priority = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [priority, limitNum, offsetNum]
    );

    const totalCount = await executeQuery(
        'SELECT COUNT(*) as total FROM tickets WHERE priority = ?',
        [priority]
    );

    res.json({
        success: true,
        data: {
            priority,
            tickets,
            total_count: totalCount[0].total || totalCount[0]['COUNT(*)'] || 0
        }
    });
}));

module.exports = router;