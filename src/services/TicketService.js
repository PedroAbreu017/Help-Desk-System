// src/services/TicketService.js - Lógica de negócio para tickets - CORRIGIDO
const { executeQuery } = require('../config/database');
const { logActivity } = require('../utils/helpers');
const Ticket = require('../models/Ticket');

// Função utilitária para formatação de data MySQL
const formatDateForMySQL = (date = new Date()) => {
    return date.toISOString().slice(0, 19).replace('T', ' ');
};

class TicketService {
    // Criar novo ticket
    static async create(ticketData) {
        // Validar dados
        const validation = Ticket.validate(ticketData);
        if (!validation.isValid) {
            throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
        }

        // Sanitizar e preparar dados
        const sanitizedData = Ticket.sanitize(ticketData);
        const ticketToCreate = Ticket.prepareForCreation(sanitizedData);

        // Inserir no banco
        await executeQuery(`
            INSERT INTO tickets (
                id, title, description, category, priority, status,
                user_name, user_email, department, assigned_to, solution,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            ticketToCreate.id, ticketToCreate.title, ticketToCreate.description, 
            ticketToCreate.category, ticketToCreate.priority, ticketToCreate.status,
            ticketToCreate.user_name, ticketToCreate.user_email, ticketToCreate.department,
            ticketToCreate.assigned_to, ticketToCreate.solution,
            ticketToCreate.created_at, ticketToCreate.updated_at
        ]);

        // Registrar atividade
        await logActivity(
            ticketToCreate.id, 
            'created', 
            `Ticket criado por ${ticketToCreate.user_name}`, 
            ticketToCreate.user_name
        );

        // Buscar ticket completo
        const createdTickets = await executeQuery('SELECT * FROM tickets WHERE id = ?', [ticketToCreate.id]);
        const ticket = createdTickets[0];

        // Enviar notificação
        await this.notifyNewTicket(ticket);

        return Ticket.formatForDisplay(ticket);
    }

    // Listar tickets com filtros
    static async list(queryParams) {
        const validation = Ticket.validateQueryParams(queryParams);
        if (!validation.isValid) {
            throw new Error(`Parâmetros inválidos: ${validation.errors.join(', ')}`);
        }

        const filters = validation.params;
        const queryData = Ticket.buildFilterQuery(filters);

        // Executar queries
        const [tickets, totalResult] = await Promise.all([
            executeQuery(queryData.query, queryData.params),
            executeQuery(queryData.countQuery, queryData.countParams)
        ]);

        const totalCount = totalResult[0].total || totalResult[0]['COUNT(*)'] || 0;

        return {
            tickets: tickets.map(ticket => Ticket.formatForDisplay(ticket)),
            total_count: totalCount,
            filtered_count: tickets.length,
            pagination: {
                limit: filters.limit || null,
                offset: filters.offset || null,
                page: filters.page || null,
                has_more: filters.limit && filters.offset ? 
                    (filters.offset + filters.limit) < totalCount : false
            }
        };
    }

    // Buscar ticket por ID
    static async findById(id) {
        const validation = Ticket.validateId(id);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        const tickets = await executeQuery('SELECT * FROM tickets WHERE id = ?', [id]);
        
        if (tickets.length === 0) {
            return null;
        }

        const ticket = tickets[0];

        // Buscar dados relacionados
        const [notes, activities] = await Promise.all([
            executeQuery(
                'SELECT * FROM ticket_notes WHERE ticket_id = ? ORDER BY created_at ASC',
                [id]
            ),
            executeQuery(
                'SELECT * FROM activity_logs WHERE ticket_id = ? ORDER BY created_at DESC LIMIT 20',
                [id]
            )
        ]);

        // Adicionar dados relacionados
        ticket.internal_notes = notes;
        ticket.activities = activities;

        return Ticket.formatForDisplay(ticket);
    }

    // Atualizar ticket - CORRIGIDO
    static async update(id, updateData, updatedBy = 'Sistema') {
        const validation = Ticket.validateUpdate(updateData);
        if (!validation.isValid) {
            throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
        }

        // Verificar se ticket existe
        const existingTickets = await executeQuery('SELECT * FROM tickets WHERE id = ?', [id]);
        if (existingTickets.length === 0) {
            throw new Error('Ticket não encontrado');
        }

        const currentTicket = existingTickets[0];
        
        // Sanitizar e preparar dados
        const sanitizedData = Ticket.sanitize(updateData);
        const updatesData = Ticket.prepareForUpdate(sanitizedData, validation.updateFields);

        // Forçar formato de data correto
        updatesData.updated_at = formatDateForMySQL();
        if (updatesData.status === 'resolvido') {
            updatesData.resolved_at = formatDateForMySQL();
        }

        // Construir query de update
        const updateFields = [];
        const updateValues = [];
        
        Object.entries(updatesData).forEach(([key, value]) => {
            updateFields.push(`${key} = ?`);
            updateValues.push(value);
        });

        updateValues.push(id);

        // Executar update
        const query = `UPDATE tickets SET ${updateFields.join(', ')} WHERE id = ?`;
        await executeQuery(query, updateValues);

        // Registrar atividades das mudanças
        await this.logTicketChanges(id, currentTicket, sanitizedData, updatedBy);

        // Buscar ticket atualizado
        const updatedTickets = await executeQuery('SELECT * FROM tickets WHERE id = ?', [id]);
        const updatedTicket = updatedTickets[0];

        // Enviar notificações
        await this.notifyTicketUpdated(updatedTicket, currentTicket, sanitizedData, updatedBy);

        return Ticket.formatForDisplay(updatedTicket);
    }

    // Deletar ticket
    static async delete(id) {
        const validation = Ticket.validateId(id);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        // Verificar se ticket existe
        const existingTickets = await executeQuery('SELECT * FROM tickets WHERE id = ?', [id]);
        if (existingTickets.length === 0) {
            throw new Error('Ticket não encontrado');
        }

        const ticket = existingTickets[0];

        // Deletar ticket (cascade vai deletar notas e atividades)
        await executeQuery('DELETE FROM tickets WHERE id = ?', [id]);

        // Registrar atividade de deleção
        await logActivity(null, 'ticket_deleted', `Ticket "${ticket.title}" deletado`, 'Sistema');

        // Enviar notificação
        await this.notifyTicketDeleted(ticket);

        return Ticket.formatForDisplay(ticket);
    }

    // Adicionar nota ao ticket - CORRIGIDO
    static async addNote(ticketId, noteData, author) {
        const validation = Ticket.validateId(ticketId);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        // Validar nota
        if (!noteData.note || noteData.note.trim() === '') {
            throw new Error('Conteúdo da nota é obrigatório');
        }

        if (!author || author.trim() === '') {
            throw new Error('Autor da nota é obrigatório');
        }

        if (noteData.note.length < 3 || noteData.note.length > 2000) {
            throw new Error('Nota deve ter entre 3 e 2000 caracteres');
        }

        // Verificar se ticket existe
        const existingTickets = await executeQuery('SELECT * FROM tickets WHERE id = ?', [ticketId]);
        if (existingTickets.length === 0) {
            throw new Error('Ticket não encontrado');
        }

        const ticket = existingTickets[0];
        const { generateId } = require('../utils/helpers');
        
        const newNote = {
            id: generateId(),
            ticket_id: ticketId,
            content: noteData.note.trim(),
            author: author.trim()
        };

        // Inserir nota
        await executeQuery(
            'INSERT INTO ticket_notes (id, ticket_id, content, author) VALUES (?, ?, ?, ?)',
            [newNote.id, newNote.ticket_id, newNote.content, newNote.author]
        );

        // Atualizar timestamp do ticket - CORRIGIDO
        await executeQuery('UPDATE tickets SET updated_at = ? WHERE id = ?', [formatDateForMySQL(), ticketId]);

        // Registrar atividade
        await logActivity(ticketId, 'note_added', `Nota interna adicionada por ${author}`, author);

        // Buscar nota criada
        const createdNotes = await executeQuery('SELECT * FROM ticket_notes WHERE id = ?', [newNote.id]);
        const createdNote = createdNotes[0];

        // Enviar notificação
        await this.notifyNewNote(ticket, createdNote);

        return createdNote;
    }

    // Obter notas do ticket
    static async getNotes(ticketId) {
        const validation = Ticket.validateId(ticketId);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        // Verificar se ticket existe
        const existingTickets = await executeQuery('SELECT id FROM tickets WHERE id = ?', [ticketId]);
        if (existingTickets.length === 0) {
            throw new Error('Ticket não encontrado');
        }

        // Buscar notas
        const notes = await executeQuery(
            'SELECT * FROM ticket_notes WHERE ticket_id = ? ORDER BY created_at ASC',
            [ticketId]
        );

        return notes;
    }

    // Obter atividades do ticket
    static async getActivities(ticketId, limit = 50) {
        const validation = Ticket.validateId(ticketId);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        // Validar limit
        const limitNum = parseInt(limit, 10);
        const validLimit = isNaN(limitNum) ? 50 : Math.min(limitNum, 100);

        // Verificar se ticket existe
        const existingTickets = await executeQuery('SELECT id FROM tickets WHERE id = ?', [ticketId]);
        if (existingTickets.length === 0) {
            throw new Error('Ticket não encontrado');
        }

        // Buscar atividades
        const activities = await executeQuery(
            'SELECT * FROM activity_logs WHERE ticket_id = ? ORDER BY created_at DESC LIMIT ?',
            [ticketId, validLimit]
        );

        return activities;
    }

    // Buscar tickets por categoria
    static async findByCategory(category, options = {}) {
        const validCategories = Ticket.getValidCategories();
        if (!validCategories.includes(category)) {
            throw new Error(`Categoria inválida. Use: ${validCategories.join(', ')}`);
        }

        const limit = parseInt(options.limit || 20, 10);
        const offset = parseInt(options.offset || 0, 10);

        if (limit < 1 || limit > 100) {
            throw new Error('Limit deve ser entre 1 e 100');
        }

        if (offset < 0) {
            throw new Error('Offset deve ser não-negativo');
        }

        const [tickets, totalResult] = await Promise.all([
            executeQuery(
                'SELECT * FROM tickets WHERE category = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
                [category, limit, offset]
            ),
            executeQuery(
                'SELECT COUNT(*) as total FROM tickets WHERE category = ?',
                [category]
            )
        ]);

        const totalCount = totalResult[0].total || totalResult[0]['COUNT(*)'] || 0;

        return {
            category,
            tickets: tickets.map(ticket => Ticket.formatForDisplay(ticket)),
            total_count: totalCount
        };
    }

    // Buscar tickets por prioridade
    static async findByPriority(priority, options = {}) {
        const validPriorities = Ticket.getValidPriorities();
        if (!validPriorities.includes(priority)) {
            throw new Error(`Prioridade inválida. Use: ${validPriorities.join(', ')}`);
        }

        const limit = parseInt(options.limit || 20, 10);
        const offset = parseInt(options.offset || 0, 10);

        if (limit < 1 || limit > 100) {
            throw new Error('Limit deve ser entre 1 e 100');
        }

        if (offset < 0) {
            throw new Error('Offset deve ser não-negativo');
        }

        const [tickets, totalResult] = await Promise.all([
            executeQuery(
                'SELECT * FROM tickets WHERE priority = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
                [priority, limit, offset]
            ),
            executeQuery(
                'SELECT COUNT(*) as total FROM tickets WHERE priority = ?',
                [priority]
            )
        ]);

        const totalCount = totalResult[0].total || totalResult[0]['COUNT(*)'] || 0;

        return {
            priority,
            tickets: tickets.map(ticket => Ticket.formatForDisplay(ticket)),
            total_count: totalCount
        };
    }

    // Métodos de notificação
    static async notifyNewTicket(ticket) {
        if (global.notificationService) {
            global.notificationService.newTicket(ticket);
        }
    }

    static async notifyTicketUpdated(updatedTicket, originalTicket, changes, updatedBy) {
        if (!global.notificationService) return;

        // Notificação de mudança de status
        if (changes.status && changes.status !== originalTicket.status) {
            global.notificationService.ticketStatusChanged(
                updatedTicket, 
                originalTicket.status, 
                changes.status
            );
        }

        // Notificação de atribuição
        if (changes.assigned_to && changes.assigned_to !== originalTicket.assigned_to) {
            global.notificationService.ticketAssigned(
                updatedTicket, 
                changes.assigned_to, 
                updatedBy
            );
        }
    }

    static async notifyTicketDeleted(ticket) {
        if (global.notificationService) {
            global.notificationService.broadcast({
                type: 'ticket_deleted',
                title: 'Ticket Deletado',
                message: `Ticket #${ticket.id} foi removido do sistema`,
                icon: 'fas fa-trash',
                color: '#dc3545'
            });
        }
    }

    static async notifyNewNote(ticket, note) {
        if (global.notificationService) {
            global.notificationService.newComment(ticket, note);
        }
    }

    // Métodos de logging
    static async logTicketChanges(ticketId, originalTicket, changes, updatedBy) {
        const changeDescriptions = [];
        
        Object.keys(changes).forEach(field => {
            const oldValue = originalTicket[field];
            const newValue = changes[field];
            if (oldValue !== newValue) {
                changeDescriptions.push(`${field}: ${oldValue || 'vazio'} → ${newValue || 'vazio'}`);
            }
        });

        if (changeDescriptions.length > 0) {
            await logActivity(
                ticketId, 
                'updated', 
                `Ticket atualizado: ${changeDescriptions.join(', ')}`, 
                updatedBy
            );
        }
    }

    // Métodos de análise e estatísticas
    static async getTicketStats() {
        const stats = await executeQuery(`
            SELECT 
                COUNT(*) as total_tickets,
                SUM(CASE WHEN status = 'aberto' THEN 1 ELSE 0 END) as open_tickets,
                SUM(CASE WHEN status = 'andamento' THEN 1 ELSE 0 END) as in_progress_tickets,
                SUM(CASE WHEN status = 'resolvido' THEN 1 ELSE 0 END) as resolved_tickets,
                SUM(CASE WHEN status = 'fechado' THEN 1 ELSE 0 END) as closed_tickets,
                AVG(CASE 
                    WHEN resolved_at IS NOT NULL 
                    THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) 
                    ELSE NULL 
                END) as avg_resolution_time
            FROM tickets
        `);

        return stats[0] || {};
    }

    static async getOverdueTickets() {
        // SLA em horas por prioridade
        const slaHours = { critica: 4, alta: 24, media: 72, baixa: 168 };
        
        const tickets = await executeQuery(`
            SELECT * FROM tickets 
            WHERE status NOT IN ('resolvido', 'fechado')
        `);

        return tickets.filter(ticket => Ticket.isOverdue(ticket));
    }

    static async getTicketsByUser(userEmail) {
        const tickets = await executeQuery(
            'SELECT * FROM tickets WHERE user_email = ? ORDER BY created_at DESC',
            [userEmail]
        );

        return tickets.map(ticket => Ticket.formatForDisplay(ticket));
    }

    static async getAssignedTickets(userId) {
        const tickets = await executeQuery(
            'SELECT * FROM tickets WHERE assigned_to = ? ORDER BY created_at DESC',
            [userId]
        );

        return tickets.map(ticket => Ticket.formatForDisplay(ticket));
    }
}

module.exports = TicketService;