// src/middleware/validation.js - Middleware de Validação

const { createError } = require('./errorHandler');

// Validação para criação de tickets
function validateTicket(req, res, next) {
    const { title, description, category, priority, user_name, user_email, department } = req.body;
    
    // Campos obrigatórios
    const requiredFields = {
        title: 'Título',
        description: 'Descrição',
        category: 'Categoria',
        priority: 'Prioridade',
        user_name: 'Nome do usuário',
        user_email: 'Email do usuário',
        department: 'Departamento'
    };

    // Verificar campos obrigatórios
    for (const [field, label] of Object.entries(requiredFields)) {
        if (!req.body[field] || req.body[field].toString().trim() === '') {
            return next(createError(`Campo obrigatório: ${label}`, 400, 'VALIDATION_ERROR'));
        }
    }

    // Validar valores específicos
    const validPriorities = ['baixa', 'media', 'alta', 'critica'];
    const validCategories = ['hardware', 'software', 'rede', 'email', 'impressora', 'sistema', 'acesso'];

    if (!validPriorities.includes(priority)) {
        return next(createError(
            `Prioridade inválida. Valores aceitos: ${validPriorities.join(', ')}`, 
            400, 
            'INVALID_PRIORITY'
        ));
    }

    if (!validCategories.includes(category)) {
        return next(createError(
            `Categoria inválida. Valores aceitos: ${validCategories.join(', ')}`, 
            400, 
            'INVALID_CATEGORY'
        ));
    }

    // Validar email
    if (!isValidEmail(user_email)) {
        return next(createError('Email inválido', 400, 'INVALID_EMAIL'));
    }

    // Validar tamanhos
    if (title.length < 5) {
        return next(createError('Título deve ter pelo menos 5 caracteres', 400, 'TITLE_TOO_SHORT'));
    }

    if (title.length > 500) {
        return next(createError('Título deve ter no máximo 500 caracteres', 400, 'TITLE_TOO_LONG'));
    }

    if (description.length < 10) {
        return next(createError('Descrição deve ter pelo menos 10 caracteres', 400, 'DESCRIPTION_TOO_SHORT'));
    }

    if (description.length > 5000) {
        return next(createError('Descrição deve ter no máximo 5000 caracteres', 400, 'DESCRIPTION_TOO_LONG'));
    }

    // Sanitizar dados
    req.body.title = title.trim();
    req.body.description = description.trim();
    req.body.user_name = user_name.trim();
    req.body.user_email = user_email.trim().toLowerCase();
    req.body.department = department.trim();

    next();
}

// Validação para atualização de tickets
function validateTicketUpdate(req, res, next) {
    const updates = req.body;
    
    // Campos que podem ser atualizados
    const allowedUpdates = [
        'status', 'priority', 'assigned_to', 'solution', 
        'title', 'description', 'category'
    ];
    
    const updateFields = Object.keys(updates).filter(key => allowedUpdates.includes(key));
    
    if (updateFields.length === 0) {
        return next(createError('Nenhum campo válido para atualização', 400, 'NO_VALID_FIELDS'));
    }

    // Validar status se fornecido
    if (updates.status && !['aberto', 'andamento', 'resolvido', 'fechado'].includes(updates.status)) {
        return next(createError('Status inválido. Use: aberto, andamento, resolvido, fechado', 400, 'INVALID_STATUS'));
    }

    // Validar prioridade se fornecida
    if (updates.priority && !['baixa', 'media', 'alta', 'critica'].includes(updates.priority)) {
        return next(createError('Prioridade inválida', 400, 'INVALID_PRIORITY'));
    }

    // Validar categoria se fornecida
    if (updates.category && !['hardware', 'software', 'rede', 'email', 'impressora', 'sistema', 'acesso'].includes(updates.category)) {
        return next(createError('Categoria inválida', 400, 'INVALID_CATEGORY'));
    }

    // Validar título se fornecido
    if (updates.title && (updates.title.length < 5 || updates.title.length > 500)) {
        return next(createError('Título deve ter entre 5 e 500 caracteres', 400, 'INVALID_TITLE_LENGTH'));
    }

    // Validar descrição se fornecida
    if (updates.description && (updates.description.length < 10 || updates.description.length > 5000)) {
        return next(createError('Descrição deve ter entre 10 e 5000 caracteres', 400, 'INVALID_DESCRIPTION_LENGTH'));
    }

    // Sanitizar strings
    if (updates.title) updates.title = updates.title.trim();
    if (updates.description) updates.description = updates.description.trim();
    if (updates.solution) updates.solution = updates.solution.trim();

    next();
}

// Validação para criação de usuários
function validateUser(req, res, next) {
    const { name, email, role = 'user', department } = req.body;

    // Campos obrigatórios
    if (!name || name.trim() === '') {
        return next(createError('Nome é obrigatório', 400, 'NAME_REQUIRED'));
    }

    if (!email || email.trim() === '') {
        return next(createError('Email é obrigatório', 400, 'EMAIL_REQUIRED'));
    }

    if (!department || department.trim() === '') {
        return next(createError('Departamento é obrigatório', 400, 'DEPARTMENT_REQUIRED'));
    }

    // Validar email
    if (!isValidEmail(email)) {
        return next(createError('Email inválido', 400, 'INVALID_EMAIL'));
    }

    // Validar role
    if (!['admin', 'technician', 'user'].includes(role)) {
        return next(createError('Role inválido. Use: admin, technician ou user', 400, 'INVALID_ROLE'));
    }

    // Validar comprimentos
    if (name.length < 2 || name.length > 255) {
        return next(createError('Nome deve ter entre 2 e 255 caracteres', 400, 'INVALID_NAME_LENGTH'));
    }

    if (department.length < 2 || department.length > 100) {
        return next(createError('Departamento deve ter entre 2 e 100 caracteres', 400, 'INVALID_DEPARTMENT_LENGTH'));
    }

    // Sanitizar dados
    req.body.name = name.trim();
    req.body.email = email.trim().toLowerCase();
    req.body.department = department.trim();
    req.body.role = role;

    next();
}

// Validação para notas de tickets
function validateTicketNote(req, res, next) {
    const { note, author } = req.body;

    if (!note || note.trim() === '') {
        return next(createError('Conteúdo da nota é obrigatório', 400, 'NOTE_REQUIRED'));
    }

    if (!author || author.trim() === '') {
        return next(createError('Autor da nota é obrigatório', 400, 'AUTHOR_REQUIRED'));
    }

    if (note.length < 3) {
        return next(createError('Nota deve ter pelo menos 3 caracteres', 400, 'NOTE_TOO_SHORT'));
    }

    if (note.length > 2000) {
        return next(createError('Nota deve ter no máximo 2000 caracteres', 400, 'NOTE_TOO_LONG'));
    }

    if (author.length > 255) {
        return next(createError('Nome do autor deve ter no máximo 255 caracteres', 400, 'AUTHOR_TOO_LONG'));
    }

    // Sanitizar dados
    req.body.note = note.trim();
    req.body.author = author.trim();

    next();
}

// Validação de parâmetros de consulta
function validateQueryParams(req, res, next) {
    const { limit, offset, search } = req.query;

    // Validar limit
    if (limit !== undefined) {
        const limitNum = parseInt(limit, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return next(createError('Limit deve ser um número entre 1 e 100', 400, 'INVALID_LIMIT'));
        }
        req.query.limit = limitNum;
    }

    // Validar offset
    if (offset !== undefined) {
        const offsetNum = parseInt(offset, 10);
        if (isNaN(offsetNum) || offsetNum < 0) {
            return next(createError('Offset deve ser um número maior ou igual a 0', 400, 'INVALID_OFFSET'));
        }
        req.query.offset = offsetNum;
    }

    // Validar search
    if (search !== undefined) {
        if (search.length > 255) {
            return next(createError('Termo de busca deve ter no máximo 255 caracteres', 400, 'SEARCH_TOO_LONG'));
        }
        req.query.search = search.trim();
    }

    next();
}

// Validação de ID (UUID ou timestamp)
function validateId(paramName = 'id') {
    return (req, res, next) => {
        const id = req.params[paramName];
        
        if (!id || id.trim() === '') {
            return next(createError('ID é obrigatório', 400, 'ID_REQUIRED'));
        }

        // Validar formato básico do ID (alfanumérico e underscore)
        if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
            return next(createError('Formato de ID inválido', 400, 'INVALID_ID_FORMAT'));
        }

        next();
    };
}

// Função auxiliar para validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Função auxiliar para sanitizar HTML
function sanitizeHtml(str) {
    if (typeof str !== 'string') return str;
    
    return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

module.exports = {
    validateTicket,
    validateTicketUpdate,
    validateUser,
    validateTicketNote,
    validateQueryParams,
    validateId,
    isValidEmail,
    sanitizeHtml
};