// src/models/Ticket.js - Model de Ticket com validações e estrutura
const { isValidEmail, sanitizeHtml } = require('../middleware/validation');

class Ticket {
    // Validação completa para criação de ticket
    static validate(data) {
        const errors = [];
        
        // Campos obrigatórios
        const required = {
            title: 'Título',
            description: 'Descrição', 
            category: 'Categoria',
            priority: 'Prioridade',
            user_name: 'Nome do usuário',
            user_email: 'Email do usuário',
            department: 'Departamento'
        };

        for (const [field, label] of Object.entries(required)) {
            if (!data[field] || data[field].toString().trim() === '') {
                errors.push(`Campo obrigatório: ${label}`);
            }
        }

        // Validações específicas
        if (data.title) {
            if (data.title.length < 5) {
                errors.push('Título deve ter pelo menos 5 caracteres');
            }
            if (data.title.length > 500) {
                errors.push('Título deve ter no máximo 500 caracteres');
            }
        }

        if (data.description) {
            if (data.description.length < 10) {
                errors.push('Descrição deve ter pelo menos 10 caracteres');
            }
            if (data.description.length > 5000) {
                errors.push('Descrição deve ter no máximo 5000 caracteres');
            }
        }

        if (data.user_email && !isValidEmail(data.user_email)) {
            errors.push('Email inválido');
        }

        if (data.priority && !this.getValidPriorities().includes(data.priority)) {
            errors.push(`Prioridade inválida. Use: ${this.getValidPriorities().join(', ')}`);
        }

        if (data.category && !this.getValidCategories().includes(data.category)) {
            errors.push(`Categoria inválida. Use: ${this.getValidCategories().join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Validação para atualização de ticket
    static validateUpdate(data) {
        const errors = [];
        const allowedFields = this.getAllowedUpdateFields();
        
        const updateFields = Object.keys(data).filter(key => allowedFields.includes(key));
        
        if (updateFields.length === 0) {
            errors.push('Nenhum campo válido para atualização');
        }

        // Validar campos específicos se fornecidos
        if (data.status && !this.getValidStatuses().includes(data.status)) {
            errors.push(`Status inválido. Use: ${this.getValidStatuses().join(', ')}`);
        }

        if (data.priority && !this.getValidPriorities().includes(data.priority)) {
            errors.push(`Prioridade inválida. Use: ${this.getValidPriorities().join(', ')}`);
        }

        if (data.category && !this.getValidCategories().includes(data.category)) {
            errors.push(`Categoria inválida. Use: ${this.getValidCategories().join(', ')}`);
        }

        if (data.title && (data.title.length < 5 || data.title.length > 500)) {
            errors.push('Título deve ter entre 5 e 500 caracteres');
        }

        if (data.description && (data.description.length < 10 || data.description.length > 5000)) {
            errors.push('Descrição deve ter entre 10 e 5000 caracteres');
        }

        return {
            isValid: errors.length === 0,
            errors,
            updateFields
        };
    }

    // Sanitizar dados de entrada
    static sanitize(data) {
        const sanitized = {};
        
        if (data.title) sanitized.title = data.title.trim();
        if (data.description) sanitized.description = data.description.trim();
        if (data.user_name) sanitized.user_name = data.user_name.trim();
        if (data.user_email) sanitized.user_email = data.user_email.trim().toLowerCase();
        if (data.department) sanitized.department = data.department.trim();
        if (data.category) sanitized.category = data.category.toLowerCase();
        if (data.priority) sanitized.priority = data.priority.toLowerCase();
        if (data.status) sanitized.status = data.status.toLowerCase();
        if (data.solution) sanitized.solution = data.solution.trim();
        if (data.assigned_to) sanitized.assigned_to = data.assigned_to.trim();

        return sanitized;
    }

    // Preparar dados para criação
    static prepareForCreation(data) {
        const { generateId } = require('../utils/helpers');
        
        return {
            id: generateId(),
            title: data.title,
            description: data.description,
            category: data.category,
            priority: data.priority,
            status: 'aberto', // Status padrão
            user_name: data.user_name,
            user_email: data.user_email,
            department: data.department,
            assigned_to: null,
            solution: null,
            created_at: new Date(),
            updated_at: new Date()
        };
    }

    // Preparar dados para atualização
    static prepareForUpdate(data, allowedFields) {
        const updates = {};
        const values = [];
        
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updates[field] = data[field];
            }
        });

        // Sempre atualizar timestamp
        updates.updated_at = new Date();

        // Se mudando para resolvido, adicionar timestamp
        if (data.status === 'resolvido') {
            updates.resolved_at = new Date();
        }

        // Se saindo de resolvido, remover timestamp
        if (data.status && data.status !== 'resolvido') {
            updates.resolved_at = null;
        }

        return updates;
    }

    // Validar parâmetros de consulta
    static validateQueryParams(query) {
        const errors = [];
        const validatedQuery = {};

        // Validar limit
        if (query.limit !== undefined) {
            const limit = parseInt(query.limit, 10);
            if (isNaN(limit) || limit < 1 || limit > 100) {
                errors.push('Limit deve ser entre 1 e 100');
            } else {
                validatedQuery.limit = limit;
            }
        }

        // Validar offset/page
        if (query.page !== undefined) {
            const page = parseInt(query.page, 10);
            if (isNaN(page) || page < 1) {
                errors.push('Page deve ser um número positivo');
            } else {
                const limit = validatedQuery.limit || 10;
                validatedQuery.offset = (page - 1) * limit;
                validatedQuery.page = page;
            }
        } else if (query.offset !== undefined) {
            const offset = parseInt(query.offset, 10);
            if (isNaN(offset) || offset < 0) {
                errors.push('Offset deve ser não-negativo');
            } else {
                validatedQuery.offset = offset;
            }
        }

        // Validar filtros
        if (query.status && !this.getValidStatuses().includes(query.status)) {
            errors.push('Status de filtro inválido');
        } else if (query.status) {
            validatedQuery.status = query.status;
        }

        if (query.priority && !this.getValidPriorities().includes(query.priority)) {
            errors.push('Prioridade de filtro inválida');
        } else if (query.priority) {
            validatedQuery.priority = query.priority;
        }

        if (query.category && !this.getValidCategories().includes(query.category)) {
            errors.push('Categoria de filtro inválida');
        } else if (query.category) {
            validatedQuery.category = query.category;
        }

        // Validar busca
        if (query.search !== undefined) {
            if (query.search.length > 255) {
                errors.push('Termo de busca muito longo');
            } else {
                validatedQuery.search = query.search.trim();
            }
        }

        // Outros filtros
        if (query.assigned_to) validatedQuery.assigned_to = query.assigned_to.trim();
        if (query.department) validatedQuery.department = query.department.trim();

        return {
            isValid: errors.length === 0,
            errors,
            params: validatedQuery
        };
    }

    // Construir query SQL com filtros
    static buildFilterQuery(filters) {
        let query = 'SELECT * FROM tickets WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM tickets WHERE 1=1';
        let params = [];
        let countParams = [];

        // Aplicar filtros
        const filterMappings = {
            status: 'status = ?',
            priority: 'priority = ?', 
            category: 'category = ?',
            assigned_to: 'assigned_to = ?',
            department: 'department = ?'
        };

        Object.entries(filterMappings).forEach(([key, condition]) => {
            if (filters[key]) {
                query += ` AND ${condition}`;
                countQuery += ` AND ${condition}`;
                params.push(filters[key]);
                countParams.push(filters[key]);
            }
        });

        // Busca textual
        if (filters.search) {
            const searchCondition = ' AND (title LIKE ? OR description LIKE ? OR user_name LIKE ?)';
            query += searchCondition;
            countQuery += searchCondition;
            const searchParam = `%${filters.search}%`;
            params.push(searchParam, searchParam, searchParam);
            countParams.push(searchParam, searchParam, searchParam);
        }

        // Ordenação
        query += ' ORDER BY created_at DESC';

        // Paginação
        if (filters.limit) {
            query += ` LIMIT ${filters.limit}`;
            if (filters.offset) {
                query += ` OFFSET ${filters.offset}`;
            }
        }

        return {
            query,
            countQuery,
            params,
            countParams
        };
    }

    // Validar ID
    static validateId(id) {
        if (!id || id.trim() === '') {
            return { isValid: false, error: 'ID é obrigatório' };
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
            return { isValid: false, error: 'Formato de ID inválido' };
        }

        return { isValid: true };
    }

    // Constantes de validação
    static getValidStatuses() {
        return ['aberto', 'andamento', 'resolvido', 'fechado'];
    }

    static getValidPriorities() {
        return ['baixa', 'media', 'alta', 'critica'];
    }

    static getValidCategories() {
        return ['hardware', 'software', 'rede', 'email', 'impressora', 'sistema', 'acesso'];
    }

    static getAllowedUpdateFields() {
        return ['status', 'priority', 'assigned_to', 'solution', 'title', 'description', 'category'];
    }

    // Métodos de formatação
    static formatForDisplay(ticket) {
        if (!ticket) return null;

        return {
            ...ticket,
            priority_display: this.getPriorityDisplay(ticket.priority),
            status_display: this.getStatusDisplay(ticket.status),
            category_display: this.getCategoryDisplay(ticket.category),
            created_at_formatted: new Date(ticket.created_at).toLocaleString('pt-BR'),
            updated_at_formatted: new Date(ticket.updated_at).toLocaleString('pt-BR'),
            resolved_at_formatted: ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleString('pt-BR') : null
        };
    }

    static getPriorityDisplay(priority) {
        const displays = {
            baixa: 'Baixa',
            media: 'Média', 
            alta: 'Alta',
            critica: 'Crítica'
        };
        return displays[priority] || priority;
    }

    static getStatusDisplay(status) {
        const displays = {
            aberto: 'Aberto',
            andamento: 'Em Andamento',
            resolvido: 'Resolvido', 
            fechado: 'Fechado'
        };
        return displays[status] || status;
    }

    static getCategoryDisplay(category) {
        const displays = {
            hardware: 'Hardware',
            software: 'Software',
            rede: 'Rede/Internet',
            email: 'Email',
            impressora: 'Impressora',
            sistema: 'Sistema Interno',
            acesso: 'Controle de Acesso'
        };
        return displays[category] || category;
    }

    // Métodos para análise de negócio
    static calculatePriorityScore(ticket) {
        const scores = {
            baixa: 1,
            media: 2,
            alta: 3,
            critica: 4
        };
        return scores[ticket.priority] || 1;
    }

    static isOverdue(ticket) {
        if (ticket.status === 'resolvido' || ticket.status === 'fechado') {
            return false;
        }

        const now = new Date();
        const created = new Date(ticket.created_at);
        const hoursDiff = (now - created) / (1000 * 60 * 60);

        // SLA baseado na prioridade
        const slaHours = {
            critica: 4,
            alta: 24, 
            media: 72,
            baixa: 168
        };

        return hoursDiff > (slaHours[ticket.priority] || 168);
    }

    static getAging(ticket) {
        const now = new Date();
        const created = new Date(ticket.created_at);
        const hoursDiff = Math.floor((now - created) / (1000 * 60 * 60));
        
        if (hoursDiff < 24) return `${hoursDiff}h`;
        const daysDiff = Math.floor(hoursDiff / 24);
        return `${daysDiff}d`;
    }
}

module.exports = Ticket;