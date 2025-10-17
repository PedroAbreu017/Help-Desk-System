// src/controllers/TicketController.js - Controller MVC para Tickets - CORRIGIDO
const TicketService = require('../services/TicketService');
const { createError } = require('../middleware/errorHandler');

// Função utilitária para formatação de data MySQL
const formatDateForMySQL = (date = new Date()) => {
    return date.toISOString().slice(0, 19).replace('T', ' ');
};

class TicketController {
    // GET /api/tickets - Listar tickets com filtros
    static async list(req, res, next) {
        try {
            const result = await TicketService.list(req.query);
            
            res.json({
                success: true,
                data: result
            });

            console.log(`📋 Listagem de tickets - ${result.tickets.length}/${result.total_count} retornados`);
        } catch (error) {
            console.error('❌ Erro na listagem de tickets:', error.message);
            next(createError(error.message, 400, 'TICKET_LIST_ERROR'));
        }
    }

    // GET /api/tickets/:id - Buscar ticket específico
    static async show(req, res, next) {
        try {
            const ticket = await TicketService.findById(req.params.id);
            
            if (!ticket) {
                return next(createError('Ticket não encontrado', 404, 'TICKET_NOT_FOUND'));
            }

            res.json({
                success: true,
                data: ticket
            });

            console.log(`🔍 Ticket consultado: ${req.params.id}`);
        } catch (error) {
            console.error('❌ Erro ao buscar ticket:', error.message);
            next(createError(error.message, 400, 'TICKET_SHOW_ERROR'));
        }
    }

    // POST /api/tickets - Criar novo ticket
    static async create(req, res, next) {
        try {
            const ticket = await TicketService.create(req.body);

            res.status(201).json({
                success: true,
                message: 'Ticket criado com sucesso',
                data: ticket
            });

            console.log(`🎫 Ticket criado: ${ticket.id} - ${ticket.title} (${ticket.priority})`);
        } catch (error) {
            console.error('❌ Erro ao criar ticket:', error.message);
            next(createError(error.message, 400, 'TICKET_CREATE_ERROR'));
        }
    }

    // PUT /api/tickets/:id - Atualizar ticket - CORRIGIDO
    static async update(req, res, next) {
        try {
            const updatedBy = req.user?.name || req.body.updated_by || 'Sistema';
            
            // Preparar dados com formatação correta de data
            const updateData = { ...req.body };
            
            // Forçar updated_at no formato MySQL correto
            updateData.updated_at = formatDateForMySQL();
            
            // Se status for resolvido, definir resolved_at
            if (updateData.status === 'resolvido') {
                updateData.resolved_at = formatDateForMySQL();
            }
            
            const ticket = await TicketService.update(req.params.id, updateData, updatedBy);

            res.json({
                success: true,
                message: 'Ticket atualizado com sucesso',
                data: ticket
            });

            console.log(`✏️ Ticket atualizado: ${req.params.id} por ${updatedBy}`);
        } catch (error) {
            console.error('❌ Erro ao atualizar ticket:', error.message);
            
            if (error.message === 'Ticket não encontrado') {
                return next(createError(error.message, 404, 'TICKET_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'TICKET_UPDATE_ERROR'));
        }
    }

    // DELETE /api/tickets/:id - Deletar ticket
    static async delete(req, res, next) {
        try {
            const ticket = await TicketService.delete(req.params.id);

            res.json({
                success: true,
                message: 'Ticket deletado com sucesso',
                data: ticket
            });

            console.log(`🗑️ Ticket deletado: ${req.params.id} - ${ticket.title}`);
        } catch (error) {
            console.error('❌ Erro ao deletar ticket:', error.message);
            
            if (error.message === 'Ticket não encontrado') {
                return next(createError(error.message, 404, 'TICKET_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'TICKET_DELETE_ERROR'));
        }
    }

    // POST /api/tickets/:id/notes - Adicionar nota interna
    static async addNote(req, res, next) {
        try {
            const author = req.user?.name || req.body.author || 'Usuário';
            const note = await TicketService.addNote(req.params.id, req.body, author);

            res.status(201).json({
                success: true,
                message: 'Nota adicionada com sucesso',
                data: note
            });

            console.log(`📝 Nota adicionada ao ticket ${req.params.id} por ${author}`);
        } catch (error) {
            console.error('❌ Erro ao adicionar nota:', error.message);
            
            if (error.message === 'Ticket não encontrado') {
                return next(createError(error.message, 404, 'TICKET_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'NOTE_ADD_ERROR'));
        }
    }

    // GET /api/tickets/:id/notes - Listar notas do ticket
    static async getNotes(req, res, next) {
        try {
            const notes = await TicketService.getNotes(req.params.id);

            res.json({
                success: true,
                data: notes
            });
        } catch (error) {
            console.error('❌ Erro ao buscar notas:', error.message);
            
            if (error.message === 'Ticket não encontrado') {
                return next(createError(error.message, 404, 'TICKET_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'NOTES_GET_ERROR'));
        }
    }

    // GET /api/tickets/:id/activities - Log de atividades do ticket
    static async getActivities(req, res, next) {
        try {
            const activities = await TicketService.getActivities(req.params.id, req.query.limit);

            res.json({
                success: true,
                data: activities
            });
        } catch (error) {
            console.error('❌ Erro ao buscar atividades:', error.message);
            
            if (error.message === 'Ticket não encontrado') {
                return next(createError(error.message, 404, 'TICKET_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'ACTIVITIES_GET_ERROR'));
        }
    }

    // GET /api/tickets/category/:category - Tickets por categoria
    static async findByCategory(req, res, next) {
        try {
            const options = {
                limit: req.query.limit,
                offset: req.query.offset
            };
            
            const result = await TicketService.findByCategory(req.params.category, options);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('❌ Erro ao buscar por categoria:', error.message);
            next(createError(error.message, 400, 'CATEGORY_SEARCH_ERROR'));
        }
    }

    // GET /api/tickets/priority/:priority - Tickets por prioridade
    static async findByPriority(req, res, next) {
        try {
            const options = {
                limit: req.query.limit,
                offset: req.query.offset
            };
            
            const result = await TicketService.findByPriority(req.params.priority, options);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('❌ Erro ao buscar por prioridade:', error.message);
            next(createError(error.message, 400, 'PRIORITY_SEARCH_ERROR'));
        }
    }

    static async getStats(req, res, next) {
        try {
            const stats = await TicketService.getTicketStats();

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas:', error.message);
            next(createError(error.message, 500, 'STATS_ERROR'));
        }
    }

    // GET /api/tickets/overdue - Tickets em atraso
    static async getOverdue(req, res, next) {
        try {
            const overdueTickets = await TicketService.getOverdueTickets();

            res.json({
                success: true,
                data: {
                    tickets: overdueTickets,
                    count: overdueTickets.length
                }
            });
        } catch (error) {
            console.error('❌ Erro ao buscar tickets em atraso:', error.message);
            next(createError(error.message, 500, 'OVERDUE_ERROR'));
        }
    }

    // GET /api/tickets/user/:email - Tickets de um usuário específico
    static async getUserTickets(req, res, next) {
        try {
            const tickets = await TicketService.getTicketsByUser(req.params.email);

            res.json({
                success: true,
                data: {
                    user_email: req.params.email,
                    tickets,
                    count: tickets.length
                }
            });
        } catch (error) {
            console.error('❌ Erro ao buscar tickets do usuário:', error.message);
            next(createError(error.message, 400, 'USER_TICKETS_ERROR'));
        }
    }

    // GET /api/tickets/assigned/:userId - Tickets atribuídos a um usuário
    static async getAssignedTickets(req, res, next) {
        try {
            const tickets = await TicketService.getAssignedTickets(req.params.userId);

            res.json({
                success: true,
                data: {
                    assigned_to: req.params.userId,
                    tickets,
                    count: tickets.length
                }
            });
        } catch (error) {
            console.error('❌ Erro ao buscar tickets atribuídos:', error.message);
            next(createError(error.message, 400, 'ASSIGNED_TICKETS_ERROR'));
        }
    }

    // POST /api/tickets/:id/assign - Atribuir ticket a usuário
    static async assign(req, res, next) {
        try {
            const { assigned_to } = req.body;
            
            if (!assigned_to) {
                return next(createError('Campo assigned_to é obrigatório', 400, 'MISSING_ASSIGNED_TO'));
            }

            const updatedBy = req.user?.name || 'Sistema';
            const updateData = { 
                assigned_to,
                updated_at: formatDateForMySQL()
            };
            
            const ticket = await TicketService.update(
                req.params.id, 
                updateData, 
                updatedBy
            );

            res.json({
                success: true,
                message: 'Ticket atribuído com sucesso',
                data: ticket
            });

            console.log(`👤 Ticket ${req.params.id} atribuído a ${assigned_to} por ${updatedBy}`);
        } catch (error) {
            console.error('❌ Erro ao atribuir ticket:', error.message);
            
            if (error.message === 'Ticket não encontrado') {
                return next(createError(error.message, 404, 'TICKET_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'ASSIGN_ERROR'));
        }
    }

    // PUT /api/tickets/:id/status - Alterar apenas o status
    static async updateStatus(req, res, next) {
        try {
            const { status } = req.body;
            
            if (!status) {
                return next(createError('Campo status é obrigatório', 400, 'MISSING_STATUS'));
            }

            const updatedBy = req.user?.name || 'Sistema';
            const updateData = { 
                status,
                updated_at: formatDateForMySQL()
            };
            
            // Se status for resolvido, definir resolved_at
            if (status === 'resolvido') {
                updateData.resolved_at = formatDateForMySQL();
            }
            
            const ticket = await TicketService.update(
                req.params.id, 
                updateData, 
                updatedBy
            );

            res.json({
                success: true,
                message: 'Status atualizado com sucesso',
                data: ticket
            });

            console.log(`📊 Status do ticket ${req.params.id} alterado para ${status} por ${updatedBy}`);
        } catch (error) {
            console.error('❌ Erro ao alterar status:', error.message);
            
            if (error.message === 'Ticket não encontrado') {
                return next(createError(error.message, 404, 'TICKET_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'STATUS_UPDATE_ERROR'));
        }
    }

    // PUT /api/tickets/:id/priority - Alterar apenas a prioridade
    static async updatePriority(req, res, next) {
        try {
            const { priority } = req.body;
            
            if (!priority) {
                return next(createError('Campo priority é obrigatório', 400, 'MISSING_PRIORITY'));
            }

            const updatedBy = req.user?.name || 'Sistema';
            const updateData = { 
                priority,
                updated_at: formatDateForMySQL()
            };
            
            const ticket = await TicketService.update(
                req.params.id, 
                updateData, 
                updatedBy
            );

            res.json({
                success: true,
                message: 'Prioridade atualizada com sucesso',
                data: ticket
            });

            console.log(`⚠️ Prioridade do ticket ${req.params.id} alterada para ${priority} por ${updatedBy}`);
        } catch (error) {
            console.error('❌ Erro ao alterar prioridade:', error.message);
            
            if (error.message === 'Ticket não encontrado') {
                return next(createError(error.message, 404, 'TICKET_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'PRIORITY_UPDATE_ERROR'));
        }
    }

    // POST /api/tickets/:id/resolve - Resolver ticket (conveniência)
    static async resolve(req, res, next) {
        try {
            const { solution } = req.body;
            
            const updatedBy = req.user?.name || 'Sistema';
            const updateData = {
                status: 'resolvido',
                solution: solution || 'Ticket resolvido',
                updated_at: formatDateForMySQL(),
                resolved_at: formatDateForMySQL()
            };

            const ticket = await TicketService.update(
                req.params.id, 
                updateData, 
                updatedBy
            );

            res.json({
                success: true,
                message: 'Ticket resolvido com sucesso',
                data: ticket
            });

            console.log(`✅ Ticket ${req.params.id} resolvido por ${updatedBy}`);
        } catch (error) {
            console.error('❌ Erro ao resolver ticket:', error.message);
            
            if (error.message === 'Ticket não encontrado') {
                return next(createError(error.message, 404, 'TICKET_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'RESOLVE_ERROR'));
        }
    }

    // POST /api/tickets/:id/close - Fechar ticket (conveniência)
    static async close(req, res, next) {
        try {
            const updatedBy = req.user?.name || 'Sistema';
            const updateData = { 
                status: 'fechado',
                updated_at: formatDateForMySQL()
            };
            
            const ticket = await TicketService.update(
                req.params.id, 
                updateData, 
                updatedBy
            );

            res.json({
                success: true,
                message: 'Ticket fechado com sucesso',
                data: ticket
            });

            console.log(`🔒 Ticket ${req.params.id} fechado por ${updatedBy}`);
        } catch (error) {
            console.error('❌ Erro ao fechar ticket:', error.message);
            
            if (error.message === 'Ticket não encontrado') {
                return next(createError(error.message, 404, 'TICKET_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'CLOSE_ERROR'));
        }
    }

    // POST /api/tickets/:id/reopen - Reabrir ticket (conveniência)
    static async reopen(req, res, next) {
        try {
            const updatedBy = req.user?.name || 'Sistema';
            const updateData = { 
                status: 'aberto',
                updated_at: formatDateForMySQL()
            };
            
            const ticket = await TicketService.update(
                req.params.id, 
                updateData, 
                updatedBy
            );

            res.json({
                success: true,
                message: 'Ticket reaberto com sucesso',
                data: ticket
            });

            console.log(`🔓 Ticket ${req.params.id} reaberto por ${updatedBy}`);
        } catch (error) {
            console.error('❌ Erro ao reabrir ticket:', error.message);
            
            if (error.message === 'Ticket não encontrado') {
                return next(createError(error.message, 404, 'TICKET_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'REOPEN_ERROR'));
        }
    }
}

module.exports = TicketController;